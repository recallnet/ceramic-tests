import { AnchorStatus, StreamUtils } from '@ceramicnetwork/common'
import { StreamID } from '@ceramicnetwork/streamid'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'

import { newCeramic } from '../utils/ceramicHelpers.js'
import * as helpers from '../utils/dynamoDbHelpers.js'

const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

/**
 * Longevity test tests that streams that were created (and pinned) in the past continue to be
 * accessible days later, possibly even after a new version of Ceramic is released and deployed.
 */
describe('longevity', () => {
  // `step` is incremented once for each r/w node during the `update` test, so use
  // the length of the r/w URL array to test the content.
  const expectedContent = { step: ComposeDbUrls.length }
  let streamIds: Array<StreamID> = []

  beforeAll(async () => {
    const anchoredReqs = await helpers.fetchAnchoredStreamReqs()
    console.log(`Found ${anchoredReqs.length} already anchored streams in the database to load`)
    streamIds = anchoredReqs.map((req) => {
      return StreamID.fromString(<string>req.StreamId.S)
    })
  })

  afterAll(async () => await helpers.cleanup())

  for (const apiUrl of ComposeDbUrls) {
    test(`load streams on ${apiUrl}`, async () => {
      const ceramic = await newCeramic(apiUrl)
      for (const streamId of streamIds) {
        console.log(`Loading stream ${streamId} on ${apiUrl}`)
        const tile = await TileDocument.load(ceramic, streamId)
        try {
          expect(tile.content).toEqual(expectedContent)
          expect(tile.state.anchorStatus).toEqual(AnchorStatus.ANCHORED)

          // Now load the same stream but at a specific CommitID. Loading at a CommitID
          // means the Ceramic node can't get the state from the state store, but has
          // to actually load and apply the commits from IPFS, so it lets us check that the
          // underlying ipfs blocks are still available.
          const commitIds = tile.allCommitIds
          const prevCommitId = commitIds[commitIds.length - 2]
          console.log(
            `Loading commit ${prevCommitId} on ${apiUrl} for stream state:\n${JSON.stringify(
              StreamUtils.serializeState(tile.state),
              null,
              2,
            )}`,
          )
          const tileAtPrevCommitId = await TileDocument.load(ceramic, prevCommitId)

          // The last commit is an anchor commit, so the second to last commit will actually
          // have the same content as the current state with the most recent commit, it just
          // won't have the anchor information.
          expect(tileAtPrevCommitId.content).toEqual(expectedContent)
          expect(tileAtPrevCommitId.state.anchorStatus).not.toEqual(AnchorStatus.ANCHORED)
        } catch (err) {
          console.error(
            `Test failed. StreamID: ${tile.id.toString()}, state:\n${JSON.stringify(
              StreamUtils.serializeState(tile.state),
              null,
              2,
            )}`,
          )

          // If the test failed, we don't want to leave this stream in the database,
          // as it will cause all future test executions to fail as well.
          await helpers.deleteStreamReq(tile.id)

          throw err
        }
      }
    })
  }
})
