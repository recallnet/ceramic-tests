import {type ModelDefinition} from '@ceramicnetwork/stream-model'

export const newModel: ModelDefinition = {
  "name": "CDITModel",
  "version": "1.0",
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "myData": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      }
    }
  },
  "accountRelation": {
    "type": "list"
  }
};

export const basicModelDocumentContent = {
  myData: 2
};
