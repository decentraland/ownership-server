import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { pingHandler } from './handlers/ping-handler'
import { ownsItemsHandler } from './handlers/owns-items-handler'
import { errorHandler } from './handlers/error-handler'
import { ownedItemsAtTimestampHandler } from './handlers/owned-items-at-timestamp-handler'
import { ownsItemUrnsByAddressHandler } from './handlers/owns-items-by-address-handler'
import { rollbackHandler } from './handlers/rollback-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()
  router.use(errorHandler)

  router.get('/ping', pingHandler)
  router.get('/ownsItems', ownsItemsHandler)
  router.get('/ownedItemsAtTimestamp', ownedItemsAtTimestampHandler)
  router.post('/ownsItemsByAddress', ownsItemUrnsByAddressHandler)
  router.get('/rollback', rollbackHandler)

  return router
}
