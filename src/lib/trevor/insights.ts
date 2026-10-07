import type { Evento, Lancamento, Lead, Project, SyncStatus } from '../store/types'

export interface TrevorData {
  projetos: Project[]
  lancamentos: Lancamento[]
  eventos: Evento[]
  leads: Lead[]
  syncBanco?: SyncStatus
}
export interface TrevorNotice {
  id: string
  title: string
  description: string
  tone: 'warning' | 'info' | 'danger'
  path: string
}
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
function parseDate(value: string) { return new Date(value.length === 10 ? value + 'T12:00:00' : value) }

export function financialSummary(entries: Lancamento[], now = new Date()) {
  const period = dayKey(now).slice(0, 7)
  const relevant = entries.filter((entry) => !entry.oculto && dayKey(parseDate(entry.data)).slice(0, 7) === period)
  const income = relevant.filter((e) => e.tipo === 'entrada').reduce((total, e) => total + e.valor, 0)
  const expenses = relevant.filter((e) => e.tipo === 'saida').reduce((total, e) => total + e.valor, 0)
  const categories = Object.entries(relevant.filter((e) => e.tipo === 'saida').reduce<Record<string, number>>((totals, e) => {
    const category = e.categoria || 'Sem categoria'
    totals[category] = (totals[category] ?? 0) + e.valor
    return totals
  }, {})).sort((a, b) => b[1] - a[1])
  return { period, income, expenses, balance: income - expenses, categories, count: relevant.length }
}

export function projectReview(project: Project, entries: Lancamento[], now = new Date()) {
  const done = project.todos.filter((task) => task.feito).length
  const pending = project.todos.filter((task) => !task.feito)
  const linked = entries.filter((entry) => !entry.oculto && entry.projetoId === project.id)
  const income = linked.filter((entry) => entry.tipo === 'entrada').reduce((total, entry) => total + entry.valor, 0)
  const expenses = linked.filter((entry) => entry.tipo === 'saida').reduce((total, entry) => total + entry.valor, 0)
  const daysIdle = Math.max(0, Math.floor((+now - +new Date(project.atualizadoEm)) / 86400000))
  return { id: project.id, name: project.nome, status: project.status, done, total: project.todos.length, pending: pending.map((task) => task.texto), income, expenses, daysIdle, hasProductionUrl: !!project.urlProducao }
}

export function buildNotices(data: TrevorData, now = new Date()): TrevorNotice[] {
  const notices: TrevorNotice[] = []
  const summary = financialSummary(data.lancamentos, now)
  if (summary.balance < 0) notices.push({
    id: `balance:${summary.period}:${summary.balance.toFixed(2)}`,
    title: 'Saídas acima das entradas no mês', description: `O saldo dos lançamentos do mês é ${money(summary.balance)}. Entradas: ${money(summary.income)}; saídas: ${money(summary.expenses)}.`, tone: 'danger', path: '/financeiro',
  })
  for (const project of data.projetos) {
    const review = projectReview(project, data.lancamentos, now)
    if (project.status === 'em_andamento' && review.daysIdle >= 14) notices.push({ id: `idle:${project.id}:${project.atualizadoEm}`, title: `${project.nome}: revisar andamento`, description: `Sem atualização há ${review.daysIdle} dias. ${review.pending.length} tarefas pendentes. Isso indica ausência de registros, não necessariamente falta de trabalho.`, tone: 'warning', path: `/projetos/${project.id}` })
    if (project.status === 'concluido' && !project.urlProducao) notices.push({ id: `production:${project.id}`, title: `${project.nome}: produção sem URL`, description: 'O projeto foi concluído e ainda não tem URL de produção cadastrada.', tone: 'info', path: `/projetos/${project.id}` })
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  for (const event of data.eventos) {
    const date = parseDate(event.data)
    if (dayKey(date) === dayKey(today) || dayKey(date) === dayKey(tomorrow)) notices.push({ id: `event:${event.id}:${event.data}`, title: event.titulo, description: `Agendado para ${dayKey(date) === dayKey(today) ? 'hoje' : 'amanhã'} (${date.toLocaleDateString('pt-BR')}).`, tone: 'info', path: '/calendario' })
  }
  const untouched = data.leads.filter((lead) => !lead.lido && +now - +new Date(lead.criadoEm) >= 3 * 86400000)
  if (untouched.length) notices.push({ id: `leads:${untouched.map((lead) => lead.id).sort().join(',')}`, title: 'Leads aguardando revisão', description: `${untouched.length} lead(s) ainda não vistos há pelo menos 3 dias.`, tone: 'warning', path: '/leads' })
  if (data.syncBanco?.status === 'erro') notices.push({ id: `sync:${data.syncBanco.ultimaExecucao}`, title: 'Sincronização bancária com erro', description: 'O último sincronismo falhou. Os valores do dashboard podem estar desatualizados.', tone: 'danger', path: '/financeiro' })
  return notices
}

export function localAnswer(prompt: string, data: TrevorData, now = new Date()) {
  const normalized = prompt.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (/gasto|despesa|financ|saldo|receita|entrada|saida/.test(normalized)) {
    const result = financialSummary(data.lancamentos, now)
    return `Resumo financeiro de ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}:\n\nEntradas: ${money(result.income)}\nSaídas: ${money(result.expenses)}\nSaldo dos lançamentos: ${money(result.balance)}\n\n${result.count ? 'Maiores categorias de saída:\n' + result.categories.slice(0, 5).map(([category, value]) => `• ${category}: ${money(value)}`).join('\n') : 'Não há lançamentos neste mês.'}\n\n${data.syncBanco?.status === 'erro' ? 'A última sincronização bancária falhou; o resumo pode estar incompleto.' : 'O resumo considera os lançamentos visíveis do mês. Não representa o saldo disponível da conta bancária.'}`
  }
  if (/projeto|revis/.test(normalized)) {
    const matches = data.projetos.filter((project) => normalized.includes(project.nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()))
    const projects = matches.length ? matches : data.projetos
    return projects.length ? projects.map((project) => {
      const r = projectReview(project, data.lancamentos, now)
      return `${project.nome}\nStatus: ${project.status.replaceAll('_', ' ')}\nChecklist: ${r.done}/${r.total} tarefas concluídas${!r.total ? ' (sem tarefas cadastradas)' : ''}\nEntradas: ${money(r.income)}; gastos: ${money(r.expenses)}\n${r.pending.length ? 'Próximas tarefas: ' + r.pending.slice(0, 3).join('; ') : 'Nenhuma tarefa pendente cadastrada.'}\n${r.hasProductionUrl ? 'URL de produção cadastrada.' : 'Falta cadastrar a URL de produção.'}`
    }).join('\n\n') + '\n\nRevisão baseada nos registros do dashboard; não inclui inspeção do código ou do site.' : 'Nenhum projeto cadastrado para revisar.'
  }
  if (/aviso|agenda|evento|hoje|amanha|resumo/.test(normalized)) {
    const notices = buildNotices(data, now)
    return notices.length ? notices.map((notice) => `• ${notice.title}: ${notice.description}`).join('\n\n') : 'Nenhum aviso para os dados atuais.'
  }
  return 'Estou em modo local. Posso mostrar o resumo dos gastos, revisar os registros dos projetos e listar avisos. Use os atalhos para criar eventos ou tarefas. Para conversar livremente e executar outros pedidos, ative o Gemini nas configurações do Firebase.'
}
