# Eleições 2026 — apuração presidencial

Aplicação React + TypeScript + Vite baseada nos frames do Figma, com tema escuro, mapa geométrico grande do Brasil e informações sob interação. O escopo atual é **Presidente e Governadores, primeiro turno**. A fonte padrão é o ambiente **oficial do TSE**, com coleta centralizada e histórico persistido no Supabase.

Publicação: **[eleicoes.dadosabertos.org](https://eleicoes.dadosabertos.org)**, no Cloudflare Pages.

## Executar

Use Node.js 22.12+ ou 24+ e npm:

```sh
npm ci
# Copie .env.example para .env.local e configure o Supabase.
# Para desenvolvimento sem rede, use VITE_ELECTION_DATA_SOURCE=mock.
npm run dev
```

Abra a URL indicada pelo Vite, normalmente `http://localhost:5173`. Nenhuma chave de Stitch ou Figma é necessária para executar; todos os SVGs e fontes estão locais.

```sh
npm run build       # TypeScript + bundle de produção em dist/
npm run preview     # servir o build localmente
npm start           # servidor Node com frontend de dist/ e API (após build)
npm run check       # lint, testes de dados e build
npm run test:tse    # consultar os 28 arquivos presidenciais do simulado TSE
npm run test:tse:official # consultar BR + 27 UFs no ambiente oficial
npm run pages:build # frontend e Pages Function
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
- Seletor Presidente / Governadores e quatro primeiros candidatos no resumo presidencial, tooltip e painel. Transições sutis respeitam movimento reduzido.

## Organização

```text
src/components/  Header, NationalSummary, BrazilMap, StateTooltip,
                 StateDetailsPanel, MapModeTabs, MapLegend, StateSearch
src/data/        metadados das UFs, mocks e geometria do design
src/domain/      contrato validado, cálculos e formatação
src/services/    seleção da fonte e cliente do proxy TSE
src/hooks/       carregamento, cancelamento, atualização e erros
server/          API, download/cache compartilhado e adaptador EA20 do TSE
functions/       Pages Function que consulta o snapshot público do Supabase
supabase/        migrations, coletor autenticado e agendamento
public/design/   SVGs originais do Figma
tests/           testes de navegador e acessibilidade
docs/            referência visual e integração de produção
```

O CSS é próprio, sem Tailwind, com os tokens da referência visual. As fontes são locais. O simulado usa os percentuais e o agregado nacional BR do TSE, preservando a destinação dos votos. A demonstração local `mock` continua disponível para desenvolvimento sem rede.

## Conectar o TSE

`GET /api/tse/presidential` lê o último snapshot oficial completo no Supabase. O coletor executa a cada minuto, valida BR + 27 UFs e grava atomicamente os arquivos originais e o resultado normalizado. A interface consulta a cada 30 segundos, identifica a fonte, mostra a data do TSE e sinaliza coletas desatualizadas. Sem divulgação ou antes do início da totalização, não apresenta um líder artificial.

Consulte [docs/tse-integration.md](docs/tse-integration.md) para os endpoints e a interpretação EA20, [docs/supabase.md](docs/supabase.md) para persistência e coleta e [docs/cloudflare.md](docs/cloudflare.md) para publicação e domínio.

O `.env.example` documenta a seleção de fonte. Consulte [docs/design.md](docs/design.md) para a origem dos assets e as adaptações do frame.

Consulte [docs/governors.md](docs/governors.md) para os endpoints estaduais, cores por partido, critérios de resultado e persistência independente.
