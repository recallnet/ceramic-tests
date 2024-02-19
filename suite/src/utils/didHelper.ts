// import { randomBytes } from 'crypto'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyDidResolver from 'key-did-resolver'
import { randomBytes } from '@stablelib/random'
import * as uint8arrays from 'uint8arrays'


  export function splitDidsToList(input: string): string[] {
    // Split the input string by commas and trim whitespace from each resulting string
    return input.split(',').map(s => s.trim());
  }

  export async function createDid(seed?: string): Promise<DID> {
    const digest = seed ? uint8arrays.fromString(seed, 'base16') : randomBytes(32)
    console.log(digest)
    const provider = new Ed25519Provider(digest)
    const resolver = KeyDidResolver.getResolver()
    const did = new DID({ provider, resolver })
    console.log("This is the did", did)
    await did.authenticate()
    console.log('Authenticated did', did.id)
    return did
  }