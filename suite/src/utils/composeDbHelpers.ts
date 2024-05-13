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
 * @param ceramicNode : Ceramic client to load teh document from
 * @param documentId : ID of the document to load
 * @param timeoutMs : Timeout in milliseconds
 * @returns 
 */
export async function loadDocumentOrTimeout(ceramicNode: CeramicClient, documentId: StreamID, timeoutMs: number) {
  const startTime = Date.now()
  while (true) {
    try {
      const doc = await ModelInstanceDocument.load(ceramicNode, documentId);
      return doc; 
    } catch (error) {
      console.log(`Error loading document : ${documentId} retrying`, error)
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Timeout waiting for document')
      }
      await delay(1)
    }
  }
}
