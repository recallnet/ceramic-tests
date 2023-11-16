import {afterAll, beforeAll, describe, expect, test} from '@jest/globals'
import * as helpers from '../../utils/dynamoDbHelpers.js'
import { ComposeClient }from '@composedb/client'
import { definition } from   './__generated__/definition.js'

// Environment variables
const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

///////////////////////////////////////////////////////////////////////////////
/// Create/Update/Queries ComposeDB Models Tests
///////////////////////////////////////////////////////////////////////////////

describe('create/update/queries on ComposeDB Models', () => {
    beforeAll(async () => {})//TODO
    afterAll(async () => await helpers.cleanup())//TODO

    const compose = new ComposeClient({ ceramic: ComposeDbUrls[0], definition })
// TODO add test criteria e.g 'expect' keyword
    test('test create', async () => {
        await compose.executeQuery(`mutation {
            createGenericModel(input: {
                content: {
                    numericalField: 42,
                    textField: "Sample Text",
                    booleanField: true
                }
            }) 
            {
                document {
                    numericalField
                    textField
                    booleanField
                  }
            }
          }`)

    })

    test('test update', async () => {
        //TODO get id from prev test
        //TODO make update data be a variable to test against it at the end
       await compose.executeQuery(`mutation UpdateGenericModel {
        updateGenericModel(
          input: { 
            id: "${id}",
            content: {
              numericalField: 42,
              textField: "Updated Text",
              booleanField: true  
            }
          }
        ) {
          document {
            numericalField
            textField
            booleanField
          }
        }
      }`)
    })

    test('test query', async () => {
        // TODO make search param a variable
       await compose.executeQuery(`
       query numericalFieldFiltered {
        genericModelIndex(first: 1, filters: { where: {numericalField: {equalTo: 2} } }) {
              edges {
            node {
                id
                numericalField
                textField
                booleanField
            }
          }
        }
      }`)
    })
})