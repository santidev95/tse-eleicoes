# Integração presidencial com o simulado do TSE

A fonte padrão agora é o **simulado oficial disponibilizado pelo TSE**, consultado
pelo servidor. Não se trata de resultados reais das Eleições 2026. Não há chave
ou autenticação para ler os arquivos públicos.

## Executar e validar

```sh
npm ci
npm run dev
npm run test:tse
```

O último comando baixa os 28 arquivos reais do ambiente de simulação, valida o
contrato e verifica o cache, sem gravar os resultados em banco ou disco. Em
04/10/2026, o download passou com 13 candidatos fictícios, 27 UFs, 100% das
seções totalizadas e geração nacional em **29/09/2026, 16:29:12**, interpretada
no horário de Brasília. Essa evidência não é garantia de disponibilidade futura.

O frontend chama `GET /api/tse/presidential`, uma rota **deste projeto**. Ela é
servida pelo middleware Vite em desenvolvimento/preview e pelo servidor Node
em `npm start`, após `npm run build`. Hospedar somente `dist/` sem essa API não
oferece a integração.

Configuração pública opcional em `.env.local` (os padrões já são estes):

```dotenv
VITE_ELECTION_DATA_SOURCE=tse-sim
VITE_TSE_PROXY_URL=/api/tse/presidential
```

Para usar a demonstração local sem rede: `VITE_ELECTION_DATA_SOURCE=mock`.
Reinicie o Vite ou refaça o build ao alterar variáveis. Nunca coloque credenciais
em variáveis `VITE_`.

## Endpoints confirmados

Referência: [informações técnicas 2026 do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados),
[especificação EA20](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado).

- Base: `https://resultados-sim.tse.jus.br/simulado/simulado2026`
- Ciclo: `ele2026`; eleição federal simulada: `21270`; turno: `1`.
- Cargo: `0001`, Presidente da República.
- Configuração: `https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json`
- Brasil: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json`
- UFs: o mesmo padrão, substituindo `br` pela UF em minúsculo, por exemplo
  `dados/mt/mt-c0001-e021270-u.json`.

Os códigos são fixados em `server/tse-adapter.ts` após conferência da documentação
e do arquivo de configuração. O servidor consulta apenas BR e as 27 UFs
conhecidas, sem sondar caminhos de municípios ou outros cargos.

## Contrato e interpretação

`server/tse-adapter.ts` valida o EA20 e produz `ElectionSnapshot`, cujo esquema
está em `src/domain/election.ts`. O navegador valida esse contrato novamente e
exige a fonte correspondente à configuração: `tse-sim` ou `tse`. Não existe
fallback automático para os mocks.

| EA20                               | Contrato / uso                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `ele`, `t`, `f`, `carg[].cd`       | Exige eleição 21270, turno 1, fase simulada `s` e cargo presidencial 1            |
| `tpabr`, `cdabr`                   | Confere o arquivo nacional ou a UF solicitada                                     |
| `carg[].agr[].par[].cand[].sqcand` | Identificador do candidato, consistente entre BR e UFs                            |
| `n`, `nmu`                         | Número e nome de urna; rótulo compacto no resumo/tooltip, nome completo no painel |
| `vap`                              | Votos computados do candidato                                                     |
| `pvapn`                            | Percentual do TSE, sem recalcular o denominador pelos candidatos visíveis         |
| `dvt`, `st`                        | Destinação dos votos e situação informadas pelo TSE                               |
| `s.ts`, `s.st`                     | Seções totais e **totalizadas**, incluindo as não instaladas                      |
| `dg`, `hg`                         | Geração do arquivo; data exibida na interface                                     |
| `dt`, `ht`                         | Data/hora da totalização, mantida nos metadados                                   |
| `idg`                              | Identificador de geração de cada arquivo                                          |

O mapa mostra quem tem mais **votos computados**, sem declarar candidatos
eleitos. Votos anulados/sub judice são preservados e sinalizados; o simulado
inclui deliberadamente essas situações e nomes com caracteres especiais. Todos
os candidatos ficam no contrato e no painel (os demais sob expansão), mesmo
quando só os dois primeiros aparecem no topo.

O total nacional vem do arquivo BR, que inclui o exterior. Não é reconstruído
pela soma das UFs. `s.st` e `s.sa` são conceitos distintos: o indicador usa
seções totalizadas, identificado na interface. Diferença significa pontos
percentuais entre os dois maiores totais computados.

Os campos de data/hora do EA20 não contêm offset. O adaptador **assume Brasília
(UTC-03)** para normalizar em ISO UTC; confirme esse detalhe operacional antes
de habilitar produção. `upstream.files` preserva IDG e datas por abrangência;
`fetchedAt` é separado da data da fonte. BR e UFs podem ser publicados em
momentos diferentes, portanto o conjunto não é apresentado como carga atômica.

## Cache, atualizações e erros

`server/tse-source.ts` limita a quatro downloads simultâneos, compartilha uma
consulta em andamento entre clientes e mantém o resultado validado em memória
por 30 segundos. Nas próximas consultas utiliza `ETag`/`Last-Modified` quando
fornecidos pelo TSE e reaproveita o arquivo validado em respostas 304.

Cada download tem timeout de 15 segundos. Uma falha impede publicar um conjunto
incompleto e devolve HTTP 503 com `Retry-After: 30`; tentativas repetidas aguardam
30 segundos antes de nova coleta. Os arquivos parcialmente baixados não
substituem o cache validado. O navegador conserva o último snapshot recebido,
avisa a falha e oferece retentativa.

O polling de 30 segundos é uma escolha local para os testes, não uma cadência
recomendada oficialmente. O TSE informa limite de 100 requisições/segundo por
IP; respostas 304 também contam, e sequências de 404 podem bloquear o IP.
Com várias instâncias, será necessário compartilhar cache/coleta entre elas.

## Conectar produção depois

1. Conferir novamente a documentação e `ele-c.json` do ambiente oficial.
2. Criar uma configuração/adaptador separado para host, ambiente, eleição e
   turno oficiais, exigindo `f=o`. Não basta trocar o rótulo ou o domínio do
   simulado; este adaptador rejeita arquivos de produção e de outras eleições.
3. Tratar `dv` (divulgação autorizada), status de totalização, timestamps e
   códigos oficiais com amostras do ambiente correto, preservando o agregado BR.
4. Implementar o coletor e persistência conforme [persistence-plan.md](persistence-plan.md).
5. Só então habilitar `VITE_ELECTION_DATA_SOURCE=tse` e apontar para a API
   oficial normalizada. O cliente já diferencia e valida essa fonte.

Os testes unitários usam exemplos capturados BR/MT sem rede. Os testes de
navegador usam respostas controladas para validar layout, contrato e falhas.
`npm run test:tse` é a verificação separada contra o ambiente real de simulação.
