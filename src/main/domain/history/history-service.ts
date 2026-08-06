import { db } from '../../db';
import { batchRecords } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

export interface BatchItem {
  before: string;
  after: string;
  status: 'success' | 'skipped' | 'failed';
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
    const batchId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    db.insert(batchRecords)
      .values({
        id: batchId,
        type,
        timestamp,
        items,
        reversible,
      })
      .run();

    return batchId;
  }

  /**
   * Reverts a reversible batch (e.g. undoes a rename or organize operation).
   * Moves files from their 'after' paths back to their 'before' paths.
   */
  static revertBatch(batchId: string): void {
    const rows = db.select().from(batchRecords).where(eq(batchRecords.id, batchId)).all();

    if (rows.length === 0) {
      throw new Error(`Batch record ${batchId} not found`);
    }

    const batch = rows[0];

    if (!batch.reversible) {
      throw new Error(`Batch record ${batchId} is not reversible (type: ${batch.type})`);
    }

    // items is stored as JSON
    let items: BatchItem[] = [];
    if (typeof batch.items === 'string') {
      items = JSON.parse(batch.items);
    } else {
      items = batch.items as unknown as BatchItem[];
    }

    // To revert, we iterate backwards in case of chained renames that depend on order
    // But since this is a single batch, order mostly matters if files were swapped, which we handle by basic rename.
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.status === 'success' && item.before !== item.after) {
        if (fs.existsSync(item.after)) {
          // Ensure parent directory exists for the 'before' path (in case it was deleted, though unlikely)
          const beforeDir = path.dirname(item.before);
          if (!fs.existsSync(beforeDir)) {
            fs.mkdirSync(beforeDir, { recursive: true });
          }

          try {
            fs.renameSync(item.after, item.before);
          } catch (err) {
            console.error(`[HistoryService] Failed to revert ${item.after} to ${item.before}:`, err);
            // In a more robust system, we would mark this item as failed in the DB
          }
        } else {
          console.warn(`[HistoryService] Cannot revert: target file ${item.after} does not exist`);
        }
      }
    }

    // Once reverted, we can either delete the batch record or mark it as reverted.
    // For MVP, we delete the record to clean up the undo stack.
    db.delete(batchRecords).where(eq(batchRecords.id, batchId)).run();
  }

  /**
   * Retrieves the most recent batches for the UI.
   */
  static getRecentBatches(limit = 50, typeFilter?: 'organize' | 'rename' | 'convert') {
    let query = db.select().from(batchRecords).orderBy(desc(batchRecords.timestamp)).limit(limit);

    if (typeFilter) {
      // Drizzle ORM doesn't easily support dynamic where with sqlite if we don't chain it conditionally cleanly.
      // But we can do:
      return db
        .select()
        .from(batchRecords)
        .where(eq(batchRecords.type, typeFilter))
        .orderBy(desc(batchRecords.timestamp))
        .limit(limit)
        .all();
    }

    return query.all();
  }
}
