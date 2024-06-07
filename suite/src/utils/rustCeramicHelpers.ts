import { StreamID } from '@ceramicnetwork/streamid'
import { CARFactory } from 'cartonne'
import * as dagJson from '@ipld/dag-json'
import * as dagCbor from '@ipld/dag-cbor'
import { sha256 } from 'multihashes-sync/sha2'
import { GenesisHeader, GenesisCommit } from '@ceramicnetwork/common'
import { randomBytes } from 'crypto'

export interface ReconEventInput {
  /// The car file multibase encoded
  data: string
}

export interface ReconEvent {
  id: string // event CID
  data: string // car file
}

export function generateRandomEvent(modelId: StreamID, controller: string): ReconEvent {
  const carFactory = new CARFactory()
  carFactory.codecs.add(dagJson)
  carFactory.hashers.add(sha256)
  const car = carFactory.build().asV1()
  const header: GenesisHeader = {
    controllers: [controller],
    model: modelId.bytes,
    sep: 'model', // See CIP-120 for more details on this field
    // make the events different so they don't get deduped. is this spec compliant?
    unique: randomBytes(12),
  }
  const commit: GenesisCommit = {
    header,
    data: null, // deterministic commit has no data and requires no signature
  }
  dagCbor.encode(commit)
  car.put(commit, { isRoot: true })
  const cid = car.roots[0]
  return {
    data: car.toString('base64'),
    id: cid.toString(),
  }
}

export function randomEvents(modelID: StreamID, count: number): ReconEvent[] {
  let modelEvents = []

  for (let i = 0; i < count; i++) {
    const event = generateRandomEvent(modelID, 'did:key:faketestcontroller')
    modelEvents.push(event)
  }
  return modelEvents
}
