# Text filter files

Use **⇅ → Export .txt / Import .txt** beside **Your filters**. No additional permissions or external services are required.

## Backup format

Files are UTF-8 text with a format header and a JSON object. The extension uses a versioned format to preserve colors, matching options, multiword terms and terms containing commas. Edit values with a text editor, keeping JSON syntax valid.

```text
# Scopelio filters v1
{
  "format": "scopelio-filters",
  "version": 1,
  "filters": [
    {
      "name": "Technology",
      "terms": ["React", "Vue", "Angular", "machine learning"],
      "color": "#8b7cf8",
      "enabled": true,
      "wholeWord": true,
      "caseSensitive": false,
      "ignoreAccents": true
    }
  ]
}
```

The header is optional if the JSON object contains the correct format identifier and version. Internal IDs are intentionally omitted and regenerated on import. Unknown fields are ignored; filter values are validated. Malformed structured files and unsupported versions are rejected without falling back to keyword import. Invalid files do not change saved filters.

## Plain lists

For a quick import, save this as `Technology.txt`:

```text
React
Vue
Angular
machine learning
```

Scopelio creates one filter named **Technology**, colored purple, with whole-word and accent-insensitive matching enabled and case sensitivity disabled. Commas also separate terms in plain lists. Duplicate exact terms and blank lines are removed. Use the backup format to preserve a comma inside an individual term.

## Preview and limits

The preview lists each filter and its term count. **Add** preserves existing filters and appends the imported ones; **Replace** replaces only the filter list. Other preferences and site permissions stay as they are. Cancel leaves the original list intact. Exceeding 40 total filters in Add mode shows an error; the extension never silently drops excess filters.

Limits: 1–40 filters, 1–2,000 terms per filter, 160 characters per term, 60 characters per filter name, and 16 MB per file. Colors must be six-digit hex values. Export includes paused filters. The export button is disabled when there are no filters.

## Português

Abra **⇅ → Exportar .txt / Importar .txt** ao lado de **Seus filtros**. A exportação usa texto UTF-8 estruturado para preservar nomes, termos, cores e opções. Uma lista simples com um termo por linha também funciona: cria um filtro com o nome do arquivo e cor roxa.

A prévia permite adicionar à lista atual ou substituí-la. Cancelar ou importar um arquivo inválido mantém os filtros salvos. Os limites são 40 filtros, 2.000 termos por filtro, 160 caracteres por termo e 16 MB por arquivo. Nenhum conteúdo de página, permissão de site ou preferência visual é incluído.
