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

// ---------- Vendas (Harvey) ----------

export type ProspectEtapa = 'mapeado' | 'abordado' | 'respondeu' | 'reuniao' | 'proposta' | 'fechado' | 'perdido'
export type ProspectSegmento = 'sistema' | 'varejo' | 'premium' | 'outro'
export type ProspectOrigem = 'prospeccao' | 'indicacao' | 'conteudo' | 'inbound'
export type Canal = 'whatsapp' | 'instagram' | 'email'

export interface HistoricoItem {
  data: string
  canal?: string
  resumo: string
  autor?: string
}

export interface Prospect {
  id: string
  empresa: string
  segmento: ProspectSegmento
  cidade?: string
  uf?: string
  origem: ProspectOrigem
  indicadoPor?: string
  instagram?: string
  site?: string
  whatsapp?: string
  email?: string
  contato?: string
  canalPreferido?: Canal
  etapa: ProspectEtapa
  encaixe?: 'A' | 'B' | 'C'
  /** last cadence touch already sent (0 = none) */
  toque?: number
  ultimoContato?: string
  proximoPasso?: string
  proximoData?: string
  valor?: number | null
  dor?: string
  decisor?: string
  orcamento?: string
  prazo?: string
  diagnostico?: string
  /** reply the team pasted; Harvey drafts an answer and clears it */
  respostaPendente?: string
  motivoPerda?: string
  notas?: string
  historico?: HistoricoItem[]
  criadoPor?: 'harvey' | 'time'
  criadoEm: string
  atualizadoEm?: string
}

export type OutboxTipo = 'abordagem' | 'followup' | 'encerramento' | 'resposta' | 'proposta'
export type OutboxStatus = 'pendente' | 'enviada' | 'descartada'

export interface OutboxItem {
  id: string
  prospectId: string
  empresa: string
  tipo: OutboxTipo
  canal: Canal
  destino?: string
  toque?: number
  texto: string
  /** why Harvey wrote this now, in one line */
  motivo?: string
  status: OutboxStatus
  criadoEm: string
  decididoEm?: string
  decididoPor?: string
}

export interface HarveyConfig {
  id: string
  pausado: boolean
  cidades: string[]
  segmentos: ProspectSegmento[]
  minFunil: number
  prospeccaoDia: number
  abordagensDia: number
  silencioInicio: string
  silencioFim: string
  intervaloMin: number
  atualizadoEm?: string
}

export interface HarveyStatus {
  id: string
  heartbeat: string
  estado: 'trabalhando' | 'dormindo' | 'pausado' | 'silencio' | 'erro'
  ultimaAcao?: string
  proximoCiclo?: string
  hoje?: { data: string; chamadas: number; prospectados: number; mensagens: number }
  erro?: string
  versao?: string
}

export interface HarveyLog {
  id: string
  criadoEm: string
  tipo: 'prospeccao' | 'mensagem' | 'diagnostico' | 'analise' | 'sistema' | 'erro'
  texto: string
}

// ---------- Instagram (analista) ----------

export interface IgPost {
  id: string
  data: string
  tipo?: string
  url?: string
  imagem?: string
  texto?: string
  pilar?: string
  gancho?: string
  alcance?: number
  curtidas?: number
  comentarios?: number
  salvos?: number
  compart?: number
  views?: number
  follows?: number
  nota?: number
  leitura?: string
  atualizadoEm?: string
}

export interface IgPerfilItem {
  area: string
  nota: number
  achado: string
  acao: string
}

export interface IgPerfil {
  id: string
  data: string
  seguidores?: number
  posts30d?: number
  notaGeral: number
  itens: IgPerfilItem[]
}

export interface IgReferencia {
  id: string
  handle: string
  nome?: string
  tipo: 'concorrente' | 'referencia-formato' | 'cliente-ideal'
  seguidores?: string
  porque?: string
  ultimaLeitura?: string
}

export type TendenciaStatus = 'ideia' | 'na-pauta' | 'feito' | 'descartada'

export interface IgTendencia {
  id: string
  titulo: string
  formato?: string
  gancho?: string
  exemplo?: string
  fonte?: string
  porqueFunciona?: string
  comoAdaptar?: string
  status: TendenciaStatus
  criadoEm: string
}
