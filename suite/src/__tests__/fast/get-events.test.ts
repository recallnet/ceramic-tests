import { describe, expect, test } from '@jest/globals'
import fetch from 'cross-fetch'
import { generateRandomEventId, generateRandomEvent } from '../../utils/rustCeramicHelpers'
import { StreamID, randomCID } from '@ceramicnetwork/streamid'

const CeramicUrls = String(process.env.CERAMIC_URLS).split(',')


async function getEventData(url: string, eventId: string, log = false) {
  let response = await fetch(url + `/ceramic/events/${eventId}`)
  if (log) {
    console.log(response)
  }
  return response
}

async function postEvent(url: string, event: any) {
  let response = await fetch(url + '/ceramic/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

describe('rust-ceramic e2e test', () => {
  const ceramicUrl = CeramicUrls[0]
  test('post and get event data, success', async () => {
    const modelId = new StreamID('model', randomCID())
    const eventId = generateRandomEventId(modelId)
    const event = generateRandomEvent(eventId)
    // publishing the event to rust-ceramic
    await postEvent(ceramicUrl, event)
    // fetching the event from its event-id from rust-ceramic
    const getResponse = await getEventData(ceramicUrl, eventId)
    expect(getResponse.status).toEqual(200)
    expect(await getResponse.json()).toEqual({
      id: eventId,
      data: event.data,
    })
  })

  test('get event data for non-existing event', async () => {
    const modelId = new StreamID('model', randomCID())
    const eventId = generateRandomEventId(modelId)
    // fetching the event from its event-id from rust-ceramic
    const getResponse = await getEventData(ceramicUrl, eventId)
    const responseText = await getResponse.text()
    expect(getResponse.status).toEqual(404)
    expect(responseText).toContain('Event not found')
    expect(responseText).toContain(eventId)
  })
})
