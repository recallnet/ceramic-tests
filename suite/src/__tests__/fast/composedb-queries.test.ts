import { beforeAll, describe, expect, test} from '@jest/globals'
import * as testHelpers from '../../utils/composeDBHelpers.js'
import { ComposeClient } from '@composedb/client'

//const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')
const ComposeDbUrls = ['http://localhost:7007']
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

    test('test create record', async () => {
      const response = await compose.executeQuery(`mutation {
        createTestData(input: {
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
      console.log(`Executing a create mutation for the TestData with textField: "${originalText}"`)
      expect(response.errors).toBeUndefined()
      expect(response.data).not.toBeUndefined()
      expect(response.data?.createTestData).not.toBeUndefined()
      const record = (response.data?.createTestData as any).document
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

    test('test query existing record', async () => {
      const response = await compose.executeQuery(`
      query numericalFieldFiltered {
       testDataIndex(first: 1, filters: { where: {textField: {equalTo: "${originalText}"} } }) {
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
      console.log(`Executing a query using filters for the TestData with textField: "${originalText}"`)
      expect(response.errors).toBeUndefined()
      expect(response.data).not.toBeUndefined()
      expect(response.data?.testDataIndex).not.toBeUndefined()
      const record = (response.data?.testDataIndex as any).edges.pop().node

      expect(record.numericalField).toBe(numValue)
      expect(record.textField).toBe(originalText)
      expect(record.booleanField).toBe(boolValue)
    })

    test('test update record', async () => {
      const response = await compose.executeQuery(`mutation UpdateTestData {
        updateTestData(
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
      console.log(`Executing an update mutation for the TestData with new textField: "${updatedText}"`)
      expect(response.errors).toBeUndefined()
      expect(response.data).not.toBeUndefined()
      expect(response.data?.updateTestData).not.toBeUndefined()

      const record = (response.data?.updateTestData as any).document

      expect(record.numericalField).toBe(updatedNumValue)
      expect(record.textField).toBe(updatedText)
      expect(record.booleanField).toBe(!boolValue)
    })
})