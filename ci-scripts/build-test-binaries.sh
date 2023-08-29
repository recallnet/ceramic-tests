#!/bin/bash

BUILD_MODE=$1
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
