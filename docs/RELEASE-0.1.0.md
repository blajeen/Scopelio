# Scopelio v0.1.0

The first public release of Scopelio — Color Highlights & Donut Analytics.

- Color-coded filters with up to 2,000 terms each.
- Local text highlighting, donut distribution and match navigation.
- Whole-word, case-sensitive and accent-insensitive matching options.
- Optional automatic activation per site and global pause.
- Minimal liquid glass interface, light/dark themes and reduced transparency.
- English by default, with Brazilian Portuguese in Preferences.
- Generated app icon, MIT license and bilingual documentation.

## Install

Download and extract `scopelio-0.1.0.zip`. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose Load unpacked, and select the extracted folder containing `manifest.json`. Chrome/Edge 120+ required.

This release is for manual installation. Browser store submission is pending. Protected browser pages, PDFs, iframes and Shadow DOM are outside this version's analysis scope. See the README for limits, privacy and matching rules.

Validation: eight unit tests and Chromium integration checks covering CRUD, dynamic content, highlighting, navigation, pause, site registration, languages, themes and saving 2,000 terms through the editor. Actual optional-access permission dialogs still require manual browser validation.

## Português

Primeira versão pública da Scopelio. Baixe e extraia o ZIP, abra `chrome://extensions` ou `edge://extensions`, ative o Modo do desenvolvedor e use Carregar sem compactação na pasta extraída. Para trocar o idioma: Preferences → Language → Português (Brasil).
