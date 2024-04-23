import { describe, test, beforeAll } from '@jest/globals'
import { newCeramic } from '../../utils/ceramicHelpers.js'
import { createDid } from '../../utils/didHelper.js'
import { EventAccumulator } from '../../utils/common.js'
import { StreamID } from '@ceramicnetwork/streamid'
import { Model } from '@ceramicnetwork/stream-model'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import { newModel } from '../../models/modelConstants'
import { CeramicClient } from '@ceramicnetwork/http-client'
import { CommonTestUtils as TestUtils } from '@ceramicnetwork/common-test-utils'
import { EventSource } from 'cross-eventsource'
import { JsonAsString, AggregationDocument } from '@ceramicnetwork/codecs'
import { decode } from 'codeco'

const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')
const adminSeeds = String(process.env.COMPOSEDB_ADMIN_DID_SEEDS).split(',')

describe('Datafeed SSE Api Test', () => {
  let ceramicNode1: CeramicClient
  let ceramicNode2: CeramicClient
  let modelId: StreamID
  beforeAll(async () => {
    const did1 = await createDid(adminSeeds[0])
    if (!adminSeeds[1])
      throw new Error(
        'adminSeeds expects minimum 2 dids one for each url, adminSeeds[1] is not set',
      )//TODO refactor all of this, maybe i dont need a second node
    const did2 = await createDid(adminSeeds[1])
    ceramicNode1 = await newCeramic(ComposeDbUrls[0], did1)
    ceramicNode2 = await newCeramic(ComposeDbUrls[1], did2)
    const model = await Model.create(ceramicNode1, newModel)
    await TestUtils.waitForConditionOrTimeout(async () =>
      ceramicNode2
        .loadStream(model.id)
        .then((_) => true)
        .catch((_) => false),
    )
    await ceramicNode1.admin.startIndexingModels([model.id])
    await ceramicNode2.admin.startIndexingModels([model.id])
    modelId = model.id
  })

  test('genesis and data commits are delivered', async () => {
    const modelInstanceDocumentMetadata = { model: modelId }
    const Codec = JsonAsString.pipe(AggregationDocument)

    const source1 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[0]).toString(),
    )
    const source2 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[1]).toString(),
    )

    const parseEventData = (eventData: any) => {
      const decoded = decode(Codec, eventData)
      return decoded.commitId.commit.toString()
    }

    const accumulator1 = new EventAccumulator(source1, parseEventData)
    const accumulator2 = new EventAccumulator(source2, parseEventData)

    try {
      const expectedEvents = new Set()
      const document1 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 40 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document1.tip.toString())

      const document2 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 50 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document2.tip.toString())

      const document3 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 60 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document3.tip.toString())

      await document1.replace({ myData: 41 })
      expectedEvents.add(document1.tip.toString())
      await document2.replace({ myData: 51 })
      expectedEvents.add(document2.tip.toString())
      await document1.replace({ myData: 42 })
      expectedEvents.add(document1.tip.toString())
      await accumulator1.waitForEvents(expectedEvents, 1000 * 60)
      await accumulator2.waitForEvents(expectedEvents, 1000 * 60)
    } finally {
      source1.close()
      source2.close()
    }
  })

  test('anchor commits are delivered', async () => {
    const modelInstanceDocumentMetadata = { model: modelId }
    const Codec = JsonAsString.pipe(AggregationDocument)

    const source1 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[0]).toString(),
    )
    const source2 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[1]).toString(),
    )

    const parseEventData = (eventData: any) => {
      const decoded = decode(Codec, eventData)
      return decoded.commitId.commit.toString()
    }

    const accumulator1 = new EventAccumulator(source1, parseEventData)
    const accumulator2 = new EventAccumulator(source2, parseEventData)

    try {
      const expectedEvents = new Set()
      const document1 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 40 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document1.tip.toString())

      const document2 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 50 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document2.tip.toString())

      const document3 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 60 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document3.tip.toString())

      await document1.replace({ myData: 41 })
      expectedEvents.add(document1.tip.toString())
      await document2.replace({ myData: 51 })
      expectedEvents.add(document2.tip.toString())
      await document1.replace({ myData: 42 })
      expectedEvents.add(document1.tip.toString())
      await accumulator1.waitForEvents(expectedEvents, 1000 * 60)
      await accumulator2.waitForEvents(expectedEvents, 1000 * 60)
    } finally {
      source1.close()
      source2.close()
    }
  })

  test('if a connection goes offline can resume the missed events upon reconnection', async () => {
    const modelInstanceDocumentMetadata = { model: modelId }
    const Codec = JsonAsString.pipe(AggregationDocument)

    const source1 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[0]).toString(),
    )
    const source2 = new EventSource(
      new URL('/api/v0/feed/aggregation/documents', ComposeDbUrls[1]).toString(),
    )

    const parseEventData = (eventData: any) => {
      const decoded = decode(Codec, eventData)
      return decoded.commitId.commit.toString()
    }

    const accumulator1 = new EventAccumulator(source1, parseEventData)
    const accumulator2 = new EventAccumulator(source2, parseEventData)

    try {
      const expectedEvents = new Set()
      const document1 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 40 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document1.tip.toString())

      const document2 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 50 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document2.tip.toString())

      const document3 = await ModelInstanceDocument.create(
        ceramicNode1,
        { myData: 60 },
        modelInstanceDocumentMetadata,
      )
      expectedEvents.add(document3.tip.toString())

      await document1.replace({ myData: 41 })
      expectedEvents.add(document1.tip.toString())
      await document2.replace({ myData: 51 })
      expectedEvents.add(document2.tip.toString())
      await document1.replace({ myData: 42 })
      expectedEvents.add(document1.tip.toString())
      await accumulator1.waitForEvents(expectedEvents, 1000 * 60)
      await accumulator2.waitForEvents(expectedEvents, 1000 * 60)
    } finally {
      source1.close()
      source2.close()
    }
  })
})
