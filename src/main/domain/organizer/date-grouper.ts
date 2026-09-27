const DATE_BUCKET_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Local-time (not UTC) YYYY-MM-DD bucket for a file/folder's own mtime, so a file
 * modified at 11pm lands in the day the user actually experienced, not UTC's next day.
 */
export function dateBucketName(mtime: Date): string {
  const year = mtime.getFullYear();
  const month = String(mtime.getMonth() + 1).padStart(2, '0');
  const day = String(mtime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Guards against re-sweeping a previously-created date bucket into itself
 * when "Organize by Date" is run again on the same folder.
 */
export function isDateBucketName(name: string): boolean {
  return DATE_BUCKET_PATTERN.test(name);
}
