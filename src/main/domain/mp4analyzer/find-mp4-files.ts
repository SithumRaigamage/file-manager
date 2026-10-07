import { walkDirectoryAsync } from '../shared/directory-walker'

export interface Mp4FileSearch {
  files: string[]
  /** Subfolders that could not be read and were skipped. */
  unreadable: string[]
}

/** Errors a user can fix by granting access, rather than a broken path. */
const PERMISSION_CODES = new Set(['EPERM', 'EACCES'])

export class FolderNotReadableError extends Error {
  readonly folderPath: string
  readonly code: string | undefined

  constructor(folderPath: string, code: string | undefined) {
    super(
      code && PERMISSION_CODES.has(code)
        ? `FileFlow doesn't have permission to read "${folderPath}". On macOS, allow access in System Settings → Privacy & Security → Files and Folders (or Full Disk Access), then try again.`
        : `"${folderPath}" could not be read (${code ?? 'unknown error'}).`
    )
    this.name = 'FolderNotReadableError'
    this.folderPath = folderPath
    this.code = code
  }
}

/**
 * Finds every .mp4 under `root`. Subfolders that can't be read — e.g. macOS
 * privacy-protected ones like ~/Movies/TV (the Apple TV library) — are skipped
 * and reported instead of failing the whole scan. Only an unreadable `root`
 * throws, since then there is nothing to scan.
 */
export async function findMp4Files(root: string): Promise<Mp4FileSearch> {
  const files: string[] = []
  const unreadable: string[] = []
  let rootError: NodeJS.ErrnoException | null = null

  await walkDirectoryAsync(root, {
    onEntry: (fullPath, entry) => {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp4')) files.push(fullPath)
    },
    onUnreadable: (dirPath, error) => {
      if (dirPath === root) rootError = error
      else unreadable.push(dirPath)
    }
  })

  if (rootError) throw new FolderNotReadableError(root, (rootError as NodeJS.ErrnoException).code)
  return { files: files.sort(), unreadable: unreadable.sort() }
}
