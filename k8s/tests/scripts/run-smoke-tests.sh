#!/bin/bash

# Create namespace and setup RBAC
kubectl create namespace "keramik-smoke-$1" >/dev/null
yq "
 .metadata.name* = \"keramik-smoke-$1\" |
 (select(.subjects[] | length) | .subjects[0].name*) = \"keramik-smoke-$1\" |
 (select(.roleRef) | .roleRef.name) = \"keramik-smoke-$1\"
" ../manifests/setup.yaml | kubectl apply -f - >/dev/null

# Create the network.
kubectl create configmap check-network --from-file=check-network.sh -n "keramik-smoke-$1" >/dev/null
yq "
  .metadata.name = \"smoke-$1\"
" ../../networks/"$1".yaml | kubectl apply -f - >/dev/null

# Create the test job
yq "
  .spec.template.spec.serviceAccountName = \"keramik-smoke-$1\"
" ../manifests/smoke.yaml | kubectl apply -n "keramik-smoke-$1" -f - >/dev/null

# Wait for test job to be fully up
kubectl wait --for=condition=ready pod --selector=job-name=tests --timeout=20m -n "keramik-smoke-$1" --timeout=20m >/dev/null

# Run the tests
kubectl exec  -n "keramik-smoke-$1" job/tests -c tests -- pnpm run start
