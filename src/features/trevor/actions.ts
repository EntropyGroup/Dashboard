import type { TrevorAction } from '../../../shared/trevor'
import { parseTrevorReply } from '../../../shared/trevor'
import type { useStore } from '@/lib/store/StoreProvider'
import { saveProjectWithLead } from '@/lib/store/useCollection'
import { formatCurrency, uid } from '@/lib/utils'

type Store = ReturnType<typeof useStore>
export function describeAction(action: TrevorAction, store: Store) {
  parseTrevorReply({ message: 'Proposta', actions: [action] })
  function project(id: string) {
    const found = store.projetos.items.find((item) => item.id === id)
    if (!found) throw new Error('O projeto não existe mais. Peça uma nova proposta.')
    return found
  }
  switch (action.type) {
    case 'create_event': return { title: 'Criar evento', description: `${action.title}\nData: ${action.date.split('-').reverse().join('/')}\nTipo: ${action.eventType}\n${action.description}` }
    case 'delete_event': {
      const event = store.eventos.items.find((item) => item.id === action.eventId)
      if (!event) throw new Error('O evento não existe mais.')
      return { title: 'Excluir evento', description: `Excluir "${event.titulo}" do calendário?`, danger: true }
    }
    case 'set_project_status': return { title: 'Alterar status', description: `${project(action.projectId).nome}: ${action.status.replaceAll('_', ' ')}` }
    case 'add_project_task': return { title: 'Adicionar tarefa', description: `${project(action.projectId).nome}\n${action.text}` }
    case 'set_production_url': return { title: 'Alterar URL de produção', description: `${project(action.projectId).nome}\n${action.url || 'Remover URL'}` }
    case 'create_lead': return { title: 'Cadastrar lead', description: `${action.name}\nContato: ${action.contact || 'Não informado'}\nTipo: ${action.category}\n${action.comment}` }
    case 'create_client': return { title: 'Cadastrar cliente', description: `${action.name}\n${action.email}\n${action.phone}` }
    case 'create_project': {
      const client = store.clientes.items.find((item) => item.id === action.clientId)
      const lead = store.leads.items.find((item) => item.id === action.leadId)
      if (action.clientId && !client || action.leadId && !lead) throw new Error('O cliente ou lead não existe mais.')
      return { title: 'Criar projeto', description: `${action.name}\nTipo: ${action.category}\n${lead ? `Converter o lead ${lead.nome} em cliente e vinculá-lo a este projeto.` : `Cliente: ${client?.nome ?? 'Sem vínculo'}`}\nProdução: ${action.productionUrl || 'Não informada'}` }
    }
    case 'create_transaction': {
      if (!action.description.trim() || !action.category.trim()) throw new Error('Informe descrição e categoria do lançamento.')
      if (action.projectId) project(action.projectId)
      return { title: 'Registrar lançamento manual', description: `${action.kind === 'entrada' ? 'Entrada' : 'Saída'}: ${formatCurrency(action.amount)}\n${action.description}\nCategoria: ${action.category}\nData: ${action.date.split('-').reverse().join('/')}\nProjeto: ${action.projectId ? project(action.projectId).nome : 'Sem vínculo'}` }
    }
    case 'append_note': return { title: 'Adicionar nota', description: `${action.scope === 'team' ? 'Quadro da equipe (visível para a equipe)' : 'Minhas notas'}\n${action.text}` }
    case 'create_notice': return { title: 'Criar aviso interno', description: `${action.title}\n${action.description}\nO aviso ficará neste navegador para a sua conta.` }
  }
}

/** The model cannot execute writes; the UI calls this only after approval. */
export async function executeAction(action: TrevorAction, actionId: string, store: Store, addNotice: (title: string, description: string, id: string) => void) {
  const summary = describeAction(action, store) // Recheck referenced records immediately before the write.
  const now = new Date().toISOString()
  switch (action.type) {
    case 'create_event': await store.eventos.add({ titulo: action.title, tipo: action.eventType, data: new Date(action.date + 'T12:00:00').toISOString(), descricao: action.description, criadoEm: now }, actionId); break
    case 'delete_event': await store.eventos.remove(action.eventId); break
    case 'set_project_status': await store.projetos.update(action.projectId, { status: action.status, atualizadoEm: now }); break
    case 'add_project_task': {
      const project = store.projetos.items.find((item) => item.id === action.projectId)!
      if (!project.todos.some((task) => task.id === actionId)) await store.projetos.update(project.id, { todos: [...project.todos, { id: actionId, texto: action.text, feito: false, ordem: Math.max(-1, ...project.todos.map((task) => task.ordem)) + 1 }], atualizadoEm: now })
      break
    }
    case 'set_production_url': await store.projetos.update(action.projectId, { urlProducao: action.url, atualizadoEm: now }); break
    case 'create_lead': await store.leads.add({ nome: action.name, contato: action.contact, categoria: action.category, comentario: action.comment, modalidade: 'compra', lido: false, criadoEm: now }, actionId); break
    case 'create_client': await store.clientes.add({ nome: action.name, email: action.email, celular: action.phone, projetos: [], criadoEm: now }, actionId); break
    case 'create_project': {
      const payload = { nome: action.name, tipo: action.category, status: 'planejamento' as const, clienteId: action.clientId, urlProducao: action.productionUrl, stack: [], todos: [], criadoEm: now, atualizadoEm: now }
      if (action.leadId) await saveProjectWithLead(action.leadId, actionId, payload, false)
      else await store.projetos.add(payload, actionId)
      break
    }
    case 'create_transaction': await store.lancamentos.add({ tipo: action.kind, origem: 'manual', descricao: action.description, categoria: action.category, valor: action.amount, data: new Date(action.date + 'T12:00:00').toISOString(), projetoId: action.projectId, criadoEm: now }, actionId); break
    case 'append_note': {
      const collection = action.scope === 'team' ? store.quadroEquipe : store.minhasNotas
      const boardId = action.scope === 'team' ? 'dashboard' : collection.items[0]?.id ?? 'me'
      const board = collection.items.find((item) => item.id === boardId)
      const trevorActionIds = board?.trevorActionIds ?? []
      if (trevorActionIds.includes(actionId)) break
      const data = { markdown: [board?.markdown, action.text].filter(Boolean).join('\n\n'), atualizadoEm: now, trevorActionIds: [...trevorActionIds.slice(-99), actionId] }
      if (board) await collection.update(boardId, data)
      else await collection.add({ ...data, todos: [] }, boardId)
      break
    }
    case 'create_notice': addNotice(action.title, action.description, actionId); break
  }
  // Escape user/model text before it reaches the existing HTML activity renderer.
  const safeTitle = summary.title.replace(/[<>&]/g, '')
  store.log(`Trevor: ${safeTitle} confirmado pelo usuário`)
  return summary.title
}
export const proposalId = () => `trevor-${uid()}`
