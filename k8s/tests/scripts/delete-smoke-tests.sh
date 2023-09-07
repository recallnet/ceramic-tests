#!/bin/bash

# Delete the tests job
yq "
 .metadata.name* = \"keramik-smoke-$1\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-smoke-$1\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-smoke-$1\"
" ../manifests/setup.yaml | kubectl delete -f - >/dev/null

# Delete the test network
yq "
  .metadata.name = \"smoke-$1\"
" ../../networks/"$1".yaml | kubectl delete -f - >/dev/null

# Wait for namespace to get deleted
kubectl wait --for=delete namespace/"keramik-smoke-$1" --timeout=10m >/dev/null
