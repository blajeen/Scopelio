const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findMatches } = require('../extension/matcher.js');
const filter = (id, terms, options = {}) => ({ id, terms, enabled: true, wholeWord: true, ignoreAccents: true, caseSensitive: false, ...options });
test('matches accents, casing, repeated terms and original Unicode offsets', () => {
  const text = '😀 AÇÃO ação acao ação';
  const result = findMatches(text, [filter('a', ['ação', 'ACAO'])]);
  assert.equal(result.matches.length, 4);
  assert.deepEqual(result.matches.map(m => text.slice(m.start, m.end)), ['AÇÃO', 'ação', 'acao', 'ação']);
});
test('whole words support Unicode and avoid substrings', () => {
  assert.equal(findMatches('React reactivity préReact React2 React_ React.', [filter('a', ['React'])]).matches.length, 2);
  assert.equal(findMatches('React reactivity', [filter('a', ['react'], { wholeWord: false })]).matches.length, 2);
});
test('case and accent settings are independent', () => {
  assert.equal(findMatches('AÇÃO Ação Acao', [filter('a', ['Ação'], { caseSensitive: true, ignoreAccents: false })]).matches.length, 1);
});
test('overlap: earliest position, longest term, then filter order', () => {
  const result = findMatches('design system design', [filter('a', ['design']), filter('b', ['design system']), filter('c', ['design'])]);
  assert.deepEqual(result.matches.map(m => m.filterId), ['b', 'a']);
});
test('disabled filters, empty terms and punctuation literals', () => {
  assert.equal(findMatches('C++ a.b', [filter('off', ['C++'], { enabled: false }), filter('on', ['', 'a.b'])]).matches.length, 1);
});
test('caps large results and signals partial analysis', () => {
  const result = findMatches('a '.repeat(100), [filter('a', ['a'])], 10);
  assert.equal(result.matches.length, 10); assert.equal(result.truncated, true);
});
test('supports 2,000 terms, including shared prefixes and suffixes', () => {
  const terms = Array.from({ length: 2000 }, (_, i) => `keyword${i}`);
  const result = findMatches('keyword0 keyword1999 keyword1500 keyword42', [filter('large', terms)]);
  assert.equal(result.matches.length, 4);
  assert.equal(findMatches('ushers', [filter('suffix', ['he', 'she', 'hers'], { wholeWord: false })]).matches.length, 1);
});
test('settings preserve all 2,000 terms and default to English', () => {
  require('../extension/shared.js');
  const terms = Array.from({ length: 2001 }, (_, i) => `term${i}`);
  const settings = Scopelio.sanitize({ filters: [filter('many', terms)] });
  assert.equal(settings.filters[0].terms.length, 2000);
  assert.equal(settings.language, 'en');
  assert.equal(Scopelio.sanitize({ language: 'pt-BR' }).language, 'pt-BR');
});
test('floating widget is opt-in and clamps opacity when migrating old settings', () => {
  require('../extension/shared.js');
  assert.deepEqual(Scopelio.sanitize({}).floating, { enabled: false, opacity: 0.78 });
  assert.equal(Scopelio.sanitize({ floating: { enabled: true, opacity: 0 } }).floating.opacity, 0.2);
  assert.equal(Scopelio.sanitize({ floating: { opacity: 4 } }).floating.opacity, 1);
  assert.equal(Scopelio.sanitize({ floating: { opacity: 'invalid' } }).floating.opacity, 0.78);
});
