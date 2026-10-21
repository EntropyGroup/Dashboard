// Firestore do entropydash, com a conta de serviço (a mesma da sincronização bancária).

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function credencial() {
  const arquivo = process.env.HARVEY_SERVICE_ACCOUNT_FILE
  const json = arquivo ? readFileSync(arquivo, 'utf8') : process.env.FIREBASE_SERVICE_ACCOUNT
  if (!json?.trim()) {
    throw new Error('Falta a conta de serviço do Firebase: defina FIREBASE_SERVICE_ACCOUNT (JSON numa linha) ou HARVEY_SERVICE_ACCOUNT_FILE (caminho do .json) no .env')
  }
  return cert(JSON.parse(json))
}

initializeApp({ credential: credencial() })
export const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })
