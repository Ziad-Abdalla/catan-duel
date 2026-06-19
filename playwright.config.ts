import { defineConfig } from '@playwright/test'

/**
 * E2E harness config. Uses Playwright's BUNDLED chromium (not the system 'chrome'
 * channel), launched no-sandbox for WSL/CI. Reuses an already-running `npm run dev`,
 * or starts one. Screenshots written per-interaction by the specs into e2e/artifacts/.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/artifacts/_pw',
  timeout: 180_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
