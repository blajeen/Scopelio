/* Uses local files and a browser download; no additional permissions. */
let pendingFilters = null, fileReadVersion = 0;
function clearImport() {
  pendingFilters = null; $('import-preview').hidden = true;
  $('import-file').value = ''; $('transfer-error').textContent = ''; $('transfer-status').textContent = '';
  $('import-apply').disabled = false;
}
$('transfer-button').addEventListener('click', () => { clearImport(); $('export-filters').disabled = !settings.filters.length; $('transfer-dialog').showModal(); });
$('close-transfer').addEventListener('click', () => $('transfer-dialog').close());
$('transfer-dialog').addEventListener('close', () => { fileReadVersion++; clearImport(); });
$('import-cancel').addEventListener('click', clearImport);
$('export-filters').addEventListener('click', () => {
  try {
    const text = ScopelioTransfer.serialize(settings.filters);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = element('a'); link.href = url;
    const date = new Date(), stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-');
    link.download = `scopelio-filters-${stamp}.txt`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('transfer-status').textContent = t('transferExported');
  } catch { $('transfer-error').textContent = t('transferExportError'); }
});
$('import-filters').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0], version = ++fileReadVersion;
  pendingFilters = null; $('import-preview').hidden = true;
  $('transfer-error').textContent = ''; $('transfer-status').textContent = '';
  if (!file) return;
  try {
    if (!/\.txt$/i.test(file.name)) throw new ScopelioTransfer.TransferError('transferFileType');
    if (file.size > ScopelioTransfer.MAX_BYTES) throw new ScopelioTransfer.TransferError('transferTooLarge');
    const filters = ScopelioTransfer.parse(await file.text(), file.name.replace(/\.txt$/i, '') || t('importedFilter'));
    if (version !== fileReadVersion || !$('transfer-dialog').open) return;
    pendingFilters = filters;
    $('import-summary').textContent = `${filters.length} ${t('filtersUnit')} · ${filters.reduce((sum, filter) => sum + filter.terms.length, 0).toLocaleString(locale())} ${t('termsUnit')}`;
    $('import-list').replaceChildren();
    for (const filter of filters) {
      const row = element('li'), dot = element('span', 'color-dot'); dot.style.backgroundColor = filter.color;
      row.append(dot, element('span', '', filter.name), element('small', '', String(filter.terms.length))); $('import-list').append(row);
    }
    $('import-mode').value = 'append'; $('import-preview').hidden = false;
  } catch (error) {
    if (version === fileReadVersion) $('transfer-error').textContent = t(error instanceof ScopelioTransfer.TransferError ? error.code : 'transferReadError');
  } finally { if (version === fileReadVersion) $('import-file').value = ''; }
});
$('import-apply').addEventListener('click', async () => {
  if (!pendingFilters) return;
  $('transfer-error').textContent = ''; $('import-apply').disabled = true;
  try {
    // Read fresh state so other tabs' preference changes aren't overwritten.
    const current = await Scopelio.read();
    const imported = pendingFilters.map(filter => ({ ...filter, id: crypto.randomUUID() }));
    const filters = $('import-mode').value === 'replace' ? imported : [...current.filters, ...imported];
    if (filters.length > 40) throw new ScopelioTransfer.TransferError('transferCombinedLimit');
    const next = { ...current, filters };
    await Scopelio.save(next); settings = next; selectedFilter = null;
    renderFilters(); $('transfer-dialog').close(); await scan();
    if (!sitePattern) renderChart(); status(t('transferImported'));
  } catch (error) {
    $('transfer-error').textContent = t(error instanceof ScopelioTransfer.TransferError ? error.code : 'transferSaveError');
  } finally { $('import-apply').disabled = false; }
});
