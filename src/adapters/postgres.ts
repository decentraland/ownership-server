import { IDatabase } from '@well-known-components/interfaces'
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg'
import { SQLStatement } from 'sql-template-strings'
import { AppComponents } from '../types'


async function sleep(time: number): Promise<void> {
  if (time <= 0) return
  return new Promise<void>((resolve) => setTimeout(resolve, time))
}

export type DatabaseResult<T> = {
  rows: T[],
  rowCount: number
}


export type Database = {
  start: () => Promise<void>,
  stop: () => Promise<void>,
  query: <T extends QueryResultRow>(query: SQLStatement) => Promise<DatabaseResult<T>>
  queryRaw: <T extends QueryResultRow>(query: string) => Promise<DatabaseResult<T>>
}

export function createDatabaseComponent(
  components: Pick<AppComponents, 'logs' | 'metrics'>,
  poolConfig: PoolConfig
): Database {
  const pool: Pool = new Pool(poolConfig)
  const logger = components.logs.getLogger('database-component')
  let didStop = false

  return {
    async start() {
      try {
        const db = await pool.connect()
        db.release()
      } catch (error) {
        logger.error('An error occurred trying to open the database. Did you run the migrations?')
        throw error
      }
    },
    async stop() {
      if (didStop) {
        logger.error('Stop called twice')
        return
      }
      didStop = true

      let gracePeriods = 10

      while (gracePeriods-- > 0 && pool.waitingCount) {
        logger.debug('Draining connections', {
          waitingCount: pool.waitingCount,
          gracePeriods
        })
        await sleep(200)
      }

      const promise = pool.end()
      let finished = false

      promise.then(() => (finished = true)).catch(() => (finished = true))

      while (!finished && pool.totalCount | pool.idleCount | pool.waitingCount) {
        if (pool.totalCount) {
          logger.log('Draining connections', {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
          })
          await sleep(1000)
        }
      }

      await promise
    },
    async query<T extends QueryResultRow>(sql: SQLStatement): Promise<DatabaseResult<T>> {
      console.log('performing query...')
      const rows = await pool.query<T>(sql)
      return {
        rows: rows.rows,
        rowCount: rows.rowCount
      }
    },
    async queryRaw<T extends QueryResultRow>(sql: string): Promise<DatabaseResult<T>> {
      const rows = await pool.query<T>(sql)
      return {
        rows: rows.rows,
        rowCount: rows.rowCount
      }
    }
  }
}
