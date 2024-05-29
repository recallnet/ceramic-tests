import { type ModelDefinition } from '@ceramicnetwork/stream-model'

export const newModel: ModelDefinition = {
  name: 'CDITModel',
  version: '1.0',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      step: {
        type: 'integer',
        minimum: 0,
        maximum: 10000,
      },
    },
  },
  accountRelation: {
    type: 'list',
  },
}
