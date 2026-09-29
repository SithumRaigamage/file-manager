import * as path from 'path'

/** The only file types `media://` will serve. Anything else is refused. */
const MEDIA_MIME_TYPES: Readonly<Record<string, string>> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4'
}

/** Fixed URL host; the file path travels percent-encoded in the pathname. */
export const MEDIA_URL_HOST = 'local'

export function mediaMimeType(filePath: string): string | undefined {
  return MEDIA_MIME_TYPES[path.extname(filePath).toLowerCase()]
}

/** `media://local/<encodeURIComponent(absolutePath)>` → absolute path, or null. */
export function mediaPathFromUrl(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'media:' || url.host !== MEDIA_URL_HOST) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(url.pathname.slice(1))
  } catch {
    return null
  }
  return path.isAbsolute(decoded) ? path.normalize(decoded) : null
}

export type ByteRange = { start: number; end: number }

/**
 * Parses a single-range `Range` header (RFC 9110): `bytes=a-b`, `bytes=a-`,
 * `bytes=-suffix`. Returns null when there is no usable header (serve the whole
 * file) and 'unsatisfiable' for a syntactically valid range outside the file.
 */
export function parseRange(
  header: string | null,
  size: number
): ByteRange | 'unsatisfiable' | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return null

  let start: number
  let end: number
  if (match[1] === '') {
    const suffix = Number(match[2])
    if (suffix === 0) return 'unsatisfiable'
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  }

  if (start >= size || start > end) return 'unsatisfiable'
  return { start, end }
}
