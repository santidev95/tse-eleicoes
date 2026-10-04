# Publicação no Cloudflare Pages

- Projeto: `eleicoes-dadosabertos` (Direct Upload).
- Domínio: https://eleicoes.dadosabertos.org.
- Endereço Pages: https://eleicoes-dadosabertos.pages.dev.
- Branch de produção: `main`.
- Frontend em `dist/`; Pages Function em `functions/api/tse/presidential.ts`.
- DNS: CNAME `eleicoes` → `eleicoes-dadosabertos.pages.dev`, com proxy Cloudflare.

O frontend usa `/api/tse/presidential` na mesma origem. A Function consulta somente
o snapshot público do Supabase, com chave publicável e RLS de leitura. Nenhuma
chave administrativa do Supabase é necessária na Cloudflare. A coleta e a gravação
continuam no Supabase, a cada minuto, independentemente de visitantes ou do computador local.

`wrangler.jsonc` contém a configuração e a chave **publicável** de leitura.
`worker-configuration.d.ts` é gerado pelo Wrangler. Após mudanças de configuração:

```sh
npm run pages:types
npm run pages:build
```

Para novas publicações com a CLI autenticada na conta proprietária:

```sh
npx wrangler login
npm run pages:deploy
```

`pages:build` fixa `VITE_ELECTION_DATA_SOURCE=tse` e
`VITE_TSE_PROXY_URL=/api/tse/presidential`, mesmo que o ambiente local esteja
configurado para mock ou simulado. Use esse comando antes de publicar.

A primeira publicação usou o plugin Cloudflare para criar o projeto, definir as
variáveis, emitir um token temporário de upload, criar o deployment e vincular o
domínio. Os assets foram enviados pelo Wrangler com esse token; ele não foi salvo
no repositório. Não existe vínculo Git/CI automático neste projeto Direct Upload.

`public/_routes.json` restringe as Functions a `/api/tse/presidential` e `/api/tse/governors`.
Assets são servidos pelo Pages; a API usa `Cache-Control: no-store` e retorna 503
em falhas de leitura. A interface preserva o último resultado em falhas de atualização.
Para diagnóstico, consulte os deployments e logs das Functions no painel do Pages.

Validação visual em um endereço publicado:

```powershell
$env:PREVIEW_URL = 'https://eleicoes.dadosabertos.org'
node scripts/capture-preview.mjs
```

Referências: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[configuração de Functions](https://developers.cloudflare.com/pages/functions/wrangler-configuration/),
[domínios personalizados](https://developers.cloudflare.com/pages/configuration/custom-domains/).
