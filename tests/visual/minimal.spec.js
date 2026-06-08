import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const jqueryDist = dirname(require.resolve('jquery'));
const jqueryPath = resolve(jqueryDist, 'jquery.min.js');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8'
};

let server;
let baseUrl;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const pathname = url.pathname === '/' ? '/demos/minimal/index.html' : url.pathname;
      const file = normalize(join(root, pathname));

      if (!file.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': contentTypes[extname(file)] || 'application/octet-stream'
      });
      response.end(body);
    } catch (error) {
      response.writeHead(404);
      response.end(error.message);
    }
  });

  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise(resolveClose => server.close(resolveClose));
});

test.beforeEach(async ({ page }) => {
  await page.route('https://code.jquery.com/jquery-4.0.0.min.js', route => {
    route.fulfill({
      path: jqueryPath,
      contentType: 'text/javascript; charset=utf-8'
    });
  });
});

const isScreenshotProject = testInfo => testInfo.project.name === '';

test('minimal demo renders the opening page', async ({ page }, testInfo) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await expect(page.locator('#status')).toHaveText('Page 1 / 6');
  if (isScreenshotProject(testInfo)) {
    await expect(page.locator('#book')).toHaveScreenshot('minimal-book-page-1.png');
  }
});

test('minimal demo renders after turning to the next page', async ({ page }, testInfo) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await page.locator('#next').click();
  await expect(page.locator('#status')).toHaveText('Page 2 / 6');
  await page.waitForTimeout(700);

  if (isScreenshotProject(testInfo)) {
    await expect(page.locator('#book')).toHaveScreenshot('minimal-book-page-2.png');
  }
});

test('minimal demo keeps turn geometry aligned in a compact viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 600, height: 720 });
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  const metrics = await page.evaluate(() => {
    const book = document.querySelector('#book').getBoundingClientRect();
    const wrapper = document.querySelector('.turn-page-wrapper').getBoundingClientRect();
    const size = $('#book').turn('size');

    return {
      book: { width: Math.round(book.width), height: Math.round(book.height) },
      wrapper: { width: Math.round(wrapper.width), height: Math.round(wrapper.height) },
      size
    };
  });

  expect(metrics.size).toEqual(metrics.book);
  expect(metrics.wrapper.height).toBe(metrics.book.height);
  expect(metrics.wrapper.width).toBe(metrics.book.width / 2);
  if (isScreenshotProject(testInfo)) {
    await expect(page.locator('#book')).toHaveScreenshot('minimal-book-compact-page-1.png');
  }
});

test('minimal demo keeps page measurements aligned during a page turn', async ({ page }, testInfo) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await page.locator('#next').click();
  await page.waitForTimeout(700);
  await page.locator('#next').click();
  await page.waitForTimeout(700);
  await expect(page.locator('#status')).toHaveText('Page 4 / 6');

  await page.locator('#next').click();
  await page.waitForTimeout(80);

  const metrics = await page.evaluate(() => {
    const book = document.querySelector('#book').getBoundingClientRect();
    const pageWidth = Math.round(book.width / 2);
    const pageHeight = Math.round(book.height);

    const pages = [...document.querySelectorAll('.turn-page')]
      .map(element => {
        const rect = element.getBoundingClientRect();

        return {
          page: element.className,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          jqueryWidth: Math.round($(element).width()),
          jqueryHeight: Math.round($(element).height())
        };
      })
      .filter(item => item.width || item.height);

    return { pageWidth, pageHeight, pages };
  });

  for (const item of metrics.pages) {
    expect(item.width, item.page).toBe(metrics.pageWidth);
    expect(item.height, item.page).toBe(metrics.pageHeight);
    expect(item.jqueryWidth, item.page).toBe(metrics.pageWidth);
    expect(item.jqueryHeight, item.page).toBe(metrics.pageHeight);
  }

  const gradientImages = await page.evaluate(() => (
    [...document.querySelectorAll('[style*="linear-gradient"]')]
      .map(element => element.style.backgroundImage)
      .filter(Boolean)
  ));

  expect(gradientImages.length).toBeGreaterThan(0);
  for (const backgroundImage of gradientImages) {
    expect(backgroundImage).not.toContain('255, 255, 255');

    for (const match of backgroundImage.matchAll(/([0-9.]+)%/g)) {
      const stop = Number(match[1]);
      expect(stop).toBeGreaterThanOrEqual(0);
      expect(stop).toBeLessThanOrEqual(100);
    }
  }

  if (isScreenshotProject(testInfo)) {
    await expect(page.locator('#book')).toHaveScreenshot('minimal-book-turning-page-4.png');
  }
});

test('minimal demo supports page controls in a mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile viewport scenario runs in the mobile project.');

  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await expect(page.locator('#status')).toHaveText('Page 1 / 6');
  await page.locator('#next').click();
  await expect(page.locator('#status')).toHaveText('Page 2 / 6');
  await page.waitForTimeout(700);
  await page.locator('#previous').click();
  await expect(page.locator('#status')).toHaveText('Page 1 / 6');

  const metrics = await page.evaluate(() => {
    const book = document.querySelector('#book').getBoundingClientRect();
    const wrapper = document.querySelector('.turn-page-wrapper').getBoundingClientRect();

    return {
      book: { width: Math.round(book.width), height: Math.round(book.height) },
      wrapper: { width: Math.round(wrapper.width), height: Math.round(wrapper.height) }
    };
  });

  expect(metrics.book.width).toBeLessThanOrEqual(390);
  expect(metrics.wrapper.height).toBe(metrics.book.height);
  expect(metrics.wrapper.width).toBe(metrics.book.width / 2);
});

test('magazine demo loads with jQuery 4 and turns pages', async ({ page }) => {
  await page.goto(`${baseUrl}/demos/magazine/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await expect(page.locator('#status')).toHaveText('Page 1 / 6');
  await page.locator('#next').click();
  await expect(page.locator('#status')).toHaveText('Page 2 / 6');
  await page.waitForTimeout(700);

  const metrics = await page.evaluate(() => {
    const book = document.querySelector('#magazine').getBoundingClientRect();
    const wrapper = [...document.querySelectorAll('.turn-page-wrapper')]
      .map(element => element.getBoundingClientRect())
      .find(rect => rect.width && rect.height);
    const size = $('#magazine').turn('size');

    return {
      book: { width: Math.round(book.width), height: Math.round(book.height) },
      wrapper: { width: Math.round(wrapper.width), height: Math.round(wrapper.height) },
      size
    };
  });

  expect(metrics.size).toEqual(metrics.book);
  expect(metrics.wrapper.height).toBe(metrics.book.height);
  expect(metrics.wrapper.width).toBe(metrics.book.width / 2);
});

test('single-page magazine demo loads with jQuery 4 and turns pages', async ({ page }) => {
  await page.goto(`${baseUrl}/demos/magazine_single/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await expect(page.locator('#status')).toHaveText('Page 1 / 6');
  await page.locator('#next').click();
  await expect(page.locator('#status')).toHaveText('Page 2 / 6');
  await page.waitForTimeout(700);

  const metrics = await page.evaluate(() => {
    const book = document.querySelector('#magazine').getBoundingClientRect();
    const wrapper = [...document.querySelectorAll('.turn-page-wrapper')]
      .map(element => element.getBoundingClientRect())
      .find(rect => rect.width && rect.height);
    const size = $('#magazine').turn('size');

    return {
      book: { width: Math.round(book.width), height: Math.round(book.height) },
      wrapper: { width: Math.round(wrapper.width), height: Math.round(wrapper.height) },
      size
    };
  });

  expect(metrics.size).toEqual(metrics.book);
  expect(metrics.wrapper.height).toBe(metrics.book.height);
  expect(metrics.wrapper.width).toBe(metrics.book.width);
});
