import { CeramicClient } from '@ceramicnetwork/http-client'
import { beforeAll, test, describe, expect } from '@jest/globals'
import { Model } from '@ceramicnetwork/stream-model'
import { AccountId } from 'caip'
import { HDNodeWallet, Wallet } from 'ethers'
import { EthereumNodeAuth } from '@didtools/pkh-ethereum'
import { DIDSession } from 'did-session'
import { StreamID } from '@ceramicnetwork/streamid'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import * as u8s from 'uint8arrays'

import { newCeramic } from '../../utils/ceramicHelpers.js'
import { createDid } from '../../utils/didHelper.js'
import { SINGLE_MODEL_DEFINITION, LIST_MODEL_DEFINITION } from '../../models/modelConstants.js'
import { indexModelOnNode } from '../../utils/composeDbHelpers.js'

// Environment variables
const composeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')
const adminSeeds = String(process.env.COMPOSEDB_ADMIN_DID_SEEDS).split(',')

class MockProvider {
  wallet: HDNodeWallet

  constructor(wallet: HDNodeWallet) {
    this.wallet = wallet
  }

  send(
    request: { method: string; params: Array<any> },
    callback: (err: Error | null | undefined, res?: any) => void,
  ): void {
    if (request.method === 'eth_chainId') {
      callback(null, { result: '1' })
    } else if (request.method === 'personal_sign') {
      let message = request.params[0] as string
      if (message.startsWith('0x')) {
        message = u8s.toString(u8s.fromString(message.slice(2), 'base16'), 'utf8')
      }
      callback(null, { result: this.wallet.signMessage(message) })
    } else {
      callback(new Error(`Unsupported method: ${request.method}`))
    }
  }
}

describe('All Event Types', () => {
  let ceramic: CeramicClient
  let singleModelId: StreamID
  let listModelId: StreamID

  beforeAll(async () => {
    const did = await createDid(adminSeeds[0])
    ceramic = await newCeramic(composeDbUrls[0], did)

    const singleModel = await Model.create(ceramic, SINGLE_MODEL_DEFINITION)
    singleModelId = singleModel.id
    await indexModelOnNode(ceramic, singleModelId)

    const listModel = await Model.create(ceramic, LIST_MODEL_DEFINITION)
    listModelId = listModel.id
    await indexModelOnNode(ceramic, listModelId)
  })

  //time events are covered through the anchor test

  test('did:key signed', async () => {
    // did:key
    const did = await createDid()
    ceramic.did = did

    // did:key signed init event
    const content = { step: 400 }
    const metadata = { controllers: [did.id], model: listModelId }
    const doc = await ModelInstanceDocument.create(ceramic, content, metadata, { anchor: false })

    const loadedDoc = await ModelInstanceDocument.load(ceramic, doc.id)
    expect(loadedDoc.content).toEqual(content)

    // did:key signed data event
    const content2 = { step: 401 }
    await doc.replace(content2, null, { anchor: false })

    // can read
    await loadedDoc.sync()
    expect(loadedDoc.content).toEqual(content2)
  })

  test('cacao signed', async () => {
    // did:pkh + cacao
    const wallet = Wallet.createRandom()
    const provider = new MockProvider(wallet)
    const accountId = new AccountId({
      address: wallet.address.toLowerCase(),
      chainId: { namespace: 'eip155', reference: '1' },
    })
    const authMethod = await EthereumNodeAuth.getAuthMethod(provider, accountId, 'test')
    const resources = [`ceramic://*`]
    const session = await DIDSession.authorize(authMethod, {
      resources,
    })
    ceramic.did = session.did

    // cacao signed init event
    const content = { step: 600 }
    const metadata = {
      controllers: [`did:pkh:eip155:1:${wallet.address.toLowerCase()}`],
      model: listModelId,
    }
    const doc = await ModelInstanceDocument.create(ceramic, content, metadata, { anchor: false })

    const loadedDoc = await ModelInstanceDocument.load(ceramic, doc.id)
    expect(loadedDoc.content).toEqual(content)

    // cacao signed data event
    const content2 = { step: 601 }
    await doc.replace(content2, null, { anchor: false })

    await loadedDoc.sync()
    expect(loadedDoc.content).toEqual(content2)
  })

  test('unsigned ', async () => {
    const did = await createDid()
    ceramic.did = did

    // single/deterministic model instance documents are unsigned
    const metadata = { controllers: [did.id], model: singleModelId, deterministic: true }
    const doc = await ModelInstanceDocument.single(ceramic, metadata, {
      anchor: false,
    })

    // did:key signed data event
    const content = { step: 700 }
    await doc.replace(content)

    const loadedDoc = await ModelInstanceDocument.load(ceramic, doc.id)
    expect(loadedDoc.content).toEqual(content)
  })
})
