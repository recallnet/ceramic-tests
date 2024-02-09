import { randomCID, EventID, StreamID } from '@ceramicnetwork/streamid'
import { base16 } from 'multiformats/bases/base16'
import { CARFactory } from 'cartonne'
import { base64 } from 'multiformats/bases/base64'
import * as random from '@stablelib/random'

export function generateRandomEventId(): string {
  const modelID = new StreamID('model', randomCID())
  const eventId = base16.encode(
    EventID.createRandom('dev-unstable', 0, {
      separatorKey: 'model',
      separatorValue: modelID.toString(),
    }).bytes,
  )
  return eventId
}

export function generateRandomEvent(eventId: string): any {
  const carFactory = new CARFactory()
  const car = carFactory.build().asV1()
  car.put({ data: base64.encode(random.randomBytes(512)) }, { isRoot: true })
  return {
    id: eventId,
    data: car.toString('base64'),
  }
}
