import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

// Audit Phase 5 (UI/UX & accessibility) regression checks against the built app.
test.describe('FileFlow UX', () => {
  let app: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    app = await electron.launch({
      args: [path.join(__dirname, '../../out/main/index.js')],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }
    })
    window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    // Restore the persisted defaults for other suites
    await window.evaluate(() =>
      (window as any).fileflow.settings.update({ theme: 'system', reducedMotion: false })
    )
    await app.close()
  })

  test('Drive Search is reachable from the sidebar', async () => {
    await window.click('text="Drive Search"')
    await expect(window.locator('#searcher-search-btn')).toBeVisible()
  })

  test('theme and reduced-motion settings apply to the document', async () => {
    await window.evaluate(() =>
      (window as any).fileflow.settings.update({ theme: 'dark', reducedMotion: true })
    )
    await window.reload()
    await window.waitForLoadState('domcontentloaded')
    const html = window.locator('html')
    await expect(html).toHaveClass(/\bdark\b/)
    await expect(html).toHaveClass(/\breduce-motion\b/)

    await window.evaluate(() =>
      (window as any).fileflow.settings.update({ theme: 'light', reducedMotion: false })
    )
    await window.reload()
    await expect(window.locator('html')).not.toHaveClass(/\bdark\b/)
  })

  test('settings switches have accessible names', async () => {
    await window.click('text=Settings')
    await expect(window.getByRole('switch', { name: 'Reduced motion' })).toBeVisible()
    await expect(window.getByRole('combobox', { name: 'Theme' })).toBeVisible()
  })
})
