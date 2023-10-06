#!/bin/sh

cd $(dirname $0)

update_dep() {
    cmd="pnpm update ${1}@latest"
    echo $cmd
    $cmd
}

deps=$(jq -r '.dependencies | keys | .[]' package.json)
for dep in $deps
do
    scope=$(dirname $dep)
    case $scope in
        "@ceramicnetwork"|"@composedb")
            update_dep $dep
            ;;
        *)
            # Ignore other deps
            ;;
    esac
done

echo "Updated versions of dependencies:"
jq -r '.dependencies' package.json
