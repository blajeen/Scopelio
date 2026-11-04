/* Versioned UTF-8 text backup; no browser APIs or executable file content. */
(() => {
  const HEADER = '# Scopelio filters v1';
  const MAX_BYTES = 16 * 1024 * 1024;
  class TransferError extends Error { constructor(code) { super(code); this.code = code; } }
  function validate(filters) {
    if (!Array.isArray(filters) || !filters.length || filters.length > 40) throw new TransferError('transferFilterLimit');
    return filters.map(filter => {
      if (!filter || typeof filter !== 'object' || Array.isArray(filter) || typeof filter.name !== 'string' || !filter.name.trim() || filter.name.trim().length > 60 || !/^#[0-9a-f]{6}$/i.test(filter.color)) throw new TransferError('transferInvalid');
      if (!Array.isArray(filter.terms) || !filter.terms.length || filter.terms.length > 2000 || filter.terms.some(term => typeof term !== 'string' || !term.trim() || term.trim().length > 160)) throw new TransferError('termLimit');
      const result = { name: filter.name.trim(), terms: [...new Set(filter.terms.map(term => term.trim()))], color: filter.color };
      for (const [option, fallback] of Object.entries({ enabled: true, wholeWord: true, caseSensitive: false, ignoreAccents: true })) {
        if (filter[option] !== undefined && typeof filter[option] !== 'boolean') throw new TransferError('transferInvalid');
        result[option] = filter[option] ?? fallback;
      }
      return result;
    });
  }
  function serialize(filters) {
    // Export an empty list too, so an empty installation can be backed up honestly.
    const safe = filters.length ? validate(filters) : [];
    return `${HEADER}\n${JSON.stringify({ format: 'scopelio-filters', version: 1, filters: safe }, null, 2)}\n`;
  }
  function parse(text, name = 'Imported filter') {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new TransferError('transferTooLarge');
    text = text.replace(/^\uFEFF/, '').trim();
    if (!text) throw new TransferError('transferEmpty');
    const structured = text.startsWith('# Scopelio filters') || /^[{\[]/.test(text);
    if (structured) {
      if (text.startsWith('# Scopelio filters')) {
        const newline = text.indexOf('\n');
        if (newline < 0 || text.slice(0, newline).trim() !== HEADER) throw new TransferError('transferVersion');
        text = text.slice(newline + 1);
      }
      let value;
      try { value = JSON.parse(text); } catch { throw new TransferError('transferInvalid'); }
      if (value?.format !== 'scopelio-filters') throw new TransferError('transferInvalid');
      if (value.version !== 1) throw new TransferError('transferVersion');
      return validate(value.filters);
    }
    const terms = [...new Set(text.split(/[,\r\n]/).map(term => term.trim()).filter(Boolean))];
    return validate([{ name: String(name).trim().slice(0, 60) || 'Imported filter', terms, color: '#8b7cf8' }]);
  }
  globalThis.ScopelioTransfer = { serialize, parse, validate, MAX_BYTES, TransferError };
  if (typeof module !== 'undefined') module.exports = globalThis.ScopelioTransfer;
})();
