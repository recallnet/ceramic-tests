'use strict'

export const utilities = {
  valid: (exp: any) => {
    return exp !== undefined && exp !== null
  },
  success: (body?: any) => {
    const response = {
      statusCode: 200,
      body: body ? JSON.stringify(body) : 'ok',
      headers: {
        'Content-Type': 'application/json',
      },
    }
    console.log('response = ' + JSON.stringify(response))
    return response
  },
  failure: (error: Error) => {
    if (error === undefined) {
      error = new Error('unknown error occurred')
    }
    const response = {
      statusCode: 500,
      body: JSON.stringify(error),
      headers: {
        'Content-Type': 'application/json',
      },
    }
    console.log('response = ' + JSON.stringify(response))
    return response
  },
  delay: async (seconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(() => resolve(), seconds * 1000)),
}
