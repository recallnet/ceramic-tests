import { CeramicClient } from '@ceramicnetwork/http-client'
import { randomBytes } from 'crypto'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyDidResolver from 'key-did-resolver'

const seed = randomBytes(32)
const provider = new Ed25519Provider(seed)
const resolver = KeyDidResolver.getResolver()
const did = new DID({ provider, resolver })

export const metadata = { controllers: [] }

export const newCeramic = async (apiUrl: string) => {
  const ceramic = new CeramicClient(apiUrl, { syncInterval: 500 })
  if (!did.authenticated) {
    await did.authenticate()
    ;(metadata.controllers as string[]) = [did.id]
  }
  await ceramic.setDID(did)
  return ceramic
}
