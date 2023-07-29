import { HandlerContextWithPath } from '../../types'
import { ownedItemsByAddress } from '../../logic/owned-items-by-address'

export async function allOwnedItemsByAddressHandler(
  context: HandlerContextWithPath<'database' | 'metrics', '/allOwnedItemsByAddress/:address'>
) {
  const address = context.params.address?.toLowerCase()

  const itemUrns = await ownedItemsByAddress(context.components, address)

  return {
    body: {
      itemUrns
    }
  }
}
