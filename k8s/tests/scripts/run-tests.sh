#!/bin/bash

cd "$(dirname "$0")"

usage() {
  echo "usage: $0 {network} {prop|smoke}"
  exit 1
}

network=$1


if [[ -z "$network" ]]; then
  usage
fi

if [[ -n $2 ]]; then
  test_type="$2"
else
  test_type="prop"
fi

case "$test_type" in
  prop|smoke)
    ;;

  *)
    usage
    ;;
esac

namespace="keramik-$test_type-$network$TEST_SUFFIX"

# Ensure admin DID secret exists
kubectl -n keramik create secret generic ceramic-tests-admin-did --from-literal=private-key=c864a33033626b448912a19509992552283fd463c143bdc4adc75f807b7a4dce

# Create namespace if it does not already exist
kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
# Add RBAC roles
yq "
 .metadata.name* = \"keramik-$test_type-$network$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-$test_type-$network$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-$test_type-$network$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl apply -f -

# Create the network.
kubectl create configmap process-peers --from-file=process-peers.sh -n "$namespace"
yq "
  .metadata.name = \"$test_type-$network$TEST_SUFFIX\"
" ../../networks/"$network".yaml | kubectl apply -f -

# Wait for the network to be up
if ! NAMESPACE="$namespace" ./check-network.sh
then
  exit 1
fi

# Delete and recreate the test job so that tests are rerun even if they've been run against this network in the past
kubectl delete -n "$namespace" job/tests
yq "
  (select(.kind == \"Job\") | .spec.template.spec.serviceAccountName) = \"keramik-$test_type-$network$TEST_SUFFIX\"
" ../manifests/"$test_type".yaml |
  kubectl apply -n "$namespace" -f -

# Wait for tests to complete then collect the results
while true; do
  if kubectl wait --for=condition=complete --timeout=0 job/tests -n "$namespace"; then
    job_result=0
    break
  fi
  if kubectl wait --for=condition=failed --timeout=0 job/tests -n "$namespace"; then
    job_result=1
    break
  fi
  sleep 3
done

kubectl logs job.batch/tests -c tests -n "$namespace"

if [[ $job_result -eq 1 ]]; then
    exit 1
fi
