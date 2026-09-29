import path from 'path'

export type ResolutionPlan = { ok: true; toTrash: string[] } | { ok: false; reason: string }

/**
 * Validates a "keep one, remove the rest" request against the group's own file
 * list. The renderer only chooses; the main process decides what may be removed,
 * so a bad or stale request can never touch a file outside the group, or remove
 * every copy of the data.
 */
export function planDuplicateResolution(
  groupFiles: string[],
  keepPath: string,
  deletePaths: string[],
  keepExistsOnDisk: boolean
): ResolutionPlan {
  const norm = (p: string): string => path.resolve(p)
  const group = new Set(groupFiles.map(norm))
  const keep = norm(keepPath)

  if (!group.has(keep)) {
    return { ok: false, reason: 'The file to keep is not part of this duplicate group' }
  }
  if (!keepExistsOnDisk) {
    return {
      ok: false,
      reason: 'The file to keep no longer exists, so its duplicates were not removed'
    }
  }

  const toTrash = [...new Set(deletePaths.map(norm))]
  if (toTrash.length === 0) {
    return { ok: false, reason: 'No duplicates selected for removal' }
  }
  if (toTrash.includes(keep)) {
    return { ok: false, reason: 'The file to keep cannot also be removed' }
  }
  const outside = toTrash.find((p) => !group.has(p))
  if (outside) {
    return { ok: false, reason: `Not part of this duplicate group: ${outside}` }
  }

  return { ok: true, toTrash }
}
