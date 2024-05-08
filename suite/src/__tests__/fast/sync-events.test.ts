import { beforeAll, describe, expect, test } from '@jest/globals'
import { utilities } from '../../utils/common.js'
import fetch from 'cross-fetch'
import { randomCID, StreamID } from '@ceramicnetwork/streamid'
import { ReconEvent, ReconEventInput, randomEvents } from '../../utils/rustCeramicHelpers.js'

const delay = utilities.delay
// Environment variables
const CeramicUrls = String(process.env.CERAMIC_URLS).split(',')
async function registerInterest(url: string, model: StreamID) {
  let response = await fetch(url + `/ceramic/interests/model/${model.toString()}`, { method: 'POST' })
  if (response.status !== 204) {
    const data = await response.text()
    console.warn(`registerInterest: ${data}`)
  }
  expect(response.status).toEqual(204)
}

async function writeEvents(url: string, events: ReconEventInput[]) {
  for (const event of events) {
    let response = await fetch(url + '/ceramic/events', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    if (response.status !== 204) {
      const data = await response.text()
      console.warn(`writeEvents: ${data}`)
    }
    expect(response.status).toEqual(204)
  }
}

async function readEvents(url: string, model: StreamID) {
  const events = []
  let complete = false;
  let offset = 0;
  var startTime = Date.now();
  while (!complete) {
    const fullUrl = url + `/ceramic/experimental/events/model/${model.toString()}?offset=${offset}`
    const response = await fetch(fullUrl)
    expect(response.status).toEqual(200)
    const data = await response.json();
    events.push(...data.events)
    offset = data.resumeOffset
    complete = data.isComplete
    if (!complete && (Date.now() - startTime) > 60000) {
      // if it took more than a minute, quit
      console.warn(`readEvents: timeout after 60 seconds`)
      complete = true
    }
  }
  return sortModelEvents(events) // sort so that tests are stable
}

function sortModelEvents(events: ReconEvent[]): ReconEvent[] {
  if (events && events.length > 0) {
    return JSON.parse(JSON.stringify(events)).sort((a: any, b: any) => {
      if (a.id > b.id) return 1;
      if (a.id < b.id) return -1;
      return 0;
    })
  } else {
    return []
  }
}

// Wait up till retries seconds for all urls to have at least count events
async function waitForEventCount(urls: string[], model: StreamID, count: number, retries: number) {
  for (let r = 0; r < retries; r++) {
    let all_good = true;
    for (let u in urls) {
      let url = urls[u];
      let events = await readEvents(url, model)
      if (events.length < count) {
        all_good = false;
        break;
      }
    }
    if (all_good) {
      return
    }
    await delay(1)
  }
  throw new Error(`waitForEventCount: timeout after ${retries} retries`)
}

describe('sync events', () => {
  const firstNodeUrl = CeramicUrls[0]
  const secondNodeUrl = CeramicUrls[1]

  beforeAll(() => {
    if (!firstNodeUrl || !secondNodeUrl) {
      throw new Error('CERAMIC_URLS environment variable must be set')
    }
  })

  test(`linear sync on ${firstNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 10);

    // Write all data to one node before subscribing on the other nodes.
    // This way the other nodes to a linear download of the data from the first node.
    await registerInterest(firstNodeUrl, modelID)
    await writeEvents(firstNodeUrl, modelEvents)

    // Now subscribe on the other nodes
    for (let idx = 1; idx < CeramicUrls.length; idx++) {
      let url = CeramicUrls[idx]
      await registerInterest(url, modelID)
    }
    const sortedModelEvents = sortModelEvents(modelEvents)
    await waitForEventCount(CeramicUrls, modelID, modelEvents.length, 10)

    // Use a sorted expected value for stable tests
    // Validate each node got the events, including the first node
    for (const url of CeramicUrls) {
      const events = await readEvents(url, modelID)

      expect(events).toEqual(sortedModelEvents)
    }
  })

  test(`active write sync on ${firstNodeUrl}`, async () => {
    const modelID = new StreamID('model', randomCID())
    let modelEvents = randomEvents(modelID, 10);
    // Subscribe on all nodes then write the data
    for (let idx in CeramicUrls) {
      let url = CeramicUrls[idx]
      await registerInterest(url, modelID)
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
    await registerInterest(firstNodeUrl, modelID)
    let half = Math.ceil(modelEvents.length / 2);
    let firstHalf = modelEvents.slice(0, half)
    let secondHalf = modelEvents.slice(half, modelEvents.length)
    await writeEvents(firstNodeUrl, firstHalf)

    // Now subscribe on the other nodes
    for (let idx = 1; idx < CeramicUrls.length; idx++) {
      let url = CeramicUrls[idx]
      await registerInterest(url, modelID)
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
      await registerInterest(url, modelID)
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
        await registerInterest(url, model.id)
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
