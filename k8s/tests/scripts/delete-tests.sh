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

# Delete the tests job
yq "
 .metadata.name* = \"keramik-$test_type-$1$TEST_SUFFIX\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-$test_type-$1$TEST_SUFFIX\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-$test_type-$1$TEST_SUFFIX\"
" ../manifests/setup.yaml | kubectl delete -f - >/dev/null

# Delete the test network
yq "
  .metadata.name = \"$test_type-$1$TEST_SUFFIX\"
" ../../networks/"$1".yaml | kubectl delete -f - >/dev/null

# Wait for namespace to get deleted
kubectl wait --for=delete namespace/"keramik-$test_type-$1$TEST_SUFFIX" --timeout=10m >/dev/null
