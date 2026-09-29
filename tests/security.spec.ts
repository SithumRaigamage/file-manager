import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

test.describe('Electron Security Hardening', () => {
  let electronApp: any
  let window: any

  test.beforeAll(async () => {
    // Launch Electron app.
    // ELECTRON_RUN_AS_NODE must be explicitly cleared: if it's set in the host
    // shell (e.g. because this test runner itself runs inside an Electron-based
    // tool), electron.launch()'s default process.env inheritance passes it
    // through, which makes the spawned `electron` binary boot as plain Node
    // instead of as an app — Node's own arg parser then rejects Playwright's
    // Chromium-only `--remote-debugging-port` flag with "bad option: ...".
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }
    })
    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('Node.js integration should be disabled in the renderer process', async () => {
    // Test that require is undefined
    const requireType = await window.evaluate(() => typeof require)
    expect(requireType).toBe('undefined')

    // Test that global process object is undefined (except for what might be safely mocked by contextBridge if any)
    const processType = await window.evaluate(() => typeof process)
    expect(processType).toBe('undefined')
  })

  test('fileflow API should be exposed via contextBridge', async () => {
    // Test that window.fileflow exists
    const fileflowType = await window.evaluate(() => typeof window.fileflow)
    expect(fileflowType).toBe('object')

    // Verify a subset of expected domains
    const hasOrganizer = await window.evaluate(() => 'organizer' in window.fileflow)
    expect(hasOrganizer).toBe(true)

    const hasConverter = await window.evaluate(() => 'converter' in window.fileflow)
    expect(hasConverter).toBe(true)
  })

  test('no generic IPC bridge is exposed (only typed APIs)', async () => {
    const electronType = await window.evaluate(() => typeof (window as any).electron)
    expect(electronType).toBe('undefined')
  })

  test('media:// serves media but refuses other files, even via a disguised symlink', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-media-'))
    const video = path.join(dir, 'clip.mp4')
    const secret = path.join(dir, 'secret.txt')
    const disguised = path.join(dir, 'secret.mp4')
    fs.writeFileSync(video, Buffer.alloc(1000, 1))
    fs.writeFileSync(secret, 'top secret')
    fs.symlinkSync(secret, disguised)

    // Call the protocol handler directly from the main process (the renderer's
    // CSP would block fetch() before it ever reached the handler).
    const status = (p: string, range?: string): Promise<number> =>
      electronApp.evaluate(
        async ({ net }, args: { url: string; range?: string }) =>
          (await net.fetch(args.url, { headers: args.range ? { Range: args.range } : {} })).status,
        { url: `media://local/${encodeURIComponent(p)}`, range }
      )

    try {
      expect(await status(video)).toBe(200)
      expect(await status(video, 'bytes=-100')).toBe(206)
      expect(await status(video, 'bytes=5000-')).toBe(416)
      expect(await status(secret)).toBe(403)
      expect(await status(disguised)).toBe(403)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('openPath refuses scripts and executables', async () => {
    const script = path.join(os.tmpdir(), `fileflow-script-${Date.now()}.command`)
    fs.writeFileSync(script, '#!/bin/sh\necho pwned\n', { mode: 0o755 })
    try {
      const res = await window.evaluate((p: string) => (window as any).api.openPath(p), script)
      expect(res.ok).toBe(false)
      expect(res.error.code).toBe('OPEN_BLOCKED')
    } finally {
      fs.rmSync(script, { force: true })
    }
  })
})
