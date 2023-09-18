#!/bin/bash

# Build and publish a docker image to run property tests
#
# DOCKER_PASSWORD must be set
# Use:
#
#   export DOCKER_PASSWORD=$(aws ecr-public get-login-password --region us-east-1)
#   echo "${DOCKER_PASSWORD}" | docker login --username AWS --password-stdin public.ecr.aws/r5b3e0r5
#
# to login to docker. That password will be valid for 12h.

tag=${1-latest}
BUILD_PROFILE=${BUILD_PROFILE-release}

CACHE_ARGS=""
if [ -n "$ACTIONS_CACHE_URL" ]
then
    # Use Github Actions cache
    CACHE_ARGS="--cache-to type=gha --cache-from type=gha"
fi

docker buildx build \
    --push \
    $CACHE_ARGS \
    --build-arg BUILD_PROFILE=${BUILD_PROFILE} \
    -t public.ecr.aws/r5b3e0r5/3box/ceramic-tests-property:$tag \
    .
