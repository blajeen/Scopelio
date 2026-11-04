(function (root) {
  const word = /[\p{L}\p{N}_]/u;
  const compiled = new WeakMap();
  function normalize(text, filter) {
    let result = '';
    const starts = [], ends = [];
    let offset = 0;
    for (const char of text) {
      let mapped = filter.ignoreAccents ? char.normalize('NFD').replace(/\p{M}/gu, '') : char;
      if (!filter.caseSensitive) mapped = mapped.toLocaleLowerCase('pt-BR');
      if (!mapped && ends.length) ends[ends.length - 1] = offset + char.length;
      for (let i = 0; i < mapped.length; i++) { starts.push(offset); ends.push(offset + char.length); }
      result += mapped;
      offset += char.length;
    }
    return { text: result, starts, ends };
  }
  function automaton(filter) {
    if (compiled.has(filter)) return compiled.get(filter);
    const nodes = [{ next: new Map(), fail: 0, lengths: [] }];
    for (const term of new Set(filter.terms.map(term => normalize(term, filter).text).filter(Boolean))) {
      let state = 0;
      for (let i = 0; i < term.length; i++) {
        const char = term[i];
        if (!nodes[state].next.has(char)) {
          nodes[state].next.set(char, nodes.length);
          nodes.push({ next: new Map(), fail: 0, lengths: [] });
        }
        state = nodes[state].next.get(char);
      }
      nodes[state].lengths.push(term.length);
    }
    const queue = [...nodes[0].next.values()];
    for (let index = 0; index < queue.length; index++) {
      const parent = queue[index];
      for (const [char, state] of nodes[parent].next) {
        queue.push(state);
        let fallback = nodes[parent].fail;
        while (fallback && !nodes[fallback].next.has(char)) fallback = nodes[fallback].fail;
        nodes[state].fail = nodes[fallback].next.get(char) || 0;
        nodes[state].lengths.push(...nodes[nodes[state].fail].lengths);
      }
    }
    compiled.set(filter, nodes);
    return nodes;
  }
  function findMatches(text, filters, limit = 20000) {
    const candidates = [];
    const normalizations = new Map();
    let truncated = false;
    outer: for (let order = 0; order < filters.length; order++) {
      const filter = filters[order];
      if (!filter.enabled) continue;
      const key = `${filter.ignoreAccents}:${filter.caseSensitive}`;
      if (!normalizations.has(key)) normalizations.set(key, normalize(text, filter));
      const normalized = normalizations.get(key);
      const nodes = automaton(filter);
      let state = 0;
      for (let cursor = 0; cursor < normalized.text.length; cursor++) {
        const char = normalized.text[cursor];
        while (state && !nodes[state].next.has(char)) state = nodes[state].fail;
        state = nodes[state].next.get(char) || 0;
        for (const length of nodes[state].lengths) {
          const at = cursor + 1 - length;
          const before = Array.from(normalized.text.slice(Math.max(0, at - 2), at)).at(-1) || '';
          const after = String.fromCodePoint(normalized.text.codePointAt(cursor + 1) || 0);
          if (filter.wholeWord && (word.test(before) || word.test(after))) continue;
          candidates.push({ start: normalized.starts[at], end: normalized.ends[cursor], filterId: filter.id, order });
          if (candidates.length >= limit) { truncated = true; break outer; }
        }
      }
    }
    // Earlier position wins; at the same position, longest term, then filter order.
    candidates.sort((a, b) => a.start - b.start || b.end - a.end || a.order - b.order);
    const matches = [];
    let end = -1;
    for (const match of candidates) if (match.start >= end) { matches.push(match); end = match.end; }
    return { matches, truncated };
  }
  root.ScopelioMatcher = { findMatches, normalize };
  if (typeof module !== 'undefined') module.exports = root.ScopelioMatcher;
})(globalThis);
