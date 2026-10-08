import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Bot, CalendarPlus, Check, ListPlus, LoaderCircle, RefreshCw, Send, Sparkles, Wallet, X } from 'lucide-react'
import { useTrevor, type Proposal } from '@/features/trevor/TrevorProvider'
import { describeAction } from '@/features/trevor/actions'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, localDateKey } from '@/lib/utils'

function ProposalCard({ proposal, messageId }: { proposal: Proposal; messageId: string }) {
  const trevor = useTrevor()
  const store = useStore()
  let title = 'Pedido preparado'
  let description = ''
  let error = ''
  if (proposal.state === 'pending') {
    try { const summary = describeAction(proposal.action, store); title = summary.title; description = summary.description }
    catch (err) { error = (err as Error).message }
  }
  return <div className="glass-inset mt-3 rounded-xl p-3">
    {proposal.state === 'pending' ? <>
      <p className="text-xs font-medium text-porcelain">{title}</p>
      <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-mist">{error || description}</p>
      <Button size="sm" variant={proposal.action.type === 'delete_event' ? 'danger' : 'secondary'} className="mt-3" disabled={trevor.executing || trevor.loading || !!error || trevor.dataLoading} onClick={() => trevor.approve(messageId, proposal)}>Conferir e executar</Button>
    </> : <p className={cn('flex items-center gap-2 text-xs', proposal.state === 'done' ? 'text-success' : 'text-steel')}>
      {proposal.state === 'done' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{proposal.state === 'done' ? 'Pedido executado' : 'Pedido cancelado'}
    </p>}
  </div>
}

function QuickRequest() {
  const { propose, loading, executing, dataLoading } = useTrevor()
  const { projetos } = useStore()
  const [mode, setMode] = useState<'event' | 'task' | 'notice' | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localDateKey(new Date()))
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  function open(next: typeof mode) { setTitle(''); setDescription(''); setDate(localDateKey(new Date())); setProjectId(''); setMode(next) }
  return <>
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => open('event')} disabled={loading || executing || dataLoading}><CalendarPlus className="h-3.5 w-3.5" /> Criar evento</Button>
      <Button variant="secondary" size="sm" onClick={() => open('task')} disabled={loading || executing || dataLoading}><ListPlus className="h-3.5 w-3.5" /> Adicionar tarefa</Button>
      <Button variant="secondary" size="sm" onClick={() => open('notice')} disabled={loading || executing || dataLoading}><Bell className="h-3.5 w-3.5" /> Criar aviso</Button>
    </div>
    <Modal open={mode !== null} onOpenChange={(open) => !open && setMode(null)} title={mode === 'event' ? 'Trevor · Criar evento' : mode === 'task' ? 'Trevor · Adicionar tarefa' : 'Trevor · Criar aviso'}>
      <form className="space-y-3.5" onSubmit={(e) => {
        e.preventDefault()
        const fields = new FormData(e.currentTarget)
        const name = String(fields.get('title') ?? '').trim()
        if (!name) return
        if (mode === 'event') propose(`Criar evento: ${name}`, { type: 'create_event', title: name, date: String(fields.get('date')), eventType: 'reuniao', description })
        if (mode === 'task') propose(`Adicionar tarefa: ${name}`, { type: 'add_project_task', projectId, text: name })
        if (mode === 'notice') propose(`Criar aviso: ${name}`, { type: 'create_notice', title: name, description })
        setMode(null)
      }}>
        <label className="block text-xs text-mist">{mode === 'task' ? 'Tarefa' : 'Título'}<input name="title" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1.5" /></label>
        {mode === 'event' && <label className="block text-xs text-mist">Data<input name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1.5" /></label>}
        {mode === 'task' && <label className="block text-xs text-mist">Projeto<select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input mt-1.5"><option value="">Selecione um projeto</option>{projetos.items.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>}
        {mode !== 'task' && <label className="block text-xs text-mist">Descrição<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className="input mt-1.5" rows={3} /></label>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setMode(null)}>Cancelar</Button><Button type="submit">Preparar pedido</Button></div>
      </form>
    </Modal>
  </>
}

export function TrevorPage() {
  const trevor = useTrevor()
  const [prompt, setPrompt] = useState('')
  const transcript = useRef<HTMLDivElement>(null)
  useEffect(() => { const node = transcript.current; if (node) node.scrollTop = node.scrollHeight }, [trevor.messages, trevor.loading])
  const disabled = trevor.loading || trevor.executing || trevor.dataLoading
  return <div className="space-y-4">
    <Card className="glass-sheen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-heavy flex h-12 w-12 items-center justify-center rounded-2xl"><Bot className="h-6 w-6 text-signal" /></div>
          <div><h2 className="text-lg font-medium text-porcelain">Trevor</h2><p className="mt-1 text-xs text-steel">Seu assistente para projetos, finanças e agenda.</p></div>
        </div>
        <div className="flex items-center gap-2"><span className="glass-pill rounded-full px-3 py-1 text-[11px] text-mist">{trevor.ready ? 'Gemini disponível' : 'Modo local'}</span><Button size="sm" variant="secondary" disabled={trevor.checkingConnection} onClick={trevor.reconnect}><RefreshCw className={cn("h-3.5 w-3.5", trevor.checkingConnection && "animate-spin")} />{trevor.checkingConnection ? 'Verificando…' : 'Verificar conexão'}</Button></div>
      </div>
      {trevor.connectionError && <p role="status" className="mt-4 text-xs leading-relaxed text-warning">{trevor.connectionError}</p>}
      {!trevor.ready && !trevor.connectionError && <p className="mt-4 text-xs leading-relaxed text-steel">Resumos e avisos funcionam com seus dados locais. Para conversar livremente, configure a chave do Gemini no servidor e entre com sua conta Firebase.</p>}
    </Card>
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <Card className="flex min-w-0 flex-col lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-medium text-porcelain"><Sparkles className="h-4 w-4 text-signal" /> Conversa</h3>{trevor.messages.length > 0 && <button onClick={trevor.clear} disabled={disabled} className="text-xs text-steel hover:text-porcelain disabled:opacity-50">Limpar conversa</button>}</div>
        <div ref={transcript} role="log" aria-label="Conversa com Trevor" aria-live="polite" className="min-h-64 max-h-[52dvh] space-y-4 overflow-y-auto overscroll-contain pr-1">
          {!trevor.messages.length && <div className="py-6"><p className="text-sm text-mist">O que vamos resolver hoje?</p><p className="mt-2 text-xs leading-relaxed text-steel">Peça uma análise dos gastos, uma revisão de projeto ou ajuda com a agenda. As alterações aparecem como propostas para você conferir.</p><div className="mt-5 flex flex-wrap gap-2">{['Analise os gastos deste mês', 'Revise meus projetos', 'Quais são os avisos de hoje?'].map((suggestion) => <Button key={suggestion} size="sm" variant="secondary" disabled={disabled} className="max-w-full whitespace-normal text-left" onClick={() => trevor.send(suggestion)}>{suggestion}</Button>)}</div></div>}
          {trevor.messages.map((message) => <div key={message.id} className={cn('rounded-xl p-3.5', message.role === 'user' ? 'ml-4 bg-white/[0.06] sm:ml-12' : 'mr-2 glass-inset sm:mr-6')}><p className="mb-2 text-[10px] font-medium tracking-wider text-steel uppercase">{message.role === 'user' ? 'Você' : message.local ? 'Trevor · local' : 'Trevor'}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-mist">{message.content}</p>{message.proposals.map((proposal) => <ProposalCard key={proposal.id} messageId={message.id} proposal={proposal} />)}</div>)}
          {trevor.loading && <p role="status" className="flex items-center gap-2 text-xs text-steel"><LoaderCircle className="h-4 w-4 animate-spin" /> Trevor está analisando…</p>}
          {trevor.dataLoading && <p role="status" className="text-xs text-steel">Carregando os dados do dashboard…</p>}
        </div>
        <form className="mt-4 border-t border-white/[0.08] pt-4" onSubmit={(e) => { e.preventDefault(); if (!prompt.trim()) return; trevor.send(prompt); setPrompt('') }}>
          {trevor.ready && <label className="mb-3 flex items-start gap-2 text-xs text-steel"><input type="checkbox" checked={trevor.shareContext} onChange={(e) => trevor.setShareContext(e.target.checked)} className="mt-0.5 accent-white" />Compartilhar contexto com Gemini (projetos, agenda e totais financeiros; sem contatos e notas privadas).</label>}
          <label htmlFor="trevor-prompt" className="sr-only">Pedido para Trevor</label>
          <div className="flex items-end gap-2"><textarea id="trevor-prompt" value={prompt} maxLength={4000} rows={2} onChange={(e) => setPrompt(e.target.value)} placeholder={trevor.ready ? 'Peça ao Trevor…' : 'Peça um resumo dos gastos ou projetos…'} className="input min-w-0 resize-none" /><Button type="submit" size="icon" aria-label="Enviar pedido ao Trevor" disabled={disabled || !prompt.trim()}><Send className="h-4 w-4" /></Button></div>
          <p className="mt-2 text-[10px] leading-relaxed text-steel">A conversa permanece enquanto você navega nesta sessão. O Trevor pede confirmação antes de alterar dados.</p>
        </form>
      </Card>
      <div className="space-y-4">
        <Card><h3 className="mb-3 text-sm font-medium text-porcelain">Pedidos rápidos</h3><QuickRequest /><p className="mt-3 text-[11px] leading-relaxed text-steel">Disponíveis também no modo local.</p></Card>
        <Card><h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-porcelain"><Bell className="h-4 w-4" /> Avisos <span className="ml-auto text-xs text-steel">{trevor.notices.length}</span></h3>
          <div className="max-h-[50dvh] space-y-3 overflow-y-auto">{trevor.notices.map((notice) => <div key={notice.id} className="glass-inset rounded-lg p-3"><div className="flex items-start gap-2"><Link to={notice.path} className={cn('flex-1 text-xs font-medium hover:underline', notice.tone === 'danger' ? 'text-danger' : notice.tone === 'warning' ? 'text-warning' : 'text-porcelain')}>{notice.title}</Link><button aria-label={`Marcar aviso como lido: ${notice.title}`} onClick={() => trevor.dismiss(notice.id)} className="shrink-0 rounded p-1 text-steel hover:text-porcelain"><Check className="h-3.5 w-3.5" /></button></div><p className="mt-2 break-words text-xs leading-relaxed text-steel">{notice.description}</p></div>)}{!trevor.notices.length && <p className="text-xs text-steel">Tudo em dia por aqui. Nenhum aviso pendente.</p>}</div>
        </Card>
        <Button className="w-full" variant="secondary" size="sm" onClick={() => trevor.send('Analise os gastos deste mês')} disabled={disabled}><Wallet className="h-3.5 w-3.5" /> Resumo financeiro</Button>
      </div>
    </div>
  </div>
}
