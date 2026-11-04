const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serialize, parse, TransferError } = require('../extension/filter-transfer.js');
const filter = { name: 'Ação 🎨', color: '#43bfa8', terms: ['ação', 'React', '<script>alert(1)</script>', 'two, terms'], enabled: false, wholeWord: false, caseSensitive: true, ignoreAccents: false };
test('text backup round-trips all filters, Unicode and matching options without settings or IDs', () => {
  const source = serialize([{ ...filter, id: 'old-id', sites: ['https://private.example/*'] }]);
  assert.deepEqual(parse(source), [filter]);
  assert.ok(!source.includes('old-id') && !source.includes('private.example'));
  assert.deepEqual(parse('\uFEFF' + source.replaceAll('\n', '\r\n')), [filter]);
});
test('plain text imports one filter with deduplicated terms and defaults', () => {
  const [result] = parse('React\r\nVue\r\nReact, Angular\n\n ação', 'Technology');
  assert.equal(result.name, 'Technology'); assert.deepEqual(result.terms, ['React', 'Vue', 'Angular', 'ação']);
  assert.equal(result.wholeWord, true); assert.equal(result.color, '#8b7cf8');
});
test('invalid structured text never falls back to keyword import', () => {
  for (const text of ['{broken', '["React"]', '# Scopelio filters v2\n{}', '{"format":"scopelio-filters","version":2,"filters":[]}']) assert.throws(() => parse(text), TransferError);
});
test('rejects invalid colors, options, empty files and over-limit lists without silently dropping data', () => {
  for (const invalid of [{ ...filter, color: 'red; color: black' }, { ...filter, enabled: 'yes' }, { ...filter, terms: [] }, { ...filter, terms: ['x'.repeat(161)] }, { ...filter, terms: Array(2001).fill('term') }, { ...filter, name: 'x'.repeat(61) }]) assert.throws(() => serialize([invalid]), TransferError);
  assert.throws(() => parse(' \n\t'), TransferError);
  assert.throws(() => serialize(Array(41).fill(filter)), TransferError);
  assert.throws(() => parse(serialize([])), /transferFilterLimit/);
});
test('preserves 2,000 terms and multiple named filters', () => {
  const large = { ...filter, terms: Array.from({ length: 2000 }, (_, i) => `term${i}`) };
  assert.deepEqual(parse(serialize([large, filter])), [large, filter]);
});
