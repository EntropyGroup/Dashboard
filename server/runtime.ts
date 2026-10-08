import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createTrevorHandler } from './http.ts'

// Initialize credentials only when authenticating a chat request, not at import time.
function firebaseAuth() {
  const existing = getApps().find((app) => app.name === 'trevor')
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  const app = existing ?? initializeApp({
    credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  }, 'trevor')
  return getAuth(app)
}

export const trevorHandler = createTrevorHandler({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  origins: (process.env.TREVOR_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map((value) => value.trim()).filter(Boolean),
  allowedEmails: (process.env.TREVOR_ALLOWED_EMAILS || 'danielvgs.work@gmail.com,guileiteteixeira@gmail.com').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
  verifyToken: (token) => firebaseAuth().verifyIdToken(token, true),
})
