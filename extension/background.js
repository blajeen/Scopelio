importScripts('shared.js');
let queue = Promise.resolve();
async function reconcile() {
  const settings = await Scopelio.read();
  const allowed = await chrome.permissions.getAll();
  const sites = settings.sites.filter(site => allowed.origins?.includes(site));
  const desired = settings.enabled ? sites : [];
  const existing = await chrome.scripting.getRegisteredContentScripts();
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: existing.map(s => s.id) });
  if (desired.length) await chrome.scripting.registerContentScripts(desired.map((site, i) => ({
    id: `scopelio-${i}`, matches: [site], js: ['shared.js', 'matcher.js', 'content.js'], runAt: 'document_idle', persistAcrossSessions: true
  })));
  if (sites.length !== settings.sites.length) await Scopelio.save({ ...settings, sites });
}
function schedule() { queue = queue.then(reconcile).catch(error => console.warn('Scopelio:', error.message)); }
chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.permissions.onRemoved.addListener(schedule);
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) schedule(); });
