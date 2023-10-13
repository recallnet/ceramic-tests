#!/bin/bash

tag=${BUILD_TAG-latest}
IMAGE_NAME=${IMAGE_NAME-public.ecr.aws/r5b3e0r5/3box/ceramic-tests-suite}

# This script won't launch any daemons. It will assume the test suite is being pointed to some instance(s) of ComposeDB
# and Ceramic running in durable infrastructure.
#
# The script also assumes that AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION) have been
# configured.
DURABLE_ENV=${1-dev}

case "${DURABLE_ENV}" in
  dev)
    COMPOSEDB_URLS=${COMPOSEDB_URLS-https://ceramic-private-dev.3boxlabs.com,https://ceramic-dev.3boxlabs.com}
    ;;

  qa)
    COMPOSEDB_URLS=https://ceramic-private-qa.3boxlabs.com,https://ceramic-qa.3boxlabs.com
    ;;

  tnet)
    COMPOSEDB_URLS=https://ceramic-private-clay.3boxlabs.com,https://ceramic-clay.3boxlabs.com
    ;;

  prod)
    COMPOSEDB_URLS=https://ceramic-private.3boxlabs.com
    ;;

  *)
    echo "Usage: $0 {dev|qa|tnet|prod}"
    exit 1
    ;;
esac

AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID-.}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY-.}
AWS_REGION=${AWS_REGION-us-east-1}
JEST_ARGS=${JEST_ARGS---reporters=default}

docker run \
    -e COMPOSEDB_URLS="${COMPOSEDB_URLS}" \
    -e CERAMIC_URLS="${CERAMIC_URLS}" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    -e AWS_REGION="${AWS_REGION}" \
    -e DB_ENDPOINT="${DB_ENDPOINT}" \
    -e JEST_ARGS="${JEST_ARGS}" \
    -e STAGE="${DURABLE_ENV}" \
    "${IMAGE_NAME}":"$tag"
