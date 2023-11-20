import {afterAll, beforeAll, describe, expect, test} from '@jest/globals'
import * as helpers from '../../utils/dynamoDbHelpers.js'
import * as testHelpers from '../../utils/composeDBHelpers.js'
import { ComposeClient }from '@composedb/client'

const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

///////////////////////////////////////////////////////////////////////////////
/// Create/Update/Queries ComposeDB Models Tests
///////////////////////////////////////////////////////////////////////////////

describe('create/update/queries on ComposeDB Models', () => {
    let id: string
    let compose: ComposeClient;
    const originalText = `Sample Text was created at ${Date.now().toString()}`
    const updatedText = originalText + " and updated"
    const numValue = Math.floor((Math.random() * 100) + 1) // Random number between 1 and 100
    const updatedNumValue = numValue + 1 
    const boolValue = true;

    beforeAll(async () => {
        compose = await testHelpers.setUpEnvironment(ComposeDbUrls[0])
    })
    afterAll(async () => await helpers.cleanup())//TODO define what should happen after

    test('test create', async () => {
        const response = await compose.executeQuery(`mutation {
            createGenericModel(input: {
                content: {
                    numericalField: ${numValue},
                    textField: "${originalText}",
                    booleanField: ${boolValue}
                }
            }) 
            {
                document {
                    id
                    numericalField
                    textField
                    booleanField
                  }
            }
        }`)
        expect(response.errors).toBeUndefined()
        expect(response.data).not.toBeUndefined()
        expect(response.data?.createGenericModel).not.toBeUndefined()
        const record = (response.data?.createGenericModel as any).document
        expect(record).not.toBeUndefined()
        // save the recently created record id
        id = record.id
        expect(id).not.toBeNull();
        expect(id).not.toBeUndefined();
        expect(id.length).toBe(63)

        expect(record.numericalField).toBe(numValue)
        expect(record.textField).toBe(originalText)
        expect(record.booleanField).toBe(boolValue)
    })

    test('test update', async () => {
       const response = await compose.executeQuery(`mutation UpdateGenericModel {
        updateGenericModel(
          input: { 
            id: "${id}",
            content: {
                numericalField: ${updatedNumValue},
                textField: "${updatedText}",
                booleanField: ${!boolValue}  
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
      expect(response.errors).toBeUndefined()
      expect(response.data).not.toBeUndefined()
      expect(response.data?.updateGenericModel).not.toBeUndefined()

      const record = (response.data?.updateGenericModel as any).document

      expect(record.numericalField).toBe(updatedNumValue)
      expect(record.textField).toBe(updatedText)
      expect(record.booleanField).toBe(!boolValue)
    })

    test('test query', async () => {
       const response = await compose.executeQuery(`
       query numericalFieldFiltered {
        genericModelIndex(first: 1, filters: { where: {textField: {equalTo: ${updatedText}} } }) {
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
      expect(response.errors).toBeUndefined()
      expect(response.data).not.toBeUndefined()
      expect(response.data?.genericModelIndex).not.toBeUndefined()
      const record = (response.data?.genericModelIndex as any).edges.pop().node

      expect(record.numericalField).toBe(updatedNumValue)
      expect(record.textField).toBe(updatedText)
      expect(record.booleanField).toBe(!boolValue)
    })
})