import { createTseSource, UpstreamError } from '../../../server/tse-source.ts'
import { OFFICIAL, SIMULATION } from '../../../server/tse-adapter.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
const secret = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!supabaseUrl || !secret) throw new Error('Supabase server environment missing')
const headers: Record<string, string> = { apikey: secret, 'Content-Type': 'application/json' }
if (secret.startsWith('eyJ')) headers.Authorization = `Bearer ${secret}`
async function rpc(name: string, params: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Database ${name}: HTTP ${response.status}`)
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
const sources = {
  oficial: createTseSource({ config: OFFICIAL, ttl: 0 }),
  simulado2026: createTseSource({ config: SIMULATION, ttl: 0 }),
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST')
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  let environment: keyof typeof sources = 'oficial'
  let lease: string | null = null
  try {
    // Custom authentication: the opaque token lives in Vault; only its hash is in our table.
    // The publishable/anon key cannot authorize collection or writes.
    const token = request.headers.get('x-collector-token')
    if (!token || token.length > 256 || !(await rpc('tse_authorize_collector', { p_token: token })))
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    if (body.environment !== 'oficial' && body.environment !== 'simulado2026')
      return Response.json({ error: 'Invalid environment' }, { status: 400 })
    environment = body.environment
    lease = await rpc('tse_claim_collection', { p_environment: environment })
    if (!lease) return Response.json({ status: 'skipped', reason: 'locked-or-cooling-down' })
    const source = sources[environment]
    const snapshot = await source.load()
    const files = await Promise.all(
      source.getRawFiles().map(async (file) => {
        const metadata = snapshot.upstream!.files.find(
          (meta) => meta.scope.toLowerCase() === file.scope,
        )!
        return {
          ...file,
          sha256: await sha256(JSON.stringify(file.raw)),
          url: metadata.url,
          generatedAt: metadata.generatedAt,
          totalizedAt: metadata.totalizedAt,
        }
      }),
    )
    files.sort((a, b) => a.scope.localeCompare(b.scope))
    const hash = await sha256(JSON.stringify(files.map((file) => [file.scope, file.sha256])))
    const id = await rpc('tse_store_collection', {
      p_environment: environment,
      p_lease: lease,
      p_files: files,
      p_snapshot: snapshot,
      p_hash: hash,
    })
    return Response.json({ status: 'stored', environment, snapshotId: id, files: files.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collection failed'
    if (lease) {
      await rpc('tse_fail_collection', {
        p_environment: environment,
        p_lease: lease,
        p_error: message,
        p_retry_seconds:
          error instanceof UpstreamError && [403, 404, 429].includes(error.status) ? 600 : 60,
      }).catch(() => console.error('Failed to record collection error'))
    }
    console.error(message)
    return Response.json({ error: 'Collection unavailable' }, { status: 503 })
  }
})
