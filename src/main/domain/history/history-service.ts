import { db } from '../../db'
import { batchRecords } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { revertMoves, BatchItem } from './revert'

export type { BatchItem } from './revert'

export interface RevertSummary {
  reverted: number
  failed: Array<{ path: string; reason: string }>
}

export class HistoryService {
  /**
   * Logs a completed operation batch to the SQLite history log.
   */
  static logBatch(
    type: 'organize' | 'rename' | 'convert',
    items: BatchItem[],
    reversible: boolean
  ): string {
    const batchId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    db.insert(batchRecords)
      .values({
        id: batchId,
        type,
        timestamp,
        items,
        reversible
      })
      .run()

    return batchId
  }

  /**
   * Reverts a reversible batch (e.g. undoes a rename or organize operation).
   * Items that cannot be reverted safely (target gone, original location now
   * occupied) are kept in the batch so the user can resolve them and retry;
   * the batch is removed only once everything has been reverted.
   */
  static revertBatch(batchId: string): RevertSummary {
    const batch = db.select().from(batchRecords).where(eq(batchRecords.id, batchId)).get()
    if (!batch) {
      throw new Error(`Batch record ${batchId} not found`)
    }
    if (!batch.reversible) {
      throw new Error(`Batch record ${batchId} is not reversible (type: ${batch.type})`)
    }

    const items: BatchItem[] =
      typeof batch.items === 'string' ? JSON.parse(batch.items) : (batch.items as BatchItem[])
    const outcome = revertMoves(items)

    if (outcome.failed.length === 0) {
      db.delete(batchRecords).where(eq(batchRecords.id, batchId)).run()
    } else {
      db.update(batchRecords)
        .set({ items: outcome.failed.map((f) => f.item) })
        .where(eq(batchRecords.id, batchId))
        .run()
    }

    return {
      reverted: outcome.reverted.length,
      failed: outcome.failed.map((f) => ({ path: f.item.after, reason: f.reason }))
    }
  }

  /**
   * Retrieves the most recent batches for the UI.
   */
  static getRecentBatches(
    limit = 50,
    typeFilter?: 'organize' | 'rename' | 'convert'
  ): Array<typeof batchRecords.$inferSelect> {
    return db
      .select()
      .from(batchRecords)
      .where(typeFilter ? eq(batchRecords.type, typeFilter) : undefined)
      .orderBy(desc(batchRecords.timestamp))
      .limit(limit)
      .all()
  }
}
