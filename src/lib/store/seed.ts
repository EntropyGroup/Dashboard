import { uid } from '@/lib/utils'
import type {
  Atividade,
  Client,
  Evento,
  Lancamento,
  Lead,
  Project,
  Prospect,
  OutboxItem,
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
  {
    id: 'pluggy_demo_1',
    tipo: 'saida',
    origem: 'banco',
    descricao: 'Figma',
    categoria: 'Serviços digitais',
    valor: 89.9,
    data: iso(daysAgo(2)),
    criadoEm: iso(daysAgo(2)),
    banco: { provedor: 'pluggy', transacaoId: 'demo-1', contaId: 'demo-card', contaNome: 'Nubank Ultravioleta', contaTipo: 'CREDIT', status: 'POSTED' },
  },
  {
    id: 'pluggy_demo_2',
    tipo: 'saida',
    origem: 'banco',
    descricao: 'MacBook Air',
    categoria: 'Compras',
    valor: 812.5,
    data: iso(daysAgo(3)),
    criadoEm: iso(daysAgo(3)),
    banco: { provedor: 'pluggy', transacaoId: 'demo-2', contaId: 'demo-card', contaNome: 'Nubank Ultravioleta', contaTipo: 'CREDIT', status: 'POSTED', parcela: '3/12' },
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


// ---------- Vendas (modo demonstração: empresas fictícias) ----------

const dia = (n: number) => iso(daysFromNow(n)).slice(0, 10)

export const seedProspects: Prospect[] = [
  { id: 'demo-p1', empresa: 'Loja Exemplo Moda', segmento: 'varejo', cidade: 'São Luís', uf: 'MA', origem: 'prospeccao', instagram: 'lojaexemplo', whatsapp: '98900000000', etapa: 'mapeado', encaixe: 'A', toque: 0, diagnostico: 'Vende pelo direct; link da bio genérico; sem catálogo com preço.', criadoPor: 'harvey', proximoPasso: 'preparar 1º contato', proximoData: dia(0), criadoEm: iso(daysAgo(1)) },
  { id: 'demo-p2', empresa: 'Clínica Exemplo', segmento: 'premium', cidade: 'Teresina', uf: 'PI', origem: 'prospeccao', instagram: 'clinicaexemplo', etapa: 'abordado', encaixe: 'B', toque: 1, ultimoContato: dia(-3), proximoPasso: 'follow-up 1 (print ou sugestão aplicada)', proximoData: dia(0), criadoPor: 'harvey', criadoEm: iso(daysAgo(5)), historico: [{ data: dia(-3), canal: 'Instagram', resumo: '1º contato enviado' }] },
  { id: 'demo-p3', empresa: 'Distribuidora Exemplo', segmento: 'sistema', cidade: 'Fortaleza', uf: 'CE', origem: 'indicacao', indicadoPor: 'Cliente exemplo', etapa: 'proposta', encaixe: 'A', toque: 2, valor: 8000, proximoPasso: 'follow-up da proposta', proximoData: dia(2), criadoPor: 'time', criadoEm: iso(daysAgo(12)) },
]

export const seedOutbox: OutboxItem[] = [
  { id: 'demo-o1', prospectId: 'demo-p1', empresa: 'Loja Exemplo Moda', tipo: 'abordagem', canal: 'whatsapp', destino: '98900000000', toque: 1, texto: 'Oi, tudo bem? Aqui é o Daniel, da Entropy, um estúdio de sites e sistemas de São Luís. Vi que os pedidos de vocês rolam pelo direct; dá pra montar um catálogo com preço e carrinho que manda o pedido pronto. Posso te mandar um print de como ficaria? Se não fizer sentido agora, sem problema.', motivo: 'Exemplo de mensagem preparada pelo Harvey', status: 'pendente', criadoEm: iso(daysAgo(0)) },
]

export const seededCollections = {
  clientes: keyBy(seedClients),
  projetos: keyBy(seedProjects),
  lancamentos: keyBy(seedLancamentos),
  eventos: keyBy(seedEventos),
  atividades: keyBy(seedAtividades),
  leads: keyBy(seedLeads),
  prospects: keyBy(seedProspects),
  outbox: keyBy(seedOutbox),
}
