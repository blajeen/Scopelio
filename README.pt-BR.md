# Scopelio — Color Highlights & Donut Analytics

**Suas palavras. Suas cores. Mais clareza.** · [English](README.md)

O inglês é o idioma padrão. Para usar em português, abra **Preferences → Language → Português (Brasil)**.

Extensão de navegador open source para destacar termos em páginas e comparar a distribuição das correspondências em um gráfico de donut. Interface minimalista com superfícies translúcidas, temas claro/escuro e processamento inteiramente local.

## Instalar e experimentar

1. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta **extension** deste projeto.
4. Visite um site HTTP/HTTPS e abra a Scopelio pelo ícone da extensão.
5. Crie um filtro ou clique em **Experimentar filtros de exemplo**.

Não é necessário instalar dependências para usar a extensão. Requer Chrome/Edge 120 ou superior. Firefox e Safari ainda não são alvos desta versão.

## O que a v0.1 faz

- Criar, editar, excluir e pausar filtros, com vários termos e cor personalizada.
- Palavra inteira, diferenciação de maiúsculas e busca sem acentos.
- Destaques com CSS Custom Highlight API, sem reescrever o HTML dos sites.
- Donut com total, quantidade e percentual por filtro; legenda selecionável.
- Navegação anterior/próxima entre todas as ocorrências ou apenas as de um filtro.
- Pausa global e ativação automática opcional por site.
- Atualização após mudanças no conteúdo da página.
- Tema do sistema, claro e escuro, redução de transparência, teclado e movimento reduzido.
- Configurações persistidas localmente, sem conta, telemetria ou serviços externos.

O popup analisa a aba ao ser aberto. **Sempre neste site** pede acesso opcional ao domínio atual e habilita a análise em visitas futuras. Desativar essa opção remove a permissão correspondente. A pausa global suspende os destaques e registros automáticos; suas preferências são preservadas.

## Como interpretar os resultados

O percentual é `ocorrências do filtro / total de ocorrências atribuídas × 100`. Ele não mede a proporção de todo o texto, relevância semântica nem sentimento. Pequenas diferenças na soma dos percentuais podem ocorrer por arredondamento.

Sobreposições são resolvidas pela ocorrência que começa primeiro; no mesmo ponto, pelo termo mais longo; em empate, pela ordem de criação dos filtros. Uma ocorrência pertence a um único filtro. Termos duplicados no mesmo filtro contam uma vez. Vírgulas e quebras de linha separam termos; a busca é literal, sem expressões regulares.

A análise considera texto renderizado na página principal, inclusive fora da área visível. Ignora campos editáveis, scripts, botões e conteúdo oculto. Não lê imagens, documentos PDF, interfaces internas do navegador, iframes nem Shadow DOM. Algumas lojas e páginas protegidas bloqueiam extensões. Termos divididos por elementos inline dentro do mesmo bloco são suportados. Separações por blocos ou quebras estruturais podem limitar frases.

Limites: 40 filtros, 2.000 termos por filtro, 160 caracteres por termo, 1,5 milhão de caracteres por página e 20 mil correspondências candidatas. Quando um limite de análise é atingido, o popup informa que os resultados são parciais.

## Desenvolvimento

Node.js 22+:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

O build copia a extensão para `dist/scopelio`. No Windows, também cria `dist/scopelio-0.1.0.zip` pronto para envio à loja. O ZIP é um pacote de distribuição; o envio e a aprovação pela loja são etapas separadas.

Os testes de navegador carregam a extensão real em Chromium, usam uma página local e verificam CRUD, contagens, atualização dinâmica, destaques, navegação, pausa e preferências. Capturas são salvas em `test-results`. O consentimento real de permissões por site deve ser verificado manualmente conforme [CONTRIBUTING.md](CONTRIBUTING.md).

```text
extension/       Manifest, popup, motor de busca e scripts da extensão
tests/           Testes de contagem e integração com Chromium
scripts/         Empacotamento sem compilação
docs/            Checklist de publicação
```

## Privacidade e contribuições

Consulte [PRIVACY.md](PRIVACY.md), [CONTRIBUTING.md](CONTRIBUTING.md) e [LICENSE](LICENSE). Código sob licença MIT. Para publicar, use o [checklist da loja](docs/STORE_CHECKLIST.md).

## English

Scopelio is an open-source Chromium extension for color-coded keyword highlighting and donut analytics. Create named filters with up to 2,000 terms, choose colors, navigate matches, and compare occurrence shares. English is the default; Brazilian Portuguese is available in Preferences.

Load the `extension` folder as an unpacked extension at `chrome://extensions` or `edge://extensions`, open a regular website and click Scopelio. No build is needed. Chrome/Edge 120+ required.

All matching runs locally. No accounts, analytics, external requests or page uploads. Site access is temporary when opening the popup; automatic activation requests optional access to the current site. See [PRIVACY.md](PRIVACY.md). Percentages describe matched occurrences, not the full page or semantic relevance. Overlaps use earliest start, then longest term, then filter order. MIT licensed.
