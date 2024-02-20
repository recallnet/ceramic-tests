import { describe, test, beforeAll, expect } from '@jest/globals'
import { newCeramic } from '../../utils/ceramicHelpers.js'
import { createDid } from '../../utils/didHelper.js'
import { StreamID } from '@ceramicnetwork/streamid'
import { Model } from '@ceramicnetwork/stream-model'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import { newModel, basicModelDocumentContent } from '../../models/modelConstants'
import { CeramicClient } from '@ceramicnetwork/http-client'
import { CommonTestUtils as TestUtils } from '@ceramicnetwork/common-test-utils'
import { utilities } from '../../utils/common.js'

const delay = utilities.delay
const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')
// TODO : Update to the modelId created manually on all envs, if id cannot be the same then create an array for different envs
const adminSeeds = String(process.env.COMPOSEDB_ADMIN_DID_SEEDS).split(',')
const nodeSyncWaitTimeSec = 2

describe('Model Integration Test', () => {
  let ceramicNode1: CeramicClient
  let ceramicNode2: CeramicClient
  let modelId: StreamID
  beforeAll(async () => {
    console.log('Reading admin seeds:', adminSeeds)
    const did = await createDid(adminSeeds[0])
    ceramicNode1 = await newCeramic(ComposeDbUrls[0], did)
    ceramicNode2 = await newCeramic(ComposeDbUrls[1], did)
    console.log('Created ceramic client for node 1', ceramicNode1)
    console.log('Created ceramic client for node 2', ceramicNode2)
    let model = await Model.create(ceramicNode1, newModel)
    console.log('Creating model on node1 ', model)
    TestUtils.waitForConditionOrTimeout(async () =>
        ceramicNode1
          .loadStream(model.id)
          .then((_) => true)
          .catch((_) => false),
    )
    await ceramicNode1.admin.startIndexingModels([model.id])
    console.log('Indexing model on node1')
    await ceramicNode2.admin.startIndexingModels([model.id])
    console.log('Indexed model on Node 2', model.id)
    modelId = model.id
  })

  test('Create a ModelInstanceDocument on one node and read it from another', async () => {
    const modelInstanceDocumentMetdata = { model: modelId }
    const document1 = await ModelInstanceDocument.create(
      ceramicNode1,
      basicModelDocumentContent,
      modelInstanceDocumentMetdata,
    )
    // We have to wait for some time for sync to happen
    await delay(nodeSyncWaitTimeSec)
    const document2 = await ModelInstanceDocument.load(ceramicNode2, document1.id)
    expect(document2.id).toEqual(document1.id)
  })
})
