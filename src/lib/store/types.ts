export type ProjectStatus = 'planejamento' | 'em_andamento' | 'pausado' | 'concluido'

export interface TodoItem {
  id: string
  texto: string
  feito: boolean
  ordem: number
}

export interface Project {
  id: string
  nome: string
  tipo: string
  status: ProjectStatus
  clienteId?: string
  responsavelId?: string
  descricao?: string
  stack: string[]
  todos: TodoItem[]
  valorCobranca?: number
  link?: string
  urlProducao?: string
  criadoEm: string
  atualizadoEm: string
}

export interface PersonalProject {
  id: string
  ownerUid: string
  nome: string
  tipo: string
  status: ProjectStatus
  descricao?: string
  stack: string[]
  todos: TodoItem[]
  link?: string
  criadoEm: string
  atualizadoEm: string
}

export interface Client {
  id: string
  nome: string
  celular?: string
  email?: string
  instagram?: string
  nascimento?: string
  projetos: string[]
  criadoEm: string
}

export type LancamentoTipo = 'entrada' | 'saida'
export type LancamentoOrigem = 'manual' | 'banco'

export interface Lancamento {
  id: string
  tipo: LancamentoTipo
  origem: LancamentoOrigem
  descricao: string
  categoria: string
  valor: number
  data: string
  projetoId?: string
  criadoEm: string
  /** Bank entries can't be deleted (the next sync would bring them back), only hidden. */
  oculto?: boolean
  banco?: {
    provedor: 'pluggy'
    transacaoId: string
    contaId: string
    contaNome: string
    contaTipo: 'BANK' | 'CREDIT'
    status?: string
    parcela?: string
  }
}

export interface SyncStatus {
  id: string
  ultimaExecucao: string
  status: 'ok' | 'erro'
  novos: number
  atualizados: number
  removidos: number
  contas: string[]
  mensagem?: string
}

export type EventoTipo = 'reuniao' | 'entrega' | 'financeiro' | 'pessoal' | 'outro'

export interface Evento {
  id: string
  titulo: string
  tipo: EventoTipo
  data: string
  descricao?: string
  criadoEm: string
}

export interface Atividade {
  id: string
  texto: string
  autorUid?: string
  autorNome?: string
  criadoEm: string
}

export type LeadModalidade = 'aluguel' | 'compra'

export interface Lead {
  id: string
  nome: string
  contato?: string
  modalidade: LeadModalidade
  categoria: string
  valor?: number | null
  comentario?: string
  lido: boolean
  criadoEm: string
}

export interface NotaTodo {
  id: string
  texto: string
  feito: boolean
  ordem: number
}

export interface Board {
  trevorActionIds?: string[]
  id: string
  markdown: string
  todos: NotaTodo[]
  atualizadoEm: string
}

export interface TeamMember {
  id: string
  nome: string
  cargo: string
  stack: string[]
  fotoUrl?: string
}
