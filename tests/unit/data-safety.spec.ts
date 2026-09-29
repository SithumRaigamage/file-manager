import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { movePath, isSameOrInside } from '../../src/main/domain/shared/move-path'
import { revertMoves } from '../../src/main/domain/history/revert'
import { planDuplicateResolution } from '../../src/main/domain/duplicates/resolution'
import { planKeywordCollection } from '../../src/main/domain/searcher/collect-plan'

// Pure Node tests for the audit's critical data-loss fixes (C1–C6) — no Electron.
test.describe('data safety', () => {
  let dir: string

  test.beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-safety-'))
  })
  test.afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const file = (rel: string, content = rel): string => {
    const p = path.join(dir, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, content)
    return p
  }

  test.describe('isSameOrInside', () => {
    test('detects self, descendants and traversal tricks', () => {
      expect(isSameOrInside('/a/b', '/a/b')).toBe(true)
      expect(isSameOrInside('/a/b', '/a/b/c/d')).toBe(true)
      expect(isSameOrInside('/a/b', '/a/bc')).toBe(false)
      expect(isSameOrInside('/a/b', '/a/b/../c')).toBe(false)
    })
  })

  test.describe('movePath', () => {
    test('moves a file and never overwrites', () => {
      const src = file('src.txt', 'new')
      const dest = file('dest.txt', 'existing')
      expect(() => movePath(src, dest)).toThrow(/already exists/)
      expect(fs.readFileSync(dest, 'utf8')).toBe('existing')
      expect(fs.existsSync(src)).toBe(true)

      const free = path.join(dir, 'moved.txt')
      movePath(src, free)
      expect(fs.readFileSync(free, 'utf8')).toBe('new')
      expect(fs.existsSync(src)).toBe(false)
    })

    test('refuses to move a folder into itself', () => {
      file('folder/a.txt')
      expect(() => movePath(path.join(dir, 'folder'), path.join(dir, 'folder/sub'))).toThrow(
        /into itself/
      )
    })

    test('rethrows non cross-device errors instead of copy+delete', () => {
      expect(() => movePath(path.join(dir, 'missing'), path.join(dir, 'x'))).toThrow(/ENOENT/)
    })
  })

  test.describe('revertMoves', () => {
    test('reverts moves and keeps occupied or missing items as failures', () => {
      const movedOk = file('out/ok.txt')
      const movedBlocked = file('out/blocked.txt', 'moved copy')
      const occupant = file('in/blocked.txt', 'newer file')

      const outcome = revertMoves([
        { before: path.join(dir, 'in/ok.txt'), after: movedOk, status: 'success' },
        { before: occupant, after: movedBlocked, status: 'success' },
        {
          before: path.join(dir, 'in/gone.txt'),
          after: path.join(dir, 'out/gone.txt'),
          status: 'success'
        },
        { before: '/x', after: '/y', status: 'failed' }
      ])

      expect(outcome.reverted).toHaveLength(1)
      expect(fs.existsSync(path.join(dir, 'in/ok.txt'))).toBe(true)
      // The newer file at the original location must survive untouched
      expect(fs.readFileSync(occupant, 'utf8')).toBe('newer file')
      expect(outcome.failed.map((f) => f.item.after).sort()).toEqual(
        [movedBlocked, path.join(dir, 'out/gone.txt')].sort()
      )
    })
  })

  test.describe('planDuplicateResolution', () => {
    const group = ['/d/a.jpg', '/d/b.jpg', '/d/c.jpg']

    test('accepts a valid keep-one request', () => {
      const plan = planDuplicateResolution(group, '/d/a.jpg', ['/d/b.jpg', '/d/c.jpg'], true)
      expect(plan).toEqual({ ok: true, toTrash: ['/d/b.jpg', '/d/c.jpg'] })
    })

    test('rejects paths outside the group, deleting the kept copy, or a missing keeper', () => {
      expect(planDuplicateResolution(group, '/d/a.jpg', ['/etc/passwd'], true).ok).toBe(false)
      expect(planDuplicateResolution(group, '/d/a.jpg', ['/d/a.jpg'], true).ok).toBe(false)
      expect(planDuplicateResolution(group, '/x/z.jpg', ['/d/b.jpg'], true).ok).toBe(false)
      expect(planDuplicateResolution(group, '/d/a.jpg', ['/d/b.jpg'], false).ok).toBe(false)
      expect(planDuplicateResolution(group, '/d/a.jpg', [], true).ok).toBe(false)
    })
  })

  test.describe('planKeywordCollection', () => {
    const r = (fullPath: string): { fullPath: string } => ({ fullPath })

    test('assigns each item once, drops nested items and anything touching the destination', () => {
      const plan = planKeywordCollection(
        {
          cats: [r('/src/cats'), r('/src/cats/cat1.jpg'), r('/src/cat-dog.jpg'), r('/dest/cats')],
          dogs: [r('/src/cat-dog.jpg'), r('/src/dogs.jpg'), r('/')]
        },
        ['cats', 'dogs'],
        '/dest'
      )
      expect(plan.cats.map((i) => i.fullPath)).toEqual(['/src/cats', '/src/cat-dog.jpg'])
      expect(plan.dogs.map((i) => i.fullPath)).toEqual(['/src/dogs.jpg'])
    })
  })
})
