import { BlockchainCollectionV2Asset, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'
import { AppComponents } from '../types'

export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

function createQuery(address: string, collectionIds: string[], itemIds: string[]) {
  return `
select collection_id, item_id
from nfts n
where owner = '${address}'
and n.collection_id in (${collectionIds.map((collectionId) => `'${collectionId}'`).join(',')})
and n.item_id in (${itemIds.map((itemId) => `'${itemId}'`).join(',')});`
}

export async function ownsItems(
  components: Pick<AppComponents, 'database'>,
  address: string,
  itemUrns: BlockchainCollectionV2Asset[]
) {
  if (itemUrns.length === 0) {
    return []
  }
  const collectionIds = itemUrns.map((urn) => urn.contractAddress)
  const itemIds = itemUrns.map((urn) => `${urn.contractAddress}-${urn.id}`)

  const query = createQuery(address, collectionIds, itemIds)

  console.log(query)

  const queryResult = await components.database.queryRaw<{ collection_id: string; item_id: string }>(query)

  console.log(queryResult)

  const ownedItemIds = new Set(queryResult.rows.map((row) => row.item_id))

  return itemUrns
    .filter((urn) => ownedItemIds.has(`${urn.contractAddress}-${urn.id}`))
    .map((urn) => `urn:${urn.namespace}:${urn.network}:collections-v2:${urn.contractAddress}:${urn.id}`)
}
