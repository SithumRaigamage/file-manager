import * as fs from 'fs'

/**
 * Minimal ISO-BMFF (MP4) box walker. Reads only 8/16-byte box headers, never
 * payloads, so it is cheap even on multi-GB files.
 */

export interface Box {
  type: string
  size: number
  offset: number
  children?: Box[]
}

export type ContainerValidation = 'healthy' | 'warning' | 'corrupted'

function parseSubBoxes(fd: number, startOffset: number, endOffset: number): Box[] {
  const boxes: Box[] = []
  let offset = startOffset
  const buf = Buffer.alloc(8)

  // Sub-box containers we care about parsing recursively
  const containerTypes = ['moov', 'trak', 'mdia', 'minf', 'stbl']

  while (offset < endOffset) {
    if (endOffset - offset < 8) break
    try {
      fs.readSync(fd, buf, 0, 8, offset)
      let size = buf.readUInt32BE(0)
      const type = buf.toString('ascii', 4, 8)

      let boxHeaderSize = 8
      if (size === 1) {
        if (endOffset - offset < 16) break
        const sizeBuf = Buffer.alloc(8)
        fs.readSync(fd, sizeBuf, 0, 8, offset + 8)
        const hi = sizeBuf.readUInt32BE(0)
        const lo = sizeBuf.readUInt32BE(4)
        size = hi * 4294967296 + lo
        boxHeaderSize = 16
      } else if (size === 0) {
        size = endOffset - offset
      }

      if (size <= 0 || offset + size > endOffset) {
        break
      }

      // Check if type looks like standard ASCII alphanumeric
      if (/^[a-zA-Z0-9 ]{4}$/.test(type)) {
        const box: Box = { type, size, offset }
        if (containerTypes.includes(type)) {
          box.children = parseSubBoxes(fd, offset + boxHeaderSize, offset + size)
        }
        boxes.push(box)
      } else {
        break
      }

      offset += size
    } catch {
      break
    }
  }
  return boxes
}

export function parseRootBoxes(filePath: string): { boxes: Box[]; error?: string } {
  const boxes: Box[] = []
  let fd: number
  try {
    fd = fs.openSync(filePath, 'r')
  } catch (err) {
    return { boxes, error: (err as Error).message }
  }

  try {
    const stats = fs.fstatSync(fd)
    const fileSize = stats.size
    let offset = 0
    const buf = Buffer.alloc(8)

    while (offset < fileSize) {
      if (fileSize - offset < 8) break
      fs.readSync(fd, buf, 0, 8, offset)
      let size = buf.readUInt32BE(0)
      const type = buf.toString('ascii', 4, 8)

      let boxHeaderSize = 8
      if (size === 1) {
        if (fileSize - offset < 16) break
        const sizeBuf = Buffer.alloc(8)
        fs.readSync(fd, sizeBuf, 0, 8, offset + 8)
        const hi = sizeBuf.readUInt32BE(0)
        const lo = sizeBuf.readUInt32BE(4)
        size = hi * 4294967296 + lo
        boxHeaderSize = 16
      } else if (size === 0) {
        size = fileSize - offset
      }

      if (size <= 0 || offset + size > fileSize) {
        break
      }

      if (/^[a-zA-Z0-9 ]{4}$/.test(type)) {
        const box: Box = { type, size, offset }
        if (['moov', 'trak'].includes(type)) {
          box.children = parseSubBoxes(fd, offset + boxHeaderSize, offset + size)
        }
        boxes.push(box)
      } else {
        // Stop if we encounter non-standard box headers to prevent infinite parsing
        break
      }

      offset += size
    }
    return { boxes }
  } catch (err) {
    return { boxes, error: (err as Error).message }
  } finally {
    try {
      fs.closeSync(fd)
    } catch {
      // ignore
    }
  }
}

export function flattenBoxes(boxes: Box[], prefix = ''): string[] {
  const result: string[] = []
  for (const box of boxes) {
    const name = prefix ? `${prefix}/${box.type}` : box.type
    result.push(name)
    if (box.children) {
      result.push(...flattenBoxes(box.children, name))
    }
  }
  return result
}

/**
 * Classifies container health from the flattened atom list: missing ftyp/moov
 * (or a parse error) is corrupted; moov after mdat is a non-faststart warning.
 */
export function validateContainer(atoms: string[], parseError?: string): ContainerValidation {
  if (parseError || !atoms.includes('moov') || !atoms.includes('ftyp')) {
    return 'corrupted'
  }
  const mdatIdx = atoms.findIndex((t) => t.endsWith('mdat'))
  const moovIdx = atoms.findIndex((t) => t.endsWith('moov'))
  if (moovIdx !== -1 && mdatIdx !== -1 && moovIdx > mdatIdx) {
    return 'warning'
  }
  return 'healthy'
}
