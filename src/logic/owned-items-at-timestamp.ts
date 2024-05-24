import { BlockchainCollectionV2Item, parseUrn as resolverParseUrn } from '@dcl/urn-resolver'
import { AppComponents } from '../types'

export async function parseUrn(urn: string) {
  try {
    return await resolverParseUrn(urn)
  } catch (err: any) {
    return null
  }
}

// function createQuery(schema: string, address: string, nfts: string[], timestamp: number) {
//   return `
//     SELECT nft from ${schema}.transfers t
//     WHERE
//     t."to" = '${address}'
//     AND t.nft IN (${nfts.map((nft) => `'${nft}'`).join(',')})
//     AND t.timestamp <= ${timestamp}
//   `
// }

export async function ownedItemsAtTimestamp(
  components: Pick<AppComponents, 'database'>,
  address: string,
  itemUrns: BlockchainCollectionV2Item[],
  atTimestamp: number
) {
  if (itemUrns.length === 0) {
    return []
  }
  const nfts = itemUrns.map((urn) => `${urn.contractAddress}-${urn.tokenId}`)

  const schema = await components.database.getLatestChainSchema('mumbai')

  if (!schema) {
    return []
  }

  const query = `
    WITH nfts_transfers AS (
      SELECT * from ${schema}.transfers t
      WHERE
      t.nft IN (${nfts.map((nft) => `'${nft}'`).join(',')})
      AND t.timestamp <= ${atTimestamp}
      ORDER BY t.timestamp DESC
    )
    SELECT nft FROM nfts_transfers nt
    WHERE nt."to" = '${address}'
    AND nt.timestamp = (SELECT max(nt2.timestamp) FROM nfts_transfers nt2 WHERE nt.nft = nt2.nft);
  `

  const queryResult = await components.database.queryRaw<{ nft: string }>(query, {
    query: 'owned_items_at_timestamp',
    addresses: 1,
    item_ids: nfts.length
  })

  const ownedItemIds = new Set(queryResult.rows.map((row) => row.nft))

  return itemUrns
    .filter((urn) => ownedItemIds.has(`${urn.contractAddress}-${urn.tokenId}`))
    .map((urn) => `urn:${urn.namespace}:${urn.network}:collections-v2:${urn.contractAddress}:${urn.id}:${urn.tokenId}`)
}
