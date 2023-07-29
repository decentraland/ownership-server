import { HandlerContextWithPath } from '../../types'
import { BlockchainCollectionV2Asset, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'
import { InvalidRequestError } from './error-handler'
import { EthAddress } from '@dcl/schemas'
import { ownsItemsByAddress } from '../../logic/owns-items-by-address'

export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

export type OwnsItemsByAddressInput = {
  itemUrnsByAddress: {
    address: string
    itemUrns: BlockchainCollectionV2Asset[]
  }[]
}

async function parseInput(
  context: HandlerContextWithPath<'metrics' | 'database', '/ownsItems'>
): Promise<OwnsItemsByAddressInput> {
  const body = await context.request.json()

  if (!body.itemUrnsByAddress) {
    throw new InvalidRequestError('Invalid input: itemUrnsByAddress is needed')
  }

  if (!Array.isArray(body.itemUrnsByAddress)) {
    throw new InvalidRequestError('Invalid input: itemUrnsByAddress must be an array')
  }

  const itemUrnsByAddress: { address: string; itemUrns: BlockchainCollectionV2Asset[] }[] = []
  for (const item of body.itemUrnsByAddress) {
    if (!item.address) {
      throw new InvalidRequestError('Invalid input: address is required in items')
    }
    if (!EthAddress.validate(item.address)) {
      throw new InvalidRequestError(`Invalid eth address: ${item.address}`)
    }

    if (!Array.isArray(item.itemUrns)) {
      throw new InvalidRequestError(`Invalid input: itemUrns of ${item.address} must be an array`)
    }

    const itemUrns: BlockchainCollectionV2Asset[] = []
    for (const urn of item.itemUrns) {
      if (typeof urn !== 'string') {
        throw new InvalidRequestError(`Invalid input: itemUrns must be strings`)
      }
      const parsedUrn = await parseUrn(urn)
      if (parsedUrn && parsedUrn.type === 'blockchain-collection-v2-asset') {
        itemUrns.push(parsedUrn)
      }
    }
    itemUrnsByAddress.push({
      address: item.address.toLowerCase(),
      itemUrns
    })
  }
  return {
    itemUrnsByAddress
  }
}

export async function ownsItemUrnsByAddressHandler(
  context: HandlerContextWithPath<'database' | 'logs' | 'metrics', '/ownsItemUrnsByAddress'>
) {
  const { logs } = context.components
  const logger = logs.getLogger('ownsitemUrnsByAddress')

  const curatedInput = await parseInput(context)

  logger.debug(`Validated input: ${JSON.stringify(curatedInput)}`)

  const itemUrnsByAddress = await ownsItemsByAddress(context.components, curatedInput.itemUrnsByAddress)

  return {
    body: {
      itemUrnsByAddress
    }
  }
}
