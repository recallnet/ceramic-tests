import { CeramicClient } from '@ceramicnetwork/http-client'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'
import { ComposeClient }from '@composedb/client'
// Import the devtool node package
import { createComposite, writeEncodedComposite, writeEncodedCompositeRuntime } from '@composedb/devtools-node'

/**
 * Creates a new model if it doesn't exists and returns a compose client instance.
 * @param apiUrl
 */
export async function setUpEnvironment(apiUrl: string) {
    const modelFile = "./src/composites/my-test-schema.graphql"
    const compositeFile = "./src/composites/my-composite.json"
    const definitionFile = "src/__generated__/definition.js"
    const seed = new Uint8Array([//Random numbers
        192,  16, 89, 183,  66, 111,  35,  98,
        211, 155, 35, 149, 177, 242, 119,  55,
        202,  79, 94, 168, 106,  74,  17,  10,
        116, 105, 77, 116, 161, 176,  81, 189
    ])// TO BE REPLACE with actual admin DID seed

    const provider = new Ed25519Provider(seed)
    const did = new DID({ provider, resolver: getResolver() })

    const ceramic = new CeramicClient(apiUrl)
    await did.authenticate()
    ceramic.did = did

    const exists = await checkIfExists(ceramic, compositeFile)

    if (!exists) {
        const composite = await createComposite(ceramic, modelFile)
    
        await writeEncodedComposite(composite, compositeFile)
    
        await writeEncodedCompositeRuntime(
            ceramic,
            compositeFile,
            definitionFile
        )
    }

    const definitionModule = await import('../../' + definitionFile)

    const definition = definitionModule.definition
    const compose = new ComposeClient({ ceramic: apiUrl, definition })
    compose.setDID(did) 
    
    return compose
}

async function checkIfExists(ceramic: CeramicClient, compositeFile: string) {
    const existingComposite = await import('../../' + compositeFile)
    const id = Object.keys(existingComposite.default.models)[0]
    const isCreated = await loadStream(ceramic, id)
    const result = isCreated? true: false
    if (result) console.log(`Found existing model in network. ModelID: ${id}`)
    return result
}

async function loadStream(ceramic: CeramicClient, id: string) {
    try {
        return await ceramic.loadStream(id)
    } catch {
        return undefined
    }
}
//TODO add doc
export async function queryRecordByText(compose: ComposeClient, textValue:string) {
    return await compose.executeQuery(`
      query numericalFieldFiltered {
       testDataIndex(first: 1, filters: { where: {textField: {equalTo: "${textValue}"} } }) {
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
}

export async function createRecord(compose: ComposeClient, numValue: number, textValue:string, boolValue: boolean) {
    return await compose.executeQuery(`mutation {
        createTestData(input: {
                content: {
                    numericalField: ${numValue},
                    textField: "${textValue}",
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
}

export async function updateRecord(compose: ComposeClient, id:string, updatedNumValue: number, updatedText:string, boolValue: boolean) {
    return await compose.executeQuery(`mutation UpdateTestData {
        updateTestData(
          input: { 
            id: "${id}",
            content: {
                numericalField: ${updatedNumValue},
                textField: "${updatedText}",
                booleanField: ${boolValue}  
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
}