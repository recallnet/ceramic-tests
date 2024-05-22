#!/bin/bash

# Build and publish a docker image for the hermetic
#
# DOCKER_PASSWORD must be set
# Use:
#
#   export DOCKER_PASSWORD=$(aws ecr-public get-login-password --region us-east-1)
#   echo "${DOCKER_PASSWORD}" | docker login --username AWS --password-stdin public.ecr.aws/r5b3e0r5
#
# to login to docker. That password will be valid for 12h.

# Regular expression for releases
pattern="^v[0-9]+\.[0-9]+\.[0-9]+$"

# Check if the number of arguments is zero
if [ $# -eq 0 ]; then
    latest=true
else
    tag=${1}
    if [[ $1 =~ $pattern ]]; then
        latest=true
    fi
fi

IMAGE_NAME=${IMAGE_NAME-public.ecr.aws/r5b3e0r5/3box/js-ceramic:jd-latest}

PUSH_ARGS="--push"
if [ "$NO_PUSH" = "true" ]
then
    PUSH_ARGS=""
fi

docker buildx build \
    $PUSH_ARGS \
    -t ${IMAGE_NAME}:$tag \
    -f Dockerfile.hermetic-driver \
    .
