import { AppComponents } from '../types'

function createQuery(schema: string, address: string) {
  return `
    SELECT item, token_id as "tokenId"
    FROM ${schema}.nfts
    WHERE owner = '${address}'`
}

export async function ownedItemsByAddress(
  components: Pick<AppComponents, 'database'>,
  address: string
): Promise<string[]> {
  const schema = await components.database.getLatestChainSchema('mumbai')

  if (!schema) {
    return []
  }

  const query = createQuery(schema, address)

  const queryResult = await components.database.queryRaw<{ item: string; tokenId: string }>(query, {
    query: 'owned_items_by_address'
  })

  return queryResult.rows.map(({ item, tokenId }) => {
    const parts = item.split('-')
    return `urn:decentraland:matic:collections-v2:${parts[0]}:${parts[1]}:${tokenId}`
  })
}
