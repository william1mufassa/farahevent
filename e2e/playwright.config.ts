import { defineConfig, devices } from '@playwright/test';

/**
 * Tests e2e du tunnel d'achat public — tournent contre le frontend dev (:3000)
 * câblé sur le vrai backend (docker-compose.dev up + événement 'e2e-forum' semé).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
