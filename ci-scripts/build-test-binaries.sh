#!/bin/bash

# Exit if any command in any pipe fails.
# This is needed to catch compilation errors.
set -e
set -o pipefail

BUILD_MODE=${1-dev}
if [ -z $BUILD_MODE ]
then
    echo "Must pass build mode arg"
    exit 1
fi
rm -rf test-binaries/
mkdir test-binaries

for b in $(RUSTFLAGS='-D warnings' cargo test \
    --no-run \
    --locked \
    --profile $BUILD_MODE \
    -q \
    --message-format=json \
    | jq -r 'select(.executable != null) | .executable')
do
    echo $b
    cp $b test-binaries/
done
