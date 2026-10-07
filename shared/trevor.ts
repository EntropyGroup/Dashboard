export const PROJECT_STATUSES = ['planejamento', 'em_andamento', 'pausado', 'concluido'] as const
export const EVENT_TYPES = ['reuniao', 'entrega', 'financeiro', 'pessoal', 'outro'] as const

export type TrevorAction =
  | { type: 'create_event'; title: string; date: string; eventType: typeof EVENT_TYPES[number]; description: string }
  | { type: 'delete_event'; eventId: string }
  | { type: 'set_project_status'; projectId: string; status: typeof PROJECT_STATUSES[number] }
  | { type: 'add_project_task'; projectId: string; text: string }
  | { type: 'set_production_url'; projectId: string; url: string }
  | { type: 'create_lead'; name: string; contact: string; category: string; comment: string }
  | { type: 'create_client'; name: string; email: string; phone: string }
  | { type: 'create_project'; name: string; category: string; clientId: string; leadId: string; productionUrl: string }
  | { type: 'create_transaction'; kind: 'entrada' | 'saida'; description: string; category: string; amount: number; date: string; projectId: string }
  | { type: 'append_note'; text: string; scope: 'personal' | 'team' }
  | { type: 'create_notice'; title: string; description: string }

export interface TrevorReply { message: string; actions: TrevorAction[] }
export interface ChatTurn { role: 'user' | 'assistant'; content: string }

const text = { type: 'string', maxLength: 2000 }
const id = { type: 'string', maxLength: 160 }
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const choice = (values: readonly string[]) => ({ type: 'string', enum: values })
interface FieldSchema { type: string; enum?: readonly string[]; maxLength?: number; pattern?: string; exclusiveMinimum?: number; maximum?: number }
const variants: { type: string; fields: Record<string, FieldSchema> }[] = [
  { type: 'create_event', fields: { title: text, date, eventType: choice(EVENT_TYPES), description: text } },
  { type: 'delete_event', fields: { eventId: id } },
  { type: 'set_project_status', fields: { projectId: id, status: choice(PROJECT_STATUSES) } },
  { type: 'add_project_task', fields: { projectId: id, text } },
  { type: 'set_production_url', fields: { projectId: id, url: text } },
  { type: 'create_lead', fields: { name: text, contact: text, category: text, comment: text } },
  { type: 'create_client', fields: { name: text, email: text, phone: text } },
  { type: 'create_project', fields: { name: text, category: text, clientId: id, leadId: id, productionUrl: text } },
  { type: 'create_transaction', fields: { kind: choice(['entrada', 'saida']), description: text, category: text, amount: { type: 'number', exclusiveMinimum: 0, maximum: 1e9 }, date, projectId: id } },
  { type: 'append_note', fields: { text, scope: choice(['personal', 'team']) } },
  { type: 'create_notice', fields: { title: text, description: text } },
]

export const TREVOR_REPLY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['message', 'actions'],
  properties: {
    message: { type: 'string', maxLength: 12000 },
    actions: { type: 'array', maxItems: 5, items: { anyOf: variants.map(({ type, fields }) => ({
      type: 'object', additionalProperties: false,
      required: ['type', ...Object.keys(fields)],
      properties: { type: choice([type]), ...fields },
    })) } },
  },
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T12:00:00Z')
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
}

export function httpUrl(value: string) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}

/** Treat every model response as untrusted input on both sides of the API. */
export function parseTrevorReply(raw: unknown): TrevorReply {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta inválida do Trevor.')
  const reply = raw as Record<string, unknown>
  if (Object.keys(reply).some((key) => !['message', 'actions'].includes(key)) || typeof reply.message !== 'string' || !reply.message.trim() || reply.message.length > 12000 || !Array.isArray(reply.actions) || reply.actions.length > 5) throw new Error('Resposta inválida do Trevor.')
  for (const action of reply.actions) {
    if (!action || typeof action !== 'object') throw new Error('Ação inválida.')
    const variant = variants.find((v) => v.type === action.type)
    if (!variant) throw new Error('Ação não permitida.')
    const fields = variant.fields
    if (Object.keys(action).some((key) => key !== 'type' && !Object.hasOwn(fields, key))) throw new Error('Campo não permitido.')
    for (const [key, field] of Object.entries(fields)) {
      const value = action[key]
      if (typeof value !== field.type || (typeof value === 'string' && value.length > (field.maxLength ?? 2000)) || (field.enum && !field.enum.includes(value)) || (field.pattern && !validDate(value))) throw new Error('Campo inválido na ação.')
    }
    if (action.type === 'create_transaction' && (!action.description.trim() || !action.category.trim())) throw new Error('Descrição e categoria obrigatórias.')
    if ('amount' in action && (!Number.isFinite(action.amount) || action.amount <= 0 || action.amount > 1e9)) throw new Error('Valor inválido.')
    for (const key of ['title', 'name', 'text', 'description']) {
      if (key in action && key !== 'description' && !action[key].trim()) throw new Error('Texto obrigatório ausente.')
    }
    for (const key of ['projectId', 'eventId']) {
      if (key in action && !action[key].trim() && !(action.type === 'create_transaction' && key === 'projectId')) throw new Error('Registro obrigatório ausente.')
    }
    if (action.type === 'create_project' && action.clientId && action.leadId) throw new Error('Selecione cliente ou lead.')
    const url = action.type === 'set_production_url' ? action.url : action.type === 'create_project' ? action.productionUrl : ''
    if (url && !httpUrl(url)) throw new Error('URL de produção inválida.')
    if (action.type === 'create_client' && action.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(action.email)) throw new Error('Email inválido.')
  }
  return reply as unknown as TrevorReply
}
