import { IHttpServerComponent } from '@well-known-components/interfaces'

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

export interface ErrorResponse {
  error: string
  message: string
}

function handleError(error: any): { status: number; body: ErrorResponse } {
  if (error instanceof InvalidRequestError) {
    return {
      status: 400,
      body: {
        error: 'Bad request',
        message: error.message
      }
    }
  }

  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: {
        error: 'Not Found',
        message: error.message
      }
    }
  }

  throw error
}

export async function errorHandler(
  ctx: IHttpServerComponent.DefaultContext<object>,
  next: () => Promise<IHttpServerComponent.IResponse>
): Promise<IHttpServerComponent.IResponse> {
  try {
    return await next()
  } catch (error: any) {
    try {
      return handleError(error)
    } catch (err: any) {
      console.log(`Error handling ${ctx.url.toString()}: ${error.message}`)
      return {
        status: 500,
        body: {
          error: 'Internal Server Error'
        }
      }
    }
  }
}
