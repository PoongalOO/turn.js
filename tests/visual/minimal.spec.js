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
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

test('minimal demo renders the opening page', async ({ page }) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');
  await expect(page.locator('#book')).toHaveScreenshot('minimal-book-page-1.png');
});

test('minimal demo renders after turning to the next page', async ({ page }) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await page.locator('#next').click();
  await expect(page.locator('#status')).toHaveText('Page 2 / 6');
  await page.waitForTimeout(700);

  await expect(page.locator('#book')).toHaveScreenshot('minimal-book-page-2.png');
});

test('minimal demo keeps turn geometry aligned in a compact viewport', async ({ page }) => {
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
  await expect(page.locator('#book')).toHaveScreenshot('minimal-book-compact-page-1.png');
});

test('minimal demo keeps page measurements aligned during a page turn', async ({ page }) => {
  await page.goto(`${baseUrl}/demos/minimal/index.html`);
  await page.waitForFunction(() => window.jQuery && window.jQuery.fn.jquery === '4.0.0' && typeof window.jQuery.fn.turn === 'function');

  await page.locator('#next').click();
  await page.waitForTimeout(700);
  await page.locator('#next').click();
  await page.waitForTimeout(700);
  await expect(page.locator('#status')).toHaveText('Page 4 / 6');

  await page.locator('#next').click();
  await page.waitForTimeout(160);

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

  await expect(page.locator('#book')).toHaveScreenshot('minimal-book-turning-page-4.png');
});
