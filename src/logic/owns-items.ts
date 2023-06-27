import { BlockchainCollectionV2Asset } from '@dcl/urn-resolver'
import { AppComponents } from '../types'
import { ownsItemsByAddress } from './owns-items-by-address'

export async function ownsItems(
  components: Pick<AppComponents, 'database'>,
  address: string,
  itemUrns: BlockchainCollectionV2Asset[]
) {
  if (itemUrns.length === 0) {
    return []
  }

  const ownedItemUrnsByAddress = await ownsItemsByAddress(components, [{ address, itemUrns }])

  return ownedItemUrnsByAddress[0].itemUrns
}
