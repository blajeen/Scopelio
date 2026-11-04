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
    assert.equal(await target.evaluate(() => CSS.highlights.size), 3);
    await popup.getByRole('button', { name: 'Próxima ocorrência', exact: true }).click();
    assert.equal(await popup.locator('#position').innerText(), '1 de 15');
    await popup.getByRole('button', { name: 'Novo filtro' }).click();
    await popup.getByLabel('Nome', { exact: true }).fill('Ação');
    await popup.getByLabel('Termos', { exact: true }).fill('ação');
    await popup.getByRole('button', { name: /Salvar filtro/ }).click();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '17');
    await target.evaluate(() => { document.getElementById('dynamic').textContent = 'React e design em conteúdo novo.'; });
    await popup.waitForFunction(() => document.getElementById('total').textContent === '19');
    await popup.getByLabel('Ativar filtro Ação', { exact: true }).uncheck();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '17');
    await popup.getByLabel('Ativar Scopelio', { exact: true }).uncheck();
    await popup.waitForFunction(() => document.getElementById('total').textContent === '0');
    assert.equal(await target.evaluate(() => CSS.highlights.size), 0);
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
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: CRUD, counts, Unicode, dynamic content, highlights, navigation, toggles, privacy settings, persistence and themes.');
  } catch (error) {
    if (context) {
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
})().catch(error => { console.error(String(error).slice(0, 1800)); process.exitCode = 1; });
