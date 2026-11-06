import { defineConfig, devices } from '@playwright/test';

const PORT = 3457;

// The app runs against a made-up Supabase address, and the tests answer every request themselves,
// so nothing here can reach real data even if a test misbehaves.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  // On CI, also report failures as annotations, which can be read without signing in to GitHub.
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx next dev --turbopack -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://e2e-test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-test-anon-key',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e-test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'e2e-test-not-a-real-key',
    },
  },
});
