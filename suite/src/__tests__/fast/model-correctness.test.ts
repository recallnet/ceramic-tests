import { describe, test, beforeAll, expect } from '@jest/globals'
import { newCeramic } from '../../utils/ceramicHelpers.js'
import { createDid } from '../../utils/didHelper.js'
import { StreamID } from '@ceramicnetwork/streamid'
import {} from '@composedb/cli'
import {Model} from '@ceramicnetwork/stream-model'
import {ModelInstanceDocument} from '@ceramicnetwork/stream-model-instance'
import { newModel, basicModelDocumentContent } from '../../models/modelConstants'
// import { StreamWriter } from '@ceramicnetwork/common'
import { CeramicClient } from '@ceramicnetwork/http-client'
// import { randomString } from '@stablelib/random'

const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')
// TODO : Update to correct modelId
// TODO : Will not result in the same stream id , have an arry per env
let modelId = "kjzl6hvfrbw6cabolodt3tflk3jdumv7dmgv8qss5jvjzcd7kck5drjkaun0bx1"
let seed = String(process.env.COMPOSEDB_ADMIN_DID_SEEDS)
describe('Model Integration Test', () => {
  let ceramicNode1: CeramicClient
  let streamId = StreamID.fromString(modelId);
  console.log(ComposeDbUrls)
  beforeAll(async () => {
    // Initialize two Ceramic nodesxwe
    // Get urls local/dev/qa depending on the env
    console.log(seed)
    let did = await createDid(seed);
    ceramicNode1 = await newCeramic('http://localhost:7007', did)
    //   let ceramicNode2 = await newCeramic('http://localhost:7007', did)
    console.log("Here!")
    console.log(ceramicNode1)
    const indexedModels = await ceramicNode1.admin.getIndexedModels();
    console.log(indexedModels);

    if(!indexedModels.includes(streamId)){
        let model = await Model.create(ceramicNode1, newModel);
        streamId = model.id;
    }

    // index the model on node 1

   // wait for some time TESTUTILS      
//    await ceramicNode2.admin.startIndexingModels([streamId]);
  })

  test('Create a ModelInstanceDocument on one node and read it from another', async () => {
    // Create a modelInstanceDocument on Node1
    const modelInstanceDocumentMetdata = {model: streamId}
    console.log(modelInstanceDocumentMetdata)
    const document = await ModelInstanceDocument.create(ceramicNode1, basicModelDocumentContent, modelInstanceDocumentMetdata);
    console.log(document)
    await new Promise(resolve => setTimeout(resolve, 5000));


    let indexedModels = await ceramicNode1.admin.getIndexedModels();
    // let document2 = await ceramicNode2.index.query()
    // or
    // ModelInstanceDocument.load(ceramicNode2, basicModelDocumentContent, modelInstanceDocumentMetdata)


    // TODO_2 : add assert that indexedModels list should contain document.id
    expect(indexedModels).toContain(document.id.toString());
    expect(document.id).not.toBeUndefined();
    
  })
})

