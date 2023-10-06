#!/bin/sh

set -e

# Run update script
./update.sh

# Run tests
exec pnpm $@
