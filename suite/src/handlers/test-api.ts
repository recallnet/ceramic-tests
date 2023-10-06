import jest from 'jest'
import * as url from 'url'
import { configDotenv } from 'dotenv'

import { utilities } from '../utils/common.js'
import { createAnchorTable } from '../utils/dynamoDbHelpers.js'

const failure = utilities.failure
const success = utilities.success
const JestArgs = process.env.JEST_ARGS ? process.env.JEST_ARGS.split(' ') : ['']

// Load the .env file if it was specified
if (process.env.ENV_PATH) {
    configDotenv({path: process.env.ENV_PATH})
}

// Handles API requests for invoking (individual) tests directly via API, mainly for consumption in CI/CD pipelines but
// can also be used for adhoc testing.
export const handler: any = async (event: any) => {
    console.log(JSON.stringify(event))
    try {
        // Make sure the test table exists before running tests
        await createAnchorTable()
        // Setup and run tests
        const body = JSON.parse(event?.body ?? '{}')
        let suite = body.suite || process.env.SUITE
        // Executing all suites means not specifying any specific suite to run
        if (suite === 'all') {
            suite = null
        }
        const suiteArgs = suite ? ['-t', suite] : ['']
        const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
        await jest.run([...suiteArgs, ...JestArgs, '--runInBand'], __dirname)
    } catch (err: any) {
        return failure(err)
    }
    return success()
}

handler()
  .then(() => {
    process.exit(0)
  })
  .catch((err: any) => {
    console.error(err)
    process.exit(1)
  })
