import { createSupabaseReader } from '../../../server/supabase-reader.ts'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  if (request.method !== 'GET')
    return Response.json(
      { error: 'Método não permitido.' },
      { status: 405, headers: { ...headers, Allow: 'GET' } },
    )
  try {
    const data = await createSupabaseReader(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      'oficial',
      fetch,
      'governor',
    ).load()
    return Response.json(data, { headers })
  } catch {
    console.error('Falha ao consultar governadores no Supabase.')
    return Response.json(
      { error: 'A apuração dos governadores está temporariamente indisponível.' },
      { status: 503, headers },
    )
  }
}
