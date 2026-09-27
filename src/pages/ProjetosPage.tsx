import { useState, type MouseEvent, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ProgressBar, progressFromTodos } from '@/components/ui/ProgressBar'
import { TagInput } from '@/components/shared/TagInput'
import { formatCurrency, initials } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/lib/store/types'

const emptyForm = {
  nome: '',
  tipo: '',
  clienteId: '',
  valorCobranca: '',
  status: 'planejamento' as ProjectStatus,
  link: '',
  stack: [] as string[],
}

export function ProjetosPage() {
  const { projetos, clientes, log } = useStore()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(p: Project, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(p)
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      clienteId: p.clienteId ?? '',
      valorCobranca: p.valorCobranca ? String(p.valorCobranca) : '',
      status: p.status,
      link: p.link ?? '',
      stack: p.stack,
    })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.nome) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        clienteId: form.clienteId || undefined,
        valorCobranca: form.valorCobranca ? Number(form.valorCobranca) : undefined,
        status: form.status,
        link: form.link || undefined,
        stack: form.stack,
        atualizadoEm: new Date().toISOString(),
      }
      if (editing) {
        await projetos.update(editing.id, payload)
        log(`Projeto <b>${form.nome}</b> atualizado`)
      } else {
        await projetos.add({ ...payload, todos: [], criadoEm: new Date().toISOString() })
        log(`Novo projeto <b>${form.nome}</b> criado`)
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Project, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const ok = await confirm({
      title: 'Excluir projeto',
      description: `Remover "${p.nome}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      await projetos.remove(p.id)
      log(`Projeto <b>${p.nome}</b> excluído`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Novo projeto
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.03] text-[11px] text-steel uppercase backdrop-blur-sm">
                <th className="px-5 py-3 font-medium">Projeto</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Progresso</th>
                <th className="px-3 py-3 text-right font-medium">Cobrança</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {projetos.items.map((p) => {
                const cliente = clientes.items.find((c) => c.id === p.clienteId)
                const progress = progressFromTodos(p.todos)
                return (
                  <tr key={p.id} className="group transition-colors hover:bg-white/[0.035]">
                    <td className="px-5 py-3">
                      <RouterLink to={`/projetos/${p.id}`} className="block">
                        <p className="text-porcelain group-hover:text-signal">{p.nome}</p>
                        <p className="text-[11px] text-steel">{p.tipo}</p>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-3">
                      {cliente ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-graphite text-[10px] text-porcelain">
                            {initials(cliente.nome)}
                          </div>
                          <span className="text-mist">{cliente.nome}</span>
                        </div>
                      ) : (
                        <span className="text-steel">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={progress} className="w-20" />
                        <span className="text-[11px] text-steel">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-mist">
                      {p.valorCobranca ? formatCurrency(p.valorCobranca) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => openEdit(p, e)}
                          aria-label="Editar projeto"
                          className="rounded p-1 text-steel hover:text-porcelain"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(p, e)}
                          aria-label="Excluir projeto"
                          className="rounded p-1 text-steel hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!projetos.items.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-steel">
                    Nenhum projeto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar projeto' : 'Novo projeto'}>
        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <Field label="Nome" htmlFor="p-nome">
            <input
              id="p-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Tipo" htmlFor="p-tipo">
            <input
              id="p-tipo"
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="input"
              placeholder="Site, sistema, e-commerce…"
            />
          </Field>
          <Field label="Cliente" htmlFor="p-cliente">
            <select
              id="p-cliente"
              value={form.clienteId}
              onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
              className="input"
            >
              <option value="">Sem cliente vinculado</option>
              {clientes.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" htmlFor="p-status">
              <select
                id="p-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                className="input"
              >
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em andamento</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
              </select>
            </Field>
            <Field label="Valor de cobrança" htmlFor="p-valor">
              <input
                id="p-valor"
                type="number"
                inputMode="decimal"
                min="0"
                value={form.valorCobranca}
                onChange={(e) => setForm((f) => ({ ...f, valorCobranca: e.target.value }))}
                className="input"
              />
            </Field>
          </div>
          <Field label="Link (repositório, deploy…)" htmlFor="p-link">
            <input
              id="p-link"
              type="url"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="https://…"
              className="input"
            />
          </Field>
          <Field label="Stack" htmlFor="p-stack">
            <TagInput
              id="p-stack"
              tags={form.stack}
              onChange={(stack) => setForm((f) => ({ ...f, stack }))}
              placeholder="React, Node…"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-mist">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
