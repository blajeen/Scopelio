(() => {
  if (globalThis.Scopelio) return;
  const defaults = { enabled: true, filters: [], sites: [], language: 'en', theme: 'system', reduceTransparency: false };
  const palette = ['#8b7cf8', '#43bfa8', '#f2ac58', '#ed7c9c', '#63a5ed', '#c98de5'];
  function sanitize(value = {}) {
    return {
      enabled: value.enabled !== false,
      filters: (Array.isArray(value.filters) ? value.filters : []).slice(0, 40).map((f, i) => ({
        id: typeof f.id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(f.id) ? f.id : `filter-${i}`,
        name: String(f.name || 'Sem nome').slice(0, 60),
        terms: [...new Set((Array.isArray(f.terms) ? f.terms : []).map(t => String(t).trim().slice(0, 160)).filter(Boolean))].slice(0, 2000),
        color: /^#[0-9a-f]{6}$/i.test(f.color) ? f.color : palette[i % palette.length],
        enabled: f.enabled !== false,
        wholeWord: f.wholeWord !== false,
        caseSensitive: f.caseSensitive === true,
        ignoreAccents: f.ignoreAccents !== false
      })),
      sites: [...new Set((Array.isArray(value.sites) ? value.sites : []).filter(s => /^https?:\/\/[^/]+\/\*$/.test(s)))],
      theme: ['system', 'light', 'dark'].includes(value.theme) ? value.theme : 'system',
      language: value.language === 'pt-BR' ? 'pt-BR' : 'en',
      reduceTransparency: value.reduceTransparency === true
    };
  }
  globalThis.Scopelio = { defaults, palette, sanitize, async read() {
    return sanitize((await chrome.storage.local.get('settings')).settings || defaults);
  }, async save(settings) { await chrome.storage.local.set({ settings: sanitize(settings) }); } };
})();
