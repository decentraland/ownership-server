import { AppComponents } from '../types'

async function getLastValidBlockTimestamp(
  components: Pick<AppComponents, 'database'>,
  lastValidBlockNumber: number
): Promise<number> {
  const lastValidBlockTimestampQuery = `select block_timestamp AS "blockTimestamp" from blocks where block_number <= ${lastValidBlockNumber} order by block_number desc limit 1;`

  const lastValidBlockTimestampQueryResult = await components.database.queryRaw<{ blockTimestamp: number }>(
    lastValidBlockTimestampQuery,
    {
      query: 'timestamp_for_block'
    }
  )
  if (lastValidBlockTimestampQueryResult.rowCount === 0) {
    // It could mean that there are no blocks in the database (which is extremely unlikely) but it could also mean that the block number is invalid
    throw new Error(`Block timestamp for block number ${lastValidBlockNumber} not found`)
  }

  return lastValidBlockTimestampQueryResult.rows[0].blockTimestamp
}

type Transfer = {
  tokenId: string
  collectionId: string
  fromAddress: string
  toAddress: string
  createdAt: number
}

function createTransfersToRollbackQuery(timestamp: number) {
  return `select token_id AS "tokenId", collection_id AS "collectionId", from_address AS "fromAddress", to_address AS "toAddress", created_at AS "createdAt" from transfers where created_at > ${timestamp} order by created_at desc;`
}

function createUpdateNFTWithPreviousTransferQuery(transfer: Transfer) {
  return `update nfts set owner = '${transfer.toAddress}', updated_at = ${transfer.createdAt} where id = '${transfer.collectionId}-${transfer.tokenId}';`
}

function createPreviousTransferQuery(transfer: Transfer) {
  return `select token_id AS "tokenId", collection_id AS "collectionId", from_address AS "fromAddress", to_address AS "toAddress", created_at AS "createdAt" from transfers where token_id = '${transfer.tokenId}' and collection_id = '${transfer.collectionId}' and created_at < '${transfer.createdAt}' order by created_at desc limit 1;`
}

async function updateNFTsWithPreviousTransferIfExist(
  components: Pick<AppComponents, 'database'>,
  lastValidBlockTimestamp: number
) {
  const transfersToRollbackQuery = createTransfersToRollbackQuery(lastValidBlockTimestamp)

  const transfersToRollbackQueryResult = await components.database.queryRaw<Transfer>(transfersToRollbackQuery, {
    query: 'transfers_to_rollback'
  })

  const transfersToRollback = transfersToRollbackQueryResult.rows

  for (const transfer of transfersToRollback) {
    const previousTransferQuery = createPreviousTransferQuery(transfer)
    const previousTransferQueryResult = await components.database.queryRaw<Transfer>(previousTransferQuery, {
      query: 'previous_transfer'
    })

    if (previousTransferQueryResult.rows.length > 0) {
      const previousTransfer = previousTransferQueryResult.rows[0]
      console.log(`new owner from previous: ${previousTransfer.toAddress}`)
      console.log(`new updated_at from previous: ${previousTransfer.createdAt}`)
      const updateQuery = createUpdateNFTWithPreviousTransferQuery(previousTransfer)
      console.log(updateQuery)
    }
    // NOTE: If there is no previous transfer, it means that it's the first transfer of the nft. The first transfer is done at the same block of the nft minting.
    // So there's no need to update the owner of the nft as the nft and this transfer will be erased in the rollback later.
  }
}

async function deleteRowsInTableAfterTimestamp(
  components: Pick<AppComponents, 'database'>,
  tableName: string,
  timestamp: number
) {
  const query = `delete from ${tableName} where created_at > ${timestamp};`
  console.log(query)
  // await components.database.queryRaw(query, {
  //   query: `delete_${tableName}`
  // })
}

export async function rollbackFromBlockNumber(
  components: Pick<AppComponents, 'database'>,
  lastValidBlockNumber: number
): Promise<void> {
  const lastValidBlockTimestamp = await getLastValidBlockTimestamp(components, lastValidBlockNumber)

  await updateNFTsWithPreviousTransferIfExist(components, lastValidBlockTimestamp)

  await deleteRowsInTableAfterTimestamp(components, 'nfts', lastValidBlockTimestamp)
  await deleteRowsInTableAfterTimestamp(components, 'items', lastValidBlockTimestamp)
  await deleteRowsInTableAfterTimestamp(components, 'collections', lastValidBlockTimestamp)
  await deleteRowsInTableAfterTimestamp(components, 'transfers', lastValidBlockTimestamp)
  await deleteRowsInTableAfterTimestamp(components, 'blocks', lastValidBlockTimestamp)
}
