import { AppComponents } from '../types'
import { BlockchainCollectionV2Asset } from '@dcl/urn-resolver'

function createQuery(addresses: string[], itemIds: string[]) {
  return `
select owner, item_id AS "itemId"
from nfts
where owner in (${addresses.map((address) => `'${address}'`).join(',')})
and item_id in (${itemIds.map((itemId) => `'${itemId}'`).join(',')});`
}

export async function ownsItemsByAddress(
  components: Pick<AppComponents, 'database'>,
  itemUrnsByAddress: {
    address: string
    itemUrns: BlockchainCollectionV2Asset[]
  }[]
): Promise<
  {
    address: string
    itemUrns: string[]
  }[]
> {
  const addresses: string[] = []
  const allItemIds: string[] = []
  for (const { address, itemUrns } of itemUrnsByAddress) {
    addresses.push(address)
    allItemIds.push(...itemUrns.map((urn) => `${urn.contractAddress}-${urn.id}`))
  }

  if (allItemIds.length === 0) {
    return itemUrnsByAddress.map((itemUrnsOfAddress) => ({
      address: itemUrnsOfAddress.address,
      itemUrns: []
    }))
  }

  const query = createQuery(addresses, allItemIds)

  const queryResult = await components.database.queryRaw<{ owner: string; itemId: string }>(query, {
    query: 'owns_items_by_address',
    addresses: addresses.length,
    item_ids: allItemIds.length
  })

  const ownedItemIdsByOwner = new Map<string, Set<string>>()

  for (const address of addresses) {
    ownedItemIdsByOwner.set(address, new Set())
  }
  for (const { owner, itemId } of queryResult.rows) {
    ownedItemIdsByOwner.get(owner)!.add(itemId)
  }

  return itemUrnsByAddress.map((itemUrnsOfAddress) => ({
    address: itemUrnsOfAddress.address,
    itemUrns: itemUrnsOfAddress.itemUrns
      .filter((urn) => ownedItemIdsByOwner.get(itemUrnsOfAddress.address)!.has(`${urn.contractAddress}-${urn.id}`))
      .map((urn) => `urn:${urn.namespace}:${urn.network}:collections-v2:${urn.contractAddress}:${urn.id}`)
  }))
}
