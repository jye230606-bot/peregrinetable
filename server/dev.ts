import { createServer } from 'node:http'
import { configFromEnv, handle, type ApiRequest } from './api'

/** The API on its own port for local work. Vite proxies /api here. */

const config = configFromEnv(process.env)
const port = Number(process.env.PEACOCK_API_PORT ?? 5179)

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  const path = url.pathname.replace(/^\/api/, '') || '/'

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')

  let body: unknown
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Body must be JSON.' }))
      return
    }
  }

  const apiReq: ApiRequest = {
    method: req.method ?? 'GET',
    path,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers as Record<string, string | undefined>,
    body,
    ip: req.socket.remoteAddress ?? 'local',
  }

  const out = await handle(apiReq, config)
  res.statusCode = out.status
  for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v)
  if (out.body === undefined) res.end()
  else {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(out.body))
  }
}).listen(port, () => {
  console.log(`peacock api on http://localhost:${port}`)
  if (!process.env.PEACOCK_OWNER_PASSWORD_HASH) {
    console.log('PEACOCK_OWNER_PASSWORD_HASH is unset — owner sign-in will refuse.')
    console.log('Generate one with: npm run hash-password -- "your password"')
  }
})
