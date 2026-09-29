import fs from 'fs'
import path from 'path'

/**
 * True when `child` is `parent` itself or lies anywhere beneath it.
 * Both paths are resolved first so `a/b/../c` style input can't slip past.
 */
export function isSameOrInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * Moves a file or directory. Uses an atomic rename when possible and falls back
 * to copy-then-delete ONLY for cross-device moves (EXDEV). Any other failure
 * (permissions, missing source, busy file) is rethrown untouched — falling back
 * on those would half-copy data and then delete the original.
 *
 * Never overwrites: throws if `dest` already exists.
 */
export function movePath(source: string, dest: string): void {
  if (fs.existsSync(dest)) {
    throw new Error(`Destination already exists: ${dest}`)
  }
  if (isSameOrInside(source, dest)) {
    throw new Error(`Cannot move "${source}" into itself`)
  }

  try {
    fs.renameSync(source, dest)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err

    // Cross-device: copy fully first, delete the source only once the copy succeeded.
    fs.cpSync(source, dest, { recursive: true, errorOnExist: true, force: false })
    fs.rmSync(source, { recursive: true })
  }
}
