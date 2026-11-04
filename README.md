<p align="center"><img src="docs/assets/icon.png" width="100" alt="Scopelio icon"></p>
<h1 align="center">Scopelio</h1>
<p align="center"><strong>Color Highlights & Donut Analytics</strong><br>Your words. Your colors. More clarity.</p>
<p align="center"><a href="LICENSE">MIT License</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="https://github.com/blajeen/Scopelio/releases">Downloads</a> · <a href="https://github.com/blajeen/Scopelio/issues">Report a bug</a></p>

Scopelio is an open-source browser extension that highlights your terms in any authorized web page and shows their distribution in a donut chart. Create color-coded filters, see which topics appear most often, and jump straight to each match.

Built with a minimal liquid glass interface: soft translucency, subtle borders, and colors that keep your filters in focus. **English is the default language; Brazilian Portuguese is available in Preferences.** All analysis runs locally.

<p align="center"><img src="docs/assets/popup-light.png" width="360" alt="Scopelio popup showing color-coded filters and a donut chart"></p>

## Features

- **Named filters:** up to **2,000 terms per filter**, each with its own color.
- **Flexible matching:** whole words, case sensitivity, and accent-insensitive search.
- **Color highlights:** browser-native text highlights without rewriting page HTML.
- **Donut analytics:** total occurrences, count and percentage per filter.
- **Match navigation:** previous/next across all matches or one selected filter.
- **Site controls:** global pause and optional automatic activation per site.
- **Dynamic content:** updates when page text changes.
- **Two languages:** English and Brazilian Portuguese, saved between sessions.
- **Appearance:** light, dark, system theme, and reduced transparency.
- **Privacy:** no account, tracking, analytics, external scripts, or page uploads.

<img src="docs/assets/highlights.png" alt="Scopelio highlighting terms in a sample web page by filter color">

## Install

Scopelio v0.1.0 is available as a manually installed extension. Store publication is still pending. Supports **Chrome and Microsoft Edge 120+**. Firefox and Safari are not supported in this release.

1. Download `scopelio-0.1.0.zip` from [Releases](https://github.com/blajeen/Scopelio/releases/latest) and extract it. Alternatively, clone this repository and use its `extension` folder.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder containing `manifest.json` (or the repository's `extension` folder).
5. Open a regular HTTP/HTTPS website and click the Scopelio toolbar icon. Pin it for easy access.

No dependencies or build step are required to use the extension.

## How to use

1. Click **New filter**. Enter a name such as `Technology` and terms such as `React, Vue, Angular`.
2. Choose a color and matching options, then save. Separate terms with commas or new lines.
3. View the highlights and donut. The legend shows each filter's count and percentage.
4. Select a filter in the legend to narrow navigation; use **↑ / ↓** to jump through matches. Click it again to navigate all matches.
5. Enable **Always on this site** if you want automatic highlighting on future visits. The browser asks for access to that site.
6. Open **Preferences** (gear icon) to change language, theme or transparency. Use the top switch to pause Scopelio globally.

Filters are saved in your local browser profile. Disabling automatic activation removes the corresponding optional site permission. The popup can still analyze the current page when opened manually.

## Understanding the chart

`Filter percentage = matches assigned to that filter ÷ all assigned matches × 100`.

The chart measures **matched occurrences**, not the percentage of the full text, semantic importance or sentiment. Rounded percentages may not add up to exactly 100%.

An occurrence belongs to one filter. Overlapping matches are resolved by earliest starting position, then longest term at that position, then filter creation order. Duplicate normalized terms within a filter count once. Search is literal; regular expressions are not supported.

## Privacy and permissions

Page text and match results are processed in memory and are not uploaded or persisted. Filters, settings, and automatically enabled sites are stored in `chrome.storage.local`. Scopelio does not enable cloud sync.

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary current-page access after you invoke the extension. |
| `scripting` | Run the local analyzer and highlighter on authorized pages. |
| `storage` | Save filters and preferences locally. |
| Optional HTTP/HTTPS site access | Automatically analyze a site when you enable that option. |

Read the complete [privacy policy](PRIVACY.md). Removing the extension clears its local storage through the browser's uninstall mechanism.

## Scope and limits

The analyzer reads rendered text in the main document, including content outside the viewport. It skips hidden content, editable fields, buttons and scripts. Images, PDFs, browser-internal pages, iframes and Shadow DOM are excluded. Protected pages, including extension stores, may block access. Phrases split across inline elements in one text block are supported; structural block boundaries may interrupt phrases.

Limits: **40 filters**, **2,000 terms per filter**, **160 characters per term**, **1.5 million page characters**, and **20,000 candidate occurrences** per scan. Large-page limits produce an explicit partial-analysis notice. Term matching uses a cached Aho–Corasick automaton to scan dictionaries efficiently.

## Development

Node.js 22+:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

The build creates `dist/scopelio`; on Windows it also creates `dist/scopelio-0.1.0.zip`. Runtime code has no third-party dependencies and needs no bundler. Playwright is used only for development tests.

```text
extension/       Manifest, popup, translations, matching engine, content script
tests/           Unit tests and Chromium integration tests
scripts/         Distribution packaging
docs/            Screenshots, icon and store publishing checklist
```

Integration tests load a real extension in an isolated Chromium profile. The test-only manifest pre-grants localhost access because opening a popup URL does not simulate the toolbar's `activeTab` gesture. The distributed manifest does not contain that permission. Actual browser permission prompts require the [manual release checks](CONTRIBUTING.md).

## Contribute

Bug reports, accessibility improvements, translations and focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), include reproduction steps, and avoid sharing sensitive page content in public issues.

Planned improvements include filter collections, configuration import/export and additional browser support. These are not part of v0.1.0. Store submission follows the [publishing checklist](docs/STORE_CHECKLIST.md).

## License

[MIT](LICENSE). The app icon was created using OpenAI's built-in image generation tool; its prompt and processing notes are in [docs/BRAND.md](docs/BRAND.md).
