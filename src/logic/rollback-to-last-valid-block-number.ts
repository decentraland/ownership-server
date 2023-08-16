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

function createTransfersAfterTimestampQuery(timestamp: number) {
  return `select token_id AS "tokenId", collection_id AS "collectionId", from_address AS "fromAddress", to_address AS "toAddress", created_at AS "createdAt" from transfers where created_at > ${timestamp} order by created_at desc;`
}

function createUpdateNFTWithPreviousTransferQuery(transfer: Transfer) {
  return `update nfts set owner = '${transfer.toAddress}', updated_at = ${transfer.createdAt} where id = '${transfer.collectionId}-${transfer.tokenId}';`
}

function createPreviousTransferQuery(transfer: Transfer) {
  return `select token_id AS "tokenId", collection_id AS "collectionId", from_address AS "fromAddress", to_address AS "toAddress", created_at AS "createdAt" from transfers where token_id = '${transfer.tokenId}' and collection_id = '${transfer.collectionId}' and created_at < '${transfer.createdAt}' order by created_at desc limit 1;`
}

async function rollbackTransfer(components: Pick<AppComponents, 'database'>, transfer: Transfer) {
  const previousTransferQuery = createPreviousTransferQuery(transfer)
  const previousTransferQueryResult = await components.database.queryRaw<Transfer>(previousTransferQuery, {
    query: 'previous_transfer'
  })

  // NOTE: If there is no previous transfer, it means that it's the first transfer of the nft. The first transfer is done at the same block of the nft minting.
  // So there's no need to update the owner of the nft as the nft and this transfer will be erased in the rollback later.
  if (previousTransferQueryResult.rows.length > 0) {
    const previousTransfer = previousTransferQueryResult.rows[0]
    console.log(`new owner from previous: ${previousTransfer.toAddress}`)
    console.log(`new updated_at from previous: ${previousTransfer.createdAt}`)
    const updateQuery = createUpdateNFTWithPreviousTransferQuery(previousTransfer)
    console.log(updateQuery)
    await components.database.queryRaw(updateQuery, {
      query: `update_owner`
    })
  }
}

async function updateNFTsWithLastTransferBeforeTimestampIfExist(
  components: Pick<AppComponents, 'database' | 'metrics'>,
  lastValidBlockTimestamp: number
) {
  const transfersAfterTimestampQuery = createTransfersAfterTimestampQuery(lastValidBlockTimestamp)

  const orderedTransfersAfterTimestampQueryResult = await components.database.queryRaw<Transfer>(
    transfersAfterTimestampQuery,
    {
      query: 'transfers_after_timestamp'
    }
  )

  const seenTokenIds = new Set<string>()
  const transfersToRollback = []
  // Note: It's important that transfers are order from the most recent to the oldest. This is because if the same nft
  // has been transferred multiple times after the last valid block timestamp, the previous of the oldest one (the last one in the sorted desc array) must take effect.
  for (const transfer of orderedTransfersAfterTimestampQueryResult.rows) {
    if (seenTokenIds.has(transfer.tokenId)) {
      // the NFT was already transfer in a previous transfer, so we can skip this one
      continue
    }
    seenTokenIds.add(transfer.tokenId)
    transfersToRollback.push(transfer)
  }

  await Promise.all(transfersToRollback.map((transfer) => rollbackTransfer(components, transfer)))
  components.metrics.increment('ownership_server_rollbacked_transfers_total', {}, transfersToRollback.length)
}

async function deleteRowsInTableAfterTimestamp(
  components: Pick<AppComponents, 'database'>,
  tableName: string,
  timestamp: number
) {
  const query = `delete from ${tableName} where created_at > ${timestamp};`
  console.log(query)
  await components.database.queryRaw(query, {
    query: `delete_${tableName}`
  })
}

async function deleteBlocksAfterTimestamp(components: Pick<AppComponents, 'database'>, timestamp: number) {
  const query = `delete from blocks where block_timestamp > ${timestamp};`
  console.log(query)
  await components.database.queryRaw(query, {
    query: `delete_blocks`
  })
}

export async function rollbackToLastValidBlockNumber(
  components: Pick<AppComponents, 'database'>,
  lastValidBlockNumber: number
): Promise<void> {
  const lastValidBlockTimestamp = await getLastValidBlockTimestamp(components, lastValidBlockNumber)
  // TODO: make the rollback transactional
  await updateNFTsWithLastTransferBeforeTimestampIfExist(components, lastValidBlockTimestamp)
  await Promise.all([
    deleteRowsInTableAfterTimestamp(components, 'nfts', lastValidBlockTimestamp),
    deleteRowsInTableAfterTimestamp(components, 'items', lastValidBlockTimestamp),
    deleteRowsInTableAfterTimestamp(components, 'collections', lastValidBlockTimestamp),
    deleteRowsInTableAfterTimestamp(components, 'transfers', lastValidBlockTimestamp),
    deleteBlocksAfterTimestamp(components, lastValidBlockTimestamp)
  ])
}
