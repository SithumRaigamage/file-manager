import { isSameOrInside } from '../shared/move-path'

export interface PathItem {
  fullPath: string
}

/**
 * Turns raw per-keyword matches into a safe move plan:
 * - an item matching several keywords goes to the FIRST keyword only;
 * - an item inside another planned item is dropped (it moves with its parent);
 * - an item that contains the destination root, or already sits inside it,
 *   is dropped (it would be moved into itself, or is already organized).
 */
export function planKeywordCollection<T extends PathItem>(
  resultsByKeyword: Record<string, T[]>,
  keywordOrder: string[],
  destRoot: string
): Record<string, T[]> {
  const claimed = new Set<string>()
  const assigned: Array<{ keyword: string; item: T }> = []

  for (const keyword of keywordOrder) {
    for (const item of resultsByKeyword[keyword] ?? []) {
      if (claimed.has(item.fullPath)) continue
      if (isSameOrInside(item.fullPath, destRoot) || isSameOrInside(destRoot, item.fullPath)) {
        continue
      }
      claimed.add(item.fullPath)
      assigned.push({ keyword, item })
    }
  }

  const plan: Record<string, T[]> = Object.fromEntries(keywordOrder.map((k) => [k, [] as T[]]))
  for (const { keyword, item } of assigned) {
    const hasPlannedAncestor = assigned.some(
      (other) => other.item !== item && isSameOrInside(other.item.fullPath, item.fullPath)
    )
    if (!hasPlannedAncestor) plan[keyword].push(item)
  }
  return plan
}
