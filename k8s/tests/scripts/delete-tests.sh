#!/bin/bash

# Delete the tests job
yq "
 .metadata.name* = \"keramik-$1$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-$1$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-$1$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl delete -f - >/dev/null

# Delete the test network
yq "
  .metadata.name = \"$1$TEST_SUFFIX\"
" ../../networks/"$1".yaml | kubectl delete -f - >/dev/null

# Wait for namespace to get deleted
kubectl wait --for=delete namespace/"keramik-$1$TEST_SUFFIX" --timeout=10m >/dev/null
