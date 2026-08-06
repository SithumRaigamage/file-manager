import { pruneOldHistoryRecords } from '../db/history-repo';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
let pruneIntervalId: NodeJS.Timeout | null = null;

export function initializeScheduler(): void {
  // Run once on startup after a small delay to avoid blocking initial UI render
  setTimeout(() => {
    runPruner();
  }, 10000); // 10 seconds

  // Then run periodically (e.g., once every 24 hours)
  pruneIntervalId = setInterval(() => {
    runPruner();
  }, TWENTY_FOUR_HOURS);
}

export function stopScheduler(): void {
  if (pruneIntervalId) {
    clearInterval(pruneIntervalId);
    pruneIntervalId = null;
  }
}

async function runPruner(): Promise<void> {
  try {
    const deletedCount = await pruneOldHistoryRecords();
    if (deletedCount > 0) {
      console.log(`[Scheduler] Pruned ${deletedCount} old history records.`);
    }
  } catch (error) {
    console.error(`[Scheduler] Failed to prune history records:`, error);
  }
}
