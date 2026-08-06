import fs from 'fs';
import path from 'path';

const IGNORED_EXTENSIONS = new Set(['.crdownload', '.part', '.tmp', '.download']);

export class FileStabilityChecker {
  /**
   * Checks if a file is stable (not actively being written to)
   * Polling strategy: check size every 500ms. If unchanged for 3 consecutive checks (1.5s total wait),
   * consider it stable.
   */
  static async waitUntilStable(filePath: string, maxWaitMs = 60000): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) {
      return false;
    }

    return new Promise((resolve) => {
      let lastSize = -1;
      let unchangedCount = 0;
      let elapsedMs = 0;
      const pollIntervalMs = 500;
      const requiredUnchangedChecks = 3;

      const timer = setInterval(() => {
        elapsedMs += pollIntervalMs;
        if (elapsedMs >= maxWaitMs) {
          clearInterval(timer);
          resolve(false); // Timed out before becoming stable
          return;
        }

        try {
          const stats = fs.statSync(filePath);
          if (lastSize === stats.size) {
            unchangedCount++;
            if (unchangedCount >= requiredUnchangedChecks) {
              clearInterval(timer);
              resolve(true); // Stable
            }
          } else {
            lastSize = stats.size;
            unchangedCount = 0; // Reset if size changed
          }
        } catch (error) {
          // File might be locked or deleted before we could read stats
          clearInterval(timer);
          resolve(false);
        }
      }, pollIntervalMs);
    });
  }
}
