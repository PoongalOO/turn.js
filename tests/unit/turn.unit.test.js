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

function sortedKeys(object) {
  return Object.keys(object).sort();
}

function expectTrackedWrappersToBeConnected($book) {
  const state = $book.data();
  const pageWrappers = Object.values(state.pageWrap || {}).map($wrapper => $wrapper[0]);
  const flipStates = Object.values(state.pages || {}).map($page => $page.data('f'));

  expect($book.find('.turn-page-wrapper').get()).toEqual(expect.arrayContaining(pageWrappers));

  for (const wrapper of pageWrappers) {
    expect(wrapper.isConnected).toBe(true);
  }

  for (const flipState of flipStates) {
    expect(flipState.wrapper[0].isConnected).toBe(true);
    expect(flipState.fwrapper[0].isConnected).toBe(true);
    expect(flipState.fpage[0].isConnected).toBe(true);
  }
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

  it('calculates fold geometry without DOM for every corner', () => {
    fixture.window.close();
    fixture = createFixture(4, {
      __TURNJS_TEST_HOOKS__: {}
    });

    const calculateFoldGeometry = fixture.window.__TURNJS_TEST_HOOKS__.calculateFoldGeometry;
    const base = {
      width: 300,
      height: 400,
      wrapperHeight: 500,
      frontGradient: true,
      backGradient: true
    };
    const cases = [
      {
        point: { corner: 'tl', x: 90, y: 120 },
        origin: { x: 0, y: 0 },
        endingPoint: { x: 600, y: 0 },
        top: true,
        left: true
      },
      {
        point: { corner: 'tr', x: 210, y: 120 },
        origin: { x: 300, y: 0 },
        endingPoint: { x: -300, y: 0 },
        top: true,
        left: false
      },
      {
        point: { corner: 'bl', x: 90, y: 280 },
        origin: { x: 0, y: 400 },
        endingPoint: { x: 600, y: 400 },
        top: false,
        left: true
      },
      {
        point: { corner: 'br', x: 210, y: 280 },
        origin: { x: 300, y: 400 },
        endingPoint: { x: -300, y: 400 },
        top: false,
        left: false
      }
    ];

    expect(calculateFoldGeometry).toBeTypeOf('function');

    for (const item of cases) {
      const originalPoint = { ...item.point };
      const geometry = calculateFoldGeometry({ ...base, ...item });

      expect(item.point).toEqual(originalPoint);
      expect(geometry.point.corner).toBe(item.point.corner);
      expect(geometry.top).toBe(item.top);
      expect(geometry.left).toBe(item.left);
      expect(Number.isFinite(geometry.alpha)).toBe(true);
      expect(Number.isFinite(geometry.angle)).toBe(true);
      expect(Number.isFinite(geometry.px)).toBe(true);
      expect(Number.isFinite(geometry.tr.x)).toBe(true);
      expect(Number.isFinite(geometry.tr.y)).toBe(true);
      expect(Number.isFinite(geometry.move.x)).toBe(true);
      expect(Number.isFinite(geometry.move.y)).toBe(true);
      expect(Number.isFinite(geometry.df.x)).toBe(true);
      expect(Number.isFinite(geometry.df.y)).toBe(true);
      expect(Number.isFinite(geometry.gradient.opacity)).toBe(true);
      expect(Number.isFinite(geometry.gradient.size)).toBe(true);
      expect(geometry.gradient.endPointA).toBeDefined();
      expect(geometry.gradient.endPointB).toBeDefined();

      if (item.left)
        expect(geometry.point.x).toBeGreaterThanOrEqual(1);
      else
        expect(geometry.point.x).toBeLessThanOrEqual(base.width - 1);
    }
  });

  it('builds normalized linear gradients without legacy syntax or white highlights', () => {
    fixture.window.close();
    fixture = createFixture(4, {
      __TURNJS_TEST_HOOKS__: {}
    });

    const buildLinearGradient = fixture.window.__TURNJS_TEST_HOOKS__.buildLinearGradient;
    const gradient = buildLinearGradient(
      { x: 0, y: 0 },
      { x: -10, y: 0 },
      [
        [-1, 'rgba(0,0,0,0)'],
        [0.5, 'rgba(0,0,0,0.12)'],
        [2, 'rgba(0,0,0,0)']
      ],
      3
    );

    expect(gradient).toMatch(/^linear-gradient\(180deg,/);
    expect(gradient).not.toContain('-webkit-gradient');
    expect(gradient).not.toContain('255, 255, 255');
    expect([...gradient.matchAll(/([0-9.]+)%/g)].map(match => Number(match[1]))).toEqual([
      0,
      50,
      100
    ]);
  });

  it('normalizes fold gradient opacity for tiny and large folds', () => {
    fixture.window.close();
    fixture = createFixture(4, {
      __TURNJS_TEST_HOOKS__: {}
    });

    const calculateFoldGeometry = fixture.window.__TURNJS_TEST_HOOKS__.calculateFoldGeometry;
    const base = {
      point: { corner: 'tl', x: 90, y: 120 },
      origin: { x: 0, y: 0 },
      width: 300,
      height: 400,
      wrapperHeight: 500,
      frontGradient: true,
      backGradient: true
    };

    const tinyFold = calculateFoldGeometry({
      ...base,
      endingPoint: { x: 90, y: 120 }
    });
    const largeFold = calculateFoldGeometry({
      ...base,
      endingPoint: { x: 600, y: 0 }
    });

    expect(tinyFold.gradient.opacity).toBe(0);
    expect(largeFold.gradient.opacity).toBe(1);
  });

  it('does not create gradient shadow layers when gradients are disabled', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    const pageState = $book.data('pages')[1].data('f');

    expect(pageState.opts.frontGradient).toBe(false);
    expect(pageState.opts.backGradient).toBe(false);
    expect(pageState.ashadow).toBeUndefined();
    expect(pageState.bshadow).toBeUndefined();
    expect($book.find('[style*="linear-gradient"]').length).toBe(0);
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

  it('keeps documented book and flip state after initialization', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    const bookState = $book.data();

    expect(sortedKeys(bookState)).toEqual([
      'display',
      'done',
      'eventHandlers',
      'fparent',
      'opts',
      'page',
      'pageDefaults',
      'pageMv',
      'pageObjs',
      'pagePlace',
      'pageWrap',
      'pages',
      'totalPages',
      'turnOriginal'
    ]);
    expect(bookState.opts).toMatchObject({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });
    expect(bookState.turnOriginal).toEqual({
      style: undefined,
      class: undefined
    });
    expect(Object.keys(bookState.pageObjs)).toEqual(['1', '2', '3', '4']);
    expect(Object.keys(bookState.pageDefaults)).toEqual(['1', '2', '3', '4']);
    expect(Object.keys(bookState.pageWrap)).toEqual(['1', '2', '3', '4']);
    expect(Object.keys(bookState.pagePlace)).toEqual(['1', '2', '3', '4']);
    expect(Object.keys(bookState.pages)).toEqual(['1']);
    expect(bookState.pageMv).toEqual([]);
    expect(bookState.totalPages).toBe(4);
    expect(bookState.page).toBe(1);

    const pageState = bookState.pages[1].data();

    expect(pageState.f).toBeDefined();
    expect(pageState.f.opts).toMatchObject({
      page: 1,
      next: 2,
      turn: $book,
      duration: 600,
      acceleration: false,
      corners: 'forward',
      backGradient: false,
      frontGradient: false
    });
    expect(pageState.f.parent[0]).toBe(bookState.pageWrap[1][0]);
    expect(pageState.f.wrapper).toBeDefined();
    expect(pageState.f.fwrapper).toBeDefined();
    expect(pageState.f.fpage).toBeDefined();
  });

  it('updates moving page state during next and previous turns', () => {
    fixture.window.close();

    const frameCallbacks = [];
    const requestAnimationFrame = vi.fn(callback => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    fixture = createFixture(6, {
      requestAnimationFrame,
      cancelAnimationFrame: vi.fn()
    });

    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false,
      duration: 32
    });

    $book.turn('next');

    expect($book.turn('page')).toBe(2);
    expect($book.turn('view')).toEqual([2, 3]);
    expect($book.data('tpage')).toBe(2);
    expect($book.data('pageMv')).toEqual([1]);

    while (frameCallbacks.length) {
      frameCallbacks.shift()(1000);
    }

    expect($book.data('tpage')).toBeUndefined();
    expect($book.data('pageMv')).toEqual([]);

    $book.turn('previous');

    expect($book.turn('page')).toBe(1);
    expect($book.turn('view')).toEqual([0, 1]);
    expect($book.data('tpage')).toBe(1);
    expect($book.data('pageMv')).toEqual([2]);

    while (frameCallbacks.length) {
      frameCallbacks.shift()(2000);
    }

    expect($book.data('tpage')).toBeUndefined();
    expect($book.data('pageMv')).toEqual([]);
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

  it('does not leave tracked wrappers orphaned after removePage', () => {
    fixture.window.close();
    fixture = createFixture(6);

    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    $book.turn('removePage', 3);

    expect($book.turn('pages')).toBe(5);
    expect($book.turn('hasPage', 6)).toBe(false);
    expectTrackedWrappersToBeConnected($book);
    expect($book.find('.turn-page-wrapper').length).toBe(Object.keys($book.data('pageWrap')).length);
  });

  it('cleans the temporary single-display page when returning to double display', () => {
    const { $ } = fixture;
    const $book = $('#book');

    $book.turn({
      width: 600,
      height: 400,
      display: 'double',
      gradients: false,
      acceleration: false
    });

    $book.turn('display', 'single');

    expect($book.data('pageObjs')[0]).toBeDefined();
    expect($book.find('.p-temporal').length).toBe(1);
    expectTrackedWrappersToBeConnected($book);

    $book.turn('display', 'double');

    expect($book.data('pageObjs')[0]).toBeUndefined();
    expect($book.find('.p-temporal').length).toBe(0);
    expectTrackedWrappersToBeConnected($book);
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
    const fparent = $book.data('fparent');

    $book.turn('destroy');

    expect(fparent[0].isConnected).toBe(false);
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
