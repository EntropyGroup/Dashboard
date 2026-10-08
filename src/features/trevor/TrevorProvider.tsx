import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { useStore } from '@/lib/store/StoreProvider'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { buildNotices, financialSummary, localAnswer, projectReview, type TrevorNotice } from '@/lib/trevor/insights'
import { inspectTrevorApi, requestTrevor } from '@/lib/trevor/api'
import { describeAction, executeAction, proposalId } from './actions'
import { uid } from '@/lib/utils'
import type { TrevorAction } from '../../../shared/trevor'

export interface Proposal { id: string; action: TrevorAction; state: 'pending' | 'done' | 'cancelled' }
export interface TrevorMessage { id: string; role: 'user' | 'assistant'; content: string; proposals: Proposal[]; local?: boolean }
interface TrevorValue {
  messages: TrevorMessage[]
  notices: TrevorNotice[]
  loading: boolean
  executing: boolean
  ready: boolean
  checkingConnection: boolean
  connectionError: string
  dataLoading: boolean
  shareContext: boolean
  setShareContext: (value: boolean) => void
  send: (prompt: string) => Promise<void>
  propose: (request: string, action: TrevorAction) => void
  approve: (messageId: string, proposal: Proposal) => Promise<void>
  dismiss: (id: string) => void
  clear: () => void
  reconnect: () => Promise<void>
}
const TrevorContext = createContext<TrevorValue | null>(null)
function stored<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

export function TrevorProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const { user, firebaseReady } = useAuth()
  const confirm = useConfirm()
  const key = `entropy.trevor.${user?.uid}`
  const [messages, setMessages] = useState<TrevorMessage[]>([])
  const [manualNotices, setManualNotices] = useState<TrevorNotice[]>(() => {
    const notices = stored<unknown>(key + '.notices', [])
    return Array.isArray(notices) ? notices.filter((n): n is TrevorNotice => !!n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.description === 'string' && n.path === '/trevor').slice(-100) : []
  })
  const [dismissed, setDismissed] = useState<string[]>(() => {
    const ids = stored<unknown>(key + '.dismissed', [])
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string').slice(-200) : []
  })
  const [clock, setClock] = useState(() => new Date())
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [ready, setReady] = useState(false)
  const [checkingConnection, setCheckingConnection] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [shareContext, setShareContext] = useState(false)
  const busy = useRef(false)
  const actionBusy = useRef(false)
  const currentStore = useRef(store)
  useEffect(() => { currentStore.current = store }, [store])
  const data = useMemo(() => ({ projetos: store.projetos.items, lancamentos: store.lancamentos.items, eventos: store.eventos.items, leads: store.leads.items, syncBanco: store.syncBanco }), [store.projetos.items, store.lancamentos.items, store.eventos.items, store.leads.items, store.syncBanco])
  const dataLoading = [store.projetos, store.lancamentos, store.eventos, store.leads, store.clientes, store.minhasNotas, store.quadroEquipe].some((collection) => collection.loading)
  const notices = useMemo(() => [...manualNotices, ...buildNotices(data, clock)].filter((notice) => !dismissed.includes(notice.id)), [data, clock, manualNotices, dismissed])

  useEffect(() => {
    const controller = new AbortController()
    setCheckingConnection(true)
    inspectTrevorApi(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setReady(result.ready && firebaseReady)
      setConnectionError(result.error || (!firebaseReady ? 'Entre pelo login Firebase para usar o Gemini. O modo de demonstração usa apenas análises locais.' : ''))
      setCheckingConnection(false)
    })
    const timer = setInterval(() => setClock(new Date()), 60000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [firebaseReady])

  async function reconnect() {
    if (checkingConnection) return
    setCheckingConnection(true)
    const result = await inspectTrevorApi()
    setReady(result.ready && firebaseReady)
    setConnectionError(result.error || (!firebaseReady ? 'Entre pelo login Firebase para usar o Gemini. O modo de demonstração usa apenas análises locais.' : ''))
    setCheckingConnection(false)
    if (result.ready && firebaseReady) toast.success('Conexão com o servidor do Trevor disponível.')
  }
  function dismiss(id: string) {
    const ids = [...dismissed.filter((item) => item !== id), id].slice(-200)
    try { localStorage.setItem(key + '.dismissed', JSON.stringify(ids)); setDismissed(ids) }
    catch { toast.error('Não foi possível guardar a leitura do aviso neste navegador.') }
  }
  function addNotice(title: string, description: string, id: string) {
    const updated = [...manualNotices.filter((notice) => notice.id !== id), { id, title, description, tone: 'info' as const, path: '/trevor' }].slice(-100)
    localStorage.setItem(key + '.notices', JSON.stringify(updated))
    setManualNotices(updated)
  }
  function context() {
    return {
      financeiroMes: financialSummary(data.lancamentos),
      revisoes: data.projetos.slice(0, 10).map((p) => ({ ...projectReview(p, data.lancamentos), pending: p.todos.filter((task) => !task.feito).slice(0, 5).map((task) => task.texto.slice(0, 200)) })),
      projetos: data.projetos.slice(0, 10).map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo, status: p.status, clienteId: p.clienteId, urlProducao: p.urlProducao, stack: p.stack, tarefas: p.todos.slice(0, 5).map((task) => ({ texto: task.texto.slice(0, 300), feito: task.feito })) })),
      clientes: store.clientes.items.slice(0, 40).map((client) => ({ id: client.id, nome: client.nome })),
      leads: data.leads.slice(0, 25).map((lead) => ({ id: lead.id, nome: lead.nome, categoria: lead.categoria })),
      eventos: data.eventos.filter((event) => +new Date(event.data) >= Date.now() - 7 * 86400000).slice(0, 25).map((event) => ({ id: event.id, titulo: event.titulo, data: event.data, tipo: event.tipo })),
      sincronizacao: data.syncBanco ? { status: data.syncBanco.status, ultimaExecucao: data.syncBanco.ultimaExecucao } : null,
      limites: 'Contexto limitado a 10 projetos, 40 clientes, 25 leads e 25 eventos recentes; referências fora desses limites exigem esclarecimento. Não inclui contatos, notas privadas, descrições bancárias ou código-fonte.',
    }
  }
  async function send(prompt: string) {
    const message = prompt.trim()
    if (!message || message.length > 4000 || busy.current || actionBusy.current || dataLoading) return
    busy.current = true; setLoading(true)
    const history = messages.map((turn) => ({ role: turn.role, content: turn.content }))
    setMessages((prev) => [...prev, { id: uid(), role: 'user', content: message, proposals: [] }])
    try {
      const reply = ready ? await requestTrevor(message, history, shareContext ? context() : null) : { message: localAnswer(message, data), actions: [] }
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply.message, local: !ready, proposals: reply.actions.map((action) => ({ id: proposalId(), action, state: 'pending' as const })) }])
    } catch (error) {
      const text = (error as Error).name === 'TimeoutError' ? 'O Trevor demorou demais para responder. Tente novamente.' : (error as Error).message
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: `${text}\nNenhuma alteração foi realizada.`, proposals: [] }])
      toast.error(text)
    } finally { busy.current = false; setLoading(false) }
  }
  function propose(request: string, action: TrevorAction) {
    if (busy.current || actionBusy.current || dataLoading) return
    describeAction(action, store)
    setMessages((prev) => [...prev,
      { id: uid(), role: 'user', content: request, proposals: [] },
      { id: uid(), role: 'assistant', content: 'Preparei o pedido. Confira os dados antes de executar.', local: true, proposals: [{ id: proposalId(), action, state: 'pending' }] },
    ])
  }
  function mark(messageId: string, proposalId: string, state: Proposal['state'], result?: string) {
    setMessages((prev) => prev.map((message) => message.id !== messageId ? message : { ...message, content: result ? `${message.content}\n\n${result}` : message.content, proposals: message.proposals.map((p) => p.id === proposalId ? { ...p, state } : p) }))
  }
  async function approve(messageId: string, proposal: Proposal) {
    if (proposal.state !== 'pending' || actionBusy.current || busy.current) return
    actionBusy.current = true; setExecuting(true)
    try {
      const before = describeAction(proposal.action, currentStore.current)
      const ok = await confirm({ ...before, confirmLabel: before.danger ? 'Excluir evento' : 'Executar pedido' })
      if (!ok) { mark(messageId, proposal.id, 'cancelled'); return }
      const after = describeAction(proposal.action, currentStore.current)
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Os dados mudaram durante a confirmação. Confira a proposta novamente.')
      const result = await executeAction(proposal.action, proposal.id, currentStore.current, addNotice)
      mark(messageId, proposal.id, 'done', `${result}: executado com sucesso.`)
      toast.success('Pedido executado pelo Trevor.')
    } catch (error) { toast.error((error as Error).message || 'Não foi possível executar o pedido.') }
    finally { actionBusy.current = false; setExecuting(false) }
  }
  return <TrevorContext.Provider value={{ messages, notices, loading, executing, ready, checkingConnection, connectionError, dataLoading, shareContext, setShareContext, send, propose, approve, dismiss, clear: () => { if (!busy.current && !actionBusy.current) setMessages([]) }, reconnect }}>{children}</TrevorContext.Provider>
}
export function useTrevor() {
  const value = useContext(TrevorContext)
  if (!value) throw new Error('TrevorProvider não encontrado.')
  return value
}
