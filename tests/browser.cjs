const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
(async () => {
  const server = http.createServer((request, response) => { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(fs.readFileSync(path.join(__dirname, 'fixture.html'))); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scopelio-test-'));
  const extension = path.join(profile, 'extension');
  fs.cpSync(path.resolve(__dirname, '../extension'), extension, { recursive: true });
  // Only the isolated test copy has localhost access pre-granted. The shipped manifest
  // uses activeTab / a real user gesture, which opening a popup URL cannot simulate.
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    context.setDefaultTimeout(15000);
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const target = await context.newPage(); await target.goto(origin);
    const popup = await context.newPage();
    // Keep the web page as the active tab; popup runs as a document in another tab for automation.
    await target.bringToFront();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => document.getElementById('filter-count').textContent === '0');
    // A real action popup uses the active website. Redirect query only in this test harness.
    await popup.evaluate(async targetId => {
      chrome.tabs.query = async () => [await chrome.tabs.get(targetId)];
      await init();
    }, await worker.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url + '/').id, origin));
    assert.equal(await popup.locator('html').getAttribute('lang'), 'en');
    assert.equal(await popup.locator('h1').innerText(), 'Find what matters.');
    await popup.getByRole('button', { name: 'Preferences', exact: true }).click();
    await popup.getByLabel('Language', { exact: true }).selectOption('pt-BR');
    await popup.locator('#close-preferences').click();
    await popup.getByRole('button', { name: /Experimentar filtros/ }).click();
    await popup.waitForFunction(() => Number(document.getElementById('total').textContent) > 0);
    assert.equal(await popup.locator('#total').innerText(), '15');
    await popup.locator('.legend-row').first().hover();
    assert.equal(await popup.locator('#total').innerText(), '15', 'Popup total stays fixed on hover');
    assert.match(await popup.locator('#chart-caption').innerText(), /Tecnologia.*5.*33/);
    const chartBox = await popup.locator('#donut').boundingBox(), legendBox = await popup.locator('#legend').boundingBox();
    assert.ok(chartBox.width >= 230 && legendBox.y > chartBox.y + chartBox.height, 'Large donut sits above its legend');
    await popup.mouse.move(0, 0);
    assert.equal(await popup.locator('#total').innerText(), '15');
    assert.equal(await target.evaluate(() => CSS.highlights.size), 3);
    assert.equal(await target.locator('#scopelio-orbit').count(), 0, 'Orbit is opt-in');
    await popup.getByLabel('Mostrar donut flutuante', { exact: true }).check();
    const orbit = target.locator('#scopelio-orbit');
    await orbit.waitFor({ state: 'visible' });
    await target.waitForFunction(() => document.querySelector('#scopelio-orbit')?.shadowRoot.querySelector('.count').textContent === '15');
    assert.equal(await orbit.locator('.orbit').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await orbit.evaluate(host => { const rect = host.getBoundingClientRect(); return document.elementFromPoint(rect.left + 92, rect.top + 27 + 92) === host; }), false, 'Transparent center passes through page clicks');
    await popup.locator('#floating-opacity').evaluate(input => { input.value = '55'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
    await target.waitForFunction(() => document.querySelector('#scopelio-orbit')?.shadowRoot.querySelector('.orbit').style.getPropertyValue('--opacity') === '0.55');
    // Click the colored arc; the transparent center intentionally passes clicks to the page.
    await orbit.getByRole('button', { name: /Tecnologia: 5/ }).hover({ position: { x: 126, y: 34 } });
    await orbit.locator('.detail').waitFor({ state: 'visible' });
    assert.equal(await orbit.locator('.count').innerText(), '15', 'Orbit total stays fixed on hover');
    assert.match(await orbit.locator('.detail strong').innerText(), /Tecnologia.*5.*33/);
    await target.mouse.move(2, 2);
    assert.equal(await orbit.locator('.count').innerText(), '15');
    await orbit.getByRole('button', { name: /Tecnologia: 5/ }).click({ position: { x: 126, y: 34 } });
    assert.equal(await orbit.locator('.count').innerText(), '15');
    await orbit.getByRole('button', { name: 'Próxima ocorrência', exact: true }).click();
    assert.equal(await orbit.locator('.position').innerText(), '1 de 5');
    const technologyArc = orbit.getByRole('button', { name: /Tecnologia: 5/ });
    await technologyArc.focus();
    await technologyArc.press('Enter');
    assert.equal(await technologyArc.evaluate(circle => circle === circle.getRootNode().activeElement), true, 'Selection keeps keyboard focus on the same arc');
    await target.evaluate(() => {
      globalThis.savedScopelioArc = document.querySelector('#scopelio-orbit').shadowRoot.querySelector('.segment');
      globalThis.savedScopelioHighlight = CSS.highlights.get('scopelio-0');
      document.body.classList.add('layout-only-change');
    });
    await target.waitForTimeout(650);
    assert.equal(await target.evaluate(() => globalThis.savedScopelioArc === document.querySelector('#scopelio-orbit').shadowRoot.querySelector('.segment') && globalThis.savedScopelioHighlight === CSS.highlights.get('scopelio-0')), true, 'Unchanged text reuses highlights and arc nodes');
    const handle = orbit.locator('.handle'), beforeDrag = await orbit.boundingBox();
    const handleBox = await handle.boundingBox();
    await target.mouse.move(handleBox.x + 35, handleBox.y + 10); await target.mouse.down();
    await target.mouse.move(handleBox.x - 165, handleBox.y - 70, { steps: 8 }); await target.mouse.up();
    const afterDrag = await orbit.boundingBox();
    assert.ok(afterDrag.x < beforeDrag.x - 150, 'Orbit can be dragged');
    await handle.press('ArrowLeft');
    const savedPosition = await worker.evaluate(async () => (await chrome.storage.local.get('orbitPosition')).orbitPosition);
    assert.ok(savedPosition.x >= 0 && savedPosition.x <= 1);
    await popup.getByRole('button', { name: 'Próxima ocorrência', exact: true }).click();
    assert.equal(await popup.locator('#position').innerText(), '1 de 15');
    await popup.getByRole('button', { name: 'Novo filtro' }).click();
    await popup.getByLabel('Nome', { exact: true }).fill('Ação');
    await popup.getByLabel('Termos', { exact: true }).fill('ação');
    await popup.getByRole('button', { name: /Salvar filtro/ }).click();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '17');
    await target.evaluate(() => { document.getElementById('dynamic').textContent = 'React e design em conteúdo novo.'; });
    await popup.waitForFunction(() => document.getElementById('total').textContent === '19');
    assert.equal(await target.evaluate(() => globalThis.savedScopelioArc === document.querySelector('#scopelio-orbit').shadowRoot.querySelector('.segment')), true, 'Live counts update existing SVG arcs');
    await popup.getByLabel('Ativar filtro Ação', { exact: true }).uncheck();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '17');
    await popup.getByLabel('Ativar Scopelio', { exact: true }).uncheck();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '0');
    assert.equal(await target.evaluate(() => CSS.highlights.size), 0);
    assert.equal(await target.locator('#scopelio-orbit').count(), 0, 'Global pause hides Orbit');
    await popup.getByLabel('Ativar Scopelio', { exact: true }).check();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '17');
    await popup.getByRole('button', { name: 'Editar filtro Ação', exact: true }).click();
    await popup.getByRole('button', { name: 'Excluir filtro', exact: true }).click();
    assert.equal(await popup.locator('#filter-count').innerText(), '3');
    // Test automatic registration on the isolated pre-granted localhost origin.
    await worker.evaluate(async pattern => {
      await chrome.storage.local.set({ settings: { ...(await chrome.storage.local.get('settings')).settings, sites: [pattern] } });
    }, 'http://127.0.0.1/*');
    await popup.waitForFunction(async () => (await chrome.scripting.getRegisteredContentScripts()).length === 1);
    await target.reload();
    await target.waitForFunction(() => CSS.highlights.size === 3);
    await target.locator('#scopelio-orbit').waitFor({ state: 'visible' });
    const restored = await target.locator('#scopelio-orbit').boundingBox();
    assert.ok(Math.abs(restored.x - (afterDrag.x - 10)) < 3, 'Position survives page reload');
    await worker.evaluate(async () => { await chrome.storage.local.set({ settings: { ...(await chrome.storage.local.get('settings')).settings, sites: [] } }); });
    await popup.waitForFunction(async () => (await chrome.scripting.getRegisteredContentScripts()).length === 0);
    await target.reload();
    assert.equal(await target.evaluate(() => CSS.highlights.size), 0);
    await popup.getByRole('button', { name: /Analisar página novamente/ }).click();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '15');
    const saved = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
    assert.equal(saved.filters.length, 3);
    await popup.getByRole('button', { name: 'Preferências', exact: true }).click();
    await popup.getByLabel('Aparência').selectOption('dark');
    await popup.getByLabel('Reduzir transparência').check();
    await popup.locator('#close-preferences').click();
    assert.equal(await popup.locator('html').getAttribute('data-theme'), 'dark');
    fs.mkdirSync(path.resolve(__dirname, '../test-results'), { recursive: true });
    await popup.setViewportSize({ width: 400, height: 900 });
    await popup.screenshot({ path: path.resolve(__dirname, '../test-results/popup-dark.png'), fullPage: true });
    await popup.getByRole('button', { name: 'Preferências', exact: true }).click();
    await popup.getByLabel('Aparência').selectOption('light');
    await popup.getByLabel('Reduzir transparência').uncheck();
    await popup.getByLabel('Idioma', { exact: true }).selectOption('en');
    await popup.locator('#close-preferences').click();
    assert.equal(await popup.locator('html').getAttribute('lang'), 'en');
    assert.equal(await popup.locator('#auto-site').getAttribute('aria-label'), 'Always on this site');
    await popup.screenshot({ path: path.resolve(__dirname, '../test-results/popup-light.png'), fullPage: true });
    await orbit.locator('.handle').hover();
    await orbit.getByRole('button', { name: 'Hide floating donut', exact: true }).click();
    await popup.getByLabel('Show floating donut', { exact: true }).waitFor();
    await popup.waitForFunction(() => !document.getElementById('floating-enabled').checked);
    assert.equal(await target.locator('#scopelio-orbit').count(), 0);
    await popup.getByLabel('Show floating donut', { exact: true }).check();
    await orbit.waitFor({ state: 'visible' });
    await target.setViewportSize({ width: 540, height: 500 });
    await target.waitForFunction(() => { const rect = document.querySelector('#scopelio-orbit').getBoundingClientRect(); return rect.right <= 540 && rect.bottom <= 500; });
    const small = await orbit.boundingBox();
    assert.ok(small.x >= 0 && small.x + small.width <= 540 && small.y >= 0 && small.y + small.height <= 500, 'Resize keeps Orbit on screen');
    await target.setViewportSize({ width: 1280, height: 720 });
    await target.mouse.move(2, 2);
    await orbit.locator('.handle').evaluate(handle => handle.blur());
    await orbit.locator('.controls').waitFor({ state: 'hidden' });
    await orbit.screenshot({ path: path.resolve(__dirname, '../test-results/orbit.png') });
    await target.screenshot({ path: path.resolve(__dirname, '../test-results/highlights.png'), fullPage: true });
    // A large dictionary must pass through the actual editor and local persistence intact.
    await popup.getByRole('button', { name: 'New filter', exact: true }).click();
    await popup.locator('#filter-dialog').waitFor({ state: 'visible' });
    await popup.getByLabel('Name', { exact: true }).fill('Large dictionary');
    // Set a paste-sized value directly; Chromium's synthetic typing can time out on large text.
    await popup.getByLabel('Terms', { exact: true }).evaluate((textarea, text) => {
      textarea.value = text; textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, Array.from({ length: 2000 }, (_, i) => `dictionary${i}`).join('\n'));
    await popup.getByRole('button', { name: /Save filter/ }).click();
    await popup.waitForFunction(() => document.getElementById('filter-count').textContent === '4');
    const largeSettings = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
    assert.equal(largeSettings.filters[3].terms.length, 2000);
    assert.equal(largeSettings.language, 'en');
    // Download a real .txt backup, then exercise preview, cancel, validation, append and replace.
    await popup.getByRole('button', { name: 'Import or export filters', exact: true }).click();
    const downloadEvent = popup.waitForEvent('download');
    await popup.getByRole('button', { name: 'Export .txt', exact: true }).click();
    const download = await downloadEvent;
    assert.ok(download.suggestedFilename().endsWith('.txt'));
    const backup = fs.readFileSync(await download.path(), 'utf8');
    const { parse, serialize } = require('../extension/filter-transfer.js');
    const originalFilters = parse(backup);
    assert.equal(originalFilters.length, 4); assert.equal(originalFilters[3].terms.length, 2000);
    const setFile = async text => popup.locator('#import-file').setInputFiles({ name: 'filters.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await setFile('React\nVue\nReact');
    await popup.locator('#import-preview').waitFor({ state: 'visible' });
    assert.match(await popup.locator('#import-summary').innerText(), /1 filters · 2 terms/);
    await popup.getByRole('button', { name: 'Cancel preview', exact: true }).click();
    assert.equal((await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings)).filters.length, 4);
    await setFile('{broken json');
    await popup.waitForFunction(() => document.getElementById('transfer-error').textContent.length > 0);
    assert.equal(await popup.locator('#import-preview').isVisible(), false);
    await setFile(serialize(Array.from({ length: 40 }, () => originalFilters[0])));
    await popup.locator('#import-preview').waitFor({ state: 'visible' });
    await popup.getByRole('button', { name: 'Import filters', exact: true }).click();
    await popup.waitForFunction(() => document.getElementById('transfer-error').textContent.includes('40'));
    assert.equal((await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings)).filters.length, 4);
    await setFile('newterm\nsecondterm');
    await popup.locator('#import-preview').waitFor({ state: 'visible' });
    await popup.getByRole('button', { name: 'Import filters', exact: true }).click();
    await popup.waitForFunction(() => document.getElementById('filter-count').textContent === '5');
    await popup.getByRole('button', { name: 'Import or export filters', exact: true }).click();
    await setFile(backup);
    await popup.locator('#import-preview').waitFor({ state: 'visible' });
    await popup.getByLabel('Import mode', { exact: true }).selectOption('replace');
    await popup.screenshot({ path: path.resolve(__dirname, '../test-results/import-preview.png'), fullPage: true });
    await popup.getByRole('button', { name: 'Import filters', exact: true }).click();
    await popup.waitForFunction(() => document.getElementById('filter-count').textContent === '4');
    const restoredFilters = (await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings)).filters;
    assert.deepEqual(restoredFilters.map(({ id, ...rest }) => rest), originalFilters);
    assert.equal(new Set(restoredFilters.map(f => f.id)).size, 4);
    assert.equal((await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings)).floating.enabled, true);
    await popup.close();
    await target.mouse.move(2, 2);
    await target.evaluate(() => { document.getElementById('dynamic').textContent = 'React'; });
    await target.waitForFunction(() => document.querySelector('#scopelio-orbit')?.shadowRoot.querySelector('.count').textContent === '16');
    assert.equal(await target.locator('html').getAttribute('lang'), 'pt-BR', 'Orbit never changes the website language');
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: CRUD, counts, Unicode, dynamic content, highlights, navigation, toggles, privacy settings, persistence and themes.');
  } catch (error) {
    if (context) {
      const website = context.pages().find(page => page.url().startsWith(origin));
      if (website) {
        fs.mkdirSync(path.resolve(__dirname, '../test-results'), { recursive: true });
        await website.screenshot({ path: path.resolve(__dirname, '../test-results/orbit-failure.png'), fullPage: true }).catch(() => {});
        const worker = context.serviceWorkers()[0];
        if (worker) console.error('Extension state:', await worker.evaluate(async origin => {
          const tabs = await chrome.tabs.query({}); const tab = tabs.find(t => t.url?.startsWith(origin));
          return { scripts: await chrome.scripting.getRegisteredContentScripts(), settings: (await chrome.storage.local.get('settings')).settings, content: tab ? await chrome.tabs.sendMessage(tab.id, { type: 'SCOPPELIO_STATUS' }).catch(e => e.message) : null };
        }, origin).catch(() => null));
      }
      const popup = context.pages().find(page => page.url().includes('/popup.html'));
      if (popup) {
        fs.mkdirSync(path.resolve(__dirname, '../test-results'), { recursive: true });
        await popup.screenshot({ path: path.resolve(__dirname, '../test-results/failure.png'), fullPage: true }).catch(() => {});
        console.error('UI state:', await popup.evaluate(() => ({ dialogOpen: document.getElementById('filter-dialog').open, textarea: document.getElementById('filter-terms').getBoundingClientRect().toJSON(), status: document.getElementById('status').textContent })).catch(() => null));
      }
    }
    throw error;
  } finally {
    if (context) await context.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error((error.stack || String(error)).slice(0, 2000)); process.exitCode = 1; });
