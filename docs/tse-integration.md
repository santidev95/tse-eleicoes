# Apuração presidencial: TSE oficial + Supabase

O padrão da aplicação é o ambiente **oficial**, primeiro turno, eleição federal
`6257`, cargo `0001` (Presidente). O simulado `21270` continua disponível como
fonte separada. Nenhum erro do ambiente oficial provoca fallback para simulação.

## Fluxo em execução

```text
TSE (BR + 27 UFs) → Edge Function tse-collect → PostgreSQL/Supabase
                                                    ↓
Navegador ← /api/tse/presidential ← public.tse_latest
```

O coletor roda a cada minuto no Supabase. O navegador consulta a API local a
cada 30 segundos. A rota do projeto lê o último conjunto validado do banco com
uma chave publicável; ela não tem permissão para gravar histórico ou disparar
o coletor. Veja [supabase.md](supabase.md) para projeto, tabelas e operação.

## Endpoints

As configurações são fixadas em `server/tse-adapter.ts`, após conferência da
[documentação técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)
e de `ele-c.json`.

| Ambiente | Base | Ciclo | Eleição | Fase |
| --- | --- | --- | --- | --- |
| Oficial | `https://resultados.tse.jus.br/oficial` | `ele2026` | `6257` | `o` |
| Simulado | `https://resultados-sim.tse.jus.br/simulado/simulado2026` | `ele2026` | `21270` | `s` |

Configuração: `<base>/comum/config/ele-c.json`.

Arquivo nacional oficial:
`https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json`.
Para uma UF, substitua os dois `br` por sua sigla em minúsculo. O servidor
aceita apenas BR e as 27 UFs conhecidas, sem explorar municípios ou outros cargos.

## Interpretação do EA20

Referência: [especificação EA20](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado).

| Campo | Tratamento |
| --- | --- |
| `ele`, `t`, `f`, `cdabr`, `tpabr`, `carg[].cd` | Validação de eleição, turno, ambiente, abrangência e cargo presidencial |
| `sqcand`, `n`, `nmu` | Identidade, número e nome de urna; catálogo consistente entre arquivos |
| `vap`, `pvapn` | Votos computados e percentual informado pelo TSE, preservando o denominador da fonte |
| `dvt`, `st` | Destinação e situação; destinação ausente permanece ausente |
| `s.ts`, `s.st` | Seções totais e totalizadas; o indicador não usa `s.sa` |
| `dv` | Com `n`, a interface informa votação não divulgada e não mostra totais de candidatos |
| `and` | Distingue não iniciada, parcial e finalizada; não declara candidato eleito |
| `dg`, `hg`, `idg` | Geração e identificador do arquivo |
| `dt`, `ht` | Totalização; campos vazios antes do início viram `null` |

O agregado nacional vem de BR, incluindo exterior. O mapa usa votos computados
e não infere eleição de candidato. Arquivos de UFs podem ter gerações diferentes.

O adaptador interpreta horários sem offset como Brasília (UTC-03); essa
interpretação está isolada em `tseTimestamp`. Os arquivos brutos mantêm as datas
originais, permitindo reprocessamento. `fetchedAt` e `lastCheckedAt` são datas de
coleta/verificação, separadas da data da fonte mostrada no cabeçalho.

## Falhas e limites

Downloads usam quatro conexões simultâneas, timeout de 15 segundos por arquivo
e validação completa antes da publicação. Em instâncias aquecidas, ETag e
Last-Modified permitem reaproveitar respostas 304. O coletor usa um lock no banco
para evitar sobreposição e espera dez minutos após HTTP 403, 404 ou 429.

Erros mantêm o último snapshot, registram a tentativa e marcam a leitura como
desatualizada. A interface também alerta quando não há verificação bem-sucedida
há mais de três minutos. Uma consulta bem-sucedida sem mudanças atualiza a
verificação, mas não duplica o histórico.

Os intervalos são escolhas do projeto. O TSE informa limite de 100 requisições
por segundo por IP, contando respostas 304; evite sondagem de URLs inexistentes.

## Verificar

```sh
npm run check
npm run test:e2e
npm run test:tse           # download direto do simulado, sem persistir
npm run test:tse:official  # download direto do oficial, sem persistir
```

Em 04/10/2026 foram validados os 28 arquivos oficiais: 12 candidatos, `dv=s`,
`and=n`, zero seções totalizadas e geração nacional em 03/10/2026. A coleta
hospedada também foi executada e gravou os arquivos no banco. Essa é a evidência
da verificação realizada, não uma afirmação de que os dados permanecem iguais.

Os testes automatizados usam fixtures controladas, inclusive BR replicado com
outras abrangências para testar o contrato sem rede; isso nunca serve como
fallback dos resultados reais.

## Alterar a fonte

Para o simulado direto, configure conjuntamente em `.env.local`:

```dotenv
VITE_ELECTION_DATA_SOURCE=tse-sim
TSE_ENVIRONMENT=simulado2026
TSE_DATA_PROVIDER=direct
```

Para demonstração sem rede, basta `VITE_ELECTION_DATA_SOURCE=mock`.
Para voltar à configuração padrão, use `tse`, `oficial` e `supabase`.
Reinicie o servidor e refaça o build ao mudar variáveis do frontend.

O segundo turno exige configuração e validação próprias antes de habilitar;
a implementação atual é deliberadamente restrita ao primeiro turno presidencial.
