import { shell } from 'electron'

export interface TrashResult {
  trashed: string[]
  failed: Array<{ path: string; reason: string }>
}

/**
 * Moves files to the OS Trash / Recycle Bin instead of deleting them, so every
 * removal stays recoverable by the user. Each path is attempted independently;
 * one failure never stops the rest.
 */
export async function moveToTrash(paths: string[]): Promise<TrashResult> {
  const result: TrashResult = { trashed: [], failed: [] }
  for (const p of paths) {
    try {
      await shell.trashItem(p)
      result.trashed.push(p)
    } catch (err) {
      result.failed.push({ path: p, reason: (err as Error).message })
    }
  }
  return result
}
