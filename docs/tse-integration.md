# Integração da apuração presidencial com o TSE

A aplicação funciona inicialmente com dados fictícios. Não há endpoint oficial de 2026 presumido ou conexão ativa com o TSE. A integração é isolada dos componentes em `src/services/tse-client.ts` e selecionada em `src/services/election-service.ts`.

## Ponto de conexão

Implemente um endpoint no seu backend, por exemplo `GET /api/tse/presidential`, que consulte os endpoints oficiais **confirmados para a eleição, cargo presidencial e turno de 2026**. O nome desse proxy é uma convenção deste projeto, não uma URL do TSE.

O backend deve transformar a resposta oficial no contrato `ElectionSnapshot`, validado por `snapshotSchema` em `src/domain/election.ts`. O frontend recebe apenas esse contrato; URLs oficiais, seus códigos de eleição/cargo, autenticação, CORS e mudanças no payload pertencem ao adaptador no servidor.

Depois de validar o adaptador, configure um `.env.local`:

```dotenv
VITE_ELECTION_DATA_SOURCE=tse
VITE_TSE_PROXY_URL=/api/tse/presidential
```

Reinicie o Vite ou gere um novo build. Variáveis `VITE_` são públicas: coloque apenas a URL do proxy e a escolha da fonte nelas, nunca credenciais. O projeto Vite gera um frontend estático e **não inclui um servidor desse proxy**.

## Contrato normalizado

```typescript
interface ElectionSnapshot {
  year: 2026
  office: 'president'
  round: 1 | 2
  source: 'mock' | 'tse'
  updatedAt: string // ISO 8601 UTC: instante informado pela fonte, não o horário do fetch
  candidates: Array<{ id: string; name: string; number: string; color: string }>
  national: {
    sectionsTotal: number
    sectionsCounted: number
    votes: Array<{ candidateId: string; count: number }>
  }
  states: Array<{
    uf: 'AC' | 'AL' | 'AP' /* ... todas as 27 UFs */
    sectionsTotal: number
    sectionsCounted: number
    votes: Array<{ candidateId: string; count: number }>
  }>
}
```

Envie todas as 27 UFs uma única vez, números inteiros não negativos, identificadores de candidatos consistentes e cores hexadecimais de seis dígitos. Em produção o cliente aceita apenas `source: 'tse'`. Não preencha dados indisponíveis com resultados fictícios: devolva erro ou mantenha um snapshot oficial completo anterior no proxy. Não misture respostas de turnos ou instantes diferentes.

O resultado nacional oficial deve vir do agregado nacional fornecido pelo TSE. Não some apenas as UFs para substituir esse total, pois o contrato da fonte pode incluir votos do exterior ou outros agrupamentos. Os mocks são somados para manter a demonstração consistente.

Percentuais de candidatos usam a soma dos votos válidos presentes no resultado. Inclua **todos** os candidatos no contrato para manter esse denominador correto. Apuração significa `sectionsCounted / sectionsTotal`; diferença significa pontos percentuais entre os dois primeiros. Sem votos e empate aparecem com cor neutra.

## Atualização e falhas

O cliente consulta o proxy a cada 30 segundos, após concluir a consulta anterior, e cancela requisições quando o componente é desmontado. Falha inicial mostra erro e botão para tentar novamente. Falha de atualização conserva o último snapshot, avisa que ele está desatualizado e continua tentando. HTTP inválido, JSON malformado e contrato inconsistente não se tornam resultados oficiais. O modo mock não consulta a rede nem simula atualização ao vivo.

Valide com uma amostra oficial real antes de habilitar produção: esquema e códigos de 2026, votos válidos, seções, candidatos, turno, timestamp, UFs, total nacional e política de cache. Os testes deste projeto validam o contrato interno e respostas simuladas do proxy; não comprovam funcionamento dos endpoints oficiais.
