(() => {
  if (globalThis.ScopelioOrbit) return;
  const NS = 'http://www.w3.org/2000/svg';
  const css = `
    :host{all:initial!important;position:fixed!important;left:var(--orbit-left,calc(100vw - 210px))!important;top:var(--orbit-top,24px)!important;z-index:2147483646!important;width:184px!important;height:auto!important;display:block!important;pointer-events:none!important;color-scheme:light dark!important;}
    *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #a99aff;outline-offset:4px}button{color:inherit}button:disabled{opacity:.35;cursor:default}
    .orbit{font:11px/1.4 system-ui,sans-serif;color:#34304c;position:relative;opacity:var(--opacity,.78);transition:opacity .2s;color-scheme:light;isolation:isolate;filter:drop-shadow(0 1px 1px #fff);}
    .orbit.dark{color:#f4efff;color-scheme:dark;filter:drop-shadow(0 1px 2px #101020)}
    .orbit:hover,.orbit:focus-within,.orbit.dragging{opacity:1}
    .toolbar{height:27px;display:flex;align-items:center;justify-content:center;gap:3px;pointer-events:auto}
    button{border:0;background:transparent;padding:3px;border-radius:6px;line-height:1;transition:color .15s,transform .15s}button:hover{color:#8b7cf8}button:active{transform:scale(.94)}
    .handle{cursor:grab;touch-action:none;font-size:8px;letter-spacing:1.5px;font-weight:650;padding:5px 7px;display:flex;align-items:center;gap:5px;user-select:none;opacity:.65}.handle:active{cursor:grabbing}.handle i{width:4px;height:4px;background:#8b7cf8;border-radius:100%}.close{font-size:17px;font-weight:300;visibility:hidden}.orbit.interacting .close,.orbit:focus-within .close{visibility:visible}
    .dial{position:relative;width:184px;height:184px;pointer-events:none}svg{width:184px;height:184px;overflow:visible}.reference{fill:none;stroke:currentColor;stroke-opacity:.15;stroke-width:.7;stroke-dasharray:1 7}.track{fill:none;stroke:#a59bbc;stroke-opacity:.15;stroke-width:12}.segment{fill:none;stroke-width:12;pointer-events:stroke;cursor:pointer;transition:stroke-width .18s,opacity .18s;outline:none}.segment:hover,.segment:focus-visible,.segment.selected{stroke-width:17}.segment.muted{opacity:.3}
    .center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none}.count{font-size:34px;line-height:1.1;font-weight:550;letter-spacing:-1.5px;font-variant-numeric:tabular-nums}.caption{font-size:8px;letter-spacing:.5px;text-align:center;margin-top:5px;opacity:.65}
    .detail{height:29px;text-align:center;font-size:9px;font-variant-numeric:tabular-nums;pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 3px}.detail strong{font-weight:600}.detail small{display:block;font-size:8px;opacity:.65;margin-top:2px}
    .navigation{display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto;opacity:.3;transition:opacity .2s}.orbit:hover .navigation,.orbit:focus-within .navigation{opacity:1}.navigation button{width:25px;height:25px;font-size:16px}.position{font-size:8px;min-width:45px;text-align:center;font-variant-numeric:tabular-nums;opacity:.75}
    .tools{opacity:0;transition:opacity .2s;pointer-events:none;margin:6px auto 0;display:flex;justify-content:center;align-items:center;gap:7px;height:22px}.orbit:hover .tools,.orbit:focus-within .tools{opacity:1;pointer-events:auto}.tools input{width:70px;height:12px;accent-color:#8b7cf8;cursor:pointer}.tools button{font-size:14px}.tools output{font-size:8px;width:29px}.hint{position:absolute;left:-16px;right:-16px;text-align:center;bottom:-18px;font-size:8px;opacity:0;pointer-events:none}.orbit:hover .hint,.orbit:focus-within .hint{opacity:.65}
    .reference{display:none}.controls{position:absolute;top:211px;left:0;right:0;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .15s,visibility .15s}.orbit:hover .controls,.orbit.interacting .controls,.orbit:focus-within .controls{visibility:visible;opacity:1;pointer-events:auto}.orbit .navigation,.orbit .tools{opacity:1}.detail{height:32px;padding-top:2px}.hint{display:none}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;
  class Orbit {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'scopelio-orbit';
      this.host.setAttribute('data-scopelio-ui', '');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `<style>${css}</style><section class="orbit" aria-label="Scopelio Orbit"><div class="toolbar"><button class="handle"><i></i>scopelio</button><button class="close">×</button></div><div class="dial"><svg viewBox="0 0 184 184" role="group"><circle class="track" cx="92" cy="92" r="68"/><g class="segments" transform="rotate(-90 92 92)"></g></svg><div class="center"><strong class="count">0</strong><span class="caption"></span></div></div><div class="controls"><div class="detail"><strong></strong><small></small></div><div class="navigation"><button class="previous">↑</button><span class="position" aria-live="polite">—</span><button class="next">↓</button></div><div class="tools"><button class="reset">↺</button><input class="opacity" type="range" min="20" max="100" step="1"><output></output></div></div></section>`;
      this.root = this.shadow.querySelector('.orbit');
      this.nodes = Object.fromEntries(['segments', 'count', 'caption', 'detail', 'position', 'opacity', 'controls'].map(name => [name, this.shadow.querySelector(`.${name}`)]));
      this.circles = new Map();
      this.root.addEventListener('pointerover', () => this.interact());
      this.root.addEventListener('pointerleave', () => { this.hideTimer = setTimeout(() => { if (!this.dragOrigin) this.root.classList.remove('interacting'); }, 240); });
      this.media = matchMedia('(prefers-color-scheme: dark)');
      this.media.addEventListener('change', () => this.applyTheme());
      this.position = null;
      this.ready = chrome.storage.local.get('orbitPosition').then(({ orbitPosition }) => { this.position = orbitPosition; this.place(); });
      this.handle = this.shadow.querySelector('.handle');
      this.handle.addEventListener('pointerdown', event => this.startDrag(event));
      this.handle.addEventListener('pointermove', event => this.drag(event));
      this.handle.addEventListener('pointerup', () => this.endDrag());
      this.handle.addEventListener('pointercancel', () => this.endDrag());
      this.handle.addEventListener('keydown', event => {
        const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (!directions[event.key]) return;
        event.preventDefault();
        const rect = this.host.getBoundingClientRect(), [dx, dy] = directions[event.key], step = event.shiftKey ? 40 : 10;
        this.move(rect.left + dx * step, rect.top + dy * step); this.savePosition();
      });
      this.shadow.querySelector('.close').addEventListener('click', () => this.setPreference({ enabled: false }));
      this.shadow.querySelector('.reset').addEventListener('click', () => { this.position = null; this.place(); this.savePosition(); });
      for (const [selector, direction] of [['.previous', -1], ['.next', 1]]) this.shadow.querySelector(selector).addEventListener('click', () => {
        const result = this.navigate(this.selected, direction);
        this.shadow.querySelector('.position').textContent = `${result.position} ${this.t('of')} ${result.total}`;
      });
      const opacity = this.shadow.querySelector('.opacity');
      opacity.addEventListener('input', () => this.opacity(Number(opacity.value) / 100));
      opacity.addEventListener('change', () => this.setPreference({ opacity: Number(opacity.value) / 100 }));
      window.addEventListener('resize', () => { if (!this.resizeFrame) this.resizeFrame = requestAnimationFrame(() => { this.resizeFrame = 0; this.place(); }); });
    }
    interact() { clearTimeout(this.hideTimer); this.root.classList.add('interacting'); }
    t(key) { return ScopelioI18n.translate(key, this.settings?.language); }
    async setPreference(patch) {
      const settings = await Scopelio.read();
      await Scopelio.save({ ...settings, floating: { ...settings.floating, ...patch } });
    }
    applyTheme() { this.root.classList.toggle('dark', this.settings?.theme === 'dark' || (this.settings?.theme === 'system' && this.media.matches)); }
    opacity(value) { this.root.style.setProperty('--opacity', value); this.shadow.querySelector('output').textContent = `${Math.round(value * 100)}%`; }
    bounds() { return { x: Math.max(0, innerWidth - 184), y: Math.max(0, innerHeight - 307) }; }
    move(x, y, bounds = this.bounds()) {
      x = Math.max(0, Math.min(bounds.x, x)); y = Math.max(0, Math.min(bounds.y, y));
      this.host.style.setProperty('--orbit-left', `${x}px`); this.host.style.setProperty('--orbit-top', `${y}px`);
      this.position = { x: bounds.x ? x / bounds.x : 0, y: bounds.y ? y / bounds.y : 0 };
    }
    place() {
      if (!this.host.isConnected) return;
      const bounds = this.bounds();
      const valid = this.position && Number.isFinite(this.position.x) && Number.isFinite(this.position.y);
      this.move(valid ? this.position.x * bounds.x : bounds.x - 26, valid ? this.position.y * bounds.y : bounds.y - 26);
    }
    savePosition() { return chrome.storage.local.set({ orbitPosition: this.position }); }
    startDrag(event) {
      if (event.button !== 0) return;
      const rect = this.host.getBoundingClientRect();
      this.dragOrigin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, bounds: this.bounds() };
      this.handle.setPointerCapture(event.pointerId); this.root.classList.add('dragging');
    }
    drag(event) {
      if (!this.dragOrigin) return;
      this.pendingMove = { x: event.clientX, y: event.clientY };
      if (!this.dragFrame) this.dragFrame = requestAnimationFrame(() => { this.dragFrame = 0; this.flushMove(); });
    }
    flushMove() {
      if (!this.dragOrigin || !this.pendingMove) return;
      const { x, y, left, top, bounds } = this.dragOrigin;
      this.move(left + this.pendingMove.x - x, top + this.pendingMove.y - y, bounds); this.pendingMove = null;
    }
    endDrag() { if (this.dragOrigin) { cancelAnimationFrame(this.dragFrame); this.dragFrame = 0; this.flushMove(); this.dragOrigin = null; this.root.classList.remove('dragging'); this.savePosition(); } }
    update(settings, snapshot, navigate) {
      this.settings = settings; this.navigate = navigate; this.snapshot = snapshot;
      if (!settings.floating.enabled || !snapshot.active || snapshot.error) {
        clearTimeout(this.hideTimer); this.endDrag(); this.shadow.activeElement?.blur();
        this.root.classList.remove('interacting'); this.preview = null; this.host.remove(); return;
      }
      if (!this.host.isConnected) { document.documentElement.append(this.host); this.place(); }
      this.applyTheme(); this.opacity(settings.floating.opacity);
      this.shadow.querySelector('.opacity').value = Math.round(settings.floating.opacity * 100);
      this.handle.setAttribute('aria-label', this.t('moveOrbit')); this.handle.title = this.t('orbitKeyboard');
      for (const [selector, key] of [['.close', 'hideOrbit'], ['.previous', 'previous'], ['.next', 'next'], ['.opacity', 'opacity'], ['.reset', 'orbitReset']]) this.shadow.querySelector(selector).setAttribute('aria-label', this.t(key));
      this.selected = settings.filters.some(f => f.enabled && f.id === this.selected) ? this.selected : null;
      const signature = JSON.stringify([snapshot.total, snapshot.counts, snapshot.truncated, settings.language, settings.filters.map(f => [f.id, f.name, f.color, f.enabled])]);
      if (signature !== this.signature) { this.signature = signature; this.preview = null; this.render(); }
    }
    render() {
      const { settings, snapshot } = this;
      const group = this.nodes.segments;
      const filters = settings.filters.filter(f => f.enabled && snapshot.counts[f.id]);
      const wanted = new Set(filters.map(f => f.id));
      for (const [id, circle] of this.circles) if (!wanted.has(id)) { circle.remove(); this.circles.delete(id); }
      const circumference = 2 * Math.PI * 68;
      let offset = 0, index = 0;
      for (const filter of filters) {
        const count = snapshot.counts[filter.id], length = count / snapshot.total * circumference;
        let circle = this.circles.get(filter.id);
        if (!circle) {
          circle = document.createElementNS(NS, 'circle'); circle.classList.add('segment'); circle.dataset.filter = filter.id;
          const select = () => { this.selected = this.selected === filter.id ? null : filter.id; this.paintDetail(); this.resetNavigation(); };
          circle.addEventListener('click', select);
          circle.addEventListener('pointerenter', () => { this.interact(); this.preview = filter.id; this.paintDetail(); });
          circle.addEventListener('pointerleave', () => { this.preview = null; this.paintDetail(); });
          circle.addEventListener('focus', () => { this.preview = filter.id; this.interact(); this.paintDetail(); });
          circle.addEventListener('blur', () => { this.preview = null; this.paintDetail(); });
          circle.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
          circle.append(document.createElementNS(NS, 'title')); this.circles.set(filter.id, circle);
        }
        for (const [name, value] of Object.entries({ cx: 92, cy: 92, r: 68, stroke: filter.color, 'stroke-dasharray': `${Math.max(0, length - (filters.length > 1 ? 4 : 0))} ${circumference}`, 'stroke-dashoffset': -offset, tabindex: 0, role: 'button', 'aria-label': `${filter.name}: ${count} (${(count / snapshot.total * 100).toFixed(1)}%)` })) if (circle.getAttribute(name) !== String(value)) circle.setAttribute(name, value);
        offset += length;
        const label = circle.getAttribute('aria-label'); if (circle.firstChild.textContent !== label) circle.firstChild.textContent = label;
        if (group.children[index] !== circle) group.insertBefore(circle, group.children[index] || null); index++;
      }
      this.nodes.count.textContent = snapshot.total.toLocaleString(settings.language);
      this.nodes.caption.textContent = this.t('occurrences');
      this.paintDetail();
      this.resetNavigation();
    }
    resetNavigation() {
      const snapshot = this.snapshot;
      this.nodes.position.textContent = '—';
      this.shadow.querySelectorAll('.navigation button').forEach(button => { button.disabled = !snapshot.total || !!this.selected && !snapshot.counts[this.selected]; });
    }
    paintDetail() {
      const { settings, snapshot } = this;
      const filters = settings.filters.filter(f => f.enabled && snapshot.counts[f.id]);
      const filter = settings.filters.find(f => f.id === (this.preview || this.selected));
      for (const circle of this.circles.values()) {
        circle.classList.toggle('muted', !!filter && circle.dataset.filter !== filter.id);
        circle.classList.toggle('selected', circle.dataset.filter === this.selected);
        const pressed = String(circle.dataset.filter === this.selected); if (circle.getAttribute('aria-pressed') !== pressed) circle.setAttribute('aria-pressed', pressed);
      }
      const top = filters.reduce((best, f) => !best || snapshot.counts[f.id] > snapshot.counts[best.id] ? f : best, null);
      const detail = filter || top;
      this.shadow.querySelector('.detail strong').textContent = detail ? `${detail.name} · ${snapshot.counts[detail.id]} · ${(snapshot.counts[detail.id] / snapshot.total * 100).toLocaleString(settings.language, { maximumFractionDigits: 1 })}%` : this.t('orbitEmpty');
      this.shadow.querySelector('.detail small').textContent = snapshot.truncated ? this.t('orbitPartial') : this.t('orbitTotal');
    }
  }
  globalThis.ScopelioOrbit = Orbit;
})();
