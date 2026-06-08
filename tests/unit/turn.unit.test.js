import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const jqueryDist = dirname(require.resolve('jquery'));
const jquerySource = readFileSync(resolve(jqueryDist, 'jquery.js'), 'utf8');
const turnSource = readFileSync(resolve(__dirname, '../../turn.js'), 'utf8');

function createFixture(pageCount = 4) {
  const pages = Array.from({ length: pageCount }, (_, index) => (
    `<div class="page">Page ${index + 1}</div>`
  )).join('');

  const dom = new JSDOM(`<!doctype html><html><body><div id="book">${pages}</div></body></html>`, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'http://localhost/'
  });

  dom.window.eval(jquerySource);
  const $ = dom.window.jQuery;
  dom.window.eval(turnSource);

  return { window: dom.window, document: dom.window.document, $ };
}

describe('turn.js jQuery plugin', () => {
  let fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => {
    fixture.window.close();
    vi.restoreAllMocks();
  });

  it('registers the turn, flip and transform plugins', () => {
    const { $ } = fixture;

    expect($.fn.turn).toBeTypeOf('function');
    expect($.fn.flip).toBeTypeOf('function');
    expect($.fn.transform).toBeTypeOf('function');
  });

  it('initializes a book and exposes page, view, pages and size state', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    expect($book.turn('page')).toBe(1);
    expect($book.turn('pages')).toBe(4);
    expect($book.turn('view')).toEqual([0, 1]);
    expect($book.turn('size')).toEqual({ width: 600, height: 400 });
    expect($book.find('.turn-page-wrapper').length).toBeGreaterThan(0);
  });

  it('supports initial page selection without animation', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false,
      page: 2
    });

    expect($book.turn('page')).toBe(2);
    expect($book.turn('view')).toEqual([2, 3]);
  });

  it('can add and remove pages dynamically', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    $book.turn('addPage', $('<div class="page">Page 5</div>'), 5);
    expect($book.turn('pages')).toBe(5);
    expect($book.turn('hasPage', 5)).toBe(true);

    $book.turn('removePage', 5);
    expect($book.turn('pages')).toBe(4);
    expect($book.turn('hasPage', 5)).toBe(false);
  });

  it('registers internal handlers with event namespaces', () => {
    fixture.window.close();
    fixture = createFixture();

    const { $ } = fixture;
    const onSpy = vi.spyOn($.fn, 'on');

    $('#book').turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false,
      when: {
        turned: function() {}
      }
    });

    const eventNames = onSpy.mock.calls
      .map(call => call[0])
      .filter(name => typeof name === 'string');

    const pointerEvents = $.isTouch
      ? ['touchstart.turn', 'touchmove.turn', 'touchend.turn']
      : ['mousedown.turn', 'mousemove.turn', 'mouseup.turn'];

    expect(eventNames).toContain('turned.turn');
    expect(eventNames).toEqual(expect.arrayContaining(pointerEvents));
    expect(eventNames).toContain('pressed.turnFlip');
    expect(eventNames).toContain('released.turnFlip');
    expect(eventNames).toContain('start.turnFlip');
    expect(eventNames).toContain('end.turnFlip');
    expect(eventNames).toContain('flip.turnFlip');
  });
});
