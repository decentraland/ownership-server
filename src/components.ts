import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createFetchComponent } from './adapters/fetch'
import { createMetricsComponent, instrumentHttpServerWithMetrics } from '@well-known-components/metrics'
import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { createDatabaseComponent } from './adapters/postgres'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })
  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const logs = await createLogComponent({ metrics })
  const server = await createServerComponent<GlobalContext>({ config, logs }, {})
  const statusChecks = await createStatusCheckComponent({ server, config })
  const fetch = await createFetchComponent()

  const postgresHost = await config.requireString('POSTGRES_HOST')
  const postgresPort = await config.requireNumber('POSTGRES_PORT')
  const postgresDatabase = await config.requireString('POSTGRES_DATABASE')
  const postgresUser = await config.requireString('POSTGRES_USER')
  const postgresPass = await config.requireString('POSTGRES_PASS')

  const database = createDatabaseComponent(
    { logs, metrics },
    {
      port: postgresPort,
      host: postgresHost,
      database: postgresDatabase,
      user: postgresUser,
      password: postgresPass
    }
  )

  await instrumentHttpServerWithMetrics({ metrics, server, config })

  return {
    config,
    logs,
    server,
    statusChecks,
    fetch,
    metrics,
    database
  }
}
