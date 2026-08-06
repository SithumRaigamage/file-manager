import { eq, lt } from 'drizzle-orm';
import { db } from './index';
import { batchRecords, appSettings } from './schema';

export async function pruneOldHistoryRecords(): Promise<number> {
  // 1. Get the configured retention days
  const settingsRows = db.select().from(appSettings).where(eq(appSettings.id, 'default')).all();
  
  // Default to 90 if settings not initialized
  const retentionDays = settingsRows.length > 0 ? settingsRows[0].historyRetentionDays : 90;

  if (retentionDays <= 0) {
    // 0 or negative could imply "keep forever", or if you want it to mean "delete all",
    // adjust accordingly. Assuming <= 0 means keep forever.
    return 0;
  }

  // 2. Calculate the cutoff timestamp (ISO string)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIsoString = cutoffDate.toISOString();

  // 3. Delete records older than the cutoff
  const result = db.delete(batchRecords)
    .where(lt(batchRecords.timestamp, cutoffIsoString))
    .run();
  
  return result.changes;
}
