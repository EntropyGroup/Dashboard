import { Check, Mail, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { cn, formatCurrency, initials, relativeTime, uid } from '@/lib/utils'
import type { Lead } from '@/lib/store/types'

export function LeadsPage() {
  const { leads, clientes, projetos, log } = useStore()
  const confirm = useConfirm()

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

  async function convert(lead: Lead) {
    const clienteId = uid()
    await clientes.add(
      { nome: lead.nome, email: lead.contato, projetos: [], criadoEm: new Date().toISOString() },
      clienteId,
    )
    await projetos.add({
      nome: `${lead.categoria} — ${lead.nome}`,
      tipo: lead.categoria,
      status: 'planejamento',
      clienteId,
      stack: [],
      todos: [],
      valorCobranca: lead.valor,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    })
    await leads.remove(lead.id)
    log(`Lead <b>${lead.nome}</b> convertido em cliente e projeto`)
  }

  return (
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
            <Button size="sm" variant="secondary" onClick={() => convert(lead)}>
              <UserPlus className="h-3.5 w-3.5" /> Converter
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
      {!leads.items.length && <p className="text-xs text-steel">Nenhum lead recebido ainda.</p>}
    </div>
  )
}
