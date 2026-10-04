import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { createPresidentialApi } from './api.ts'

try { process.loadEnvFile('.env.local') } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
const presidentialApi = createPresidentialApi()

const root = resolve('dist')
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}
await stat(resolve(root, 'index.html')).catch(() => {
  throw new Error('Execute npm run build antes de npm start.')
})
const server = createServer((req, res) => {
  void presidentialApi(req, res, () => {
    void serveStatic()
  })
  async function serveStatic() {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' })
        res.end()
        return
      }
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
      if (pathname.startsWith('/api/')) {
        res.writeHead(404)
        res.end()
        return
      }
      const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
      if (!path.startsWith(root + sep)) {
        res.writeHead(403)
        res.end()
        return
      }
      const body = await readFile(path)
      res.writeHead(200, {
        'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
      })
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.writeHead(404)
      res.end('Arquivo não encontrado.')
    }
  }
})
const port = Number(process.env.PORT ?? 3000)
server.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`Apuração presidencial · ${process.env.TSE_ENVIRONMENT ?? 'oficial'} · http://127.0.0.1:${port}`)
})
