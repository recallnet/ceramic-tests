#!/bin/bash

tag=${BUILD_TAG-latest}
IMAGE_NAME=${IMAGE_NAME-public.ecr.aws/r5b3e0r5/3box/ceramic-tests-suite}

# This script won't launch any daemons. It will assume the test suite is being pointed to some instance(s) of ComposeDB
# and Ceramic running in durable infrastructure.
#
# The script also assumes that AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION) have been
# configured.
DURABLE_ENV=${1-dev}
TEST_SELECTOR=${2-.}

case "${DURABLE_ENV}" in
  dev)  ;;
  qa)   ;;
  tnet) ;;
  prod) ;;
  *)
    echo "Usage: $0 {dev|qa|tnet|prod}"
    exit 1
    ;;
esac

AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID-.}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY-.}
AWS_REGION=${AWS_REGION-us-east-1}

docker run --network="host" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    -e AWS_REGION="${AWS_REGION}" \
    -e DB_ENDPOINT="${DB_ENDPOINT}" \
    -e DOTENV_CONFIG_PATH="./env/.env.${DURABLE_ENV}" \
    -e TEST_SELECTOR="${TEST_SELECTOR}" \
    -e EXTRA_COMPOSEDB_URLS="${COMPOSEDB_URLS}" \
    -e EXTRA_CERAMIC_URLS="${CERAMIC_URLS}" \
    "${IMAGE_NAME}":"$tag"
