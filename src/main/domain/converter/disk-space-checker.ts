import fs from 'fs';
import path from 'path';

export class DiskSpaceChecker {
  /**
   * Checks if the drive containing the given path has at least `requiredBytes` free space.
   * Uses Node's fs.statfs (available in Node >= 19.6.0).
   */
  static async hasEnoughSpace(targetPath: string, requiredBytes: number): Promise<boolean> {
    try {
      // Ensure target directory exists to check its drive
      const dirPath = fs.existsSync(targetPath) ? targetPath : path.dirname(targetPath);
      
      if (!fs.existsSync(dirPath)) {
        // If parent doesn't exist, we fallback to true since we can't easily check
        // without walking up the tree, and the conversion job will just fail if it runs out of space.
        return true; 
      }

      const stats = await fs.promises.statfs(dirPath);
      // bavail is free blocks available to unprivileged user
      // bsize is fundamental file system block size
      const freeSpaceBytes = stats.bavail * stats.bsize;

      return freeSpaceBytes > requiredBytes;
    } catch (err) {
      console.warn('[DiskSpaceChecker] Failed to check disk space:', err);
      // Fail open if we cannot check disk space
      return true;
    }
  }

  /**
   * Extremely rough estimate: output size is usually less than input size for most standard
   * web/archival presets. If we assume a worst case of output being 1.5x input size.
   */
  static estimateRequiredBytes(inputFilePath: string): number {
    try {
      const stats = fs.statSync(inputFilePath);
      return stats.size * 1.5;
    } catch {
      return 100 * 1024 * 1024; // Default guess 100MB if we can't read file
    }
  }
}
