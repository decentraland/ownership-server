import { HandlerContextWithPath } from '../../types'
import { BlockchainCollectionV2Asset, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'
import { InvalidRequestError } from './error-handler'
import { EthAddress } from '@dcl/schemas'
import { ownedItemsAtTimestamp } from '../../logic/owned-items-at-timestamp'

export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

type CuratedInput = {
  address: string
  itemUrns: BlockchainCollectionV2Asset[]
  timestamp: number
}

async function parseInput(
  context: HandlerContextWithPath<'metrics' | 'database', '/ownsItems'>
): Promise<CuratedInput> {
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
    throw new InvalidRequestError(`Invalid timestamp: ${parsedTimestamp}`)
  }

  if (!EthAddress.validate(address)) {
    throw new InvalidRequestError(`Invalid eth address: ${address}`)
  }

  return {
    address: address.toLowerCase(),
    itemUrns: parsedUrns,
    timestamp: parsedTimestamp
  }
}

export async function ownedItemsAtTimestampHandler(
  context: HandlerContextWithPath<'database' | 'logs' | 'metrics', '/ownsItems'>
) {
  const { logs } = context.components
  const logger = logs.getLogger('ownsItemsHandler')

  const curatedInput = await parseInput(context)
  logger.debug(`Validated input: ${JSON.stringify(curatedInput)}`)

  const ownedUrns = await ownedItemsAtTimestamp(
    context.components,
    curatedInput.address,
    curatedInput.itemUrns,
    curatedInput.timestamp
  )

  return {
    body: {
      ownedUrns
    }
  }
}
