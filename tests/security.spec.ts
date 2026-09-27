import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Electron Security Hardening', () => {
  let electronApp: any;
  let window: any;

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
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Node.js integration should be disabled in the renderer process', async () => {
    // Test that require is undefined
    const requireType = await window.evaluate(() => typeof require);
    expect(requireType).toBe('undefined');

    // Test that global process object is undefined (except for what might be safely mocked by contextBridge if any)
    const processType = await window.evaluate(() => typeof process);
    expect(processType).toBe('undefined');
  });

  test('fileflow API should be exposed via contextBridge', async () => {
    // Test that window.fileflow exists
    const fileflowType = await window.evaluate(() => typeof window.fileflow);
    expect(fileflowType).toBe('object');
    
    // Verify a subset of expected domains
    const hasOrganizer = await window.evaluate(() => 'organizer' in window.fileflow);
    expect(hasOrganizer).toBe(true);

    const hasConverter = await window.evaluate(() => 'converter' in window.fileflow);
    expect(hasConverter).toBe(true);
  });
});
