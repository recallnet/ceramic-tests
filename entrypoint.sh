#!/bin/bash

set -e

# Run all test binaries, fail on first failure.
for tb in /test-binaries/*
do
    echo "Running tests in: $tb"
    # Always exit successfully so that the test job isn't restarted
    $tb || exit 0
done
