import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { initials } from '@/lib/utils'

export function ConfigPage() {
  const { user, signOut, firebaseReady, saveProfile, changePassword } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [photo, setPhoto] = useState(user?.photoURL ?? '')
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
        <form className="space-y-3.5" onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          try { await saveProfile(name.trim(), photo.trim()); toast.success('Perfil atualizado.') }
          catch { toast.error('Não foi possível salvar o perfil. Tente novamente.') }
          finally { setSaving(false) }
        }}>
          <div className="glass flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-porcelain">
            {photo ? <img src={photo} alt="Foto do perfil" className="h-full w-full object-cover" /> : initials(name || 'Usuário')}
          </div>
          <label className="block text-xs font-medium text-mist">Nome
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1.5" autoComplete="name" />
          </label>
          <label className="block text-xs font-medium text-mist">URL da foto
            <input type="url" value={photo} onChange={(e) => setPhoto(e.target.value)} className="input mt-1.5" placeholder="https://…" />
          </label>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPhoto('')}>Remover foto</Button>
          <label className="block text-xs font-medium text-mist">Email
            <input value={user?.email ?? ''} disabled className="input mt-1.5 opacity-60" />
          </label>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</Button>
        </form>
      </Card>
      <Card>
        <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
        {firebaseReady ? <form className="space-y-3.5" onSubmit={async (e) => {
          e.preventDefault()
          if (password !== repeat) { toast.error('As novas senhas não coincidem.'); return }
          setChanging(true)
          try {
            await changePassword(current, password)
            setCurrent(''); setPassword(''); setRepeat('')
            toast.success('Senha alterada.')
          } catch (err) { toast.error((err as Error).message) }
          finally { setChanging(false) }
        }}>
          <label className="block text-xs font-medium text-mist">Senha atual
            <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-mist">Nova senha
            <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-mist">Confirmar nova senha
            <input type="password" required minLength={6} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="input mt-1.5" />
          </label>
          <Button type="submit" disabled={changing}>{changing ? 'Alterando…' : 'Alterar senha'}</Button>
        </form> : <p className="text-xs text-steel">A troca de senha fica disponível com a conta Firebase conectada.</p>}
      </Card>
      <Button variant="secondary" onClick={() => signOut()}>Sair da conta</Button>
    </div>
  )
}
