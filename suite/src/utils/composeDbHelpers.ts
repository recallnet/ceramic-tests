import { ComposeClient } from '@composedb/client'
import { utilities } from './common'
import { CeramicClient } from '@ceramicnetwork/http-client'
import { ModelInstanceDocument } from '@ceramicnetwork/stream-model-instance'
import { StreamID } from '@ceramicnetwork/streamid'

const delay = utilities.delay

/**
 * Waits for a specific document to be available by repeatedly querying the ComposeDB until the document is found or a timeout occurs.
 *
 * This function continuously executes a provided GraphQL query using the ComposeClient until a document with an `id` is found in the response.
 * If the document is found within the specified timeout period, the function returns the document's response object.
 * If the document is not found within the timeout period, the function throws a timeout error.
 *
 * @param {ComposeClient} composeClient - The ComposeClient instance used to execute the query.
 * @param {string} query - The GraphQL query string to be executed.
 * @param {any} variables - The variables to be passed with the query.
 * @param {number} timeoutMs - The maximum amount of time (in milliseconds) to wait for the document before timing out.
 * @returns {Promise<any>} A promise that resolves with the response object of the document if found within the timeout period.
 * @throws {Error} Throws an error if the document is not found within the specified timeout period.
 */

export async function waitForDocument(
  composeClient: ComposeClient,
  query: string,
  variables: any,
  timeoutMs: number,
) {
  const startTime = Date.now()
  while (true) {
    const response = await composeClient.executeQuery(query, variables)
    const responseObj = JSON.parse(JSON.stringify(response))
    if (responseObj?.data?.node?.id) {
      return responseObj
    }
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timeout waiting for document')
    }
    await delay(1)
  }
}

/**
 * Loads a document from a ceramic node with a timeout.
 * @param ceramicNode : Ceramic client to load the document from
 * @param documentId : ID of the document to load
 * @param timeoutMs : Timeout in milliseconds
 * @returns The document if found, throws error on timeout
 */
export async function loadDocumentOrTimeout(
  ceramicNode: CeramicClient,
  documentId: StreamID,
  timeoutMs: number,
) {
  let now = Date.now()
  const expirationTime = now + timeoutMs
  while (now < expirationTime) {
    try {
      const doc = await ModelInstanceDocument.load(ceramicNode, documentId)
      return doc
    } catch (error) {
      console.log(`Error loading document : ${documentId} retrying`, error)
      await delay(10)
      now = Date.now()
    }
  }
  throw Error('Timeout waiting for document')
}

/**
 * Waits for indexing to complete on both nodes or a timeout.
 * @param ceramicNode1 : Ceramic client to check indexing on
 * @param ceramicNode2 : Ceramic client to check indexing on
 * @param modelId : ID of the model to check indexing for
 * @param timeoutMs : Timeout in milliseconds
 * @returns True if indexing is complete on both nodes, throws error on timeout
 */
export async function waitForIndexingOrTimeout(
  ceramicNode1: CeramicClient,
  ceramicNode2: CeramicClient,
  modelId: StreamID,
  timeoutMs: number,
) {
  let now = Date.now()
  const expirationTime = now + timeoutMs
  while (now < expirationTime) {
    const indexedModels1 = await ceramicNode1.admin.getIndexedModels()
    const indexedModels2 = await ceramicNode2.admin.getIndexedModels()
    if (indexedModels1.includes(modelId) && indexedModels2.includes(modelId)) {
      return true
    }
    await delay(100)
    now = Date.now()
    console.log(
      `Waiting for indexing model: ${modelId}, indexed on node1: ${indexedModels1.toString()}, indexed on node2: ${indexedModels2.toString()}`,
    )
  }
  throw Error(`Timeout waiting for indexing model: ${modelId}`)
}
