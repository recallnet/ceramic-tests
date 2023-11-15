import {afterAll, beforeAll, describe, expect, test} from '@jest/globals'
import * as helpers from '../../utils/dynamoDbHelpers.js'
import { ComposeClient }from '@composedb/client'


// Environment variables
const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

///////////////////////////////////////////////////////////////////////////////
/// Create/Update/Queries ComposeDB Models Tests
///////////////////////////////////////////////////////////////////////////////

describe('create/update/queries on ComposeDB Models', () => {
    beforeAll(async () => {})
    afterAll(async () => await helpers.cleanup())
    const definition: RuntimeCompositeDefinition = //TODO
    
    const compose = new ComposeClient({ ceramic: ComposeDbUrls[0], definition })

    test('test create', async () => {
       //create model 
       // only create it if it doesn't exist?

    })

    test('test update', async () => {
       //update model
    })

    test('test query', async () => {
       //read model
       await compose.executeQuery(`
       query {
           viewer {
           id
           }
       }
       `)
    })
})