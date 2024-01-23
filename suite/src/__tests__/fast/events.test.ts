import { describe, expect, test } from '@jest/globals'
import { utilities } from '../../utils/common.js'
import fetch from 'cross-fetch'
import * as random from '@stablelib/random'
import { base64 } from 'multiformats/bases/base64'
import { base16 } from 'multiformats/bases/base16'
import { randomCID, StreamID, EventID } from '@ceramicnetwork/streamid'

const delay = utilities.delay

// Environment variables
const CeramicUrls = String(process.env.CERAMIC_URLS).split(',')
const Network = String(process.env.NETWORK)

function randomEvents(modelID: StreamID, count: number, network = Network, networkOffset = 0) {
  let modelEvents = [];
  for (let i = 0; i < count; i++) {
    modelEvents.push({
      "eventId": base16.encode(EventID.createRandom(
        network,
        networkOffset,
        {
          separatorKey: 'model',
          separatorValue: modelID.toString(),
        }
      ).bytes),
      "eventData": base64.encode(random.randomBytes(1024)),
    })
  }
  return modelEvents
}

async function subscribe(url: string, model: StreamID) {
  let response = await fetch(url + `/ceramic/subscribe/model/${model.toString()}?limit=1`)
  await response.text()
}

async function writeEvents(url: string, events: any[]) {
  for (let i in events) {
    let event = events[i]
    let response = await fetch(url + '/ceramic/events', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    await response.text()
  }
}
async function readEvents(url: string, model: StreamID) {
  let fullUrl = url + `/ceramic/subscribe/model/${model.toString()}`
  let response = await fetch(fullUrl)
  return await response.json()
}

function sortModelEvents(events: any[]) {
  return JSON.parse(JSON.stringify(events)).sort((a: any, b: any) => {
    if (a.eventId > b.eventId) return 1;
    if (a.eventId < b.eventId) return -1;
    return 0;
  })
}

// Wait up till retries seconds for all urls to have count events
async function waitForEventCount(urls: string[], model: StreamID, count: number, retries: number) {
  for (let r = 0; r < retries; r++) {
    let all_good = true;
    for (let u in urls) {
      let url = urls[u];
      let events = await readEvents(url, model)
      if (events.length != count) {
        all_good = false;
        break;
      }
    }
    if (all_good) {
      return
    }
    await delay(1)
  }
}

describe('events', () => {
  const firstNodeUrl = CeramicUrls[0]
  const secondNodeUrl = CeramicUrls[1]

  test(`linear sync on ${firstNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 10);

    // Write all data to one node before subscribing on the other nodes.
    // This way the other nodes to a linear download of the data from the first node.
    await subscribe(firstNodeUrl, modelID)
    await writeEvents(firstNodeUrl, modelEvents)

    // Now subscribe on the other nodes
    for (let idx = 1; idx < CeramicUrls.length; idx++) {
      let url = CeramicUrls[idx]
      await subscribe(url, modelID)
    }

    await waitForEventCount(CeramicUrls, modelID, modelEvents.length, 10)

    // Use a sorted expected value for stable tests
    const sortedModelEvents = sortModelEvents(modelEvents)
    // Validate each node got the events, including the first node
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      let events = await readEvents(url, modelID)

      expect(events).toEqual(sortedModelEvents)
    }
  })

  test(`active write sync on ${firstNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 10);
    // Subscribe on all nodes then write the data
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      await subscribe(url, modelID)
    }
    await writeEvents(firstNodeUrl, modelEvents)

    await waitForEventCount(CeramicUrls, modelID, modelEvents.length, 10)

    // Use a sorted expected value for stable tests
    const sortedModelEvents = sortModelEvents(modelEvents)
    // Validate each node got the events, including the first node
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      let events = await readEvents(url, modelID)

      expect(events).toEqual(sortedModelEvents)
    }
  })
  test(`half and half sync on ${firstNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 20);
    // Write half the data before other nodes subscribe
    await subscribe(firstNodeUrl, modelID)
    let half = Math.ceil(modelEvents.length / 2);
    let firstHalf = modelEvents.slice(0, half)
    let secondHalf = modelEvents.slice(half, modelEvents.length)
    await writeEvents(firstNodeUrl, firstHalf)

    // Now subscribe on the other nodes
    for (let idx = 1; idx < CeramicUrls.length; idx++) {
      let url = CeramicUrls[idx]
      await subscribe(url, modelID)
    }
    // Write the second half of the data
    await writeEvents(firstNodeUrl, secondHalf)

    await waitForEventCount(CeramicUrls, modelID, modelEvents.length, 10)

    // Use a sorted expected value for stable tests
    const sortedModelEvents = sortModelEvents(modelEvents)
    // Validate each node got the events, including the first node
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      let events = await readEvents(url, modelID)

      expect(events).toEqual(sortedModelEvents)
    }
  })
  test(`active write sync on two nodes ${firstNodeUrl} ${secondNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 20);
    let half = Math.ceil(modelEvents.length / 2);
    let firstHalf = modelEvents.slice(0, half)
    let secondHalf = modelEvents.slice(half, modelEvents.length)

    // Subscribe on all nodes then write the data
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      await subscribe(url, modelID)
    }

    // Write to both node simultaneously
    await Promise.all([writeEvents(firstNodeUrl, firstHalf), writeEvents(secondNodeUrl, secondHalf)])

    await waitForEventCount(CeramicUrls, modelID, modelEvents.length, 10)

    // Use a sorted expected value for stable tests
    const sortedModelEvents = sortModelEvents(modelEvents)
    // Validate each node got the events, including the first node
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      let events = await readEvents(url, modelID)

      expect(events).toEqual(sortedModelEvents)
    }
  })
  test(`active write for many models sync`, async () => {
    let modelCount = 10
    let models = []
    for (let m = 0; m < modelCount; m++) {
      let modelID = new StreamID('model', randomCID())
      // Generate random events for each model for each node
      let events = []
      for (let _ in CeramicUrls) {
        events.push(randomEvents(modelID, 2))
      }
      models.push({
        'id': modelID,
        'events': events,
      })
    }

    // Subscribe on all nodes to all models then write the data
    for (let m in models) {
      let model = models[m]
      for (let idx in CeramicUrls) {
        let url = CeramicUrls[idx]
        await subscribe(url, model.id)
      }
    }

    // Write to all nodes for all models simultaneously
    let writes = []
    for (let m in models) {
      let model = models[m]
      for (let idx in CeramicUrls) {
        let url = CeramicUrls[idx]
        writes.push(writeEvents(url, model.events[idx]))
      }
    }
    await Promise.all(writes)


    for (let m in models) {
      let model = models[m]
      let events = model.events.flat();


      await waitForEventCount(CeramicUrls, model.id, events.length, 20)

      // Use a sorted expected value for stable tests
      const sortedModelEvents = sortModelEvents(events)
      // Validate each node got the events, including the first node
      for (let idx in CeramicUrls) {
        let url = CeramicUrls[idx]
        let events = await readEvents(url, model.id)

        expect(events).toEqual(sortedModelEvents)
      }
    }
  })
})
