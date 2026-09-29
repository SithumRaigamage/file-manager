import { test, expect } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  findMp4Files,
  FolderNotReadableError
} from '../../src/main/domain/mp4analyzer/find-mp4-files'

// Regression: one unreadable subfolder (macOS-protected ~/Movies/TV → EPERM)
// used to abort the whole MP4 folder scan.
test.describe('findMp4Files', () => {
  let root: string
  let locked: string

  test.beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-find-mp4-'))
    fs.mkdirSync(path.join(root, 'a/b'), { recursive: true })
    fs.writeFileSync(path.join(root, 'top.MP4'), '')
    fs.writeFileSync(path.join(root, 'a/b/deep.mp4'), '')
    fs.writeFileSync(path.join(root, 'a/notes.txt'), '')
    locked = path.join(root, 'locked')
    fs.mkdirSync(locked)
    fs.writeFileSync(path.join(locked, 'hidden.mp4'), '')
    fs.chmodSync(locked, 0o000)
  })

  test.afterEach(() => {
    fs.chmodSync(locked, 0o755)
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('skips and reports unreadable subfolders instead of failing', async () => {
    test.skip(process.getuid?.() === 0, 'root can read any folder')
    const result = await findMp4Files(root)
    expect(result.files.map((f) => path.relative(root, f))).toEqual([
      path.join('a', 'b', 'deep.mp4'),
      'top.MP4'
    ])
    expect(result.unreadable).toEqual([locked])
  })

  test('an unreadable root throws a helpful permission error', async () => {
    test.skip(process.getuid?.() === 0, 'root can read any folder')
    const error = await findMp4Files(locked).catch((e) => e)
    expect(error).toBeInstanceOf(FolderNotReadableError)
    expect(error.message).toMatch(/permission/i)
  })

  test('the real ~/Movies folder scans without failing (local only)', async () => {
    const movies = path.join(os.homedir(), 'Movies')
    test.skip(!fs.existsSync(movies), 'no ~/Movies here')
    const result = await findMp4Files(movies)
    console.log(`~/Movies: ${result.files.length} mp4(s); skipped:`, result.unreadable)
    expect(Array.isArray(result.files)).toBe(true)
  })
})
