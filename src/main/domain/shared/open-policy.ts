import * as path from 'path'

/**
 * Extensions that launch or execute code when "opened" by the OS shell
 * (apps, installers, scripts, shortcuts). Opening them from a file manager must
 * go through the user's own Finder/Explorer action, never an app IPC call.
 */
const LAUNCHABLE_EXTENSIONS = new Set([
  // macOS bundles & scripts
  '.app',
  '.command',
  '.tool',
  '.terminal',
  '.workflow',
  '.action',
  '.scpt',
  '.scptd',
  '.applescript',
  '.osax',
  '.prefpane',
  '.pkg',
  '.mpkg',
  '.webloc',
  '.inetloc',
  '.fileloc',
  // Windows
  '.exe',
  '.com',
  '.bat',
  '.cmd',
  '.msi',
  '.msp',
  '.scr',
  '.pif',
  '.cpl',
  '.hta',
  '.jse',
  '.vbs',
  '.vbe',
  '.wsf',
  '.wsh',
  '.ps1',
  '.psm1',
  '.reg',
  '.lnk',
  '.url',
  '.appref-ms',
  '.js',
  '.jar',
  '.gadget',
  '.msc',
  '.application',
  // Unix
  '.sh',
  '.bash',
  '.zsh',
  '.csh',
  '.ksh',
  '.run',
  '.bin',
  '.desktop',
  '.appimage'
])

export interface OpenTarget {
  path: string
  isDirectory: boolean
  /** Regular file with an execute permission bit (POSIX). */
  isExecutable: boolean
}

/** Why a path must not be opened with the default app, or null when it is safe. */
export function openBlockReason(target: OpenTarget): string | null {
  const ext = path.extname(target.path).toLowerCase()
  if (LAUNCHABLE_EXTENSIONS.has(ext)) {
    return 'Applications, installers and scripts cannot be opened from FileFlow. Use "Show in folder" instead.'
  }
  if (!target.isDirectory && target.isExecutable) {
    return 'Executable files cannot be opened from FileFlow. Use "Show in folder" instead.'
  }
  return null
}

/** Only web links may be handed to the system browser. */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const { protocol } = new URL(rawUrl)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}
