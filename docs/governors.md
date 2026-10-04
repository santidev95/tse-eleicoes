# Governadores

A aba Governadores segue o frame Figma `uWM4FrZcCvqiG3LWbOIcO9`, nó `2:2`.
Ela preserva o mapa, adiciona o seletor de cargos e resume as 27 disputas estaduais.
URL direta: https://eleicoes.dadosabertos.org/?cargo=governador.

## Dados oficiais

A configuração oficial `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`
identifica a eleição estadual de primeiro turno como **6259** e governador como
cargo **0003**. Cada UF usa:

`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/<uf>/<uf>-c0003-e006259-u.json`

São 27 arquivos, incluindo DF. Não existe arquivo BR de governador. IDs de candidato
são qualificados pela UF e o contrato rejeita candidatos de outra disputa. `national`
contém apenas totais de seções por compatibilidade de interface, com `votes: []`.
Não há soma nem ranking nacional dos candidatos estaduais.

O resumo mostra a média aritmética dos percentuais de seções totalizadas das 27 UFs.
As cores representam o partido do candidato líder (`par.sg`), com paleta editorial
fixa do design; não são cores oficiais de partidos. Partidos fora da paleta usam cinza
e permanecem identificados por nome na legenda. Empates ou ausência de votos não
produzem liderança. As disputas mais próximas consideram somente disputas com votos,
ainda sem resultado definido.

`md=e`/`md=s` e as situações finais `st=Eleito`/`st=2º turno` determinam os indicadores.
`esae=s` produz “sem atribuição de eleito”. O campo `e=s` **não** distingue eleição
de segundo turno, e obter mais de 50% durante a apuração não declara alguém eleito.
Fonte: [especificação EA20](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado).

Tooltip e painel mostram os quatro primeiros candidatos de cada UF; o resumo
presidencial também mostra quatro. A diferença permanece entre primeiro e segundo.

## Persistência e coleta

O armazenamento é independente do presidencial:

- `public.tse_governor_latest`: snapshot público, somente leitura via RLS.
- `tse_private.governor_file_versions`: JSONs originais com hash e data de geração.
- `tse_private.governor_snapshots`: snapshots completos versionados.
- `tse_private.governor_collector_state`: lease e cooldown.
- `tse_private.governor_collection_runs`: histórico de execuções.

O coletor `tse-governor-collect` usa a mesma autenticação privada via Vault, com RPCs
próprias e sem alterar as tabelas, funções ou agendamento presidencial existentes.
`tse-governor-official` executa a cada minuto. Falhas preservam o último snapshot;
limites e recuo para 403/404/429 são os mesmos do coletor presidencial.

Para reproduzir, aplicar a migration, gerar o pacote com
`node scripts/build-edge-package.mjs governor` e publicar `tse-governor-collect`
com `index.ts`, `deno.json` e os módulos compartilhados; informar explicitamente
`import_map_path: deno.json` ao plugin. `verify_jwt=false` depende da validação
obrigatória do token privado dentro da função.

Após verificar a primeira coleta:

```sql
select tse_private.invoke_governor_collection('oficial');
select cron.schedule('tse-governor-official','* * * * *',
  $$select tse_private.invoke_governor_collection('oficial');$$);
```

O cliente recebe os dados em `GET /api/tse/governors` pela Pages Function.
O ambiente simulado TSE para governadores ainda não é exposto; `mock` local está
disponível e claramente identificado. Presidente mantém seus modos existentes.

## Verificação

`npx tsx scripts/check-governors.ts` consulta e valida os 27 arquivos oficiais.
Os testes locais cobrem isolamento por UF/cargo, resultados definidos pelo TSE,
arquivos faltantes, troca de abas, quatro candidatos, erros e acessibilidade.
Os advisors de segurança mantêm apenas notas informativas de
[RLS sem políticas nas tabelas privadas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
que negam acesso público intencionalmente.
