import { APIGatewayClient, TestInvokeMethodCommand } from '@aws-sdk/client-api-gateway'
import { BaseReporter } from '@jest/reporters'
import axios, { AxiosRequestConfig } from 'axios'
import * as childProcess from 'child_process'
import { DateTime } from 'luxon'

const Region = process.env.REGION
const TestFailuresWebhook = process.env.DISCORD_WEBHOOK_TEST ?? String(process.env.DISCORD_WEBHOOK_FAILURES)
const TestResultsWebhook = process.env.DISCORD_WEBHOOK_TEST ?? String(process.env.DISCORD_WEBHOOK_RESULTS)
const UtilsRestApiId = process.env.UTILS_REST_API_ID
const UtilsResourceId = process.env.UTILS_RESOURCE_ID
const DiscordUserName = 'jest-reporter'
const LogsUrl = String(process.env.CLOUDWATCH_LOG_BASE_URL)

export default class JestReporter extends BaseReporter {
    ApiGwClient = new APIGatewayClient({ region: Region })
    commitHashes = ''
    logsLink = ''

    constructor() {
        super()
        this.logsLink = this.buildLogsLink()
    }

    getInfraStatus = async (name: string): Promise<any> => {
        const testCmd = new TestInvokeMethodCommand({
            restApiId: UtilsRestApiId,
            resourceId: UtilsResourceId,
            httpMethod: 'GET',
            pathWithQueryString: `v1.0/infra?name=${name}`
        })
        const res = await this.ApiGwClient.send(testCmd)
        return res.body ? JSON.parse(res.body) : {}
    }

    getCommitHashes = async () => {
        try {
            const ceramicStatus = await this.getInfraStatus('ceramic')
            const casStatus = await this.getInfraStatus('cas')
            const ipfsStatus = await this.getInfraStatus('ipfs')
            return `${this.buildCommitLink('js-ceramic', ceramicStatus.deployTag)}\n${this.buildCommitLink('ceramic-anchor-service', casStatus.deployTag)}\n${this.buildCommitLink('go-ipfs-daemon', ipfsStatus.deployTag)}`
        } catch (err) {
            throw ('unexpected error: ' + err)
        }
    }

    buildCommitLink = (repo: string, hash: string) => {
        return `[${repo} (${hash.slice(0, 12)})](https://github.com/ceramicnetwork/${repo}/commit/${hash})`
    }

    sendDiscordMsg = (webhookUrl: string, data: any) => {
        const config: AxiosRequestConfig = {
            method: 'POST',
            url: webhookUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data)
        }
        return axios(config)
            .then(r => console.log(r.status))
            .catch(err => {
                throw ('unexpected error: ' + err)
            })
    }

    discordStartMsg() {
        return {
            embeds: [
                {
                    title: 'Smoke Tests STARTED',
                    fields: [
                        {
                            name: 'Started at',
                            value: DateTime.utc().toLocaleString(DateTime.DATETIME_FULL)
                        },
                        {
                            name: 'Commit hashes',
                            value: this.commitHashes
                        },
                        {
                            name: 'Logs',
                            value: this.logsLink
                        },
                    ],
                },
            ],
            username: DiscordUserName
        }
    }

    buildLogsLink = () => {
        const taskArn = this.getThisTaskArn()
        return `[${taskArn}](${LogsUrl}${taskArn})`
    }

    getThisTaskArn = () => {
        return childProcess.execSync(
            'curl -s "$ECS_CONTAINER_METADATA_URI_V4/task" | /app/node_modules/node-jq/bin/jq -r ".TaskARN" | awk -F/ \'{print $NF}\''
        ).toString()
    }

    buildDiscordSummary(results: any) {
        const startTime = DateTime.fromMillis(results.startTime)
        const runDuration = DateTime.utc().diff(startTime)
        const durationStr = runDuration.shiftTo("minutes", "seconds").toHuman({ unitDisplay: "short" })
        return {
            embeds: [
                {
                    title: `Smoke Tests ${results.numFailedTestSuites < 1 ? 'PASSED' : 'FAILED'}`,
                    color: results.numFailedTestSuites < 1 ? 8781568 : 16711712,
                    fields: [
                        {
                            name: 'Started at',
                            value: startTime.toUTC().toLocaleString(DateTime.DATETIME_FULL)
                        },
                        {
                            name: 'Duration',
                            value: durationStr
                        },
                        {
                            name: 'Suites',
                            value: `Passed: ${results.numPassedTestSuites}, Failed: ${results.numFailedTestSuites}, Total: ${results.numTotalTestSuites}`,
                        },
                        {
                            name: 'Tests',
                            value: `Passed: ${results.numPassedTests}, Failed: ${results.numFailedTests}, Total: ${results.numTotalTests}`,
                        },
                        {
                            name: 'Commit hashes',
                            value: this.commitHashes
                        },
                        {
                            name: 'Logs',
                            value: this.logsLink
                        },
                    ],
                },
            ],
            username: DiscordUserName
        }
    }

    async onRunStart({ } = {}, { } = {}) {
        this.commitHashes = await this.getCommitHashes()
        return this.sendDiscordMsg(TestResultsWebhook, this.discordStartMsg())
    }

    async onRunComplete({ } = {}, results: any) {
        const summary = this.buildDiscordSummary(results)
        if (results.numFailedTestSuites > 0) {
            await this.sendDiscordMsg(TestFailuresWebhook, summary)
        }
        return this.sendDiscordMsg(TestResultsWebhook, summary)
    }
}
