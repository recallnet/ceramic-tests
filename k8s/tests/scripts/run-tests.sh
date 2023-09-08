#!/bin/bash

if [[ -n $2 ]]; then
  test_type="$2"
else
  test_type="prop"
fi

case "$test_type" in
  prop|smoke)
    ;;

  *)
    echo "usage: $0 {network} {prop|smoke}"
    ;;
esac

# Create namespace and setup RBAC
kubectl create namespace "keramik-$test_type-$1$TEST_SUFFIX" >/dev/null 2>/dev/null
yq "
 .metadata.name* = \"keramik-$test_type-$1$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-$test_type-$1$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-$test_type-$1$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl apply -f - >/dev/null

# Create the network.
kubectl create configmap process-peers --from-file=process-peers.sh -n "keramik-$test_type-$1$TEST_SUFFIX" >/dev/null 2>/dev/null
yq "
  .metadata.name = \"$test_type-$1$TEST_SUFFIX\"
" ../../networks/"$1".yaml | kubectl apply -f - >/dev/null

# Wait for the network to be up
if ! NAMESPACE="keramik-$test_type-$1$TEST_SUFFIX" ./check-network.sh
then
  exit 1
fi

# Delete and recreate the test job so that tests are rerun even if they've been run against this network in the past
kubectl delete -n "keramik-$test_type-$1$TEST_SUFFIX" job/tests >/dev/null 2>/dev/null
yq "
  (select(.kind == \"Job\") | .spec.template.spec.serviceAccountName) = \"keramik-$test_type-$1$TEST_SUFFIX\"
" ../manifests/"$test_type".yaml |
  kubectl apply -n "keramik-$test_type-$1$TEST_SUFFIX" -f - >/dev/null

# Wait for tests to complete then collect the results
while true; do
  if kubectl wait --for=condition=complete --timeout=0 job/tests -n "keramik-$test_type-$1$TEST_SUFFIX" >/dev/null 2>/dev/null; then
    job_result=0
    break
  fi
  if kubectl wait --for=condition=failed --timeout=0 job/tests -n "keramik-$test_type-$1$TEST_SUFFIX" >/dev/null 2>/dev/null; then
    job_result=1
    break
  fi
  sleep 3
done

kubectl logs job.batch/tests -c tests -n "keramik-$test_type-$1$TEST_SUFFIX"

if [[ $job_result -eq 1 ]]; then
    exit 1
fi
