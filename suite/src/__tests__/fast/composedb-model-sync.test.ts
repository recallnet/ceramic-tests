import { ComposeClient } from '@composedb/client'
import { beforeAll, describe, test } from '@jest/globals'
import { newModel, basicModelDocumentContent } from '../../models/modelConstants'
import { gql } from 'graphql-request'
import { Composite } from '@composedb/devtools'
import { basicSchema } from '../../graphql-schemas/basicSchema'
import { newCeramic } from '../../utils/ceramicHelpers.js'

const ComposeDbUrls = String(process.env.COMPOSEDB_URLS).split(',')

describe('Sync Model and ModelInstanceDocument using ComposeDB GraphQL API', () => {
  let composeClient1: ComposeClient
  let composeClient2: ComposeClient
  let streamId: string
//   let createdDocumentId: string

  beforeAll(async () => {
    const ceramicInstance1 = await newCeramic(ComposeDbUrls[0])
    const ceramicInstance2 = await newCeramic(ComposeDbUrls[1])
    const composite = await Composite.create({ ceramic: ceramicInstance1, schema: basicSchema })

    composeClient1 = new ComposeClient({
      ceramic: ceramicInstance1,
      definition: composite.toRuntime(),
    })
    composeClient2 = new ComposeClient({
      ceramic: ceramicInstance2,
      definition: composite.toRuntime(),
    })

    const createStreamMutation = gql`
      mutation CreateStream($input: CreateStreamInput!) {   
        createStream(input: $input) {
          stream {
            id
          }
        }
      }
    `

    const variables = {
      input: {
        schema: newModel,
      },
    }

    const response = await composeClient1.executeQuery(createStreamMutation, variables)
    // streamId = response.data.createStream.stream.id
    console.log("Document 1: ", response)
  })

  test('Create and sync a ModelInstanceDocument', async () => {
    const createDocumentMutation = gql`
      mutation CreateDocument($input: CreateDocumentInput!) {
        createDocument(input: $input) {
          document {
            id
          }
        }
      }
    `

    const variables = {
      input: {
        content: basicModelDocumentContent,
        streamId,
      },
    }

    const response = await composeClient1.executeQuery(createDocumentMutation, variables)
    // createdDocumentId = response.id
    console.log("Created document 1: ", response.data)
    // expect(createdDocumentId).toBeDefined()

    // Wait for the document to sync across nodes
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const queryDocumentsQuery = gql`
      query QueryDocuments($streamId: String!) {
        documents(streamId: $streamId) {
          nodes {
            id
            content
          }
        }
      }
    `

    const queryVariables = {
      streamId,
    }

    const queryResponse1 = await composeClient1.executeQuery(queryDocumentsQuery, queryVariables)
    console.log("Query response 1:", queryResponse1)
    const queryResponse2 = await composeClient2.executeQuery(queryDocumentsQuery, queryVariables)
    console.log("Query response 2: ", queryResponse2)
    // const documents1 = queryResponse1.data.documents.nodes
    // const documents2 = queryResponse2.data.documents.nodes

    // expect(documents1).toBeDefined()
    // expect(documents2).toBeDefined()
    // expect(documents1.some((doc) => doc.id === createdDocumentId)).toBe(true)
    // expect(documents2.some((doc) => doc.id === createdDocumentId)).toBe(true)
    // expect(documents1.find((doc) => doc.id === createdDocumentId)?.content).toEqual(basicModelDocumentContent)
    // expect(documents2.find((doc) => doc.id === createdDocumentId)?.content).toEqual(basicModelDocumentContent)
  })
})