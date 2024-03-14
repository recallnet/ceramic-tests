

export const basicSchema = `
type BasicScema @createModel(description: "A set of unique numbers")
  @createIndex(fields: [{ path: "numericalField" }]){
    numericalField: Int @int(min: 1, max: 100)
  }
`