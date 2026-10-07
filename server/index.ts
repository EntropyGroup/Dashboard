import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createTrevorServer } from './http.ts'

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
// Firebase only verifies the existing dashboard login. Gemini uses its direct REST API.
initializeApp({ credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID })
const server = createTrevorServer({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  origins: (process.env.TREVOR_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map((value) => value.trim()).filter(Boolean),
  allowedEmails: (process.env.TREVOR_ALLOWED_EMAILS || 'danielvgs.work@gmail.com,guileiteteixeira@gmail.com').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
  verifyToken: (token) => getAuth().verifyIdToken(token, true),
})
server.listen(Number(process.env.PORT || 8787), process.env.TREVOR_HOST || '127.0.0.1', () => {
  console.log(`Trevor API na porta ${process.env.PORT || 8787}. Gemini ${process.env.GEMINI_API_KEY ? 'configurado' : 'aguardando chave'}.`)
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
