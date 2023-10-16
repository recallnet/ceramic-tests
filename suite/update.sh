#!/bin/sh

set -e

cd $(dirname $0)

deps=$(jq -r '.dependencies | keys | .[]' package.json)
filtered_deps=''
for dep in $deps
do
    # Look for specific deps we manage
    case $dep in
        "dids" | "key-did-provider-ed25519" | "key-did-resolver")
            filtered_deps="$filtered_deps $dep@latest"
            continue
            ;;
        *)
            # Ignore other deps
            ;;
    esac
    scope=$(dirname $dep)
    case $scope in
        "@ceramicnetwork"|"@composedb")
            filtered_deps="$filtered_deps $dep@latest"
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
