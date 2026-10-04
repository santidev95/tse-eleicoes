# Eleições 2026 — apuração presidencial

Aplicação React + TypeScript + Vite baseada no frame do Figma, com tema escuro, mapa geométrico grande do Brasil e informações sob interação. O escopo atual é apenas **Presidente da República**. A fonte padrão é o **simulado oficial do TSE**, com candidatos fictícios; os resultados não são a apuração real das Eleições 2026.

## Executar

Use Node.js 22.12+ ou 24+ e npm:

```sh
npm ci
npm run dev
```

Abra a URL indicada pelo Vite, normalmente `http://localhost:5173`. Nenhuma chave de Stitch ou Figma é necessária para executar; todos os SVGs e fontes estão locais.

```sh
npm run build       # TypeScript + bundle de produção em dist/
npm run preview     # servir o build localmente
npm start           # servidor Node com frontend de dist/ e API (após build)
npm run check       # lint, testes de dados e build
npm run test:tse    # consultar os 28 arquivos presidenciais do simulado TSE
npx playwright install chromium --only-shell
npm run test:e2e    # interações e acessibilidade em desktop/celular
```

## Experiência

- Resumo nacional compacto e mapa com as 27 UFs, coloridas pelo candidato líder.
- Modos Mais votado, Diferença e % Apurado, com legenda correspondente.
- Tooltip no hover/foco; clique, toque, Enter ou Espaço abrem detalhes do estado.
- Painel inicialmente fechado; Escape ou o botão de fechar devolvem o foco ao estado.
- Busca de UF com nomes sem depender de acentos; Ctrl/⌘K abre a busca.
- Estados de carregamento e erro, retentativa e preservação do último snapshot nas falhas de atualização.
- Sem gráficos, tabelas ou outros cargos. Transições sutis respeitam movimento reduzido.

## Organização

```text
src/components/  Header, NationalSummary, BrazilMap, StateTooltip,
                 StateDetailsPanel, MapModeTabs, MapLegend, StateSearch
src/data/        metadados das UFs, mocks e geometria do design
src/domain/      contrato validado, cálculos e formatação
src/services/    seleção da fonte e cliente do proxy TSE
src/hooks/       carregamento, cancelamento, atualização e erros
server/          API, download/cache compartilhado e adaptador EA20 do TSE
public/design/   SVGs originais do Figma
tests/           testes de navegador e acessibilidade
docs/            referência visual e integração de produção
```

O CSS é próprio, sem Tailwind, com os tokens da referência visual. As fontes são locais. O simulado usa os percentuais e o agregado nacional BR do TSE, preservando a destinação dos votos. A demonstração local `mock` continua disponível para desenvolvimento sem rede.

## Conectar o TSE

O simulado já funciona por `GET /api/tse/presidential`, servido pelo próprio projeto. Não é necessário criar um `.env` para usá-lo. O servidor mantém cache em memória por 30 segundos, limita downloads simultâneos e valida BR + 27 UFs antes de publicar. A interface identifica o ambiente e mostra a data do arquivo, sem apresentá-lo como apuração ao vivo.

Consulte [docs/tse-integration.md](docs/tse-integration.md) para endpoints, interpretação EA20, tratamento de erros e futura conexão de produção. Não há gravação em banco ainda; a proposta para guardar o histórico está em [docs/persistence-plan.md](docs/persistence-plan.md).

O `.env.example` documenta a seleção de fonte. Consulte [docs/design.md](docs/design.md) para a origem dos assets e as adaptações do frame.
