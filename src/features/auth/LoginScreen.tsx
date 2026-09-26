import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import { EntropyMark } from '@/components/brand/EntropyMark'
import { cn } from '@/lib/utils'

export function LoginScreen() {
  const { signIn, firebaseReady } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(160_170_190_/_0.16),transparent_65%)] blur-3xl" />

      <div className="entropy-rise relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <EntropyMark className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.32em] text-steel uppercase">Entropy</p>
            <h1 className="mt-1.5 text-lg font-medium text-porcelain">Painel interno</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6">
          {!firebaseReady && (
            <p className="glass-inset mb-4 rounded-lg px-3 py-2 text-xs leading-relaxed text-mist">
              Firebase ainda não configurado. Use qualquer email/senha para entrar em modo de demonstração local.
            </p>
          )}

          <label className="block text-xs font-medium text-mist" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1.5 mb-4"
            placeholder="voce@entropy.studio"
          />

          <label className="block text-xs font-medium text-mist" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1.5 mb-5"
            placeholder="••••••••"
          />

          {error && <p className="mb-4 text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'w-full rounded-lg bg-porcelain py-2.5 text-sm font-medium text-obsidian shadow-[0_1px_0_rgb(255_255_255_/_0.4)_inset,0_12px_24px_-12px_rgb(0_0_0_/_0.6)] transition-all active:scale-[0.99]',
              busy ? 'opacity-60' : 'hover:brightness-95',
            )}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
