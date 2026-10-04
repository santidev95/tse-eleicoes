# Armazenamento no Supabase

Projeto: **tse** · organização **Santi** · região **São Paulo (`sa-east-1`)**.
ID: `tcdazqafanzvbrgovnnn`.
[Abrir projeto](https://supabase.com/dashboard/project/tcdazqafanzvbrgovnnn).
O plugin informou custo de criação de US$ 0/mês, confirmado pelo usuário.

## Onde os dados ficam

| Tabela | Conteúdo e acesso |
| --- | --- |
| `tse_private.file_versions` | JSON bruto de cada abrangência, URL, IDG, SHA-256, ETag, datas originais no payload e datas normalizadas; apenas servidor |
| `tse_private.snapshots` | Conjunto validado, referências às 28 versões, hash e versão do adaptador; apenas servidor |
| `public.tse_latest` | Último snapshot completo, última verificação e erro; leitura pública com RLS, escrita somente do servidor |
| `tse_private.collection_runs` | Histórico de tentativas, resultado e erro |
| `tse_private.collector_state` | Lock com expiração e próxima tentativa permitida |
| `tse_private.collector_credentials` | Somente o hash da credencial do coletor |

Ambiente, eleição e abrangência fazem parte da identidade das versões. O
simulado fica separado do oficial. Todas as tabelas têm RLS; o schema privado
não é exposto à Data API. Não há políticas de usuário nas tabelas privadas:
o acesso do runtime usa exclusivamente a identidade de serviço.

Arquivos e snapshots só recebem novas linhas quando o conteúdo muda. O IDG
não é usado como contador crescente. Uma transação grava todas as versões,
o snapshot e o ponteiro `tse_latest`; uma falha não publica estado parcial.
O runtime não pode atualizar nem apagar versões históricas. Não há expurgo
automático configurado.

## Coletor hospedado

Edge Function: `tse-collect`. Cron: `tse-presidential-official`, a cada minuto.
O agendamento continua ativo mesmo com o computador local desligado.

A função usa um token opaco gerado no banco, guardado no Supabase Vault e
enviado em `x-collector-token`. Ela confere seu hash antes de qualquer coleta.
`verify_jwt=false` é intencional porque a autenticação é própria; uma chamada
sem esse token recebe HTTP 401. Chaves publicáveis não autorizam gravação.

As credenciais administrativas são as variáveis internas da Edge Function.
Nenhuma chave secreta foi colocada no frontend ou no `.env.local`. O aplicativo
local usa apenas `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` para leitura.

## Operação no SQL Editor (administrador)

```sql
-- Estado atual e últimas tentativas, sem exibir credenciais:
select environment, last_checked_at, last_error from public.tse_latest;
select environment, attempted_at, outcome, error_message
from tse_private.collection_runs order by id desc limit 20;

-- Uma coleta manual respeita o mesmo lock e cooldown:
select tse_private.invoke_collection('oficial');

-- Pausar/retomar o job preserva todo o histórico:
select cron.alter_job(jobid, active := false)
from cron.job where jobname = 'tse-presidential-official';
-- Para retomar, usar active := true.
```

O erro mais recente também é refletido na interface. Respostas HTTP 403, 404 e
429 do TSE impõem cooldown de dez minutos, sem insistência durante o bloqueio.
Uma lease impede que jobs sobrepostos executem a mesma coleta.

## Reproduzir o ambiente

1. Aplicar as migrações de `supabase/migrations/` na ordem. As versões locais
   acompanham as versões aplicadas pelo plugin no projeto remoto.
2. Publicar `supabase/functions/tse-collect/index.ts` com os módulos compartilhados
   `server/tse-source.ts`, `server/tse-adapter.ts`, `src/domain/election.ts` e
   `src/data/states.ts`, e o `deno.json` que fixa Zod em `4.6.5`.
   `node scripts/build-edge-package.mjs` monta o pacote usado pelo plugin.
3. Executar `supabase/bootstrap.sql`, substituindo a URL do projeto. O token é
   gerado dentro do banco; não precisa ser copiado para arquivos locais.
4. Verificar a primeira coleta antes de habilitar o cron indicado nesse script.
5. Configurar a URL e a chave publicável em `.env.local`, conforme `.env.example`.

## Validação realizada

Primeira coleta remota: HTTP 200, 28 versões de arquivo e um snapshot oficial.
Uma coleta seguinte sem alterações manteve essas quantidades e registrou
`unchanged`. O papel `anon` pode ler `tse_latest`, mas não inserir dados nem
executar a RPC que inicia a gravação.

Os advisors não apontaram erros ou avisos de segurança. Restaram apenas notas
informativas de [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
nas cinco tabelas privadas (negação padrão intencional) e
[índices ainda não utilizados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
em um banco recém-criado. Os índices foram mantidos para as referências e
consultas do histórico.
