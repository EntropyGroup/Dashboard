import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  MessageSquareReply,
  Pause,
  Play,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { cn, formatCurrency, relativeTime } from '@/lib/utils'
import type {
  Canal,
  HarveyConfig,
  HarveyStatus,
  OutboxItem,
  Prospect,
  ProspectEtapa,
  ProspectSegmento,
} from '@/lib/store/types'
import {
  ETAPAS,
  MOTIVOS_PERDA,
  ORDEM_FUNIL,
  SEGMENTOS,
  alcancouEtapa,
  aposEnvio,
  hojeISO,
  linkDeEnvio,
  somarDias,
} from '../../shared/vendas'

const etapaNome = Object.fromEntries(ETAPAS) as Record<string, string>
const segNome = Object.fromEntries(SEGMENTOS) as Record<string, string>
const ORIGEM: Record<string, string> = { prospeccao: 'Prospecção', indicacao: 'Indicação', conteudo: 'Conteúdo', inbound: 'Chegou sozinho' }
const TIPO_MSG: Record<string, string> = { abordagem: '1º contato', followup: 'Follow-up', encerramento: 'Encerramento', resposta: 'Resposta', proposta: 'Proposta' }
const CANAL: Record<Canal, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'E-mail' }

const ABAS = [
  ['hoje', 'Hoje'],
  ['funil', 'Funil'],
  ['prospects', 'Prospects'],
  ['harvey', 'Harvey'],
] as const
type Aba = (typeof ABAS)[number][0]

const ativo = (p: Prospect) => p.etapa !== 'fechado' && p.etapa !== 'perdido'
const dm = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '')

export const CONFIG_PADRAO: Omit<HarveyConfig, 'id'> = {
  pausado: false,
  cidades: ['São Luís, MA', 'Teresina, PI', 'Fortaleza, CE'],
  segmentos: ['varejo', 'premium', 'sistema'],
  minFunil: 10,
  prospeccaoDia: 10,
  abordagensDia: 5,
  silencioInicio: '21:00',
  silencioFim: '07:30',
  intervaloMin: 15,
}

function destinoPara(p: Prospect | undefined, canal: Canal): string | undefined {
  if (!p) return undefined
  if (canal === 'whatsapp') return p.whatsapp
  if (canal === 'instagram') return p.instagram
  return p.email
}

function canaisDisponiveis(p: Prospect | undefined): Canal[] {
  if (!p) return []
  return (['whatsapp', 'instagram', 'email'] as Canal[]).filter((c) => destinoPara(p, c))
}

// ------------------------------------------------------------------ page

export function VendasPage() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.some(([a]) => a === params.get('aba')) ? params.get('aba') : 'hoje') as Aba
  const { outbox } = useStore()
  const pendentes = outbox.items.filter((o) => o.status === 'pendente').length

  return (
    <div className="space-y-5">
      <nav className="glass-pill flex w-full gap-1 overflow-x-auto rounded-full p-1 sm:w-fit" aria-label="Seções de vendas">
        {ABAS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setParams(id === 'hoje' ? {} : { aba: id })}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              aba === id ? 'bg-porcelain text-obsidian' : 'text-mist hover:text-porcelain',
            )}
          >
            {label}
            {id === 'hoje' && pendentes > 0 && (
              <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', aba === id ? 'bg-obsidian/15' : 'bg-signal/15 text-signal')}>
                {pendentes}
              </span>
            )}
          </button>
        ))}
      </nav>
      {aba === 'hoje' && <HojeTab />}
      {aba === 'funil' && <FunilTab />}
      {aba === 'prospects' && <ProspectsTab />}
      {aba === 'harvey' && <HarveyTab />}
    </div>
  )
}

// ------------------------------------------------------------------ hoje

function Kpi({ valor, label, tom }: { valor: string | number; label: string; tom?: 'warning' | 'danger' | 'success' }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className={cn('text-xl font-medium tabular-nums text-porcelain', tom === 'warning' && 'text-warning', tom === 'danger' && 'text-danger', tom === 'success' && 'text-success')}>{valor}</p>
      <p className="text-[11px] text-steel">{label}</p>
    </div>
  )
}

function HojeTab() {
  const { prospects, outbox } = useStore()
  const [abrir, setAbrir] = useState<Prospect | null>(null)
  const hoje = hojeISO()
  const fila = outbox.items.filter((o) => o.status === 'pendente').sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  const A = prospects.items.filter(ativo)
  const esperando = A.filter((p) => ['respondeu', 'reuniao', 'proposta'].includes(p.etapa) && (!p.proximoData || p.proximoData <= hoje))
  const comFila = new Set(fila.map((o) => o.prospectId))
  const vencidos = A.filter((p) => p.etapa === 'abordado' && p.proximoData && p.proximoData <= hoje && !comFila.has(p.id))
  const parados = A.filter((p) => p.etapa !== 'mapeado' && (p.ultimoContato ?? p.criadoEm).slice(0, 10) < somarDias(hoje, -14))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi valor={fila.length} label="Mensagens para aprovar" tom={fila.length ? 'warning' : undefined} />
        <Kpi valor={esperando.length} label="Responderam, esperando vocês" tom={esperando.length ? 'danger' : undefined} />
        <Kpi valor={A.filter((p) => p.etapa === 'mapeado').length} label="Mapeados para abordar" />
        <Kpi valor={parados.length} label="Parados há 14+ dias" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fila de aprovação</CardTitle>
          <span className="text-[11px] text-steel">O Harvey prepara, vocês revisam e enviam</span>
        </CardHeader>
        {fila.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {fila.map((o) => (
              <OutboxCard key={o.id} item={o} prospect={prospects.items.find((p) => p.id === o.prospectId)} onAbrirLead={setAbrir} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-steel">Nada na fila. O Harvey coloca aqui as mensagens que preparar no próximo ciclo.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListaLeads titulo="Responderam: esperando vocês" itens={esperando} vazio="Ninguém esperando resposta." onAbrir={setAbrir} />
        <ListaLeads titulo="Follow-ups que o Harvey vai preparar" itens={vencidos} vazio="Nenhum follow-up vencido sem mensagem." onAbrir={setAbrir} />
        <ListaLeads titulo="Parados há 14+ dias" itens={parados} vazio="Nada parado." onAbrir={setAbrir} />
      </div>
      <ProspectModal prospect={abrir} onClose={() => setAbrir(null)} />
    </div>
  )
}

function ListaLeads({ titulo, itens, vazio, onAbrir }: { titulo: string; itens: Prospect[]; vazio: string; onAbrir: (p: Prospect) => void }) {
  const hoje = hojeISO()
  return (
    <Card>
      <CardHeader><CardTitle>{titulo}</CardTitle><span className="text-[11px] tabular-nums text-steel">{itens.length}</span></CardHeader>
      <div className="divide-y divide-white/[0.06]">
        {itens.map((p) => (
          <button key={p.id} onClick={() => onAbrir(p)} className="flex w-full items-start justify-between gap-3 py-2.5 text-left hover:text-porcelain">
            <span className="min-w-0">
              <span className="block truncate text-sm text-porcelain">{p.empresa}</span>
              <span className="block truncate text-[11px] text-steel">{etapaNome[p.etapa]} · {p.proximoPasso || 'sem próximo passo'}</span>
            </span>
            <span className={cn('shrink-0 text-[11px] tabular-nums', p.proximoData && p.proximoData < hoje ? 'text-danger' : 'text-steel')}>{dm(p.proximoData)}</span>
          </button>
        ))}
        {!itens.length && <p className="py-2 text-xs text-steel">{vazio}</p>}
      </div>
    </Card>
  )
}

function OutboxCard({ item, prospect, onAbrirLead }: { item: OutboxItem; prospect?: Prospect; onAbrirLead: (p: Prospect) => void }) {
  const { outbox, prospects, log } = useStore()
  const { user } = useAuth()
  const [texto, setTexto] = useState(item.texto)
  const [canal, setCanal] = useState<Canal>(item.canal)
  const [busy, setBusy] = useState(false)
  useEffect(() => setTexto(item.texto), [item.texto])
  const destino = item.canal === canal && item.destino ? item.destino : destinoPara(prospect, canal)
  const link = linkDeEnvio(canal, destino, texto)
  const canais = Array.from(new Set([item.canal, ...canaisDisponiveis(prospect)]))
  const autor = user?.displayName ?? user?.email ?? 'time'

  async function salvarTexto() {
    if (texto !== item.texto) await outbox.update(item.id, { texto })
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Mensagem copiada')
    } catch {
      toast.error('Não deu pra copiar. Selecione o texto e copie manualmente.')
    }
  }

  async function marcarEnviada() {
    if (busy) return
    setBusy(true)
    try {
      const agora = new Date().toISOString()
      await outbox.update(item.id, { status: 'enviada', texto, canal, destino, decididoEm: agora, decididoPor: autor })
      if (prospect) {
        const prox = aposEnvio(prospect, item)
        await prospects.update(prospect.id, {
          ...prox,
          atualizadoEm: agora,
          historico: [...(prospect.historico ?? []), { data: hojeISO(), canal: CANAL[canal], resumo: `${TIPO_MSG[item.tipo]} enviado`, autor }],
        })
      }
      log(`${TIPO_MSG[item.tipo]} enviado para <b>${item.empresa}</b>`)
      toast.success('Marcado como enviado. O Harvey agenda o próximo passo.')
    } finally {
      setBusy(false)
    }
  }

  async function descartar() {
    await outbox.update(item.id, { status: 'descartada', decididoEm: new Date().toISOString(), decididoPor: autor })
  }

  return (
    <div className="glass-inset flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <button className="min-w-0 text-left" onClick={() => prospect && onAbrirLead(prospect)}>
          <p className="truncate text-sm font-medium text-porcelain hover:underline">{item.empresa}</p>
          <p className="text-[11px] text-steel">{relativeTime(item.criadoEm)}{item.toque ? ` · toque ${item.toque}` : ''}</p>
        </button>
        <Badge tone={item.tipo === 'resposta' ? 'accent' : item.tipo === 'encerramento' ? 'neutral' : 'info'}>{TIPO_MSG[item.tipo]}</Badge>
      </div>
      {item.motivo && <p className="text-[11px] leading-relaxed text-steel">{item.motivo}</p>}
      <textarea
        className="input min-h-[132px] text-[13px] leading-relaxed"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvarTexto}
        aria-label={`Mensagem para ${item.empresa}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto py-1.5 text-xs" value={canal} onChange={(e) => setCanal(e.target.value as Canal)} aria-label="Canal">
          {canais.map((c) => (
            <option key={c} value={c}>{CANAL[c]}</option>
          ))}
        </select>
        <span className="truncate text-[11px] text-steel">{destino || 'sem contato nesse canal'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { if (canal === 'instagram') copiar() }}
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-porcelain px-3 text-xs font-medium text-obsidian hover:brightness-95"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir no {CANAL[canal]}
          </a>
        ) : null}
        <Button size="sm" variant="secondary" onClick={copiar}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={marcarEnviada}><Check className="h-3.5 w-3.5" /> Marquei como enviada</Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={descartar}><X className="h-3.5 w-3.5" /> Descartar</Button>
      </div>
      {canal === 'instagram' && <p className="text-[10px] text-steel">No Instagram o texto é copiado ao abrir: cole na conversa.</p>}
    </div>
  )
}

// ------------------------------------------------------------------ funil

function FunilTab() {
  const { prospects } = useStore()
  const P = prospects.items
  const chegou = (e: ProspectEtapa) => P.filter((p) => alcancouEtapa(p, e)).length
  const abordados = chegou('abordado')
  const responderam = chegou('respondeu')
  const fechados = P.filter((p) => p.etapa === 'fechado')
  const max = Math.max(1, chegou('mapeado'))
  const perdidos = P.filter((p) => p.etapa === 'perdido')
  const motivos = Object.entries(
    perdidos.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.motivoPerda || 'sem motivo']: (acc[p.motivoPerda || 'sem motivo'] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])

  const grupos = useMemo(() => {
    const g: Record<string, { n: number; abord: number; resp: number; fech: number }> = {}
    for (const p of P) {
      for (const k of [segNome[p.segmento] ?? 'Outro', ORIGEM[p.origem] ?? 'Prospecção']) {
        const x = (g[k] ??= { n: 0, abord: 0, resp: 0, fech: 0 })
        x.n++
        if (alcancouEtapa(p, 'abordado')) x.abord++
        if (alcancouEtapa(p, 'respondeu')) x.resp++
        if (p.etapa === 'fechado') x.fech++
      }
    }
    return Object.entries(g)
  }, [P])

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi valor={P.filter(ativo).length} label="Ativos" />
        <Kpi valor={pct(responderam, abordados)} label="Taxa de resposta" />
        <Kpi valor={formatCurrency(P.filter((p) => p.etapa === 'proposta').reduce((s, p) => s + (p.valor ?? 0), 0))} label="Em proposta" />
        <Kpi valor={fechados.length} label="Fechados" tom="success" />
        <Kpi valor={formatCurrency(fechados.reduce((s, p) => s + (p.valor ?? 0), 0))} label="Valor fechado" tom="success" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Quantos chegaram a cada etapa</CardTitle></CardHeader>
          <div className="space-y-2.5">
            {ORDEM_FUNIL.map((e, i) => {
              const n = chegou(e)
              const ant = i ? chegou(ORDEM_FUNIL[i - 1]) : 0
              return (
                <div key={e} className="grid grid-cols-[88px_1fr_36px_48px] items-center gap-3 text-xs">
                  <span className="text-mist">{etapaNome[e]}</span>
                  <div className="glass-inset h-5 overflow-hidden rounded-md">
                    <div className="h-full rounded-md bg-gradient-to-r from-steel/60 to-signal" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="text-right tabular-nums text-porcelain">{n}</span>
                  <span className="text-right tabular-nums text-steel">{i ? pct(n, ant) : ''}</span>
                </div>
              )
            })}
            <p className="pt-1 text-[11px] text-steel">{perdidos.length} perdido(s). À direita, a conversão em relação à etapa anterior.</p>
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Por segmento e origem</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-steel">
                <tr><th className="py-1.5 font-normal">Grupo</th><th className="text-right font-normal">Leads</th><th className="text-right font-normal">Abordados</th><th className="text-right font-normal">Responderam</th><th className="text-right font-normal">Fechados</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {grupos.map(([k, x]) => (
                  <tr key={k}><td className="py-2 text-mist">{k}</td><td className="text-right tabular-nums">{x.n}</td><td className="text-right tabular-nums">{x.abord}</td><td className="text-right tabular-nums">{x.resp} <span className="text-steel">({pct(x.resp, x.abord)})</span></td><td className="text-right tabular-nums">{x.fech}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 mb-1 text-[11px] uppercase tracking-wider text-steel">Motivos de perda</p>
          {motivos.length ? motivos.map(([m, n]) => <p key={m} className="text-xs text-mist">{n} × {m}</p>) : <p className="text-xs text-steel">Nenhuma perda registrada.</p>}
        </Card>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ prospects

function ProspectsTab() {
  const { prospects } = useStore()
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('')
  const [abrir, setAbrir] = useState<Prospect | null>(null)
  const [novo, setNovo] = useState(false)
  const hoje = hojeISO()
  const vis = prospects.items.filter(
    (p) => (!seg || p.segmento === seg) && (!q || [p.empresa, p.cidade, p.instagram, p.site, p.indicadoPor].join(' ').toLowerCase().includes(q.toLowerCase())),
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs flex-1" placeholder="Buscar empresa, cidade, @…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="input w-auto" value={seg} onChange={(e) => setSeg(e.target.value)} aria-label="Segmento">
          <option value="">Todo segmento</option>
          {SEGMENTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button size="sm" className="ml-auto" onClick={() => setNovo(true)}><Plus className="h-3.5 w-3.5" /> Novo prospect</Button>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1400px] grid-cols-7 gap-3">
          {ETAPAS.map(([e, label]) => {
            const itens = vis.filter((p) => p.etapa === e).sort((a, b) => (a.proximoData ?? '9').localeCompare(b.proximoData ?? '9'))
            return (
              <div key={e} className="glass flex min-h-[360px] flex-col rounded-xl p-2.5">
                <p className="mb-2 flex justify-between px-1 text-[11px] uppercase tracking-wider text-mist">{label}<span className="tabular-nums text-steel">{itens.length}</span></p>
                <div className="flex flex-col gap-2">
                  {itens.map((p) => (
                    <button key={p.id} onClick={() => setAbrir(p)} className="glass-inset flex flex-col gap-1.5 rounded-lg p-3 text-left hover:border-white/15">
                      <span className="text-sm text-porcelain">{p.empresa}</span>
                      <span className="text-[11px] text-steel">{[p.cidade, p.instagram ? '@' + p.instagram.replace(/^@/, '') : ''].filter(Boolean).join(' · ')}</span>
                      <span className="flex flex-wrap gap-1">
                        {p.encaixe && <Badge tone={p.encaixe === 'A' ? 'success' : p.encaixe === 'B' ? 'warning' : 'neutral'}>Encaixe {p.encaixe}</Badge>}
                        {p.criadoPor === 'harvey' && <Badge tone="accent"><Bot className="h-3 w-3" /> Harvey</Badge>}
                        {!!p.valor && <Badge>{formatCurrency(p.valor)}</Badge>}
                      </span>
                      {(p.proximoPasso || p.proximoData) && ativo(p) && (
                        <span className={cn('border-t border-white/[0.06] pt-1.5 text-[11px]', p.proximoData && p.proximoData < hoje ? 'text-danger' : p.proximoData === hoje ? 'text-warning' : 'text-mist')}>
                          {[dm(p.proximoData), p.proximoPasso].filter(Boolean).join(' — ')}
                        </span>
                      )}
                    </button>
                  ))}
                  {!itens.length && <p className="px-1 text-[11px] text-steel">Vazio.</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <ProspectModal prospect={abrir} onClose={() => setAbrir(null)} />
      <ProspectModal prospect={null} novo={novo} onClose={() => setNovo(false)} />
    </div>
  )
}

const VAZIO: Omit<Prospect, 'id' | 'criadoEm'> = { empresa: '', segmento: 'varejo', origem: 'prospeccao', etapa: 'mapeado' }

function ProspectModal({ prospect, novo, onClose }: { prospect: Prospect | null; novo?: boolean; onClose: () => void }) {
  const { prospects, clientes, log } = useStore()
  const { user } = useAuth()
  const confirm = useConfirm()
  const open = !!prospect || !!novo
  const [f, setF] = useState<Partial<Prospect>>(VAZIO)
  const [resposta, setResposta] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) { setF(prospect ? { ...prospect } : { ...VAZIO }); setResposta('') }
  }, [open, prospect])
  const set = <K extends keyof Prospect>(k: K, v: Prospect[K]) => setF((x) => ({ ...x, [k]: v }))
  const autor = user?.displayName ?? user?.email ?? 'time'

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!f.empresa?.trim() || saving) return
    setSaving(true)
    try {
      const agora = new Date().toISOString()
      const { id: _id, ...dados } = f as Prospect
      const payload: Partial<Prospect> = { ...dados, empresa: f.empresa.trim(), valor: f.valor ? Number(f.valor) : null, atualizadoEm: agora }
      if (resposta.trim()) {
        payload.respostaPendente = resposta.trim()
        payload.historico = [...(f.historico ?? []), { data: hojeISO(), resumo: `Lead respondeu: "${resposta.trim().slice(0, 140)}"`, autor }]
        payload.ultimoContato = hojeISO()
        if (payload.etapa === 'mapeado' || payload.etapa === 'abordado') payload.etapa = 'respondeu'
        payload.proximoPasso = 'responder (o Harvey prepara a resposta)'
        payload.proximoData = hojeISO()
      }
      if (prospect) {
        await prospects.update(prospect.id, payload)
        log(`Prospect <b>${payload.empresa}</b> atualizado`)
      } else {
        await prospects.add({ ...(payload as Omit<Prospect, 'id'>), criadoPor: 'time', toque: 0, criadoEm: agora })
        log(`Novo prospect <b>${payload.empresa}</b>`)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function converter() {
    if (!prospect) return
    const ok = await confirm({ title: 'Virou cliente?', description: `Cadastrar ${prospect.empresa} em Clientes e marcar como fechado.`, confirmLabel: 'Converter' })
    if (!ok) return
    const agora = new Date().toISOString()
    await clientes.add({ nome: prospect.empresa, celular: prospect.whatsapp, email: prospect.email, instagram: prospect.instagram, projetos: [], criadoEm: agora })
    await prospects.update(prospect.id, { etapa: 'fechado', atualizadoEm: agora, historico: [...(prospect.historico ?? []), { data: hojeISO(), resumo: 'Fechou: virou cliente', autor }] })
    log(`<b>${prospect.empresa}</b> virou cliente`)
    onClose()
  }

  async function excluir() {
    if (!prospect) return
    const ok = await confirm({ title: 'Excluir prospect', description: `Remover ${prospect.empresa}?`, confirmLabel: 'Excluir', danger: true })
    if (ok) { await prospects.remove(prospect.id); onClose() }
  }

  const campo = (k: keyof Prospect, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-xs text-mist">{label}
      <input className="input mt-1.5" value={(f[k] as string | number | undefined) ?? ''} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </label>
  )

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o && !saving) onClose() }} title={prospect ? prospect.empresa : 'Novo prospect'} className="max-w-2xl">
      <form className="space-y-3.5" onSubmit={salvar}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campo('empresa', 'Empresa', { required: true })}
          <label className="block text-xs text-mist">Segmento
            <select className="input mt-1.5" value={f.segmento} onChange={(e) => set('segmento', e.target.value as ProspectSegmento)}>{SEGMENTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          {campo('cidade', 'Cidade')}
          {campo('uf', 'UF', { maxLength: 2 })}
          {campo('instagram', 'Instagram', { placeholder: 'empresa (sem @)' })}
          {campo('whatsapp', 'WhatsApp comercial', { placeholder: '(98) 9…' })}
          {campo('email', 'E-mail de contato')}
          {campo('site', 'Site')}
          <label className="block text-xs text-mist">Etapa
            <select className="input mt-1.5" value={f.etapa} onChange={(e) => set('etapa', e.target.value as ProspectEtapa)}>{ETAPAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="block text-xs text-mist">Encaixe
            <select className="input mt-1.5" value={f.encaixe ?? ''} onChange={(e) => set('encaixe', (e.target.value || undefined) as Prospect['encaixe'])}><option value="">—</option><option value="A">A · prioridade</option><option value="B">B · nutrir</option><option value="C">C · não agora</option></select>
          </label>
          <label className="block text-xs text-mist">Origem
            <select className="input mt-1.5" value={f.origem} onChange={(e) => set('origem', e.target.value as Prospect['origem'])}>{Object.entries(ORIGEM).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          {campo('indicadoPor', 'Indicado por')}
          {campo('proximoPasso', 'Próximo passo')}
          {campo('proximoData', 'Data do próximo passo', { type: 'date' })}
          {campo('valor', 'Valor (R$)', { type: 'number', min: 0, step: 100 })}
          <label className="block text-xs text-mist">Motivo da perda
            <select className="input mt-1.5" value={f.motivoPerda ?? ''} onChange={(e) => set('motivoPerda', e.target.value || undefined)}><option value="">—</option>{MOTIVOS_PERDA.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
        </div>
        <label className="block text-xs text-mist">Dor (nas palavras do lead)<textarea className="input mt-1.5" value={f.dor ?? ''} onChange={(e) => set('dor', e.target.value)} /></label>
        <label className="block text-xs text-mist">Diagnóstico<textarea className="input mt-1.5" value={f.diagnostico ?? ''} onChange={(e) => set('diagnostico', e.target.value)} /></label>
        <label className="block text-xs text-mist">Notas<textarea className="input mt-1.5" value={f.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></label>
        {prospect && (
          <>
            <label className="block text-xs text-mist"><span className="flex items-center gap-1.5"><MessageSquareReply className="h-3.5 w-3.5" /> O lead respondeu? Cole a mensagem dele</span>
              <textarea className="input mt-1.5" placeholder="O Harvey prepara a resposta e coloca na fila de aprovação" value={resposta} onChange={(e) => setResposta(e.target.value)} />
            </label>
            {prospect.respostaPendente && <p className="text-[11px] text-warning">Resposta aguardando o Harvey preparar a mensagem.</p>}
            <div>
              <p className="mb-1.5 text-xs text-mist">Histórico</p>
              <div className="glass-inset max-h-44 space-y-1.5 overflow-y-auto rounded-lg p-3">
                {[...(prospect.historico ?? [])].reverse().map((h, i) => (
                  <p key={i} className="text-xs text-mist"><span className="mr-2 font-mono text-[10px] text-steel">{dm(h.data)}{h.canal ? ` · ${h.canal}` : ''}</span>{h.resumo}</p>
                ))}
                {!prospect.historico?.length && <p className="text-xs text-steel">Nenhum contato registrado.</p>}
              </div>
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {prospect && <button type="button" onClick={excluir} className="glass-pill rounded-full p-1.5 text-steel hover:text-danger" aria-label="Excluir prospect"><Trash2 className="h-3.5 w-3.5" /></button>}
          {prospect && ativo(prospect) && <Button type="button" size="sm" variant="secondary" onClick={converter}><UserPlus className="h-3.5 w-3.5" /> Virou cliente</Button>}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------------ harvey

function HarveyTab() {
  const { harvey, harveyLog, log } = useStore()
  const status = harvey.items.find((d) => d.id === 'status') as HarveyStatus | undefined
  const salvo = harvey.items.find((d) => d.id === 'config') as HarveyConfig | undefined
  const cfg: Omit<HarveyConfig, 'id'> = { ...CONFIG_PADRAO, ...(salvo ?? {}) }
  const [form, setForm] = useState({ cidades: cfg.cidades.join('\n'), minFunil: cfg.minFunil, prospeccaoDia: cfg.prospeccaoDia, abordagensDia: cfg.abordagensDia, silencioInicio: cfg.silencioInicio, silencioFim: cfg.silencioFim, segmentos: cfg.segmentos })
  useEffect(() => {
    setForm({ cidades: cfg.cidades.join('\n'), minFunil: cfg.minFunil, prospeccaoDia: cfg.prospeccaoDia, abordagensDia: cfg.abordagensDia, silencioInicio: cfg.silencioInicio, silencioFim: cfg.silencioFim, segmentos: cfg.segmentos })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvo?.atualizadoEm])

  const idadeMin = status ? (Date.now() - new Date(status.heartbeat).getTime()) / 60000 : Infinity
  const online = idadeMin < cfg.intervaloMin * 2 + 5

  async function gravar(dados: Partial<HarveyConfig>) {
    const agora = new Date().toISOString()
    if (salvo) await harvey.update('config', { ...dados, atualizadoEm: agora } as Partial<HarveyConfig>)
    else await harvey.add({ ...CONFIG_PADRAO, ...dados, atualizadoEm: agora } as Omit<HarveyConfig, 'id'>, 'config')
  }

  async function alternarPausa() {
    await gravar({ pausado: !cfg.pausado })
    log(cfg.pausado ? 'Harvey retomado' : 'Harvey pausado')
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Harvey</CardTitle>
          <Badge tone={!status ? 'neutral' : !online ? 'danger' : cfg.pausado ? 'warning' : 'success'}>
            {!status ? 'nunca rodou' : !online ? 'offline' : cfg.pausado ? 'pausado' : status.estado}
          </Badge>
        </CardHeader>
        <div className="space-y-2 text-xs text-mist">
          <p>Último sinal: <span className="text-porcelain">{status ? relativeTime(status.heartbeat) : '—'}</span></p>
          <p>Última ação: <span className="text-porcelain">{status?.ultimaAcao ?? '—'}</span></p>
          {status?.proximoCiclo && <p>Próximo ciclo: <span className="text-porcelain">{relativeTime(status.proximoCiclo)}</span></p>}
          {status?.hoje && <p>Hoje: {status.hoje.prospectados} prospectados · {status.hoje.mensagens} mensagens · {status.hoje.chamadas} chamadas ao Claude</p>}
          {status?.erro && <p className="text-danger">Erro: {status.erro}</p>}
          {!online && <p className="text-steel">O Harvey roda no PC do estúdio. Se ficou offline, confira se o PC está ligado e o serviço rodando (README, seção Harvey).</p>}
        </div>
        <Button className="mt-4 w-full" variant={cfg.pausado ? 'primary' : 'secondary'} onClick={alternarPausa}>
          {cfg.pausado ? <><Play className="h-4 w-4" /> Retomar</> : <><Pause className="h-4 w-4" /> Pausar</>}
        </Button>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Como ele trabalha</CardTitle></CardHeader>
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            await gravar({
              cidades: form.cidades.split('\n').map((c) => c.trim()).filter(Boolean),
              segmentos: form.segmentos,
              minFunil: Number(form.minFunil),
              prospeccaoDia: Number(form.prospeccaoDia),
              abordagensDia: Number(form.abordagensDia),
              silencioInicio: form.silencioInicio,
              silencioFim: form.silencioFim,
            })
            toast.success('Configuração salva. Vale a partir do próximo ciclo.')
          }}
        >
          <label className="block text-xs text-mist sm:row-span-3">Cidades para prospectar (uma por linha)
            <textarea className="input mt-1.5 min-h-[148px]" value={form.cidades} onChange={(e) => setForm((x) => ({ ...x, cidades: e.target.value }))} />
          </label>
          <fieldset className="text-xs text-mist">
            <legend className="mb-1.5">Segmentos</legend>
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTOS.filter(([v]) => v !== 'outro').map(([v, l]) => {
                const on = form.segmentos.includes(v)
                return (
                  <button type="button" key={v} onClick={() => setForm((x) => ({ ...x, segmentos: on ? x.segmentos.filter((s) => s !== v) : [...x.segmentos, v] }))}
                    className={cn('rounded-full border px-2.5 py-1 text-[11px]', on ? 'border-porcelain/40 bg-porcelain/10 text-porcelain' : 'border-white/10 text-steel')}>{l}</button>
                )
              })}
            </div>
          </fieldset>
          <label className="block text-xs text-mist">Prospectar quando o funil tiver menos de<input type="number" min={0} className="input mt-1.5" value={form.minFunil} onChange={(e) => setForm((x) => ({ ...x, minFunil: Number(e.target.value) }))} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-mist">Prospects por dia<input type="number" min={0} max={30} className="input mt-1.5" value={form.prospeccaoDia} onChange={(e) => setForm((x) => ({ ...x, prospeccaoDia: Number(e.target.value) }))} /></label>
            <label className="block text-xs text-mist">1º contatos por dia<input type="number" min={0} max={20} className="input mt-1.5" value={form.abordagensDia} onChange={(e) => setForm((x) => ({ ...x, abordagensDia: Number(e.target.value) }))} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-mist">Silêncio a partir de<input type="time" className="input mt-1.5" value={form.silencioInicio} onChange={(e) => setForm((x) => ({ ...x, silencioInicio: e.target.value }))} /></label>
            <label className="block text-xs text-mist">até<input type="time" className="input mt-1.5" value={form.silencioFim} onChange={(e) => setForm((x) => ({ ...x, silencioFim: e.target.value }))} /></label>
          </div>
          <div className="flex items-end justify-end sm:col-span-2"><Button type="submit" size="sm">Salvar configuração</Button></div>
        </form>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>O que ele fez</CardTitle><span className="text-[11px] text-steel">últimos 60 registros</span></CardHeader>
        <div className="divide-y divide-white/[0.06]">
          {harveyLog.items.slice(0, 60).map((l) => (
            <div key={l.id} className="flex gap-3 py-2 text-xs">
              <span className="w-24 shrink-0 text-steel">{relativeTime(l.criadoEm)}</span>
              <Badge tone={l.tipo === 'erro' ? 'danger' : l.tipo === 'prospeccao' ? 'info' : l.tipo === 'mensagem' ? 'accent' : 'neutral'} className="shrink-0">{l.tipo}</Badge>
              <span className="min-w-0 text-mist">{l.texto}</span>
            </div>
          ))}
          {!harveyLog.items.length && <p className="py-2 text-xs text-steel">Nada ainda. Assim que o Harvey rodar no PC, cada ação aparece aqui.</p>}
        </div>
      </Card>
    </div>
  )
}
