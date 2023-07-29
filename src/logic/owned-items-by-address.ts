import { AppComponents } from '../types'

function createQuery(address: string) {
  return `
    SELECT item_id AS "itemId"
    FROM nfts
    WHERE owner = '${address}'`
}

export async function ownedItemsByAddress(
  components: Pick<AppComponents, 'database'>,
  address: string
): Promise<string[]> {
  const query = createQuery(address)

  const queryResult = await components.database.queryRaw<{ itemId: string }>(query, {
    query: 'owned_items_by_address'
  })

  const ownedItems = new Set<string>()
  for (const { itemId } of queryResult.rows) {
    ownedItems.add(itemId)
  }

  return Array.from(ownedItems).map((itemId: string) => {
    const parts = itemId.split('-')
    return `urn:decentraland:matic:${parts[0]}:${parts[1]}`
  })
}
