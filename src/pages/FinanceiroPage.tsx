import { useMemo, useState, type ReactNode } from 'react'
import { Plus, Pencil, Trash2, EyeOff, Landmark, AlertTriangle } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { cn, formatCurrency, formatDate, relativeTime } from '@/lib/utils'
import type { Lancamento, LancamentoTipo, SyncStatus } from '@/lib/store/types'

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  tipo: 'saida' as LancamentoTipo,
  descricao: '',
  categoria: '',
  projetoId: '',
  valor: '',
  data: today(),
}

export function FinanceiroPage() {
  const { lancamentos, projetos, syncBanco, log } = useStore()
  const confirm = useConfirm()
  const [filtro, setFiltro] = useState<'todos' | 'manual' | 'banco'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const monthly = lancamentos.items.filter((l) => {
    const d = new Date(l.data)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const entradas = monthly.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = monthly.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  const porCategoria = useMemo(() => {
    const totals = new Map<string, number>()
    for (const l of monthly) {
      if (l.tipo !== 'saida') continue
      totals.set(l.categoria || 'Sem categoria', (totals.get(l.categoria || 'Sem categoria') ?? 0) + l.valor)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [monthly])

  const categorias = useMemo(
    () => [...new Set(lancamentos.items.map((l) => l.categoria).filter(Boolean))].sort(),
    [lancamentos.items],
  )

  const filtered = useMemo(
    () => lancamentos.items.filter((l) => (filtro === 'todos' ? true : l.origem === filtro)),
    [lancamentos.items, filtro],
  )

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, data: today() })
    setModalOpen(true)
  }

  function openEdit(l: Lancamento) {
    setEditing(l)
    setForm({
      tipo: l.tipo,
      descricao: l.descricao,
      categoria: l.categoria,
      projetoId: l.projetoId ?? '',
      valor: String(l.valor),
      data: l.data.slice(0, 10),
    })
    setModalOpen(true)
  }

  const isBankEdit = editing?.origem === 'banco'

  async function handleSubmit() {
    const valor = Number(form.valor)
    if (!form.descricao || (!isBankEdit && !valor)) return
    setSaving(true)
    try {
      if (editing && isBankEdit) {
        // value, date and direction belong to the bank; the sync owns them
        await lancamentos.update(editing.id, {
          descricao: form.descricao,
          categoria: form.categoria || 'Sem categoria',
          projetoId: form.projetoId || undefined,
        })
        log(`Lançamento do banco <b>${form.descricao}</b> editado`)
      } else if (editing) {
        await lancamentos.update(editing.id, {
          tipo: form.tipo,
          descricao: form.descricao,
          categoria: form.categoria || 'Sem categoria',
          projetoId: form.projetoId || undefined,
          valor,
          data: new Date(form.data).toISOString(),
        })
        log(`Lançamento <b>${form.descricao}</b> editado`)
      } else {
        await lancamentos.add({
          tipo: form.tipo,
          origem: 'manual',
          descricao: form.descricao,
          categoria: form.categoria || 'Sem categoria',
          projetoId: form.projetoId || undefined,
          valor,
          data: new Date(form.data).toISOString(),
          criadoEm: new Date().toISOString(),
        })
        log(`Novo lançamento <b>${form.descricao}</b> registrado`)
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
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

  async function handleHide(l: Lancamento) {
    const ok = await confirm({
      title: 'Ocultar lançamento do banco',
      description: `"${l.descricao}" some da lista e dos totais, e não volta na próxima sincronização.`,
      confirmLabel: 'Ocultar',
      danger: true,
    })
    if (ok) {
      await lancamentos.update(l.id, { oculto: true })
      log(`Lançamento do banco <b>${l.descricao}</b> ocultado`)
    }
  }

  const maxCategoria = porCategoria[0]?.[1] ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-steel">Entradas do mês</p>
          <p className="mt-2 text-2xl font-medium text-success tabular-nums">{formatCurrency(entradas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saídas do mês</p>
          <p className="mt-2 text-2xl font-medium text-danger tabular-nums">{formatCurrency(saidas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saldo do mês</p>
          <p className="mt-2 text-2xl font-medium text-porcelain tabular-nums">{formatCurrency(entradas - saidas)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Saídas por categoria — {now.toLocaleDateString('pt-BR', { month: 'long' })}</CardTitle>
          </CardHeader>
          {porCategoria.length ? (
            <ul className="space-y-3">
              {porCategoria.map(([cat, total]) => (
                <li key={cat}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-mist">{cat}</span>
                    <span className="shrink-0 text-porcelain tabular-nums">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-danger/60 to-danger"
                      style={{ width: `${(total / maxCategoria) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-steel">Nenhuma saída registrada neste mês.</p>
          )}
        </Card>

        <BankSyncCard syncBanco={syncBanco} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrar por origem"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="input w-auto py-1.5 text-xs"
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
                    <td className="px-3 py-2.5">
                      <p className="text-porcelain">{l.descricao}</p>
                      {l.banco && (
                        <p className="text-[11px] text-steel">
                          {l.banco.contaNome}
                          {l.banco.parcela && ` · parcela ${l.banco.parcela}`}
                          {l.banco.status === 'PENDING' && ' · pendente'}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-mist">{l.categoria}</td>
                    <td className="px-3 py-2.5 text-mist">{projeto?.nome ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-mist">{formatDate(l.data)}</td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right font-medium whitespace-nowrap tabular-nums',
                        l.tipo === 'entrada' ? 'text-success' : 'text-danger',
                      )}
                    >
                      {l.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(l.valor)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Badge tone={l.origem === 'banco' ? 'info' : 'neutral'}>{l.origem}</Badge>
                        <button
                          onClick={() => openEdit(l)}
                          aria-label="Editar lançamento"
                          className="rounded p-1 text-steel hover:text-porcelain"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {l.origem === 'banco' ? (
                          <button
                            onClick={() => handleHide(l)}
                            aria-label="Ocultar lançamento do banco"
                            title="Ocultar"
                            className="rounded p-1 text-steel hover:text-danger"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(l)}
                            aria-label="Excluir lançamento"
                            className="rounded p-1 text-steel hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={isBankEdit ? 'Editar lançamento do banco' : editing ? 'Editar lançamento' : 'Novo lançamento'}
        description={isBankEdit ? 'Valor, data e tipo vêm do banco e não podem ser alterados.' : undefined}
      >
        <form
          className="space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {isBankEdit && editing ? (
            <div className="glass-inset grid grid-cols-3 gap-3 rounded-lg p-3 text-xs">
              <Info label="Valor">
                <span className={editing.tipo === 'entrada' ? 'text-success' : 'text-danger'}>
                  {editing.tipo === 'entrada' ? '+' : '-'}
                  {formatCurrency(editing.valor)}
                </span>
              </Info>
              <Info label="Data">{formatDate(editing.data)}</Info>
              <Info label="Conta">{editing.banco?.contaNome ?? 'Banco'}</Info>
            </div>
          ) : (
            <div className="flex gap-2" role="group" aria-label="Tipo">
              {(['saida', 'entrada'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={form.tipo === t}
                  onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                  className={cn(
                    'flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors',
                    form.tipo === t ? 'border-signal bg-signal/10 text-signal' : 'border-white/10 text-mist',
                  )}
                >
                  {t === 'saida' ? 'Saída' : 'Entrada'}
                </button>
              ))}
            </div>
          )}
          <Field label="Descrição" htmlFor="l-desc">
            <input
              id="l-desc"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria" htmlFor="l-cat">
              <input
                id="l-cat"
                list="l-cat-list"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Alimentação, Software…"
                className="input"
              />
              <datalist id="l-cat-list">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Projeto" htmlFor="l-proj">
              <select
                id="l-proj"
                value={form.projetoId}
                onChange={(e) => setForm((f) => ({ ...f, projetoId: e.target.value }))}
                className="input"
              >
                <option value="">Nenhum</option>
                {projetos.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!isBankEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor" htmlFor="l-valor">
                <input
                  id="l-valor"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  className="input"
                />
              </Field>
              <Field label="Data" htmlFor="l-data">
                <input
                  id="l-data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="input"
                />
              </Field>
            </div>
          )}
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

function BankSyncCard({ syncBanco }: { syncBanco: SyncStatus | undefined }) {
  const conectado = !!syncBanco
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco</CardTitle>
        <Landmark className="h-4 w-4 text-steel" />
      </CardHeader>
      {!conectado && (
        <p className="text-xs leading-relaxed text-steel">
          Nenhuma sincronização ainda. Os lançamentos do Nubank aparecem aqui depois da primeira execução do
          workflow "Sincronizar banco" no GitHub.
        </p>
      )}
      {conectado && syncBanco.status === 'erro' && (
        <div className="flex gap-2 text-xs leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            A última sincronização falhou {relativeTime(syncBanco.ultimaExecucao)}.
            {syncBanco.mensagem && <span className="mt-1 block text-steel">{syncBanco.mensagem}</span>}
          </p>
        </div>
      )}
      {conectado && syncBanco.status === 'ok' && (
        <div className="space-y-3">
          <p className="text-sm text-porcelain">Sincronizado {relativeTime(syncBanco.ultimaExecucao)}</p>
          <div className="glass-inset grid grid-cols-3 gap-2 rounded-lg p-3 text-center">
            <Stat label="novos" value={syncBanco.novos} />
            <Stat label="atualizados" value={syncBanco.atualizados} />
            <Stat label="removidos" value={syncBanco.removidos} />
          </div>
          {syncBanco.contas?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {syncBanco.contas.map((c) => (
                <span key={c} className="glass-pill rounded-full px-2.5 py-1 text-[10px] text-mist">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-base font-medium text-porcelain tabular-nums">{value}</p>
      <p className="text-[10px] text-steel">{label}</p>
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] tracking-wide text-steel uppercase">{label}</p>
      <p className="mt-0.5 text-porcelain">{children}</p>
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
