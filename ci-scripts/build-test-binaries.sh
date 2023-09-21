#!/bin/bash

# Exit if any command in any pipe fails.
# This is needed to catch compilation errors.
set -e
set -o pipefail

BUILD_PROFILE=${1-dev}
if [ -z $BUILD_PROFILE ]
then
    echo "Must pass build profile arg"
    exit 1
fi
rm -rf test-binaries/
mkdir test-binaries

temp=$(mktemp)
RUSTFLAGS='-D warnings' cargo test -p ceramic-tests-property \
    --no-run \
    --locked \
    --profile $BUILD_PROFILE \
    -q \
    --message-format=json > $temp

# Copy only binaries built for integration tests
for b in  $(cat $temp | jq -r 'select(.target.kind != null) |
        select(.target.kind | contains(["test"])) |
        select( .executable != null) |
            .executable')
do
    echo $b
    cp $b test-binaries/
done

rm $temp
