import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Lancamento, LancamentoTipo } from '@/lib/store/types'

const emptyForm = {
  tipo: 'entrada' as LancamentoTipo,
  descricao: '',
  categoria: '',
  valor: '',
  data: new Date().toISOString().slice(0, 10),
}

export function FinanceiroPage() {
  const { lancamentos, projetos, log } = useStore()
  const confirm = useConfirm()
  const [filtro, setFiltro] = useState<'todos' | 'manual' | 'banco'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [form, setForm] = useState(emptyForm)

  const now = new Date()
  const monthly = lancamentos.items.filter((l) => {
    const d = new Date(l.data)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const entradas = monthly.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = monthly.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  const filtered = useMemo(
    () => lancamentos.items.filter((l) => (filtro === 'todos' ? true : l.origem === filtro)),
    [lancamentos.items, filtro],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(l: Lancamento) {
    setEditing(l)
    setForm({
      tipo: l.tipo,
      descricao: l.descricao,
      categoria: l.categoria,
      valor: String(l.valor),
      data: l.data.slice(0, 10),
    })
    setModalOpen(true)
  }

  async function handleSubmit() {
    const valor = Number(form.valor)
    if (!form.descricao || !valor) return

    if (editing) {
      await lancamentos.update(editing.id, {
        tipo: form.tipo,
        descricao: form.descricao,
        categoria: form.categoria,
        valor,
        data: new Date(form.data).toISOString(),
      })
      log(`Lançamento <b>${form.descricao}</b> editado`)
    } else {
      await lancamentos.add({
        tipo: form.tipo,
        origem: 'manual',
        descricao: form.descricao,
        categoria: form.categoria || 'Geral',
        valor,
        data: new Date(form.data).toISOString(),
        criadoEm: new Date().toISOString(),
      })
      log(`Novo lançamento <b>${form.descricao}</b> registrado`)
    }
    setModalOpen(false)
  }

  async function handleDelete(l: Lancamento) {
    const ok = await confirm({
      title: 'Excluir lançamento',
      description: `Remover "${l.descricao}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      await lancamentos.remove(l.id)
      log(`Lançamento <b>${l.descricao}</b> excluído`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-steel">Entradas do mês</p>
          <p className="mt-2 text-2xl font-medium text-success">{formatCurrency(entradas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saídas do mês</p>
          <p className="mt-2 text-2xl font-medium text-danger">{formatCurrency(saidas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saldo do mês</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">{formatCurrency(entradas - saidas)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="rounded-md border border-graphite bg-obsidian px-2.5 py-1.5 text-xs text-mist outline-none focus:border-signal"
            >
              <option value="todos">Todas as origens</option>
              <option value="manual">Manual</option>
              <option value="banco">Banco</option>
            </select>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Novo lançamento
            </Button>
          </div>
        </CardHeader>

        <div className="glass-inset -mx-1 overflow-x-auto rounded-lg">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.03] text-[11px] text-steel uppercase backdrop-blur-sm">
                <th className="px-3 py-2.5 font-medium">Descrição</th>
                <th className="px-3 py-2.5 font-medium">Categoria</th>
                <th className="px-3 py-2.5 font-medium">Projeto</th>
                <th className="px-3 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                <th className="px-3 py-2.5 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((l) => {
                const projeto = projetos.items.find((p) => p.id === l.projetoId)
                return (
                  <tr key={l.id} className="transition-colors hover:bg-white/[0.035]">
                    <td className="px-3 py-2.5 text-porcelain">{l.descricao}</td>
                    <td className="px-3 py-2.5 text-mist">{l.categoria}</td>
                    <td className="px-3 py-2.5 text-mist">{projeto?.nome ?? '—'}</td>
                    <td className="px-3 py-2.5 text-mist">{formatDate(l.data)}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                      {l.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(l.valor)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Badge tone={l.origem === 'banco' ? 'info' : 'neutral'}>{l.origem}</Badge>
                        {l.origem === 'manual' && (
                          <>
                            <button onClick={() => openEdit(l)} className="rounded p-1 text-steel hover:text-porcelain">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(l)} className="rounded p-1 text-steel hover:text-danger">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-steel">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? 'Editar lançamento' : 'Novo lançamento'}>
        <div className="space-y-3.5">
          <div className="flex gap-2">
            {(['entrada', 'saida'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                className={`flex-1 rounded-md border py-1.5 text-xs font-medium capitalize transition-colors ${
                  form.tipo === t ? 'border-signal bg-signal/10 text-signal' : 'border-graphite text-mist'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Field label="Descrição">
            <input
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Categoria">
            <input
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <input
                type="number"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Data">
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="input"
              />
            </Field>
          </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-mist">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
