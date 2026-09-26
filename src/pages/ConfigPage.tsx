import { useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { isFirebaseConfigured } from '@/lib/firebase'

export function ConfigPage() {
  const { user, signOut, firebaseReady } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [saved, setSaved] = useState(false)

  async function saveName() {
    if (isFirebaseConfigured && user && 'getIdToken' in user) {
      await updateProfile(user as any, { displayName: name })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <div className="space-y-3.5">
          <label className="block text-xs font-medium text-mist">
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="input mt-1.5"
            />
          </label>
          <label className="block text-xs font-medium text-mist">
            Email
            <input value={user?.email ?? ''} disabled className="input mt-1.5 opacity-60" />
          </label>
          {saved && <p className="text-[11px] text-success">Salvo.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <p className="text-xs leading-relaxed text-steel">
          {firebaseReady
            ? 'Alteração de email, senha e autenticação em duas etapas ficam disponíveis aqui assim que o fluxo de reautenticação for configurado.'
            : 'Conecte um projeto Firebase para habilitar troca de senha, e-mail e autenticação em duas etapas.'}
        </p>
      </Card>

      <Button variant="secondary" onClick={() => signOut()}>
        Sair da conta
      </Button>
    </div>
  )
}
