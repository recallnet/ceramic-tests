#!/bin/bash

# Proxy to the k8s API
kubectl proxy --port=8080 >/dev/null 2>/dev/null &
sleep 3

status() {
  curl -s "http://localhost:8080/apis/keramik.3box.io/v1alpha1/networks/${NAMESPACE/#keramik-}/status"
}

check_status() {
  status | jq -r 'if (.status != "Failure") and (.status.readyReplicas == .status.replicas) then true else false end'
}

check_network() {
  # Wait for 10 minutes, or till the network is ready.
  n=0
  until [ "$n" -ge 60 ];
    do
      if [ "$(check_status)" == "true" ]; then
        echo Network ready
        exit 0
      else
        sleep 10
        n=$((n+1))
      fi
  done

  echo Network failed to start
  exit 1
}

check_network
