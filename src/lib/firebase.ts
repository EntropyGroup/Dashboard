import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore } from 'firebase/firestore'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const existing = getApps()[0]
const app = isFirebaseConfigured ? existing ?? initializeApp(firebaseConfig) : undefined

export const auth = app ? getAuth(app) : undefined
// Optional form fields reach Firestore as `undefined`, which it rejects by default.
export const db = app
  ? existing
    ? getFirestore(app)
    : initializeFirestore(app, { ignoreUndefinedProperties: true })
  : undefined
