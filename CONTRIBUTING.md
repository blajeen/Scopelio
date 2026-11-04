# Contribuir com a Scopelio

Abra uma Issue com passos para reproduzir problemas, comportamento esperado, versão do navegador e da extensão. Para contribuir com código, crie um branch, mantenha o escopo claro e envie um pull request com resumo e validação. Não envie conteúdo privado de páginas nem dados pessoais.

## Validação

Execute `npm test`, `npm run test:browser` e `npm run build` conforme o README. Mudanças no analisador devem cobrir contagem, Unicode, sobreposição ou limites pertinentes.

Validação manual antes de uma versão:

1. Carregar `extension` no Chrome e no Edge e abrir uma página comum.
2. Criar, editar, pausar e excluir filtros; reabrir o popup para confirmar persistência.
3. Habilitar **Sempre neste site**, aceitar a permissão, recarregar e confirmar destaques sem abrir o popup. Reiniciar o navegador e repetir.
4. Recusar a permissão em outro site e confirmar que a análise manual continua disponível.
5. Desabilitar o automático e confirmar a remoção do acesso e ausência de destaque em nova visita.
6. Revogar acesso pelas configurações do navegador e confirmar a atualização da preferência.
7. Pausar globalmente, confirmar remoção dos destaques em abas abertas e retomar.
8. Conferir navegação, tema escuro, teclado, Escape nos diálogos, zoom e redução de transparência.
9. Experimentar uma página dinâmica e uma página protegida; conferir atualização e mensagem explicativa.
10. Ativar Orbit, arrastar, mover pelo teclado, ajustar a opacidade, redimensionar a janela e confirmar que a posição sobrevive ao recarregamento.
11. Conferir o preview ao passar o mouse e ao focar filtros nos dois donuts; o centro do Orbit deve permitir clicar na página por baixo.
12. Fechar o popup, alterar conteúdo da página e confirmar atualização do Orbit; testar ×, pausa global e reativação.

Não adicione requisições externas, execução remota de código ou permissões amplas sem discutir a necessidade e atualizar a política de privacidade.
