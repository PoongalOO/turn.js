import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumExecutable = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02
    }
  },
  use: {
    browserName: 'chromium',
    viewport: { width: 1100, height: 760 },
    deviceScaleFactor: 1,
    launchOptions: existsSync(chromiumExecutable) ? { executablePath: chromiumExecutable } : {}
  }
});
