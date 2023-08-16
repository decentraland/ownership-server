import { IMetricsComponent } from '@well-known-components/interfaces'
import { getDefaultHttpMetrics, validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as logsMetricsDeclarations } from '@well-known-components/logger'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logsMetricsDeclarations,
  test_ping_counter: {
    help: 'Count calls to ping',
    type: IMetricsComponent.CounterType,
    labelNames: ['pathname']
  },
  ownership_server_db_query_duration_seconds: {
    help: 'Histogram of query duration to the database in seconds per query',
    type: IMetricsComponent.HistogramType,
    labelNames: ['query', 'status', 'addresses', 'item_ids'] // status=(success|error)
  },
  ownership_server_rollbacked_transfers_total: {
    help: 'Histogram of rollback duration in seconds',
    type: IMetricsComponent.CounterType
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
