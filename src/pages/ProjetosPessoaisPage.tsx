import { useState } from 'react'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ProgressBar, progressFromTodos } from '@/components/ui/ProgressBar'
import { TodoList } from '@/components/shared/TodoList'
import type { PersonalProject, ProjectStatus } from '@/lib/store/types'

const emptyForm = { nome: '', tipo: '', status: 'planejamento' as ProjectStatus }

export function ProjetosPessoaisPage() {
  const { projetosPessoais } = useStore()
  const { user } = useAuth()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [active, setActive] = useState<PersonalProject | null>(null)

  async function handleCreate() {
    if (!form.nome) return
    await projetosPessoais.add({
      ownerUid: user?.uid ?? 'anon',
      nome: form.nome,
      tipo: form.tipo,
      status: form.status,
      stack: [],
      todos: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    })
    setForm(emptyForm)
    setModalOpen(false)
  }

  async function handleDelete(p: PersonalProject) {
    const ok = await confirm({
      title: 'Excluir projeto pessoal',
      description: `Remover "${p.nome}"?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      await projetosPessoais.remove(p.id)
      if (active?.id === p.id) setActive(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Novo projeto pessoal
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projetosPessoais.items.map((p) => (
          <Card key={p.id} className="cursor-pointer" onClick={() => setActive(p)}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-porcelain">{p.nome}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="mb-3 text-[11px] text-steel">{p.tipo}</p>
            <ProgressBar value={progressFromTodos(p.todos)} />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-steel">{progressFromTodos(p.todos)}% concluído</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(p)
                }}
                className="rounded p-1 text-steel hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        ))}
        {!projetosPessoais.items.length && <p className="text-xs text-steel">Nenhum projeto pessoal ainda.</p>}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Novo projeto pessoal">
        <div className="space-y-3.5">
          <label className="block text-xs font-medium text-mist">
            Nome
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="input mt-1.5" />
          </label>
          <label className="block text-xs font-medium text-mist">
            Tipo
            <input value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className="input mt-1.5" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate}>
              Criar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!active} onOpenChange={(o) => !o && setActive(null)} title={active?.nome ?? ''} description={active?.tipo}>
        {active && (
          <div className="space-y-4">
            <textarea
              defaultValue={active.descricao ?? ''}
              onBlur={(e) => projetosPessoais.update(active.id, { descricao: e.target.value })}
              rows={3}
              placeholder="Descrição…"
              className="input resize-none"
            />
            {active.link && (
              <a href={active.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-signal hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> {active.link}
              </a>
            )}
            <TodoList
              todos={active.todos}
              onChange={(todos) => {
                projetosPessoais.update(active.id, { todos })
                setActive({ ...active, todos })
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
