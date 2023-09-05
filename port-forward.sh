#!/bin/bash
# Setup port-forward to each pod in the Keramik network
# prints env vars for use in the tests using the port-forwarded values.

# Enable job control within the script
set -m

pids=$(jobs -p)
if [ -n "$pids" ]
then
    kill $pids
    wait $pids
fi

composedb=7007
ceramic=5001
offset=1
step=1

COMPOSEDB_URLS=''
CERAMIC_URLS=''

for pod in $(kubectl get pods -l app=ceramic -o json | jq -r '.items[].metadata.name')
do
    composedb_local=$((composedb + $offset))
    ceramic_local=$((ceramic + $offset))

    if [ $offset != 1 ]
    then
        COMPOSEDB_URLS="$COMPOSEDB_URLS,"
        CERAMIC_URLS="$CERAMIC_URLS,"
    fi


    COMPOSEDB_URLS="${COMPOSEDB_URLS}http://localhost:$composedb_local"
    CERAMIC_URLS="${CERAMIC_URLS}http://localhost:$ceramic_local"

    kubectl port-forward $pod $composedb_local:$composedb $ceramic_local:$ceramic >/dev/null  &

    offset=$((offset + $step))
done

export COMPOSEDB_URLS=$COMPOSEDB_URLS
export CERAMIC_URLS=$CERAMIC_URLS
