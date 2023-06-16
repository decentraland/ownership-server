// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createRunner, createLocalFetchCompoment } from '@well-known-components/test-helpers'

import { main } from '../src/service'
import { TestComponents } from '../src/types'
import { initComponents as originalInitComponents } from '../src/components'
import { Database } from '../src/adapters/postgres'

function createTestDatabase(): Database {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    query: jest.fn(),
    queryRaw: jest.fn()
  }
}

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */
export const test = createRunner<TestComponents>({
  main,
  initComponents
})

async function initComponents(): Promise<TestComponents> {
  const components = await originalInitComponents()

  const { config } = components

  const database = createTestDatabase()

  return {
    ...components,
    database,
    localFetch: await createLocalFetchCompoment(config)
  }
}
