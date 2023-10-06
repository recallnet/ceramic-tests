#!/bin/bash

available_peers() {
  jq -r '. | length' < /peers/peers.json
}

# Wait for 5 minutes, or till the peers are available.
n=0
until [ "$n" -ge 30 ];
  do
    if [ "$(available_peers)" == "0" ]; then
      sleep 10
      n=$((n+1))
    else
      mkdir /config/env

      CERAMIC_URLS=$(jq -j '[.[].ceramic.ipfsRpcAddr | select(.)] | join(",")' < /peers/peers.json)
      COMPOSEDB_URLS=$(jq -j '[.[].ceramic.ceramicAddr | select(.)] | join(",")' < /peers/peers.json)

      echo "CERAMIC_URLS=$CERAMIC_URLS" > /config/.env
      echo "COMPOSEDB_URLS=$COMPOSEDB_URLS" >> /config/.env

      echo "Populated env"
      cat /config/.env

      exit 0
    fi
done

exit 1
