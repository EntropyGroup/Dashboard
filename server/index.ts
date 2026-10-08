import { trevorHandler } from './runtime.ts'
import { createServer } from 'node:http'

const server = createServer(trevorHandler)
server.requestTimeout = 40000
server.headersTimeout = 10000
server.listen(Number(process.env.PORT || 8787), process.env.TREVOR_HOST || '127.0.0.1', () => {
  console.log(`Trevor API na porta ${process.env.PORT || 8787}. Gemini ${process.env.GEMINI_API_KEY ? 'configurado' : 'aguardando chave'}.`)
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
