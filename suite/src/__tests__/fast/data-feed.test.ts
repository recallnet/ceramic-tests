import { CeramicClient } from '@ceramicnetwork/http-client'
import { describe, test, beforeAll, expect } from '@jest/globals'
import { newCeramic } from '../../utils/ceramicHelpers.js'
import { StreamID } from '@ceramicnetwork/streamid'
import { createDid } from '../../utils/didHelper.js'

const CeramicUrls = String(process.env.CERAMIC_URLS).split(',')
//const adminSeeds = String(process.env.COMPOSEDB_ADMIN_DID_SEEDS).split(',')

describe('Data Feed API Test', () => {
    let ceramicNode1: CeramicClient
    let ceramicNode2: CeramicClient
    
    beforeAll(async () => {
        //lift one ceramic instance and gets its url
        // add a listener to the url feed
    })

    //basic scenario
    test('Can connect to data fee and add/receive entry for each commit type and when pinning model', async () => {
        // task get the right ceramic instance type, could be client or could be pulled from ceramicUrls but those might always be recon nodes
        expect(s)
    })

    //more complex scenarios
    test('Create a ModelInstanceDocument on one node and read it from another', async () => {

    })

    test('If node goes gets disconnected can get events emitted while it was not listening', async () => {

    })
})