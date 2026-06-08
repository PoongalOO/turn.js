# turn.js 3rd release, local maintenance fork

turn.js is a jQuery plugin that renders HTML pages as a book or magazine with a page-turn transition.

This repository contains a maintained local copy of the original `turn.js` 3rd release. The current work focuses on making the library easier to test and safer to use with modern jQuery versions while keeping the original API shape.

French version: [README.fr.md](README.fr.md)

## Current Status

This fork has been smoke-tested with jQuery `4.0.0` in the minimal demo and covered by automated unit and visual tests. The core plugin can initialize, navigate, resize, add/remove pages, and destroy itself in modern browser test runs.

Compatibility is not yet guaranteed for every modern browser or device. Safari/WebKit, iOS, Android touch behavior, accessibility, and production visual regressions still need dedicated validation.

## What Changed

- Updated internal event registration from deprecated jQuery `.bind()` / `.unbind()` patterns to `.on()` / `.off()`.
- Added event namespaces:
  - `.turn` for book-level and document-level turn.js events.
  - `.turnFlip` for internal flip-page events.
- Added a public `destroy` method:
  - stops animations;
  - detaches turn.js event handlers;
  - removes turn and flip wrappers;
  - restores original page elements as direct children;
  - restores original `style` and `class` attributes;
  - removes turn.js internal jQuery data while preserving unrelated user data.
- Replaced the internal `setInterval` animation loop with `requestAnimationFrame`.
- Fixed `animatef(false)` so cancelling an animation cancels the scheduled animation frame.
- Modernized CSS output:
  - gradients now use standard `linear-gradient(...deg, ...)`;
  - fold gradients keep normalized `0-100%` stops and use softer shadow-only colors;
  - transforms now write standard `transform` and `transform-origin` properties, with a prefixed fallback when detected.
- Moved static wrapper styles to `turn.css` and internal classes, while keeping dynamic size, position, z-index, transform, and gradient values inline.
- Added a minimal browser demo using jQuery `4.0.0`.
- Added text and local images to the minimal demo.
- Fixed minimal demo layout so turn.js page measurements match the real rendered page size.
- Added unit tests with Vitest and JSDOM.
- Added Playwright visual tests and reference snapshots for the minimal demo.
- Added npm scripts and project configuration for automated tests.
- Regenerated `turn.min.js` from the updated source.

## Demo

Open the minimal demo directly in a browser:

```bash
xdg-open demos/minimal/index.html
```

The demo loads:

- jQuery `4.0.0` from the jQuery CDN;
- `../../turn.css`;
- `../../turn.js`;
- local image assets from `demos/minimal/assets`.

It includes a six-page book, previous/next controls, keyboard navigation, text, and images.

## Installation for Development

Install dependencies:

```bash
npm install
```

The development dependencies include:

- `jquery` `4.0.0`;
- `vitest`;
- `jsdom`;
- `@playwright/test`.

## Usage

Basic HTML:

```html
<div id="magazine">
  <div>Page 1</div>
  <div>Page 2</div>
  <div>Page 3</div>
  <div>Page 4</div>
</div>
```

Basic CSS:

```css
#magazine {
  width: 800px;
  height: 400px;
}

#magazine .turn-page {
  background: #f4f4f4;
}
```

Basic JavaScript:

```html
<link rel="stylesheet" href="turn.css">
<script src="https://code.jquery.com/jquery-4.0.0.min.js"></script>
<script src="turn.js"></script>
<script>
  $('#magazine').turn({
    width: 800,
    height: 400,
    gradients: true,
    acceleration: true
  });
</script>
```

`turn.css` contains the static styles for turn.js internal wrappers. `turn.js` also injects these base rules as a fallback for existing pages that only load the script, but loading the stylesheet explicitly is recommended.

Destroying an instance:

```javascript
$('#magazine').turn('destroy');
```

After `destroy`, the original page elements are restored as direct children of `#magazine`, turn.js wrappers are removed, and the element can be initialized again.

## API Notes

Supported public turn API:

- `init` / `$('#magazine').turn(options)`
- `page`
- `next`
- `previous`
- `addPage`
- `removePage`
- `pages`
- `size`
- `display`
- `disable`
- `destroy`

Methods whose names start with `_` are private implementation details. Other legacy helpers may still exist for internal compatibility, but they are not documented as supported API.

The new `destroy` method is intended for teardown in single-page applications, tests, page transitions, and any workflow where a book needs to be removed or initialized again without leaving DOM wrappers or document event handlers behind.

## Tests

Run the full test suite:

```bash
npm test
```

Run only unit tests:

```bash
npm run test:unit
```

Run only Playwright visual tests:

```bash
npm run test:visual
```

Update Playwright snapshots after an intentional visual change:

```bash
npm run test:visual:update
```

The current suite covers:

- plugin registration;
- initialization state;
- initial page selection;
- dynamic `addPage` / `removePage`;
- event namespace registration;
- `destroy` cleanup and re-initialization;
- `requestAnimationFrame` scheduling and cancellation in `animatef`;
- standard CSS transform property writing;
- bounded, shadow-only fold gradients during animation;
- minimal demo rendering;
- page turn rendering;
- compact viewport geometry;
- page measurements during animation.

## Requirements

- Node.js for development and tests.
- jQuery `4.0.0` for the current maintained demo and test setup.
- A browser supported by Playwright for visual tests.

Older jQuery versions were part of the compatibility spike, but this repository now uses jQuery `4.0.0` as the modern target for its demo and automated tests.

## Browser Support

The original README listed Chrome 12, Safari 5, Firefox 10, and IE 9 for the historical 3rd release.

This maintained copy targets modern browsers, but the current automated coverage is limited to the configured Playwright browsers and the local test environment. Treat Safari/WebKit, mobile touch devices, and accessibility behavior as open validation work.

## License

Released under the original non-commercial BSD license. See [license.txt](license.txt).

## Original Project

- Original site: [turnjs.com](http://www.turnjs.com/)
- Original documentation: [GitHub wiki reference](https://github.com/blasten/turn.js/wiki/Reference)
