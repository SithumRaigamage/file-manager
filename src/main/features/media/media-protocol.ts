import { protocol } from 'electron'
import * as fs from 'fs'
import { Readable } from 'stream'
import { mediaMimeType, mediaPathFromUrl, parseRange } from '../../domain/shared/media-request'

/** Must run before `app.whenReady()` — Electron only accepts privileges then. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      // No bypassCSP / corsEnabled: pages may embed media, but not fetch() arbitrary bytes.
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

const deny = (status: number, message: string): Response => new Response(message, { status })

/**
 * Streams local audio/video for the in-app players. Serves only regular files
 * whose real path (after resolving symlinks) has an allow-listed media type, so
 * the scheme cannot be used to read documents, keys or other arbitrary files.
 */
export function registerMediaProtocol(): void {
  protocol.handle('media', async (request) => {
    const requested = mediaPathFromUrl(request.url)
    if (!requested) return deny(400, 'Invalid media URL')

    let realPath: string
    let size: number
    try {
      realPath = await fs.promises.realpath(requested)
      const stats = await fs.promises.stat(realPath)
      if (!stats.isFile()) return deny(404, 'Not found')
      size = stats.size
    } catch {
      return deny(404, 'Not found')
    }

    const mimeType = mediaMimeType(realPath)
    if (!mimeType || !mediaMimeType(requested)) return deny(403, 'Unsupported media type')

    const range = parseRange(request.headers.get('range'), size)
    if (range === 'unsatisfiable') {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }

    const { start, end } = range ?? { start: 0, end: size - 1 }
    const body = Readable.toWeb(
      fs.createReadStream(realPath, { start, end })
    ) as unknown as BodyInit
    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
      'Content-Type': mimeType
    })
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`)

    return new Response(body, { status: range ? 206 : 200, headers })
  })
}
