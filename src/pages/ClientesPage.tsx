import { useState, type ReactNode } from 'react'
import { Plus, Mail, Phone, AtSign, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { initials } from '@/lib/utils'
import type { Client } from '@/lib/store/types'

const emptyForm = { nome: '', celular: '', email: '', instagram: '' }

export function ClientesPage() {
  const { clientes, projetos, log } = useStore()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setForm({ nome: c.nome, celular: c.celular ?? '', email: c.email ?? '', instagram: c.instagram ?? '' })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.nome) return
    if (editing) {
      await clientes.update(editing.id, form)
      log(`Cliente <b>${form.nome}</b> atualizado`)
    } else {
      await clientes.add({ ...form, projetos: [], criadoEm: new Date().toISOString() })
      log(`Novo cliente <b>${form.nome}</b> cadastrado`)
    }
    setModalOpen(false)
  }

  async function handleDelete(c: Client) {
    const ok = await confirm({
      title: 'Excluir cliente',
      description: `Remover "${c.nome}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      await clientes.remove(c.id)
      log(`Cliente <b>${c.nome}</b> removido`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Novo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientes.items.map((c) => {
          const clientProjects = projetos.items.filter((p) => p.clienteId === c.id)
          return (
            <Card key={c.id} className="glass-sheen">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="glass-heavy flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium text-porcelain">
                    {initials(c.nome)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-porcelain">{c.nome}</p>
                    <p className="text-[11px] text-steel">{clientProjects.length} projeto(s)</p>
                  </div>
                </div>
                <div className="glass-pill flex gap-0.5 rounded-full p-0.5">
                  <button
                    onClick={() => openEdit(c)}
                    aria-label="Editar cliente"
                    className="rounded-full p-1.5 text-steel transition-colors hover:bg-white/[0.08] hover:text-porcelain"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    aria-label="Excluir cliente"
                    className="rounded-full p-1.5 text-steel transition-colors hover:bg-danger/15 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {(c.email || c.celular || c.instagram) && (
              <div className="glass-inset space-y-2 rounded-lg p-3">
                {c.email && (
                  <ContactLine icon={<Mail className="h-3.5 w-3.5" />}>{c.email}</ContactLine>
                )}
                {c.celular && (
                  <ContactLine icon={<Phone className="h-3.5 w-3.5" />}>{c.celular}</ContactLine>
                )}
                {c.instagram && (
                  <ContactLine icon={<AtSign className="h-3.5 w-3.5" />}>
                    <a
                      href={`https://instagram.com/${c.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-signal"
                    >
                      @{c.instagram}
                    </a>
                  </ContactLine>
                )}
              </div>
              )}

              {clientProjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {clientProjects.map((p) => (
                    <span key={p.id} className="glass-pill rounded-full px-2.5 py-1 text-[10px] text-mist">
                      {p.nome}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
        {!clientes.items.length && <p className="text-xs text-steel">Nenhum cliente cadastrado.</p>}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar cliente' : 'Novo cliente'}>
        <div className="space-y-3.5">
          <Field label="Nome">
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="input" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
          </Field>
          <Field label="Celular">
            <input value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} className="input" />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} className="input" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ContactLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-mist">
      <span className="text-steel">{icon}</span>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-mist">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
