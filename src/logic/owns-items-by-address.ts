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
  const query = createQuery(addresses, allItemIds)

  const queryResult = await components.database.queryRaw<{ owner: string; itemId: string }>(query, {
    query: 'owns_items_by_address',
    addresses: addresses.length,
    item_ids: allItemIds.length
  })

  const ownedItemIdsByOwner = new Map<string, Set<string>>()

  for (const { owner, itemId } of queryResult.rows) {
    if (!ownedItemIdsByOwner.has(owner)) {
      ownedItemIdsByOwner.set(owner, new Set())
    }
    ownedItemIdsByOwner.get(owner)!.add(itemId)
  }

  return itemUrnsByAddress.map((itemUrnsOfAddress) => ({
    address: itemUrnsOfAddress.address,
    itemUrns: itemUrnsOfAddress.itemUrns
      .filter((urn) => ownedItemIdsByOwner.get(itemUrnsOfAddress.address)!.has(`${urn.contractAddress}-${urn.id}`))
      .map((urn) => `urn:${urn.namespace}:${urn.network}:collections-v2:${urn.contractAddress}:${urn.id}`)
  }))
}
