#!/bin/bash

# Create namespace and setup RBAC
kubectl create namespace "keramik-$1$TEST_SUFFIX" >/dev/null
yq "
 .metadata.name* = \"keramik-$1$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-$1$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-$1$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl apply -f - >/dev/null

# Create the network.
kubectl create configmap check-network --from-file=check-network.sh -n "keramik-$1$TEST_SUFFIX" >/dev/null
yq "
  .metadata.name = \"$1$TEST_SUFFIX\"
" ../../networks/"$1".yaml | kubectl apply -f - >/dev/null

# Create the test job
yq "
  .spec.template.spec.serviceAccountName = \"keramik-$1$TEST_SUFFIX\"
" ../manifests/tests.yaml | kubectl apply -n "keramik-$1$TEST_SUFFIX" -f - >/dev/null

# Wait for tests to complete then collect the results
kubectl wait --for=condition=complete job/ceramic-tests -n "keramik-$1$TEST_SUFFIX" --timeout=20m >/dev/null
TEST_RESULTS=$(kubectl logs job.batch/ceramic-tests -c ceramic-tests -n "keramik-$1$TEST_SUFFIX")
echo "$TEST_RESULTS"
# Return a failure from here instead of from the tests. The test job is setup to restart on failure, which is needed for
# it to be setup correctly with the right Ceramic/ComposeDB URLs.
if [[ "$TEST_RESULTS" =~ "FAILED" ]]; then
   exit 1
fi
