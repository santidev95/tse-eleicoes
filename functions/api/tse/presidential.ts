import { createSupabaseReader } from '../../../server/supabase-reader.ts'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  if (request.method !== 'GET')
    return Response.json({ message: 'Método não permitido.' }, { status: 405, headers: { ...headers, Allow: 'GET' } })
  try {
    const snapshot = await createSupabaseReader(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      'oficial',
    ).load()
    return Response.json(snapshot, { headers })
  } catch {
    console.error('Falha ao consultar o snapshot presidencial no Supabase.')
    return Response.json(
      { message: 'A apuração está temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503, headers },
    )
  }
}
