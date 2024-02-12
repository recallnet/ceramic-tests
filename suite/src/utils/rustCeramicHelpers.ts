import { randomCID, EventID, StreamID } from '@ceramicnetwork/streamid'
import fetch from 'cross-fetch'
import { base16 } from 'multiformats/bases/base16'
import { base64 } from 'multiformats/bases/base64'
import { CARFactory } from 'cartonne'
import * as random from '@stablelib/random'
import * as dagJson from "@ipld/dag-json";
import { sha256 } from "multihashes-sync/sha2";

// Environment variables
const Network = String(process.env.NETWORK || 'dev-unstable')

export interface ReconEvent {
  id: string
  data: string
}

export function generateRandomEventId(): string {
  const modelID = new StreamID('model', randomCID())
  return generateEventId(modelID)
}

export function generateEventId(modelId: StreamID, network = Network, networkOffset = 0): string {
  const eventId = base16.encode(EventID.createRandom(
    network,
    networkOffset,
    {
      separatorKey: 'model',
      separatorValue: modelId.toString(),
    }
  ).bytes)

  return eventId
}

export function generateRandomEvent(eventId: string): ReconEvent {
  const carFactory = new CARFactory()
  const car = carFactory.build().asV1()
  car.put({ data: base64.encode(random.randomBytes(512)) }, { isRoot: true })
  return {
    id: eventId,
    data: car.toString('base64'),
  }
}

export function randomEvents(modelID: StreamID, count: number, network = Network, networkOffset = 0) {
  let modelEvents = []
  const carFactory = new CARFactory()
  carFactory.codecs.add(dagJson)
  carFactory.hashers.add(sha256)

  for (let i = 0; i < count; i++) {
    const eventId = generateEventId(modelID, network, networkOffset)
    const event = generateRandomEvent(eventId)
    modelEvents.push(event)
  }
  return modelEvents
}

export async function getEventData(url: string, eventId: string, log = false) {
  let response = await fetch(url + `/ceramic/events/${eventId}`)
  if (log) {
    console.log(response)
  }
  return response
}