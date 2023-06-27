import { BlockchainCollectionV2Asset, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'
import { AppComponents } from '../types'

export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

function createQuery(address: string, collectionIds: string[], itemIds: string[], timestamp: number) {
  return `
select t.collection_id, n.item_id
from nfts n
join transfers t on t.token_id = n.token_id and t.collection_id = n.collection_id
where n.collection_id in (${collectionIds.map((collectionId) => `'${collectionId}'`).join(',')})
and n.item_id in (${itemIds.map((itemId) => `'${itemId}'`).join(',')})
and to_address = '${address}'
and block_timestamp <= ${timestamp}
group by t.collection_id, n.item_id;`
}

export async function ownedItemsAtTimestamp(
  components: Pick<AppComponents, 'database'>,
  address: string,
  itemUrns: BlockchainCollectionV2Asset[],
  atTimestamp: number
) {
  if (itemUrns.length === 0) {
    return []
  }
  const collectionIds = itemUrns.map((urn) => urn.contractAddress)
  const itemIds = itemUrns.map((urn) => `${urn.contractAddress}-${urn.id}`)

  const query = createQuery(address, collectionIds, itemIds, atTimestamp)

  const queryResult = await components.database.queryRaw<{ collection_id: string; item_id: string }>(query, {
    query: 'owned_items_at_timestamp',
    addresses: 1,
    item_ids: itemIds.length
  })

  const ownedItemIds = new Set(queryResult.rows.map((row) => row.item_id))

  return itemUrns
    .filter((urn) => ownedItemIds.has(`${urn.contractAddress}-${urn.id}`))
    .map((urn) => `urn:${urn.namespace}:${urn.network}:collections-v2:${urn.contractAddress}:${urn.id}`)
}
