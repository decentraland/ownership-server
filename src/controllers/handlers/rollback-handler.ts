import { rollbackToLastValidBlockNumber } from '../../logic/rollback-to-last-valid-block-number'
import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError } from './error-handler'

type CuratedInput = {
  lastValidBlock: number
}

async function parseInput(context: HandlerContextWithPath<'metrics' | 'database', '/rollback'>): Promise<CuratedInput> {
  const lastValidBlock = context.url.searchParams.get('last_valid_block')

  if (!lastValidBlock) {
    throw new InvalidRequestError('Missing parameter')
  }

  const parsedlastValidBlock = Number(lastValidBlock)
  if (isNaN(parsedlastValidBlock)) {
    throw new InvalidRequestError(`Invalid last valid block: ${lastValidBlock}`)
  }

  return {
    lastValidBlock: parsedlastValidBlock
  }
}

// handlers arguments only type what they need, to make unit testing easier
export async function rollbackHandler(context: HandlerContextWithPath<'database' | 'logs' | 'metrics', '/rollback'>) {
  const curatedInput = await parseInput(context)
  console.log(curatedInput)
  await rollbackToLastValidBlockNumber(context.components, curatedInput.lastValidBlock)
  return {
    body: {
      lastValidBlock: curatedInput.lastValidBlock
    }
  }
}
