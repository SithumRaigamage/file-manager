import fs from 'fs'
import path from 'path'
import { movePathAsync } from '../shared/move-path'

export interface BatchItem {
  before: string
  after: string
  status: 'success' | 'skipped' | 'failed'
}

export interface RevertFailure {
  item: BatchItem
  reason: string
}

export interface RevertOutcome {
  reverted: BatchItem[]
  failed: RevertFailure[]
}

/**
 * Moves every successful item in a batch from `after` back to `before`, newest
 * first so chained moves unwind in order.
 *
 * Safety rules:
 * - never overwrites: if something now exists at `before`, that item is left
 *   alone and reported, instead of silently replacing the newer file;
 * - one failure never aborts the rest; every failure is returned so the caller
 *   can keep those items undoable.
 */
export async function revertMoves(items: BatchItem[]): Promise<RevertOutcome> {
  const outcome: RevertOutcome = { reverted: [], failed: [] }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.status !== 'success' || item.before === item.after) continue

    if (!fs.existsSync(item.after)) {
      outcome.failed.push({ item, reason: `No longer found at ${item.after}` })
      continue
    }
    if (fs.existsSync(item.before)) {
      outcome.failed.push({
        item,
        reason: `Something already exists at the original location ${item.before}`
      })
      continue
    }

    try {
      await fs.promises.mkdir(path.dirname(item.before), { recursive: true })
      await movePathAsync(item.after, item.before)
      outcome.reverted.push(item)
    } catch (err) {
      outcome.failed.push({ item, reason: (err as Error).message })
    }
  }

  return outcome
}
