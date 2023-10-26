import { CeramicApi, SyncOptions } from '@ceramicnetwork/common'
import CeramicClient from '@ceramicnetwork/http-client'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { afterAll, describe, expect, test } from '@jest/globals'

import * as helpers from '../utils/dynamoDbHelpers.js'
import { utilities } from '../utils/common.js'
import { newCeramic, metadata } from '../utils/ceramicHelpers.js'

const delay = utilities.delay

// Environment variables
const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

///////////////////////////////////////////////////////////////////////////////
/// Create/Update Tests
///////////////////////////////////////////////////////////////////////////////

describe('update', () => {
  afterAll(async () => await helpers.cleanup())

  const firstRwUrl = ComposeDbUrls[0]
  const content = { step: 0 }
  let firstCeramic: CeramicClient.CeramicClient
  let firstTile: TileDocument

  // Create and update on first node
  test(`create stream on ${firstRwUrl}`, async () => {
    firstCeramic = await newCeramic(firstRwUrl)
    firstTile = await TileDocument.create(firstCeramic as CeramicApi, content, metadata, {
      anchor: false,
    })
    console.log(
      `Created stream on ${firstRwUrl}: ${firstTile.id.toString()} with step ${content.step}`,
    )
  })

  test(`update stream on ${firstRwUrl}`, async () => {
    content.step++
    await firstTile.update(content, undefined, { anchor: false })
    console.log(
      `Updated stream on ${firstRwUrl}: ${firstTile.id.toString()} with step ${content.step}`,
    )
  })

  // Test load, update, and sync on subsequent node(s)
  // Skip first url because it was already handled in the previous tests
  for (let idx = 1; idx < ComposeDbUrls.length; idx++) {
    const apiUrl = ComposeDbUrls[idx]
    let tile: TileDocument
    test(`load stream on ${apiUrl}`, async () => {
      await delay(5)
      const ceramic = await newCeramic(apiUrl)
      console.log(
        `Loading stream ${firstTile.id.toString()} on ${apiUrl} with step ${content.step}`,
      )
      tile = await TileDocument.load(ceramic, firstTile.id)
      expect(tile.content).toEqual(content)
      console.log(
        `Loaded stream on ${apiUrl}: ${firstTile.id.toString()} successfully with step ${
          content.step
        }`,
      )
    })
    test(`sync stream on ${apiUrl}`, async () => {
      const isFinalWriter = idx == ComposeDbUrls.length - 1
      // Update the content as we iterate through the list of node URLs so that each step includes some change
      // from the previous step.
      content.step++
      // Update on first node and wait for update to propagate to other nodes via pubsub
      // Only anchor on the final write to avoid writes conflicting with anchors.
      console.log(
        `Updating stream ${firstTile.id.toString()} on ${firstRwUrl} so we can sync it on ${apiUrl} with step ${
          content.step
        }`,
      )
      await firstTile.update(content, undefined, { anchor: isFinalWriter })
      console.log(`Updating complete, sleeping 5 seconds before syncing`)
      await delay(5)
      console.log(`Sleep complete, syncing`)
      await tile.sync({ sync: SyncOptions.NEVER_SYNC })
      expect(tile.content).toEqual(firstTile.content)
      console.log(
        `Synced stream on ${apiUrl}: ${firstTile.id.toString()} successfully with step ${
          content.step
        }`,
      )

      if (isFinalWriter) {
        // Store the anchor request in the DB
        await helpers.storeStreamReq(firstTile.id)
      }
    })
  }
})
