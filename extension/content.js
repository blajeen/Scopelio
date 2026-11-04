(() => {
  if (globalThis.__scopelioContent) return;
  globalThis.__scopelioContent = true;
  const MAX_TEXT = 1500000, MAX_MATCHES = 20000;
  const excluded = 'script,style,noscript,textarea,input,select,option,button,svg,canvas,[contenteditable]:not([contenteditable="false"]),[hidden],[aria-hidden="true"]';
  let settings, manual = false, ranges = [], current = -1, selected = null, timer, generation = 0, mutationStarted = null;
  let snapshot = { total: 0, counts: {}, active: false, truncated: false };
  let lastInput = null, lastFilters = '';
  const names = new Set();
  const orbit = new ScopelioOrbit();
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
    const scanSettings = settings;
    const nextSnapshot = { total: 0, counts: Object.fromEntries(scanSettings.filters.map(f => [f.id, 0])), active: isActive(), truncated: false };
    if (!nextSnapshot.active || !globalThis.Highlight || !CSS.highlights) {
      clear(); lastInput = null; snapshot = nextSnapshot;
      if (nextSnapshot.active) snapshot.error = 'unsupported';
      orbit.update(settings, snapshot, navigate); return;
    }
    const collected = textBlocks();
    const filterKey = JSON.stringify(scanSettings.filters);
    const unchanged = lastInput && lastFilters === filterKey && collected.truncated === lastInput.truncated && collected.blocks.length === lastInput.blocks.length && collected.blocks.every((block, i) => {
      const previous = lastInput.blocks[i];
      return block.text === previous.text && block.nodes.length === previous.nodes.length && block.nodes.every((part, n) => part.node === previous.nodes[n].node && part.start === previous.nodes[n].start && part.end === previous.nodes[n].end);
    });
    if (unchanged) { orbit.update(settings, snapshot, navigate); return; }
    nextSnapshot.truncated = collected.truncated;
    const grouped = new Map();
    const nextRanges = [];
    let index = 0;
    for (const block of collected.blocks) {
      const found = ScopelioMatcher.findMatches(block.text, scanSettings.filters, MAX_MATCHES - nextRanges.length);
      nextSnapshot.truncated ||= found.truncated;
      let firstIndex = 0, lastIndex = 0;
      for (const match of found.matches) {
        while (block.nodes[firstIndex].end <= match.start) firstIndex++;
        while (block.nodes[lastIndex].end < match.end) lastIndex++;
        const first = block.nodes[firstIndex], last = block.nodes[lastIndex];
        const range = document.createRange();
        range.setStart(first.node, match.start - first.start); range.setEnd(last.node, match.end - last.start);
        nextRanges.push({ range, filterId: match.filterId });
        if (!grouped.has(match.filterId)) grouped.set(match.filterId, []);
        grouped.get(match.filterId).push(range);
        nextSnapshot.counts[match.filterId]++;
      }
      if (nextRanges.length >= MAX_MATCHES) { nextSnapshot.truncated = true; break; }
      if (++index % 100 === 0) { await new Promise(resolve => setTimeout(resolve, 0)); if (version !== generation) return; }
    }
    if (version !== generation) return;
    clear(); ranges = nextRanges;
    nextSnapshot.total = ranges.length; snapshot = nextSnapshot;
    lastInput = collected; lastFilters = filterKey;
    let rules = '';
    scanSettings.filters.forEach((filter, i) => {
      const name = `scopelio-${i}`;
      const highlight = new Highlight(...(grouped.get(filter.id) || []));
      CSS.highlights.set(name, highlight); names.add(name);
      rules += `::highlight(${name}){background-color:${filter.color}99;color:#171923;}`;
    });
    rules += '::highlight(scopelio-current){background-color:#fde68a;color:#111827;text-decoration:underline;}';
    style.textContent = rules;
    orbit.update(settings, snapshot, navigate);
  }
  async function refresh(force = false) {
    const next = await Scopelio.read();
    const changed = !settings || JSON.stringify([settings.enabled, settings.filters, settings.sites]) !== JSON.stringify([next.enabled, next.filters, next.sites]);
    settings = next;
    if (force || changed) await scan();
    else orbit.update(settings, snapshot, navigate);
  }
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
      refresh(true).then(() => respond(snapshot)).catch(() => respond({ total: 0, counts: {}, error: 'scanError' }));
      return true;
    }
    if (message.type === 'SCOPPELIO_STATUS') respond(snapshot);
    if (message.type === 'SCOPPELIO_NAVIGATE') respond(navigate(message.filterId, message.direction));
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) refresh(); });
  const observer = new MutationObserver(records => {
    const own = node => node === orbit.host || node === style || style.contains(node);
    if (!settings || !isActive() || records.every(r => own(r.target) || r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every(own))) return;
    mutationStarted ??= performance.now();
    const delay = Math.min(350, Math.max(0, 1500 - (performance.now() - mutationStarted)));
    clearTimeout(timer); timer = setTimeout(() => { mutationStarted = null; scan(); }, delay);
  });
  observer.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-hidden'] });
  refresh();
})();
