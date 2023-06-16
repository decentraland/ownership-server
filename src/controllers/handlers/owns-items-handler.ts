import SQL from "sql-template-strings"
import { HandlerContextWithPath } from "../../types"
import { ownsItems } from "../../logic/owns-items"
import { BlockchainCollectionV2Asset, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'


export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

type CuratedInput = {
  address: string,
  itemUrns: BlockchainCollectionV2Asset[],
  timestamp: number
}

async function parseInput(context: HandlerContextWithPath<
  'metrics' | 'database',
  '/ownsItems'
>): Promise<CuratedInput> {
  const address = context.url.searchParams.get('address')
  const itemUrns = context.url.searchParams.getAll('itemUrn')
  const timestamp = context.url.searchParams.get('timestamp')

  if (!address || itemUrns.length === 0 || !timestamp) {
    throw new InvalidRequestError('Missing parameters')
  }

  const parsedUrns: BlockchainCollectionV2Asset[] = []
  for (const urn of itemUrns) {
    const parsedUrn = await parseUrn(urn)
    if (parsedUrn && parsedUrn.type === 'blockchain-collection-v2-asset') {
      parsedUrns.push(parsedUrn)
    }
  }

  const parsedTimestamp = Number(timestamp)
  if (isNaN(parsedTimestamp)) {
    throw new InvalidRequestError('Invalid timestamp')
  }

  const lowercasedAddress = address.toLowerCase()
  // if (!EthAddress.validate(address)) {
  //   throw new Error('Invalid eth address')
  // }

  return {
    address: lowercasedAddress,
    itemUrns: parsedUrns,
    timestamp: parsedTimestamp
  }
}

export async function ownsItemsHandler(context: HandlerContextWithPath<
  'metrics' | 'database',
  '/ownsItems'
>) {
  try {
    const curatedInput = await parseInput(context)
    console.log(`Validated input:`)
    console.log(curatedInput)
    const queryResult = await ownsItems(context.components, curatedInput.address, curatedInput.itemUrns, curatedInput.timestamp)
    return {
      body: {
        queryResult
      },
    }
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return {
        status: 400,
        body: {
          error: 'Bad request',
          message: error.message
        }
      }
    }
    console.log(error)
    return {
      status: 500,
      body: {
        error: 'Internal Server Error'
      }
    }
  }
}
