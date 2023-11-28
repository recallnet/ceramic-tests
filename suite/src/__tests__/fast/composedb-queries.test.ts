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

    test('test create', async () => {
      try {
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
        console.log(`Executing a create mutation for the GenericModel with textField: "${originalText}"`)
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
       } catch (err) {
        console.error(`Test failed. Unable to execute create mutation with text: "${originalText}"`)
        throw err
      }

    })

    test('test query', async () => {
      try { 
        const response = await compose.executeQuery(`
        query numericalFieldFiltered {
         genericModelIndex(first: 1, filters: { where: {textField: {equalTo: "${originalText}"} } }) {
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
        console.log(`Executing a query using filters for the GenericModel with textField: "${originalText}"`)
        expect(response.errors).toBeUndefined()
        expect(response.data).not.toBeUndefined()
        expect(response.data?.genericModelIndex).not.toBeUndefined()
        const record = (response.data?.genericModelIndex as any).edges.pop().node
  
        expect(record.numericalField).toBe(numValue)
        expect(record.textField).toBe(originalText)
        expect(record.booleanField).toBe(boolValue)
      } catch (err) {
        console.error(`Test failed. Unable to query filtering by textField: "${originalText}"`)
        throw err
      }
     })

    test('test update', async () => {
      try { 
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
        console.log(`Executing an update mutation for the GenericModel with new textField: "${updatedText}"`)
        expect(response.errors).toBeUndefined()
        expect(response.data).not.toBeUndefined()
        expect(response.data?.updateGenericModel).not.toBeUndefined()
  
        const record = (response.data?.updateGenericModel as any).document
  
        expect(record.numericalField).toBe(updatedNumValue)
        expect(record.textField).toBe(updatedText)
        expect(record.booleanField).toBe(!boolValue)
      } catch (err) {
        console.error(`Test failed. Unable to execute update mutation to text: "${updatedText}"`)
        throw err
      }
    })
})