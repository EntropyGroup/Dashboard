import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Check, Plus, Mail, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { cn, formatCurrency, initials, relativeTime } from '@/lib/utils'
import type { Lead } from '@/lib/store/types'

export function LeadsPage() {
  const { leads, log } = useStore()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const empty = { nome: '', contato: '', categoria: '', modalidade: 'compra' as Lead['modalidade'], valor: '', comentario: '' }
  const [form, setForm] = useState(empty)

  function openEdit(lead: Lead) {
    setEditing(lead)
    setForm({
      nome: lead.nome,
      contato: lead.contato ?? '',
      categoria: lead.categoria,
      modalidade: lead.modalidade,
      valor: lead.valor == null ? '' : String(lead.valor),
      comentario: lead.comentario ?? '',
    })
    setOpen(true)
  }

  async function markRead(lead: Lead) {
    await leads.update(lead.id, { lido: !lead.lido })
  }

  async function remove(lead: Lead) {
    const ok = await confirm({
      title: 'Excluir lead',
      description: `Remover o lead de "${lead.nome}"?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) await leads.remove(lead.id)
  }


  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => { setEditing(null); setForm(empty); setOpen(true) }}><Plus className="h-3.5 w-3.5" /> Novo lead</Button></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leads.items.map((lead) => (
        <Card key={lead.id} className={cn('glass-sheen flex flex-col', lead.lido && 'opacity-60 hover:opacity-100')}>
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="glass-heavy flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium text-porcelain">
                {initials(lead.nome)}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-porcelain">
                  {lead.nome}
                  {!lead.lido && <span className="h-1.5 w-1.5 rounded-full bg-signal" title="Não visto" />}
                </p>
                <p className="text-[11px] text-steel">{relativeTime(lead.criadoEm)}</p>
              </div>
            </div>
            <Badge tone={lead.modalidade === 'compra' ? 'accent' : 'info'}>{lead.modalidade}</Badge>
          </div>

          <div className="mb-3 flex items-baseline justify-between gap-2">
            {lead.valor ? (
              <p className="text-xl font-medium text-porcelain">{formatCurrency(lead.valor)}</p>
            ) : (
              <span />
            )}
            <span className="glass-pill rounded-full px-2.5 py-1 text-[10px] text-mist">{lead.categoria}</span>
          </div>

          {(lead.comentario || lead.contato) && (
            <div className="glass-inset mb-4 space-y-2 rounded-lg p-3">
              {lead.comentario && <p className="text-xs leading-relaxed text-mist">{lead.comentario}</p>}
              {lead.contato && (
                <p className="flex items-center gap-2 text-xs text-steel">
                  <Mail className="h-3.5 w-3.5" /> {lead.contato}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEdit(lead)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/projetos?lead=${encodeURIComponent(lead.id)}`)}>
              <UserPlus className="h-3.5 w-3.5" /> Adicionar a projeto
            </Button>
            <Button size="sm" variant="ghost" onClick={() => markRead(lead)}>
              <Check className="h-3.5 w-3.5" /> {lead.lido ? 'Marcar como novo' : 'Marcar como visto'}
            </Button>
            <button
              onClick={() => remove(lead)}
              aria-label="Excluir lead"
              className="glass-pill ml-auto rounded-full p-1.5 text-steel transition-colors hover:bg-danger/15 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>
      ))}
      {!leads.items.length && <p className="text-xs text-steel">Nenhum lead cadastrado ainda.</p>}
      </div>
      <Modal open={open} onOpenChange={(nextOpen) => { if (!saving) setOpen(nextOpen) }} title={editing ? 'Editar lead' : 'Novo lead'}>
        <form className="space-y-3.5" onSubmit={async (e) => {
          e.preventDefault()
          if (!form.nome.trim() || saving) return
          setSaving(true)
          try {
            const payload = { ...form, nome: form.nome.trim(), valor: form.valor ? Number(form.valor) : null }
            if (editing) {
              await leads.update(editing.id, payload)
              log(`Lead <b>${payload.nome}</b> atualizado`)
            } else {
              await leads.add({ ...payload, lido: false, criadoEm: new Date().toISOString() })
              log(`Novo lead <b>${payload.nome}</b> cadastrado`)
            }
            setOpen(false)
          } catch { toast.error(editing ? 'Não foi possível atualizar o lead.' : 'Não foi possível cadastrar o lead.') }
          finally { setSaving(false) }
        }}>
          <label className="block text-xs text-mist">Nome<input required className="input mt-1.5" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></label>
          <label className="block text-xs text-mist">Contato (email ou telefone)<input className="input mt-1.5" value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} /></label>
          <label className="block text-xs text-mist">Tipo de projeto<input className="input mt-1.5" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} placeholder="Site, sistema…" /></label>
          <label className="block text-xs text-mist">Modalidade<select className="input mt-1.5" value={form.modalidade} onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value as Lead['modalidade'] }))}><option value="compra">Compra</option><option value="aluguel">Aluguel</option></select></label>
          <label className="block text-xs text-mist">Valor previsto<input type="number" min="0" step="0.01" className="input mt-1.5" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} /></label>
          <label className="block text-xs text-mist">Observações<textarea className="input mt-1.5" value={form.comentario} onChange={(e) => setForm((f) => ({ ...f, comentario: e.target.value }))} /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar lead'}</Button></div>
        </form>
      </Modal>
    </div>
  )
}
