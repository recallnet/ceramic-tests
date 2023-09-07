#!/bin/bash

# Create namespace and setup RBAC
kubectl create namespace "keramik-prop-$1$TEST_SUFFIX" >/dev/null
yq "
 .metadata.name* = \"keramik-prop-$1$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-prop-$1$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-prop-$1$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl apply -f - >/dev/null

# Create the network.
kubectl create configmap process-peers --from-file=process-peers.sh -n "keramik-prop-$1$TEST_SUFFIX" >/dev/null
yq "
  .metadata.name = \"prop-$1$TEST_SUFFIX\"
" ../../networks/"$1".yaml | kubectl apply -f - >/dev/null

# Wait for the network to be up
if ! NAMESPACE="keramik-prop-$1$TEST_SUFFIX" ./check-network.sh
then
  exit 1
fi

# Delete and recreate the test job so that tests are rerun even if they've been run against this network in the past
test_spec=$(
  yq "
    .spec.template.spec.serviceAccountName = \"keramik-prop-$1$TEST_SUFFIX\"
  " ../manifests/prop.yaml
)
echo "$test_spec" | kubectl delete -n "keramik-prop-$1$TEST_SUFFIX" -f - >/dev/null
echo "$test_spec" | kubectl apply -n "keramik-prop-$1$TEST_SUFFIX" -f - >/dev/null

# Wait for tests to complete then collect the results
while true; do
  if kubectl wait --for=condition=complete --timeout=0 job/tests -n "keramik-prop-$1$TEST_SUFFIX" >/dev/null 2>/dev/null; then
    job_result=0
    break
  fi
  if kubectl wait --for=condition=failed --timeout=0 job/tests -n "keramik-prop-$1$TEST_SUFFIX" >/dev/null 2>/dev/null; then
    job_result=1
    break
  fi
  sleep 3
done

kubectl logs job.batch/tests -c tests -n "keramik-prop-$1$TEST_SUFFIX"

if [[ $job_result -eq 1 ]]; then
    exit 1
fi
