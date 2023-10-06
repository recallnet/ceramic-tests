#!/bin/bash
# Check if the test suite is using latest deps.
# By adding this check in CI we can ensure that the tests are not getting to far behind.
# The test drive will update the deps regarless, however this keeps the code base itself closer to latest.

set -e

cd $(dirname $0)/../suite

./update.sh


# Check if anything changed, the README contains a generation date, ignore that file.
changes=$(git status --porcelain .)
echo $changes
if [[ -n "$changes" ]]
then
    echo "Found test suite 'pnpm update' changes:"
    echo "$changes"
    exit 1
fi

echo "Test suite deps are up-to-date"
exit 0
