import { defineConfig } from '@playwright/test';

const port = 4173;
const appUrl = `http://127.0.0.1:${port}/cclog_sheet/`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: appUrl,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: appUrl,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop-1280x720',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'narrow-320x800',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 800 },
      },
    },
    {
      name: 'short-1280x320',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 320 },
      },
    },
  ],
});
