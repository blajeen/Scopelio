(() => {
  if (globalThis.__scopelioContent) return;
  globalThis.__scopelioContent = true;
  const MAX_TEXT = 1500000, MAX_MATCHES = 20000;
  const excluded = 'script,style,noscript,textarea,input,select,option,button,svg,canvas,[contenteditable]:not([contenteditable="false"]),[hidden],[aria-hidden="true"]';
  let settings, manual = false, ranges = [], current = -1, selected = null, timer, generation = 0;
  let snapshot = { total: 0, counts: {}, active: false, truncated: false };
  const names = new Set();
  const style = document.createElement('style');
  style.dataset.scopelio = 'highlights';
  (document.head || document.documentElement).append(style);
  function clear() {
    for (const name of names) CSS.highlights.delete(name);
    names.clear(); ranges = []; current = -1;
  }
  function isActive() {
    return settings.enabled && (manual || settings.sites.includes(`${location.protocol}//${location.hostname}/*`));
  }
  function textBlocks() {
    const blocks = [];
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    const visibility = new WeakMap();
    let node, length = 0, lastParent = null, block;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest(excluded)) continue;
      let visible = visibility.get(parent);
      if (visible === undefined) { visible = parent.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }); visibility.set(parent, visible); }
      if (!visible) continue;
      const owner = parent.closest('p,div,li,h1,h2,h3,h4,h5,h6,article,section,td,th,blockquote,pre,dt,dd') || parent;
      if (owner !== lastParent) { block = { text: '', nodes: [] }; blocks.push(block); lastParent = owner; }
      const remaining = MAX_TEXT - length;
      if (remaining <= 0) return { blocks, truncated: true };
      const value = node.data.slice(0, remaining);
      block.nodes.push({ node, start: block.text.length, end: block.text.length + value.length });
      block.text += value; length += value.length;
      if (value.length < node.length) return { blocks, truncated: true };
    }
    return { blocks, truncated: false };
  }
  async function scan() {
    const version = ++generation;
    clear();
    snapshot = { total: 0, counts: Object.fromEntries(settings.filters.map(f => [f.id, 0])), active: isActive(), truncated: false };
    if (!snapshot.active) return;
    if (!globalThis.Highlight || !CSS.highlights) { snapshot.error = 'unsupported'; return; }
    const collected = textBlocks();
    snapshot.truncated = collected.truncated;
    const grouped = new Map();
    let index = 0;
    for (const block of collected.blocks) {
      const found = ScopelioMatcher.findMatches(block.text, settings.filters, MAX_MATCHES - ranges.length);
      snapshot.truncated ||= found.truncated;
      for (const match of found.matches) {
        const first = block.nodes.find(n => n.end > match.start);
        const last = block.nodes.find(n => n.end >= match.end);
        const range = document.createRange();
        range.setStart(first.node, match.start - first.start); range.setEnd(last.node, match.end - last.start);
        ranges.push({ range, filterId: match.filterId });
        if (!grouped.has(match.filterId)) grouped.set(match.filterId, []);
        grouped.get(match.filterId).push(range);
        snapshot.counts[match.filterId]++;
      }
      if (ranges.length >= MAX_MATCHES) { snapshot.truncated = true; break; }
      if (++index % 100 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (version !== generation) return; }
    }
    snapshot.total = ranges.length;
    let rules = '';
    settings.filters.forEach((filter, i) => {
      const name = `scopelio-${i}`;
      const highlight = new Highlight(...(grouped.get(filter.id) || []));
      CSS.highlights.set(name, highlight); names.add(name);
      rules += `::highlight(${name}){background-color:${filter.color}99;color:#171923;}`;
    });
    rules += '::highlight(scopelio-current){background-color:#fde68a;color:#111827;text-decoration:underline;}';
    style.textContent = rules;
  }
  async function refresh() { settings = await Scopelio.read(); await scan(); }
  function navigate(filterId, direction) {
    const pool = ranges.filter(r => !filterId || r.filterId === filterId);
    if (selected !== filterId) { current = -1; selected = filterId; }
    if (!pool.length) return { position: 0, total: 0 };
    current = current < 0 ? (direction < 0 ? pool.length - 1 : 0) : (current + direction + pool.length) % pool.length;
    const range = pool[current].range;
    const highlight = new Highlight(range); highlight.priority = 100;
    CSS.highlights.set('scopelio-current', highlight); names.add('scopelio-current');
    range.startContainer.parentElement.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    return { position: current + 1, total: pool.length };
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'SCOPPELIO_SCAN') {
      manual = message.manual !== false;
      refresh().then(() => respond(snapshot)).catch(() => respond({ total: 0, counts: {}, error: 'scanError' }));
      return true;
    }
    if (message.type === 'SCOPPELIO_STATUS') respond(snapshot);
    if (message.type === 'SCOPPELIO_NAVIGATE') respond(navigate(message.filterId, message.direction));
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) refresh(); });
  const observer = new MutationObserver(records => {
    if (!settings || !isActive() || records.every(r => r.target === style || style.contains(r.target))) return;
    clearTimeout(timer); timer = setTimeout(() => refresh(), 350);
  });
  observer.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-hidden'] });
  refresh();
})();
