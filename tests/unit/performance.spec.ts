import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { walkDirectory, walkDirectoryAsync } from '../../src/main/domain/shared/directory-walker'
import { movePathAsync } from '../../src/main/domain/shared/move-path'
import { createThrottle } from '../../src/main/domain/shared/throttle'

// Pure Node tests for the audit's performance fixes (P1, P4) — no Electron.
test.describe('performance helpers', () => {
  let dir: string

  test.beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-'))
    for (const rel of ['a/1.txt', 'a/b/2.txt', 'a/b/c/3.txt', 'skip/4.txt', '5.txt']) {
      const p = path.join(dir, rel)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, rel)
    }
  })
  test.afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('walkDirectoryAsync visits the same entries as the sync walker', async () => {
    const skip = (e: fs.Dirent): boolean => e.name === 'skip'
    const sync: string[] = []
    walkDirectory(dir, { onEntry: (p) => sync.push(p), shouldSkipDir: skip })
    const asyncSeen: string[] = []
    await walkDirectoryAsync(dir, {
      onEntry: async (p) => {
        asyncSeen.push(p)
      },
      shouldSkipDir: skip
    })
    expect(asyncSeen.sort()).toEqual(sync.sort())
    expect(asyncSeen.some((p) => p.endsWith('4.txt'))).toBe(false)
  })

  test('walkDirectoryAsync stops when cancelled', async () => {
    let seen = 0
    await walkDirectoryAsync(dir, { onEntry: () => void seen++, shouldContinue: () => seen < 2 })
    expect(seen).toBe(2)
  })

  test('walkDirectoryAsync yields to the event loop while walking', async () => {
    let timerFired = false
    setImmediate(() => (timerFired = true))
    await walkDirectoryAsync(dir, { onEntry: () => undefined })
    expect(timerFired).toBe(true)
  })

  test('movePathAsync moves, and never overwrites', async () => {
    const src = path.join(dir, '5.txt')
    const taken = path.join(dir, 'a/1.txt')
    await expect(movePathAsync(src, taken)).rejects.toThrow(/already exists/)
    expect(fs.readFileSync(taken, 'utf8')).toBe('a/1.txt')
    await movePathAsync(src, path.join(dir, 'moved.txt'))
    expect(fs.existsSync(src)).toBe(false)
    await expect(movePathAsync(path.join(dir, 'a'), path.join(dir, 'a/b/x'))).rejects.toThrow(
      /into itself/
    )
  })

  test('createThrottle opens at most once per interval', () => {
    let now = 0
    const gate = createThrottle(100, () => now)
    expect(gate()).toBe(true)
    now = 50
    expect(gate()).toBe(false)
    now = 100
    expect(gate()).toBe(true)
    now = 150
    expect(gate()).toBe(false)
  })
})
