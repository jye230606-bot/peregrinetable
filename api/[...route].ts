import type { IncomingMessage, ServerResponse } from 'node:http'
import { configFromEnv, handle, type ApiRequest } from '../server/api.js'

/**
 * Vercel entry point. One catch-all, delegating to the same handlers the local
 * dev server runs, so there is exactly one implementation of every rule.
 */

const config = configFromEnv(process.env)

export default async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname.replace(/^\/api/, '') || '/'

  let body: unknown
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Body must be JSON.' }))
        return
      }
    }
  }

  const forwarded = req.headers['x-forwarded-for']
  const apiReq: ApiRequest = {
    method: req.method ?? 'GET',
    path,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers as Record<string, string | undefined>,
    body,
    ip: (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ?? 'unknown',
  }

  const out = await handle(apiReq, config)
  res.statusCode = out.status
  for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v)
  if (out.body === undefined) {
    res.end()
  } else {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(out.body))
  }
}
