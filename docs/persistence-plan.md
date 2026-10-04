# Próxima etapa: guardar a evolução da apuração

Ainda não há armazenamento permanente. O cache atual é em memória, compartilhado
por processo, e desaparece ao reiniciar. Os arquivos BR/MT em `tests/fixtures`
são amostras de contrato usadas nos testes, não histórico da aplicação.

## Proposta inicial

Usar um coletor no servidor para consultar o TSE independentemente do número
de visitantes. Ele publica a última leitura validada para a API e grava uma
nova versão apenas quando um arquivo muda. A interface e o cliente atual não
precisam conhecer o banco.

PostgreSQL é uma opção inicial para guardar tanto metadados quanto os JSONs
brutos em JSONB. Se o histórico crescer, os arquivos brutos podem ir para
armazenamento de objetos comprimido, mantendo hashes e referências no banco.
Essa escolha é uma proposta, não uma infraestrutura já criada.

| Registro              | Conteúdo                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source_file_version` | Ambiente, ciclo, eleição, turno, cargo, abrangência, URL, IDG, datas originais, horário interpretado, data de coleta, ETag, SHA-256, versão do adaptador e JSON bruto |
| `collection`          | Instante da coleta, resultado da validação e referências às 28 versões usadas; BR e UFs podem ter gerações diferentes                                                 |
| `latest_snapshot`     | Referência ao último conjunto completo validado e contrato normalizado para a API                                                                                     |

Preservar o JSON bruto permite corrigir o adaptador e reprocessar percentuais,
destinação e situações dos candidatos sem perder o que o TSE publicou. A chave
de origem deve incluir **ambiente, eleição, turno, cargo e abrangência** para
separar simulado e produção e impedir colisões entre arquivos.

## Regras de gravação

- Deduplicar por origem + IDG + hash; o IDG identifica uma geração e não deve
  ser interpretado como contador crescente nem comparado entre BR e UFs.
- Guardar data/hora originais e `fetchedAt` separadamente. Não inventar offset
  de origem ao armazenar o bruto.
- Não sobrescrever versões antigas quando há retotalização, correção de votos
  ou mudança de destinação. Registrar a nova versão.
- Atualizar o ponteiro do último snapshot em transação apenas após validar
  todos os arquivos. Falha de rede fica no registro da coleta e não vira zero.
- Compartilhar coleta/cache entre instâncias e ajustar o intervalo observando
  os limites do TSE. ETag reduz tráfego, mas respostas 304 contam no limite.
- Definir retenção, exportação e política de backup antes de produção.

## Ponto de implementação

Separar o transporte de `server/tse-source.ts` em uma operação que entregue
arquivo bruto + metadados HTTP ao coletor. Inserir ali a gravação de cada versão,
e depois executar `normalizeSimulation` (ou o futuro adaptador oficial).
`server/api.ts` passa a ler o último snapshot validado do repositório, sem
disparar uma coleta por visitante. Os metadados `upstream.files` já permitem
rastrear cada abrangência do contrato entregue hoje.

Antes de implementar, fechar três escolhas: banco/hospedagem, intervalo de
coleta e por quanto tempo manter o histórico. Não é necessário criar gráficos
ou tabelas na interface para guardar essa evolução.
