/**
 * URL for the main process's `media://` player protocol. The whole path is
 * percent-encoded under a fixed host, so spaces, `#`, `?` and Windows drive
 * letters survive intact.
 */
export function toMediaUrl(filePath: string): string {
  return `media://local/${encodeURIComponent(filePath)}`
}
