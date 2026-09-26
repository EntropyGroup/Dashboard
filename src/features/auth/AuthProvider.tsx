import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'

interface MockUser {
  uid: string
  email: string | null
  displayName: string | null
}

interface AuthValue {
  user: User | MockUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  firebaseReady: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

const MOCK_SESSION_KEY = 'entropy.mockSession'

function authMessage(code?: string) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou senha incorretos.'
    case 'auth/invalid-email':
      return 'Esse email não é válido.'
    case 'auth/user-disabled':
      return 'Essa conta foi desativada.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Espere alguns minutos e tente de novo.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique a internet e tente de novo.'
    case 'auth/operation-not-allowed':
      return 'Login por email e senha não está ativado no Firebase.'
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'A chave do Firebase no .env é inválida.'
    default:
      return `Não foi possível entrar${code ? ` (${code})` : ''}.`
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | MockUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      })
      return unsub
    }

    const stored = sessionStorage.getItem(MOCK_SESSION_KEY)
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  async function signIn(email: string, password: string) {
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (err) {
        throw new Error(authMessage((err as { code?: string })?.code))
      }
      return
    }

    if (!email || !password) throw new Error('Informe email e senha.')
    const mockUser: MockUser = { uid: 'demo-user', email, displayName: email.split('@')[0] }
    sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser))
    setUser(mockUser)
  }

  async function signOut() {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth)
      return
    }
    sessionStorage.removeItem(MOCK_SESSION_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, firebaseReady: isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
