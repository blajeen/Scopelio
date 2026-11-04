/* Scopelio popup: all content and settings remain inside the browser. */
const $ = id => document.getElementById(id);
const t = key => ScopelioI18n.t(key);
const locale = () => settings.language === 'pt-BR' ? 'pt-BR' : 'en-US';
let settings, tab, sitePattern, editingId = null, selectedFilter = null, poll, busy = false;
let stats = { total: 0, counts: {}, active: false };
const media = matchMedia('(prefers-color-scheme: dark)');
const svgNS = 'http://www.w3.org/2000/svg';
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function appearance() {
  document.documentElement.dataset.theme = settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
  document.documentElement.dataset.reduced = settings.reduceTransparency;
}
function status(message = '') { $('status').textContent = message; }
async function persist() { await Scopelio.save(settings); }
async function send(message) { return chrome.tabs.sendMessage(tab.id, message); }
function unavailable(message) {
  sitePattern = null; $('auto-site').disabled = true; $('rescan').disabled = true;
  stats = { total: 0, counts: {}, active: false }; renderChart(); status(message);
}
async function scan() {
  if (!sitePattern || busy) return;
  busy = true; $('rescan').disabled = true; status(t('scanning'));
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['shared.js', 'matcher.js', 'content.js'] });
    stats = await send({ type: 'SCOPPELIO_SCAN', manual: true });
    renderChart(); showScanStatus();
  } catch {
    unavailable(t('unavailable'));
  } finally { busy = false; $('rescan').disabled = !sitePattern; }
}
function showScanStatus() {
  if (stats.error) status(t(stats.error));
  else if (!settings.enabled) status(t('paused'));
  else if (stats.truncated) status(t('limited'));
  else if (settings.filters.some(f => f.enabled) && !stats.total) status(t('noMatches'));
  else status('');
}
function selectFilter(id) { selectedFilter = selectedFilter === id ? null : id; $('position').textContent = '—'; renderChart(); }
function renderChart() {
  $('total').textContent = stats.total.toLocaleString(locale());
  $('segments').replaceChildren(); $('legend').replaceChildren();
  const active = settings.filters.filter(f => f.enabled);
  let offset = 0;
  const circumference = 2 * Math.PI * 78;
  active.forEach(filter => {
    const count = stats.counts?.[filter.id] || 0;
    const percent = stats.total ? count / stats.total * 100 : 0;
    if (count) {
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', '100'); circle.setAttribute('cy', '100'); circle.setAttribute('r', '78');
      circle.setAttribute('stroke', filter.color);
      const length = count / stats.total * circumference;
      circle.setAttribute('stroke-dasharray', `${Math.max(0, length - (active.filter(f => stats.counts?.[f.id]).length > 1 ? 4 : 0))} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', -offset); offset += length;
      circle.classList.add('segment'); if (selectedFilter === filter.id) circle.classList.add('selected');
      const title = document.createElementNS(svgNS, 'title'); title.textContent = `${filter.name}: ${count} (${percent.toFixed(1)}%)`; circle.append(title);
      circle.addEventListener('click', () => selectFilter(filter.id)); $('segments').append(circle);
    }
    const row = element('button', `legend-row${selectedFilter === filter.id ? ' selected' : ''}`);
    row.setAttribute('aria-pressed', String(selectedFilter === filter.id));
    const dot = element('span', 'color-dot'); dot.style.backgroundColor = filter.color;
    row.append(dot, element('span', 'legend-name', filter.name), element('span', 'legend-count', String(count)), element('span', 'legend-percent', `${percent.toLocaleString(locale(), { maximumFractionDigits: 1 })}%`));
    row.addEventListener('click', () => selectFilter(filter.id)); $('legend').append(row);
  });
  $('donut').setAttribute('aria-label', `${stats.total} ${t('occurrences')}. ${active.map(f => `${f.name}: ${stats.counts?.[f.id] || 0}`).join('. ')}`);
  const leading = active.reduce((best, f) => (stats.counts?.[f.id] || 0) > (stats.counts?.[best?.id] || 0) ? f : best, null);
  const tied = leading && active.filter(f => stats.counts?.[f.id] === stats.counts?.[leading.id]).length > 1;
  $('chart-caption').textContent = stats.total && leading ? (tied ? t('balanced') : `${leading.name} ${t('leading')}`) : t('emptyChart');
  $('navigator').hidden = !stats.total;
  $('navigation-label').textContent = settings.filters.find(f => f.id === selectedFilter)?.name || t('all');
}
function renderFilters() {
  $('filters').replaceChildren(); $('filter-count').textContent = settings.filters.length;
  $('empty-state').hidden = settings.filters.length > 0;
  $('add-filter').disabled = settings.filters.length >= 40;
  settings.filters.forEach(filter => {
    const card = element('div', `filter-card${filter.enabled ? '' : ' inactive'}`);
    const swatch = element('span', 'filter-swatch'); swatch.style.backgroundColor = filter.color;
    const info = element('button', 'filter-info');
    info.setAttribute('aria-label', `${t('edit')} ${filter.name}`);
    info.append(element('strong', '', filter.name), element('small', '', filter.terms.join(' · ')));
    info.addEventListener('click', () => openEditor(filter));
    const edit = element('button', 'icon-button', '⋯'); edit.setAttribute('aria-label', `${t('options')} ${filter.name}`); edit.addEventListener('click', () => openEditor(filter));
    const toggle = element('label', 'switch'), input = element('input'); input.type = 'checkbox'; input.checked = filter.enabled;
    input.setAttribute('aria-label', `${t('enableFilter')} ${filter.name}`);
    input.addEventListener('change', async () => { filter.enabled = input.checked; if (selectedFilter === filter.id) selectedFilter = null; await persist(); renderFilters(); await scan(); });
    toggle.append(input, element('span')); card.append(swatch, info, edit, toggle); $('filters').append(card);
  });
}
function setColor(color) {
  $('filter-color').value = color;
  for (const button of $('palette').children) button.setAttribute('aria-pressed', String(button.dataset.color === color));
}
function openEditor(filter) {
  editingId = filter?.id || null;
  $('dialog-title').textContent = t(filter ? 'edit' : 'newFilter');
  $('filter-name').value = filter?.name || ''; $('filter-terms').value = filter?.terms.join('\n') || '';
  $('whole-word').checked = filter?.wholeWord ?? true; $('case-sensitive').checked = filter?.caseSensitive ?? false; $('ignore-accents').checked = filter?.ignoreAccents ?? true;
  $('delete-filter').hidden = !filter; $('form-error').textContent = '';
  setColor(filter?.color || Scopelio.palette[settings.filters.length % Scopelio.palette.length]);
  $('filter-dialog').showModal(); $('filter-name').focus();
}
async function navigate(direction) {
  try {
    const result = await send({ type: 'SCOPPELIO_NAVIGATE', filterId: selectedFilter, direction });
    $('position').textContent = `${result.position} ${t('of')} ${result.total}`;
  } catch { status(t('changed')); }
}
async function init() {
  settings = await Scopelio.read(); ScopelioI18n.apply(settings.language); appearance(); media.addEventListener('change', appearance);
  $('enabled').checked = settings.enabled;
  $('theme').value = settings.theme; $('reduce-transparency').checked = settings.reduceTransparency;
  $('language').value = settings.language;
  renderFilters(); renderChart();
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported');
    sitePattern = `${url.protocol}//${url.hostname}/*`;
    $('page-host').textContent = url.hostname.replace(/^www\./, '');
    $('page-host').title = url.origin;
    $('auto-site').checked = settings.sites.includes(sitePattern);
    await scan();
  } catch { $('page-host').textContent = t('unavailableTag'); unavailable(t('openSite')); }
  poll = setInterval(async () => {
    if (busy || !sitePattern) return;
    try { const next = await send({ type: 'SCOPPELIO_STATUS' }); if (JSON.stringify(next) !== JSON.stringify(stats)) { stats = next; $('position').textContent = '—'; renderChart(); showScanStatus(); } } catch { /* A navigation can unload the content script. */ }
  }, 1000);
}
$('add-filter').addEventListener('click', () => openEditor());
$('close-dialog').addEventListener('click', () => $('filter-dialog').close());
$('filter-color').addEventListener('input', e => setColor(e.target.value));
Scopelio.palette.forEach(color => {
  const button = element('button', 'palette-button'); button.type = 'button'; button.dataset.color = color; button.style.backgroundColor = color;
  button.setAttribute('aria-label', `${t('useColor')} ${color}`); button.addEventListener('click', () => setColor(color)); $('palette').append(button);
});
$('filter-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('filter-name').value.trim(), terms = [...new Set($('filter-terms').value.split(/[,\n]/).map(t => t.trim()).filter(Boolean))];
  if (!name || !terms.length) { $('form-error').textContent = t('invalid'); return; }
  if (terms.length > 2000 || terms.some(term => term.length > 160)) { $('form-error').textContent = t('termLimit'); return; }
  const filter = { id: editingId || crypto.randomUUID(), name, terms, color: $('filter-color').value, enabled: settings.filters.find(f => f.id === editingId)?.enabled ?? true, wholeWord: $('whole-word').checked, caseSensitive: $('case-sensitive').checked, ignoreAccents: $('ignore-accents').checked };
  if (editingId) settings.filters = settings.filters.map(f => f.id === editingId ? filter : f); else settings.filters.push(filter);
  await persist(); $('filter-dialog').close(); renderFilters(); await scan();
});
$('delete-filter').addEventListener('click', async () => {
  settings.filters = settings.filters.filter(f => f.id !== editingId); if (selectedFilter === editingId) selectedFilter = null;
  await persist(); $('filter-dialog').close(); renderFilters(); await scan();
});
$('enabled').addEventListener('change', async e => { settings.enabled = e.target.checked; await persist(); await scan(); });
$('auto-site').addEventListener('change', async event => {
  const checked = event.target.checked;
  if (!sitePattern) return;
  try {
    if (checked) {
      const granted = await chrome.permissions.request({ origins: [sitePattern] });
      if (!granted) { event.target.checked = false; status(t('denied')); return; }
      settings.sites = [...new Set([...settings.sites, sitePattern])];
      await persist(); await scan();
    } else {
      settings.sites = settings.sites.filter(s => s !== sitePattern); await persist();
      await chrome.permissions.remove({ origins: [sitePattern] });
      status(t('autoOff'));
    }
  } catch { event.target.checked = settings.sites.includes(sitePattern); status(t('accessError')); }
});
$('examples').addEventListener('click', async () => {
  settings.filters = (settings.language === 'pt-BR' ? [
    { name: 'Tecnologia', terms: ['tecnologia', 'software', 'código', 'React', 'Vue', 'Angular'], color: Scopelio.palette[0] },
    { name: 'Design', terms: ['design', 'interface', 'cores', 'acessibilidade'], color: Scopelio.palette[1] },
    { name: 'Negócios', terms: ['negócios', 'produto', 'clientes', 'mercado'], color: Scopelio.palette[2] }
  ] : [
    { name: 'Technology', terms: ['technology', 'software', 'code', 'React', 'Vue', 'Angular'], color: Scopelio.palette[0] },
    { name: 'Design', terms: ['design', 'interface', 'colors', 'accessibility'], color: Scopelio.palette[1] },
    { name: 'Business', terms: ['business', 'product', 'customers', 'market'], color: Scopelio.palette[2] }
  ]).map(f => ({ ...f, id: crypto.randomUUID(), enabled: true, wholeWord: true, caseSensitive: false, ignoreAccents: true }));
  await persist(); renderFilters(); await scan();
});
$('rescan').addEventListener('click', scan);
$('previous').addEventListener('click', () => navigate(-1)); $('next').addEventListener('click', () => navigate(1));
$('settings-button').addEventListener('click', () => $('preferences').showModal());
$('close-preferences').addEventListener('click', () => $('preferences').close());
$('theme').addEventListener('change', async e => { settings.theme = e.target.value; appearance(); await persist(); });
$('reduce-transparency').addEventListener('change', async e => { settings.reduceTransparency = e.target.checked; appearance(); await persist(); });
document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
window.addEventListener('pagehide', () => clearInterval(poll));
$('language').addEventListener('change', async event => {
  settings.language = event.target.value;
  const host = $('page-host').textContent;
  ScopelioI18n.apply(settings.language); $('page-host').textContent = host;
  $('position').textContent = '—'; renderFilters(); renderChart(); showScanStatus();
  for (const button of $('palette').children) button.setAttribute('aria-label', `${t('useColor')} ${button.dataset.color}`);
  await persist();
});
init().catch(() => status(t('loadError')));
