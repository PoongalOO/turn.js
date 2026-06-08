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

function createFixture(pageCount = 4, windowOptions = {}) {
  const pages = Array.from({ length: pageCount }, (_, index) => (
    `<div class="page">Page ${index + 1}</div>`
  )).join('');

  const dom = new JSDOM(`<!doctype html><html><body><div id="book">${pages}</div></body></html>`, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'http://localhost/'
  });

  Object.entries(windowOptions).forEach(([key, value]) => {
    Object.defineProperty(dom.window, key, {
      value,
      configurable: true,
      writable: true
    });
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

  it('destroys a book, restores pages and removes turn.js state', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.data('externalValue', 'keep-me');
    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    expect($book.find('.turn-page-wrapper').length).toBeGreaterThan(0);
    expect($book.children('.page').length).toBe(0);

    $book.turn('destroy');

    expect($book.data('externalValue')).toBe('keep-me');
    expect($book.data('opts')).toBeUndefined();
    expect($book.data('pages')).toBeUndefined();
    expect($book.find('.turn-page-wrapper').length).toBe(0);
    expect($book.find('.turn-page').length).toBe(0);
    expect($book.children('.page').length).toBe(4);
    expect($book.children().map((_, el) => $(el).text()).get()).toEqual([
      'Page 1',
      'Page 2',
      'Page 3',
      'Page 4'
    ]);
    expect($book.attr('style')).toBeUndefined();
  });

  it('can initialize again after destroy', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    $book.turn('destroy');
    $book.turn({
      width: 320,
      height: 240,
      display: 'single',
      gradients: false,
      acceleration: false
    });

    expect($book.turn('size')).toEqual({ width: 320, height: 240 });
    expect($book.turn('display')).toBe('single');
    expect($book.turn('pages')).toBe(4);
    expect($book.find('.turn-page-wrapper').length).toBeGreaterThan(0);
  });

  it('uses requestAnimationFrame for animatef animations', () => {
    fixture.window.close();

    const frameCallbacks = [];
    let frameHandle = 0;
    const requestAnimationFrame = vi.fn(callback => {
      frameCallbacks.push(callback);
      frameHandle += 1;
      return frameHandle;
    });
    const cancelAnimationFrame = vi.fn();

    fixture = createFixture(4, {
      performance: { now: vi.fn(() => 0) },
      requestAnimationFrame,
      cancelAnimationFrame
    });

    const { $ } = fixture;
    const frames = [];
    const complete = vi.fn();
    const $element = $('<div></div>');

    $element.animatef({
      from: 0,
      to: 10,
      duration: 32,
      easing: (x, t, b, c, d) => b + c * (t / d),
      frame: value => frames.push(value),
      complete
    });

    expect(frames).toEqual([0]);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    frameCallbacks.shift()(16);
    expect(frames[1]).toBe(5);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    $element.animatef(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);

    frameCallbacks.shift()(32);
    expect(frames).toEqual([0, 5]);
    expect(complete).not.toHaveBeenCalled();
  });

  it('writes modern CSS transform properties', () => {
    const { $ } = fixture;
    const element = $('<div></div>')[0];

    $(element).transform('translate(12px, 24px)', '10% 20%');

    expect(element.style.transform).toBe('translate(12px, 24px)');
    expect(element.style.transformOrigin).toBe('10% 20%');
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
