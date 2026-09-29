import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('FileFlow E2E Smoke Tests', () => {
  let electronApp: any;
  let window: any;
  let userDataDir: string;

  test.beforeAll(async () => {
    // Launch Electron app.
    // The main entry point is out/main/index.js
    // Isolated profile so tests never touch the real app database (MP4 scan
    // history pruning, duplicates, settings, ...).
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-e2e-userdata-'));
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        // Must be explicitly cleared: if set in the host shell (e.g. because
        // this test runner itself runs inside an Electron-based tool), the
        // default process.env inheritance above passes it through, which
        // makes the spawned `electron` binary boot as plain Node instead of
        // as an app — Node's own arg parser then rejects Playwright's
        // Chromium-only `--remote-debugging-port` flag with "bad option: ...".
        ELECTRON_RUN_AS_NODE: ''
      }
    });

    // Wait for the first BrowserWindow to open and return its Page object
    window = await electronApp.firstWindow();

    window.on('console', msg => console.log('PAGE LOG:', msg.text()));
    window.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  test('App should launch and display the sidebar', async () => {
    // Check window title
    const title = await window.title();
    expect(title).toBe('FileFlow — File Manager'); // or whatever title is set, default in vite electron is often package name or index.html title

    // Wait for the sidebar FileFlow logo text
    await expect(window.locator('text=FileFlow').first()).toBeVisible();
    await expect(window.locator('text=File Manager').first()).toBeVisible();
  });

  test('Should navigate between tools', async () => {
    // Dashboard is the default landing route (post-MVP addition); navigate to
    // Organizer explicitly rather than assuming it's the initial view.
    await window.click('text=Organizer');
    await expect(window.locator('text=Smart File Organizer').first()).toBeVisible();

    // Click Renamer
    await window.click('text=Renamer');
    await expect(window.locator('text=Professional Bulk Renamer').first()).toBeVisible();

    // Click Converter
    await window.click('text=Converter');
    await expect(window.locator('text=High-Speed Converter').first()).toBeVisible();

    // Click History
    await window.click('text=History');
    await expect(window.locator('text=Operation History').first()).toBeVisible();
  });

  test('Organize by Date should bucket files and folders by their own modified date', async () => {
    // Native OS folder-picker dialogs can't be driven from Playwright, so this
    // drives the same IPC bridge the "Select Folder" button and "Organize by
    // Date" button call, exercising the real main-process handlers and disk
    // I/O end-to-end without needing to click through the OS dialog.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-organize-by-date-'));
    const olderFile = path.join(dir, 'older.txt');
    const newerFile = path.join(dir, 'newer.txt');
    const subFolder = path.join(dir, 'a-subfolder');

    fs.writeFileSync(olderFile, 'old');
    fs.writeFileSync(newerFile, 'new');
    fs.mkdirSync(subFolder);

    const olderDate = new Date('2026-01-01T10:00:00');
    const newerDate = new Date('2026-06-15T10:00:00');
    fs.utimesSync(olderFile, olderDate, olderDate);
    fs.utimesSync(newerFile, newerDate, newerDate);
    fs.utimesSync(subFolder, newerDate, newerDate);

    const result = await window.evaluate(async (targetDir) => {
      const preview = await (window as any).fileflow.organizer.previewOrganizeByDate(targetDir);
      if (!preview.ok) return { ok: false, stage: 'preview', error: preview.error };
      const apply = await (window as any).fileflow.organizer.applyOrganize(preview.data);
      if (!apply.ok) return { ok: false, stage: 'apply', error: apply.error };
      return { ok: true, preview: preview.data, apply: apply.data };
    }, dir);

    expect(result.ok).toBe(true);
    expect(result.apply.organized).toBe(3);
    expect(result.apply.skipped).toEqual([]);

    // Files/folder landed in per-day buckets named after their own mtime.
    expect(fs.existsSync(path.join(dir, '2026-01-01', 'older.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '2026-06-15', 'newer.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '2026-06-15', 'a-subfolder'))).toBe(true);
    // Originals are gone (moved, not copied).
    expect(fs.existsSync(olderFile)).toBe(false);
    expect(fs.existsSync(newerFile)).toBe(false);
    expect(fs.existsSync(subFolder)).toBe(false);

    // Re-running on the now-organized folder must not sweep the date
    // buckets into themselves.
    const secondPreview = await window.evaluate(async (targetDir) => {
      return (window as any).fileflow.organizer.previewOrganizeByDate(targetDir);
    }, dir);
    expect(secondPreview.ok).toBe(true);
    expect(secondPreview.data).toEqual([]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('Tool state should survive navigating to another tab and back', async () => {
    // Regression: pages used to reset their store on unmount, so leaving a
    // tab wiped its results (Duplicates even cleared them in the main process).
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-tab-persist-'));
    fs.writeFileSync(path.join(dir, 'persist-dup-a.bin'), 'same-content');
    fs.writeFileSync(path.join(dir, 'persist-dup-b.bin'), 'same-content');

    await window.click('text="Duplicates"');
    await expect(window.locator('text=Smart Duplicate Finder').first()).toBeVisible();

    // Folder picker is a native dialog, so kick off the scan through the same
    // IPC bridge; the store's progress listener fetches groups on completion.
    await window.evaluate(async (targetDir) => {
      await (window as any).fileflow.duplicates.scan(targetDir);
    }, dir);

    const fileRow = window.locator('p.font-medium', { hasText: 'persist-dup-a.bin' });
    await expect(fileRow).toBeVisible({ timeout: 15000 });
    await fileRow.click();
    await expect(window.locator('text=KEEP')).toBeVisible();

    await window.click('text=Organizer');
    await expect(window.locator('text=Smart File Organizer').first()).toBeVisible();
    await window.click('text="Duplicates"');

    await expect(window.locator('p.font-medium', { hasText: 'persist-dup-a.bin' })).toBeVisible();
    await expect(window.locator('p.font-medium', { hasText: 'persist-dup-b.bin' })).toBeVisible();
    await expect(window.locator('text=KEEP')).toBeVisible();

    await window.evaluate(async () => {
      await (window as any).fileflow.duplicates.clear();
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('Page-local UI state should survive navigating to another tab and back', async () => {
    // Pages are kept mounted (KeepAliveRoutes), so even component useState —
    // not just Zustand stores — must persist across tab switches.
    await window.click('text=Advanced Search');
    const searchInput = window.locator('input[placeholder^="Search indexed files"]');
    await searchInput.fill('quarterly report');

    await window.click('text=History');
    await expect(window.locator('text=Operation History').first()).toBeVisible();
    await expect(searchInput).toBeHidden();

    await window.click('text=Advanced Search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue('quarterly report');
  });

  test('MP4 Analyzer should keep scan history with diffs, missing-file flags and a size limit', async () => {
    // Garbage bytes pass the basic check but fail the container check, so each
    // file resolves instantly as unrecoverable without needing ffmpeg.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileflow-mp4-history-'));
    fs.writeFileSync(path.join(dir, 'keep.mp4'), 'not really a video');
    fs.writeFileSync(path.join(dir, 'gone.mp4'), 'not really a video');

    const scanAndList = (targetDir: string) =>
      window.evaluate(async (d: string) => {
        const api = (window as any).api.mp4analyzer;
        await api.analyzeFolder(d);
        return api.listScans();
      }, targetDir);

    // First scan: no previous scan to compare with
    let list = await scanAndList(dir);
    expect(list.ok).toBe(true);
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({
      targetPath: dir,
      targetType: 'folder',
      status: 'completed',
      filesFound: 2,
      filesScanned: 2,
      unrecoverable: 2,
      diff: null
    });
    const firstScanId = list.data[0].id;

    // Second scan: one file removed, one added
    fs.rmSync(path.join(dir, 'gone.mp4'));
    fs.writeFileSync(path.join(dir, 'new.mp4'), 'not really a video');
    list = await scanAndList(dir);
    expect(list.data).toHaveLength(2);
    expect(list.data[0].diff).toEqual({ newlyCorrupted: 0, fixed: 0, newFiles: 1, removedFiles: 1 });

    // Reopening the first scan flags the deleted file as missing
    const first = await window.evaluate(
      (id: string) => (window as any).api.mp4analyzer.getScan(id),
      firstScanId
    );
    expect(first.ok).toBe(true);
    const missing = Object.fromEntries(
      first.data.results.map((r: any) => [path.basename(r.filePath), r.missingOnDisk])
    );
    expect(missing).toEqual({ 'keep.mp4': false, 'gone.mp4': true });

    // UI: history tab lists both scans; opening the old one shows the Missing badge
    await window.click('text=MP4 Analyzer');
    await window.click('text=/Scan History \\(2\\)/');
    await expect(window.locator('[data-testid="mp4-history-row"]')).toHaveCount(2);
    await window.locator('[data-testid="mp4-history-row"]').nth(1).click();
    await expect(window.locator('text=Viewing saved scan from')).toBeVisible();
    await expect(window.locator('tr', { hasText: 'gone.mp4' }).locator('text="Missing"')).toBeVisible();
    await expect(window.locator('tr', { hasText: 'keep.mp4' }).locator('text="Missing"')).toHaveCount(0);

    // Auto-keep last N: with a limit of 1 only the newest scan survives
    await window.evaluate(() => (window as any).fileflow.settings.update({ mp4HistoryLimit: 1 }));
    list = await scanAndList(dir);
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).not.toBe(firstScanId);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
