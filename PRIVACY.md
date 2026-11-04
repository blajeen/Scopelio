# Política de privacidade — Scopelio

Atualizada em 4 de novembro de 2026. Aplicável à versão 0.3.0.

A Scopelio analisa o texto das páginas localmente no navegador para destacar termos e calcular suas contagens. O conteúdo das páginas e as ocorrências não são enviados a servidores nem persistidos pela extensão. Os resultados permanecem em memória enquanto a página estiver aberta.

Ao exportar, a pessoa salva voluntariamente um arquivo `.txt` com nomes, termos, cores e opções dos filtros. A importação lê apenas o arquivo selecionado e salva os filtros após confirmação da prévia. Esses arquivos não incluem o conteúdo das páginas, permissões de sites ou preferências de aparência, e não são enviados a servidores.

Filtros, termos, cores, preferências, visibilidade/opacidade/posição do donut flutuante e a lista de sites em que a ativação automática foi habilitada ficam em `chrome.storage.local`, no perfil local do navegador. A Scopelio não habilita sincronização em nuvem, não usa cookies, não coleta telemetria e não integra publicidade ou rastreamento.

Permissões:

- `activeTab`: acesso temporário à aba atual quando a pessoa invoca a extensão.
- `scripting`: execução do analisador e dos destaques na página autorizada.
- `storage`: armazenamento local de filtros e preferências.
- Acesso opcional a sites HTTP/HTTPS: solicitado ao habilitar **Sempre neste site**, para analisar automaticamente esse site em visitas futuras.

É possível pausar a extensão, excluir filtros e desativar a ativação por site no popup. O acesso a sites também pode ser revogado nas configurações do navegador. Desinstalar a extensão remove seu armazenamento local pelo mecanismo do navegador.

O projeto não opera um serviço para receber dados das páginas. Dúvidas e relatos podem ser abertos nas Issues do repositório onde a extensão é distribuída. Não inclua texto sensível de páginas nos relatos públicos.

## English

Exporting creates a local `.txt` file containing filter names, terms, colors and matching options. Importing reads only the selected file and saves filters after preview confirmation. These files do not include page content, site permissions or appearance preferences, and are not uploaded to servers.

Scopelio processes page text locally to highlight terms and count occurrences. Page text and results are not sent to servers or persisted by the extension. Filters, preferences, floating donut visibility/opacity/position and automatically enabled sites are stored in the browser's local extension storage. There are no accounts, analytics, ads, tracking, cookies or cloud synchronization enabled by Scopelio.

`activeTab` provides temporary access after user invocation; `scripting` runs local highlighting code; `storage` saves preferences. Optional HTTP/HTTPS host access is requested when enabling automatic activation for a site. Revoke access in the popup or browser settings. Uninstalling removes local extension storage through the browser. Questions can be filed in the distribution repository's Issues.
