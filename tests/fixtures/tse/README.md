# Fixtures EA20

Arquivos BR e MT originais obtidos do simulado oficial do TSE em 04/10/2026,
com geração em 29/09/2026. Usados exclusivamente em testes de contrato, sem
consultas de rede. Os testes de composição duplicam o exemplo MT com diferentes
abrangências para testar validação, cache e concorrência; isso não é dado real
de outras UFs nem um fallback da aplicação.

Origem: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/`
Arquivos: `br/br-c0001-e021270-u.json` e `mt/mt-c0001-e021270-u.json`.

`official-br.json` foi obtido do ambiente oficial em 04/10/2026, antes do início
da totalização (`and=n`, `dv=s`, `dt`/`ht` vazios). Origem:
`https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json`.
Esse arquivo testa a ausência de totalização, sem presumir o estado atual da eleição.

`governor-sp.json` e `governor-mt.json` foram coletados do ambiente oficial em
04/10/2026, eleição 6259, cargo 0003. Testes que replicam uma amostra nas demais
UFs fazem isso somente para testar o contrato; a aplicação coleta 27 arquivos reais.
