import { StreamReaderWriter, StreamUtils } from '@ceramicnetwork/common'
import { TileDocument } from '@ceramicnetwork/stream-tile'
import { jest, describe, test, beforeAll, expect } from '@jest/globals'
import { newCeramic, waitForAnchor, waitForCondition } from '../../utils/ceramicHelpers.js'

const UPDATE_TIMEOUT = 60 // 60 seconds for regular updates to propagate from one node to another
const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

const createWithOneLoadWithTheOther = async (
  ceramic1: StreamReaderWriter,
  ceramic2: StreamReaderWriter,
): Promise<void> => {
  const content = { foo: 'bar' }
  const doc1 = await TileDocument.create(ceramic1, content)
  const doc2 = await TileDocument.load(ceramic2, doc1.id)
  expect(doc1.content).toEqual(content)
  expect(doc2.content).toEqual(doc1.content)
}

const updatesAreShared = async (
  ceramic1: StreamReaderWriter,
  ceramic2: StreamReaderWriter,
  anchor: boolean,
): Promise<void> => {
  const content0 = { foo: 0 }
  const content1 = { foo: 1 }
  const content2 = { foo: 2 }

  // Create initial doc
  console.log('Creating document on node 1')
  const doc1 = await TileDocument.create(ceramic1, content0, undefined, { anchor })
  if (anchor) {
    await waitForAnchor(doc1).catch((errStr) => {
      throw new Error(errStr)
    })
  }

  // Perform an update
  console.log('Updating document on node 1')
  await doc1.update(content1, undefined, { anchor })
  if (anchor) {
    await waitForAnchor(doc1).catch((errStr) => {
      throw new Error(errStr)
    })
  }
  expect(doc1.content).toEqual(content1)

  // Load doc from other node, make sure it sees the update
  console.log('Loading document on node 2')
  const doc2 = await ceramic2.loadStream<TileDocument>(doc1.id)
  await waitForCondition(
    doc2,
    function (state) {
      return state.next?.content.foo == content1.foo || state.content.foo == content1.foo
    },
    UPDATE_TIMEOUT,
  ).catch((errStr) => {
    throw new Error(errStr)
  })
  if (anchor) {
    await waitForAnchor(doc2).catch((errStr) => {
      throw new Error(errStr)
    })
  }
  expect(StreamUtils.serializeState(doc2.state)).toEqual(StreamUtils.serializeState(doc1.state))

  // Now do an update from the second node, and make sure the first gets it
  console.log('Updating document on node 2')
  await doc2.update(content2, undefined, { anchor })

  console.log('Waiting for node 1 to learn of update from node 2')
  await waitForCondition(
    doc1,
    function (state) {
      return state.next?.content.foo == content2.foo || state.content.foo == content2.foo
    },
    UPDATE_TIMEOUT,
  )

  expect(doc2.content).toEqual(content2)
  expect(doc1.content).toEqual(content2)

  if (anchor) {
    await waitForAnchor(doc1).catch((errStr) => {
      throw new Error(errStr)
    })
    await waitForAnchor(doc2).catch((errStr) => {
      throw new Error(errStr)
    })
  }

  expect(doc2.content).toEqual(content2)
  expect(doc1.content).toEqual(content2)
  expect(StreamUtils.serializeState(doc1.state)).toEqual(StreamUtils.serializeState(doc2.state))
}

describe.skip('Ceramic<->Ceramic multi-node integration', () => {
  jest.setTimeout(1000 * 60 * 60) // 1 hour
  let ceramic1: StreamReaderWriter
  let ceramic2: StreamReaderWriter

  beforeAll(async () => {
    ceramic1 = await newCeramic(ComposeDbUrls[0])
    ceramic2 = await newCeramic(ComposeDbUrls[1])
  })

  test('create with one, load with the other', async () => {
    console.info("Running test 'create with one, load with the other'")
    await createWithOneLoadWithTheOther(ceramic1, ceramic2)
  })

  test('create with one, load with the other - ceramics swapped', async () => {
    console.info("Re-running test 'create with one, load with the other' with ceramics swapped")
    await createWithOneLoadWithTheOther(ceramic2, ceramic1)
  })

  test('updates are shared without anchoring', async () => {
    console.info("Running test 'updates are shared without anchoring'")
    await updatesAreShared(ceramic1, ceramic2, false)
  })

  test('updates are shared without anchoring - ceramics swapped', async () => {
    console.info("Re-running test 'updates are shared without anchoring' with ceramics swapped")
    await updatesAreShared(ceramic2, ceramic1, false)
  })

  test('updates are shared with anchoring', async () => {
    console.log("Running test 'updates are shared with anchoring'")
    await updatesAreShared(ceramic1, ceramic2, true)
  })

  test('updates are shared with anchoring - ceramics swapped', async () => {
    console.log("Re-running test 'updates are shared with anchoring' with ceramics swapped")
    await updatesAreShared(ceramic2, ceramic1, true)
  })
})
