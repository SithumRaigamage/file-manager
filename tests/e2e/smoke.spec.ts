import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('FileFlow E2E Smoke Tests', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    // Launch Electron app.
    // The main entry point is out/main/index.js
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      // Optional: pass env variables if needed
      env: {
        ...process.env,
        NODE_ENV: 'development'
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
    // Organizer is default
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
});
