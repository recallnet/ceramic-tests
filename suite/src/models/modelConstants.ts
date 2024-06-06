import { type ModelDefinition } from '@ceramicnetwork/stream-model'

export const MODEL_DEFINITION_LIST: ModelDefinition = {
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

export const MODEL_DEFINITION_SINGLE: ModelDefinition = {
  name: 'ceramic-tests-single-model',
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
  accountRelation: { type: 'single' },
}
