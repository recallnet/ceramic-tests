// To use install:
//  pnpm install  graphology
//  pnpm install  graphology-svg
//  pnpm install  graphology-layout
//  pnpm install  axios

import Graph from 'graphology';
import { circular } from 'graphology-layout';
import render from 'graphology-svg';
import axios from 'axios';


const addrs = process.env.CERAMIC_URLS.split(',');

const graph = new Graph();

let addrsToID = {};

async function get_peer_id(addr) {
  let resp = await axios.post(addr + '/api/v0/id');
  return resp.data.ID;
}
async function get_peers(addr) {
  let resp = await axios.post(addr + '/api/v0/swarm/peers');
  return resp.data.Peers;
}

function short_id(id) {
  return id.substr(id.length - 5, id.length);
}

for (let i in addrs) {
  const addr = addrs[i];
  const id = await get_peer_id(addr);
  addrsToID[addr] = id;
  const short = short_id(id);
  graph.addNode(id, { 'label': short + ' - ' + addr });
}

for (let i in addrs) {
  const addr = addrs[i];
  const peers = await get_peers(addr);
  const id = addrsToID[addr];
  for (let p in peers) {
    const peer = peers[p];
    try {
      graph.addEdge(id, peer.Peer);
    } catch {
      try {
        graph.addNode(peer.Peer, { 'label': short_id(peer.Peer) + ' - CAS' });
        graph.addEdge(id, peer.Peer);
      } catch { }
    }

  }
}


circular.assign(graph, { scale: 50 });
render(graph, './topology.svg', { width: 2648, height: 2048, margin: 100 }, () => console.log("done"));
