# Eleições 2026 — apuração presidencial

Aplicação React + TypeScript + Vite baseada no frame do Figma, com tema escuro, mapa geométrico grande do Brasil e informações sob interação. O escopo atual é apenas **Presidente da República**. Os candidatos e números são fictícios.

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
npm run check       # lint, testes de dados e build
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
public/design/   SVGs originais do Figma
tests/           testes de navegador e acessibilidade
docs/            referência visual e integração de produção
```

O CSS é próprio, sem Tailwind, com os tokens da referência visual. As fontes são locais. O resultado nacional dos mocks é derivado dos estados; produção pode utilizar o agregado nacional oficial.

## Conectar o TSE

Consulte [docs/tse-integration.md](docs/tse-integration.md). Configure `VITE_ELECTION_DATA_SOURCE=tse` e `VITE_TSE_PROXY_URL` **somente após implementar o adaptador no backend**. O frontend não presume URLs ou o esquema oficial de 2026 e não faz fallback para mocks em produção.

O `.env.example` documenta a seleção de fonte. Consulte [docs/design.md](docs/design.md) para a origem dos assets e as adaptações do frame.
