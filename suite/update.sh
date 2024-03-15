#!/bin/bash

set -e

cd $(dirname $0)

# Update to specific label (we only publish nightly for ceramic packages)
target=latest
target_dids=latest


deps=$(jq -r '.dependencies | keys | .[]' package.json)
filtered_deps=''
for dep in $deps
do
    # Look for specific deps we manage
    case $dep in
        "dids" | "key-did-provider-ed25519" | "key-did-resolver" | "@composedb")
            filtered_deps="$filtered_deps $dep@$target_dids"
            continue
            ;;
        *)
            # Ignore other deps
            ;;
    esac
    scope=$(dirname $dep)
    case $scope in
        "@ceramicnetwork")
            filtered_deps="$filtered_deps $dep@$target"
            ;;
        *)
            # Ignore other deps
            ;;
    esac
done

# We only care about top level dependencies.
cmd="pnpm update --depth 0 $filtered_deps"
echo $cmd
$cmd

echo "Updated versions of dependencies:"
jq -r '.dependencies' package.json
