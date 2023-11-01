#!/bin/bash

id=$(uuidgen)
job_id=$(uuidgen)
now=$(date +%s%N)
ttl=$(date +%s -d "14 days")
tag=${BUILD_TAG-latest}
network=${1-dev}

curl -s https://raw.githubusercontent.com/3box/pipeline-tools/develop/ci/scripts/schedule_job.sh | bash -s -- \
  "$network"                                        \
  "{                                                \
    \"id\":     {\"S\": \"$id\"},                   \
    \"job\":    {\"S\": \"$job_id\"},               \
    \"ts\":     {\"N\": \"$now\"},                  \
    \"ttl\":    {\"N\": \"$ttl\"},                  \
    \"stage\":  {\"S\": \"queued\"},                \
    \"type\":   {\"S\": \"workflow\"},              \
    \"params\": {                                   \
      \"M\": {                                      \
        \"name\":     {\"S\": \"Durable Tests\"},   \
        \"org\":      {\"S\": \"3box\"},            \
        \"repo\":     {\"S\": \"ceramic-tests\"},   \
        \"ref\":      {\"S\": \"main\"},            \
        \"workflow\": {\"S\": \"run-durable.yml\"}, \
        \"inputs\":   {                             \
          \"M\": {                                  \
            \"build_tag\": {\"S\": \"$tag\"},       \
          }                                         \
        }                                           \
      }                                             \
    }                                               \
  }"
