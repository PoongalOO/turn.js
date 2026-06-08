import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumExecutable = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
const chromiumLaunchOptions = existsSync(chromiumExecutable) ? { executablePath: chromiumExecutable } : {};
const desktopViewport = { width: 1100, height: 760 };
const webkitSystemDepsAvailable = [
  '/lib/x86_64-linux-gnu/libgstcodecparsers-1.0.so.0',
  '/usr/lib/x86_64-linux-gnu/libgstcodecparsers-1.0.so.0'
].some(existsSync);

const projects = [
  {
    use: {
      browserName: 'chromium',
      viewport: desktopViewport,
      deviceScaleFactor: 1,
      launchOptions: chromiumLaunchOptions
    }
  },
  {
    name: 'chromium-mobile',
    use: {
      browserName: 'chromium',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      launchOptions: chromiumLaunchOptions
    }
  }
];

if (webkitSystemDepsAvailable || process.env.TURNJS_ENABLE_WEBKIT === '1') {
  projects.push({
    name: 'webkit-desktop',
    use: {
      browserName: 'webkit',
      viewport: desktopViewport,
      deviceScaleFactor: 1
    }
  });
}

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02
    }
  },
  projects
});
