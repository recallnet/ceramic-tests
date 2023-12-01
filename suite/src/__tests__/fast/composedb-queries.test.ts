import { beforeAll, describe, expect, test} from '@jest/globals'
import * as testHelpers from '../../utils/composeDBHelpers.js'
import { ComposeClient } from '@composedb/client'
import { createRecord, queryRecordByText, updateRecord } from '../../utils/composeDBHelpers.js'

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
    const boolValue = true

    beforeAll(async () => {
      compose = await testHelpers.setUpEnvironment(ComposeDbUrls[0])
    })

    test('test create/update/queries on ComposeDB', async () => {
      const createResponse = await createRecord(compose, numValue, originalText, boolValue)
      console.log(`Executing a create mutation for the TestData with textField: "${originalText}"`)
      expect(createResponse.errors).toBeUndefined()
      expect(createResponse.data).not.toBeUndefined()
      expect(createResponse.data?.createTestData).not.toBeUndefined()
      const createdRecord = (createResponse.data?.createTestData as any).document
      expect(createdRecord).not.toBeUndefined()
      // save the recently created record id
      id = createdRecord.id
      expect(id).not.toBeNull();
      expect(id).not.toBeUndefined();
      expect(id.length).toBe(63)
      expect(createdRecord.numericalField).toBe(numValue)
      expect(createdRecord.textField).toBe(originalText)
      expect(createdRecord.booleanField).toBe(boolValue)

      const queryResponse = await queryRecordByText(compose, originalText)
      console.log(`Executing a query using filters for the TestData with textField: "${originalText}"`)
      expect(queryResponse.errors).toBeUndefined()
      expect(queryResponse.data).not.toBeUndefined()
      expect(queryResponse.data?.testDataIndex).not.toBeUndefined()
      const queriedRecord = (queryResponse.data?.testDataIndex as any).edges.pop().node

      expect(queriedRecord.numericalField).toBe(numValue)
      expect(queriedRecord.textField).toBe(originalText)
      expect(queriedRecord.booleanField).toBe(boolValue)
    
      const updateResponse = await updateRecord(compose, id, updatedNumValue, updatedText, !boolValue)
      console.log(`Executing an update mutation for the TestData with new textField: "${updatedText}"`)
      expect(updateResponse.errors).toBeUndefined()
      expect(updateResponse.data).not.toBeUndefined()
      expect(updateResponse.data?.updateTestData).not.toBeUndefined()

      const updatedRecord = (updateResponse.data?.updateTestData as any).document

      expect(updatedRecord.numericalField).toBe(updatedNumValue)
      expect(updatedRecord.textField).toBe(updatedText)
      expect(updatedRecord.booleanField).toBe(!boolValue)
    })
})