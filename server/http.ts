import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { ChatTurn } from '../shared/trevor.ts'
import { validDate } from '../shared/trevor.ts'
import { askGemini } from './gemini.ts'

class RequestError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
interface ServerOptions {
  apiKey?: string
  model: string
  origins: string[]
  verifyToken: (token: string) => Promise<{ uid: string; email?: string }>
  allowedEmails: string[]
  fetch?: typeof fetch
}

async function bodyJson(req: IncomingMessage) {
  let bytes = 0
  const parts: Buffer[] = []
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 262144) throw new RequestError(413, 'Pedido muito grande. Reduza o contexto.')
    parts.push(Buffer.from(chunk))
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')) }
  catch { throw new RequestError(400, 'Pedido inválido.') }
}

export function validateRequest(body: any) {
  if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000 || !Array.isArray(body.history) || body.history.length > 12 || !validDate(body.today) || typeof body.timezone !== 'string') throw new RequestError(400, 'Pedido inválido.')
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: body.timezone }).format() }
  catch { throw new RequestError(400, 'Fuso horário inválido.') }
  for (const [index, turn] of body.history.entries()) {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string' || turn.content.length > 12000 || (index === 0 && turn.role !== 'user') || (index > 0 && turn.role === body.history[index - 1].role)) throw new RequestError(400, 'Histórico inválido.')
  }
  if (body.history.at(-1)?.role === 'user') throw new RequestError(400, 'Histórico incompleto.')
  if (body.context !== null && (typeof body.context !== 'object' || Array.isArray(body.context) || JSON.stringify(body.context).length > 30000)) throw new RequestError(400, 'Contexto inválido ou muito grande.')
  return { message: body.message.trim(), history: body.history as ChatTurn[], context: body.context, today: body.today as string, timezone: body.timezone as string }
}

export function createTrevorServer(options: ServerOptions) {
  const limits = new Map<string, { count: number; reset: number }>()
  function limited(key: string, max: number) {
    const now = Date.now()
    // Expired entries are removed on every request, avoiding unbounded IP/UID growth.
    for (const [entry, bucket] of limits) if (bucket.reset <= now) limits.delete(entry)
    const bucket = limits.get(key) ?? { count: 0, reset: now + 60000 }
    bucket.count++
    limits.set(key, bucket)
    return bucket.count > max
  }
  function json(res: ServerResponse, status: number, value: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(value))
  }
  const server = createServer(async (req, res) => {
    try {
      const origin = req.headers.origin
      if (origin && !options.origins.includes(origin)) throw new RequestError(403, 'Origem não autorizada.')
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600' }); res.end(); return
      }
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      if (req.method === 'GET' && path === '/api/trevor/health') { json(res, 200, { ready: !!options.apiKey, provider: 'gemini' }); return }
      if (req.method !== 'POST' || path !== '/api/trevor') throw new RequestError(404, 'Endpoint não encontrado.')
      if (!options.apiKey) throw new RequestError(503, 'Configure GEMINI_API_KEY no servidor para ativar o chat com IA.')
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new RequestError(415, 'Use JSON no pedido.')
      if (limited(`ip:${req.socket.remoteAddress}`, 60)) throw new RequestError(429, 'Muitos pedidos. Aguarde um minuto.')
      const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')
      if (!match) throw new RequestError(401, 'Entre na sua conta para usar o Trevor.')
      let user: { uid: string; email?: string }
      try { user = await options.verifyToken(match[1]) }
      catch { throw new RequestError(401, 'Sessão inválida. Entre novamente.') }
      if (!user.email || !options.allowedEmails.includes(user.email.toLowerCase())) throw new RequestError(403, 'Conta sem acesso ao Trevor.')
      if (limited(`uid:${user.uid}`, 12)) throw new RequestError(429, 'Limite de 12 pedidos por minuto. Aguarde um momento.')
      const input = validateRequest(await bodyJson(req))
      try { json(res, 200, await askGemini(input, { apiKey: options.apiKey, model: options.model, fetch: options.fetch })) }
      catch (error) {
        if ((error as Error).name === 'TimeoutError') throw new RequestError(504, 'O Gemini demorou demais. Tente novamente.')
        throw new RequestError(502, (error as Error).message)
      }
    } catch (error) {
      if (!res.headersSent) json(res, error instanceof RequestError ? error.status : 500, { error: error instanceof RequestError ? error.message : 'Não foi possível processar o pedido.' })
    }
  })
  server.requestTimeout = 40000
  server.headersTimeout = 10000
  return server
}
