import { uid } from '@/lib/utils'
import type {
  Atividade,
  Client,
  Evento,
  Lancamento,
  Lead,
  Project,
} from './types'

const now = new Date()
const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000)

function keyBy<T extends { id: string }>(list: T[]) {
  return Object.fromEntries(list.map((item) => [item.id, item]))
}

const clientId1 = uid()
const clientId2 = uid()
const projectId1 = uid()
const projectId2 = uid()

export const seedClients: Client[] = [
  {
    id: clientId1,
    nome: 'Aurora Studio',
    celular: '(11) 98888-0001',
    email: 'contato@aurorastudio.com',
    instagram: 'aurorastudio',
    nascimento: iso(new Date(1990, 3, 12)),
    projetos: [projectId1],
    criadoEm: iso(daysAgo(120)),
  },
  {
    id: clientId2,
    nome: 'Vetor Logística',
    celular: '(11) 97777-0002',
    email: 'ops@vetorlog.com',
    projetos: [projectId2],
    criadoEm: iso(daysAgo(60)),
  },
]

export const seedProjects: Project[] = [
  {
    id: projectId1,
    nome: 'Site institucional Aurora',
    tipo: 'Site',
    status: 'em_andamento',
    clienteId: clientId1,
    descricao: 'Redesign completo do site institucional com CMS próprio.',
    stack: ['React', 'Tailwind', 'Sanity'],
    todos: [
      { id: uid(), texto: 'Wireframes aprovados', feito: true, ordem: 0 },
      { id: uid(), texto: 'Home + páginas internas', feito: true, ordem: 1 },
      { id: uid(), texto: 'Integração CMS', feito: false, ordem: 2 },
      { id: uid(), texto: 'QA e deploy', feito: false, ordem: 3 },
    ],
    valorCobranca: 18000,
    criadoEm: iso(daysAgo(45)),
    atualizadoEm: iso(daysAgo(2)),
  },
  {
    id: projectId2,
    nome: 'Sistema de rotas Vetor',
    tipo: 'Sistema sob medida',
    status: 'planejamento',
    clienteId: clientId2,
    descricao: 'Painel de otimização de rotas com visualização em mapa.',
    stack: ['TypeScript', 'Node', 'Postgres'],
    todos: [
      { id: uid(), texto: 'Levantamento de requisitos', feito: true, ordem: 0 },
      { id: uid(), texto: 'Modelagem de dados', feito: false, ordem: 1 },
    ],
    valorCobranca: 42000,
    criadoEm: iso(daysAgo(10)),
    atualizadoEm: iso(daysAgo(1)),
  },
]

export const seedLancamentos: Lancamento[] = [
  {
    id: uid(),
    tipo: 'entrada',
    origem: 'manual',
    descricao: 'Parcela 1/3 — Site Aurora',
    categoria: 'Projeto',
    valor: 6000,
    data: iso(daysAgo(15)),
    projetoId: projectId1,
    criadoEm: iso(daysAgo(15)),
  },
  {
    id: uid(),
    tipo: 'saida',
    origem: 'manual',
    descricao: 'Assinatura de infraestrutura',
    categoria: 'Operacional',
    valor: 480,
    data: iso(daysAgo(5)),
    criadoEm: iso(daysAgo(5)),
  },
]

export const seedEventos: Evento[] = [
  {
    id: uid(),
    titulo: 'Reunião de alinhamento — Aurora',
    tipo: 'reuniao',
    data: iso(daysFromNow(2)),
    criadoEm: iso(daysAgo(3)),
  },
  {
    id: uid(),
    titulo: 'Entrega do MVP — Vetor',
    tipo: 'entrega',
    data: iso(daysFromNow(9)),
    criadoEm: iso(daysAgo(3)),
  },
]

export const seedAtividades: Atividade[] = [
  {
    id: uid(),
    texto: 'Projeto <b>Site institucional Aurora</b> atualizado',
    criadoEm: iso(daysAgo(2)),
  },
  {
    id: uid(),
    texto: 'Novo lançamento financeiro registrado',
    criadoEm: iso(daysAgo(5)),
  },
]

export const seedLeads: Lead[] = [
  {
    id: uid(),
    nome: 'Marcela Prado',
    contato: 'marcela@exemplo.com',
    modalidade: 'compra',
    categoria: 'E-commerce',
    valor: 12000,
    comentario: 'Precisa de loja com integração a marketplace.',
    lido: false,
    criadoEm: iso(daysAgo(1)),
  },
]

export const seededCollections = {
  clientes: keyBy(seedClients),
  projetos: keyBy(seedProjects),
  lancamentos: keyBy(seedLancamentos),
  eventos: keyBy(seedEventos),
  atividades: keyBy(seedAtividades),
  leads: keyBy(seedLeads),
}
