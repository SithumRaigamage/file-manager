import fs from 'fs'
import path from 'path'

/**
 * Appends " (n)" before the extension, incrementing n until `isTaken` returns false.
 * Shared by both on-disk conflict resolution (resolveUniquePath) and in-memory
 * batch collision resolution (e.g. RenameEvaluator's intra-batch dedup).
 */
export function resolveUniqueName(
  baseName: string,
  ext: string,
  isTaken: (candidate: string) => boolean
): string {
  const original = `${baseName}${ext}`
  if (!isTaken(original)) return original

  let counter = 1
  let candidate = `${baseName} (${counter})${ext}`
  while (isTaken(candidate)) {
    counter++
    candidate = `${baseName} (${counter})${ext}`
  }
  return candidate
}

/**
 * Resolves a destination path to one that doesn't already exist on disk,
 * suffixing " (1)", " (2)", ... before the extension as needed.
 */
export function resolveUniquePath(destPath: string): string {
  const dir = path.dirname(destPath)
  const ext = path.extname(destPath)
  const base = path.basename(destPath, ext)
  const name = resolveUniqueName(base, ext, (candidate) => fs.existsSync(path.join(dir, candidate)))
  return path.join(dir, name)
}
