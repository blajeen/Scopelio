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
    .handle{cursor:grab;touch-action:none;font-size:9px;letter-spacing:1.6px;font-weight:750;padding:5px 7px;display:flex;align-items:center;gap:5px;user-select:none}.handle:active{cursor:grabbing}.handle i{width:5px;height:5px;background:#8b7cf8;box-shadow:0 0 7px #8b7cf855;border-radius:100%}.close{font-size:17px;font-weight:300;opacity:.6}
    .dial{position:relative;width:184px;height:184px;pointer-events:none}svg{width:184px;height:184px;overflow:visible}.reference{fill:none;stroke:currentColor;stroke-opacity:.15;stroke-width:.7;stroke-dasharray:1 7}.track{fill:none;stroke:#a59bbc;stroke-opacity:.15;stroke-width:12}.segment{fill:none;stroke-width:12;pointer-events:stroke;cursor:pointer;transition:stroke-width .18s,opacity .18s;outline:none}.segment:hover,.segment:focus-visible,.segment.selected{stroke-width:17}.segment.muted{opacity:.3}
    .center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none}.count{font-size:31px;line-height:1.1;font-weight:600;letter-spacing:-1.7px;font-variant-numeric:tabular-nums}.caption{font-size:8px;letter-spacing:1.3px;text-transform:uppercase;max-width:100px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:5px;opacity:.8}.center:before{content:'+';font-weight:300;opacity:.45;position:absolute;top:33px;font-size:12px;color:#8b7cf8}
    .detail{height:29px;text-align:center;font-size:9px;font-variant-numeric:tabular-nums;pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 3px}.detail strong{font-weight:600}.detail small{display:block;font-size:8px;opacity:.65;margin-top:2px}
    .navigation{display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto;opacity:.3;transition:opacity .2s}.orbit:hover .navigation,.orbit:focus-within .navigation{opacity:1}.navigation button{width:25px;height:25px;font-size:16px}.position{font-size:8px;min-width:45px;text-align:center;font-variant-numeric:tabular-nums;opacity:.75}
    .tools{opacity:0;transition:opacity .2s;pointer-events:none;margin:6px auto 0;display:flex;justify-content:center;align-items:center;gap:7px;height:22px}.orbit:hover .tools,.orbit:focus-within .tools{opacity:1;pointer-events:auto}.tools input{width:70px;height:12px;accent-color:#8b7cf8;cursor:pointer}.tools button{font-size:14px}.tools output{font-size:8px;width:29px}.hint{position:absolute;left:-16px;right:-16px;text-align:center;bottom:-18px;font-size:8px;opacity:0;pointer-events:none}.orbit:hover .hint,.orbit:focus-within .hint{opacity:.65}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;
  class Orbit {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'scopelio-orbit';
      this.host.setAttribute('data-scopelio-ui', '');
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `<style>${css}</style><section class="orbit" aria-label="Scopelio Orbit"><div class="toolbar"><button class="handle"><i></i>scopelio / orbit</button><button class="close">×</button></div><div class="dial"><svg viewBox="0 0 184 184" role="group"><circle class="reference" cx="92" cy="92" r="87"/><circle class="track" cx="92" cy="92" r="68"/><g class="segments" transform="rotate(-90 92 92)"></g></svg><div class="center"><strong class="count">0</strong><span class="caption"></span></div></div><div class="detail"><strong></strong><small></small></div><div class="navigation"><button class="previous">↑</button><span class="position" aria-live="polite">—</span><button class="next">↓</button></div><div class="tools"><button class="reset">↺</button><input class="opacity" type="range" min="20" max="100" step="1"><output></output></div><div class="hint"></div></section>`;
      this.root = this.shadow.querySelector('.orbit');
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
      window.addEventListener('resize', () => this.place());
    }
    t(key) { return ScopelioI18n.translate(key, this.settings?.language); }
    async setPreference(patch) {
      const settings = await Scopelio.read();
      await Scopelio.save({ ...settings, floating: { ...settings.floating, ...patch } });
    }
    applyTheme() { this.root.classList.toggle('dark', this.settings?.theme === 'dark' || (this.settings?.theme === 'system' && this.media.matches)); }
    opacity(value) { this.root.style.setProperty('--opacity', value); this.shadow.querySelector('output').textContent = `${Math.round(value * 100)}%`; }
    bounds() { return { x: Math.max(0, innerWidth - 184), y: Math.max(0, innerHeight - this.host.getBoundingClientRect().height - 22) }; }
    move(x, y) {
      const bounds = this.bounds();
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
      this.dragOrigin = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      this.handle.setPointerCapture(event.pointerId); this.root.classList.add('dragging');
    }
    drag(event) { if (this.dragOrigin) this.move(this.dragOrigin.left + event.clientX - this.dragOrigin.x, this.dragOrigin.top + event.clientY - this.dragOrigin.y); }
    endDrag() { if (this.dragOrigin) { this.dragOrigin = null; this.root.classList.remove('dragging'); this.savePosition(); } }
    update(settings, snapshot, navigate) {
      this.settings = settings; this.navigate = navigate; this.snapshot = snapshot;
      if (!settings.floating.enabled || !snapshot.active || snapshot.error) { this.host.remove(); return; }
      if (!this.host.isConnected) { document.documentElement.append(this.host); this.place(); }
      this.applyTheme(); this.opacity(settings.floating.opacity);
      this.shadow.querySelector('.opacity').value = Math.round(settings.floating.opacity * 100);
      this.handle.setAttribute('aria-label', this.t('moveOrbit')); this.handle.title = this.t('orbitKeyboard');
      for (const [selector, key] of [['.close', 'hideOrbit'], ['.previous', 'previous'], ['.next', 'next'], ['.opacity', 'opacity'], ['.reset', 'orbitReset']]) this.shadow.querySelector(selector).setAttribute('aria-label', this.t(key));
      this.shadow.querySelector('.hint').textContent = this.t('orbitHint');
      this.selected = settings.filters.some(f => f.enabled && f.id === this.selected) ? this.selected : null;
      this.preview = null;
      this.render();
    }
    render() {
      const { settings, snapshot } = this;
      const group = this.shadow.querySelector('.segments'); group.replaceChildren();
      const filters = settings.filters.filter(f => f.enabled && snapshot.counts[f.id]);
      const circumference = 2 * Math.PI * 68;
      let offset = 0;
      for (const filter of filters) {
        const count = snapshot.counts[filter.id], length = count / snapshot.total * circumference;
        const circle = document.createElementNS(NS, 'circle');
        for (const [name, value] of Object.entries({ cx: 92, cy: 92, r: 68, stroke: filter.color, 'stroke-dasharray': `${Math.max(0, length - (filters.length > 1 ? 4 : 0))} ${circumference}`, 'stroke-dashoffset': -offset, tabindex: 0, role: 'button', 'aria-pressed': String(this.selected === filter.id), 'aria-label': `${filter.name}: ${count} (${(count / snapshot.total * 100).toFixed(1)}%)` })) circle.setAttribute(name, value);
        offset += length;
        circle.classList.add('segment');
        circle.dataset.filter = filter.id;
        if (this.selected === filter.id) circle.classList.add('selected');
        else if (this.selected) circle.classList.add('muted');
        const title = document.createElementNS(NS, 'title'); title.textContent = circle.getAttribute('aria-label'); circle.append(title);
        const select = () => { this.selected = this.selected === filter.id ? null : filter.id; this.render(); };
        circle.addEventListener('click', select);
        circle.addEventListener('pointerenter', () => { this.preview = filter.id; this.paintDetail(); });
        circle.addEventListener('pointerleave', () => { this.preview = null; this.paintDetail(); });
        circle.addEventListener('focus', () => { this.preview = filter.id; this.paintDetail(); });
        circle.addEventListener('blur', () => { this.preview = null; this.paintDetail(); });
        circle.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
        group.append(circle);
      }
      this.paintDetail();
      this.shadow.querySelector('.position').textContent = '—';
      this.shadow.querySelectorAll('.navigation button').forEach(button => { button.disabled = !snapshot.total || !!this.selected && !snapshot.counts[this.selected]; });
    }
    paintDetail() {
      const { settings, snapshot } = this;
      const filters = settings.filters.filter(f => f.enabled && snapshot.counts[f.id]);
      const filter = settings.filters.find(f => f.id === (this.preview || this.selected));
      for (const circle of this.shadow.querySelectorAll('.segment')) circle.classList.toggle('muted', !!filter && circle.dataset.filter !== filter.id);
      this.shadow.querySelector('.count').textContent = (filter ? snapshot.counts[filter.id] || 0 : snapshot.total).toLocaleString(settings.language);
      this.shadow.querySelector('.caption').textContent = filter?.name || this.t('occurrences');
      const top = filters.reduce((best, f) => !best || snapshot.counts[f.id] > snapshot.counts[best.id] ? f : best, null);
      const detail = filter || top;
      this.shadow.querySelector('.detail strong').textContent = detail ? `${detail.name} · ${(snapshot.counts[detail.id] / snapshot.total * 100).toLocaleString(settings.language, { maximumFractionDigits: 1 })}%` : this.t('orbitEmpty');
      this.shadow.querySelector('.detail small').textContent = snapshot.truncated ? this.t('orbitPartial') : this.t('orbitTotal');
    }
  }
  globalThis.ScopelioOrbit = Orbit;
})();
