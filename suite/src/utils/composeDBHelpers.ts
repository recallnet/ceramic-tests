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
//TODO avoid creating a new model if it already exists
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

    const composite = await createComposite(ceramic, modelFile)

    await writeEncodedComposite(composite, compositeFile)

    await writeEncodedCompositeRuntime(
        ceramic,
        compositeFile,
        definitionFile
    )

    const definitionModule = await import('../../' + definitionFile)

    const definition = definitionModule.definition
    const compose = new ComposeClient({ ceramic: apiUrl, definition })
    compose.setDID(did) 
    
    return compose
}