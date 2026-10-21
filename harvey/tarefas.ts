// O que o Harvey sabe fazer. Cada tarefa lê o Firestore, pergunta ao Claude e grava o resultado.
// Nada é enviado a ninguém: mensagens vão para a coleção `outbox` e esperam o time aprovar.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FieldValue } from 'firebase-admin/firestore'
import type { Canal, HarveyConfig, OutboxTipo, Prospect } from '../src/lib/store/types.ts'
import { CADENCIA, ULTIMO_TOQUE, hojeISO } from '../shared/vendas.ts'
import { db } from './db.ts'
import { extrairJson, perguntar } from './claude.ts'

const PROMPTS = join(import.meta.dirname, 'prompts')
const MARCA = readFileSync(join(PROMPTS, 'marca.md'), 'utf8')
const VENDAS = readFileSync(join(PROMPTS, 'vendas.md'), 'utf8')
const REMETENTE = process.env.HARVEY_REMETENTE || 'Daniel'

const REGRAS = `
REGRAS FIXAS (não negociáveis):
- Você escreve como ${REMETENTE}, da Entropy. Português do Brasil, tom próximo e direto, sem buzzword, no máximo 1 emoji.
- Nunca invente fato, número, cliente, depoimento ou resultado. Só use o que está nos dados do lead e no portfólio permitido.
- Cliente real e divulgável: só a Amira. Produtos próprios e projetos conceito mostram capacidade, nunca como cliente. Way e Pivô nunca aparecem.
- Mensagem curta (até ~450 caracteres no direct/WhatsApp), com uma observação real sobre o negócio, um valor oferecido, uma pergunta fácil de responder e uma saída educada.
- Sem pressão falsa (escassez, prazo ou desconto inventados). Preço só se estiver nos dados.
- Use só dados públicos da empresa. Não procure dados pessoais de funcionários ou clientes.
`

export interface Contadores {
  chamadas: number
  prospectados: number
  mensagens: number
}

export async function registrar(tipo: string, texto: string) {
  await db.collection('harvey_log').add({ tipo, texto, criadoEm: new Date().toISOString() })
}

function canalPara(p: Partial<Prospect>, sugerido?: string): { canal: Canal; destino?: string } {
  const ordem: Canal[] = sugerido && ['whatsapp', 'instagram', 'email'].includes(sugerido) ? [sugerido as Canal, 'whatsapp', 'instagram', 'email'] : ['whatsapp', 'instagram', 'email']
  for (const c of ordem) {
    const d = c === 'whatsapp' ? p.whatsapp : c === 'instagram' ? p.instagram : p.email
    if (d) return { canal: c, destino: d }
  }
  return { canal: 'instagram', destino: p.instagram }
}

async function enfileirar(p: Prospect, tipo: OutboxTipo, toque: number | undefined, texto: string, motivo: string, canalSugerido?: string) {
  const { canal, destino } = canalPara(p, canalSugerido ?? p.canalPreferido)
  await db.collection('outbox').add({
    prospectId: p.id,
    empresa: p.empresa,
    tipo,
    canal,
    destino,
    toque,
    texto: texto.trim(),
    motivo,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
  })
}

function resumoLead(p: Prospect): string {
  const campos = {
    empresa: p.empresa, segmento: p.segmento, cidade: p.cidade, uf: p.uf, instagram: p.instagram, site: p.site,
    origem: p.origem, indicadoPor: p.indicadoPor, etapa: p.etapa, encaixe: p.encaixe, dor: p.dor,
    diagnostico: p.diagnostico, notas: p.notas, historico: (p.historico ?? []).slice(-6),
  }
  return JSON.stringify(campos, null, 2)
}

// ------------------------------------------------------------ resposta a lead

export async function responder(p: Prospect, c: Contadores) {
  const prompt = `${MARCA}\n\n${VENDAS}\n${REGRAS}
O lead abaixo respondeu. Escreva a próxima mensagem para avançar a conversa (qualificar, responder objeção com o roteiro, ou propor 15 minutos de conversa). Se ele perguntou preço e não há preço nos dados, devolva com uma pergunta de diagnóstico e proponha a conversa.

LEAD:
${resumoLead(p)}

MENSAGEM DO LEAD:
"""${p.respostaPendente}"""

Responda só com JSON: {"texto": "...", "motivo": "uma linha explicando a estratégia", "etapaSugerida": "respondeu|reuniao|proposta|perdido", "dor": "a dor nas palavras dele, se apareceu, ou vazio"}`
  c.chamadas++
  const r = extrairJson<{ texto: string; motivo: string; etapaSugerida?: string; dor?: string }>(await perguntar(prompt, { maxTurns: 3 }))
  await enfileirar(p, 'resposta', p.toque, r.texto, r.motivo + (r.etapaSugerida ? ` · etapa sugerida: ${r.etapaSugerida}` : ''))
  await db.collection('prospects').doc(p.id).update({
    respostaPendente: FieldValue.delete(),
    ...(r.dor && !p.dor ? { dor: r.dor } : {}),
    atualizadoEm: new Date().toISOString(),
  })
  c.mensagens++
  await registrar('mensagem', `Resposta preparada para ${p.empresa}`)
}

// ------------------------------------------------------------ follow-up / encerramento

export async function followup(p: Prospect, c: Contadores) {
  const toqueAtual = p.toque ?? 1
  const passo = CADENCIA[toqueAtual]
  if (!passo || toqueAtual >= ULTIMO_TOQUE) return
  const tipo: OutboxTipo = passo.tipo
  const prompt = `${MARCA}\n\n${VENDAS}\n${REGRAS}
Este lead foi abordado e ainda não respondeu. Escreva o ${tipo === 'encerramento' ? 'encerramento cordial (dizendo que vai parar de escrever e que a porta fica aberta)' : `próximo toque da cadência: ${passo.passo}`}. Traga algo novo em relação ao histórico; nunca "e aí, viu minha mensagem?". Se for oferecer um print ou rascunho, diga que pode mandar, não diga que já fez.

LEAD:
${resumoLead(p)}

Responda só com JSON: {"texto": "...", "motivo": "uma linha: o que esta mensagem traz de novo"}`
  c.chamadas++
  const r = extrairJson<{ texto: string; motivo: string }>(await perguntar(prompt, { maxTurns: 3 }))
  await enfileirar(p, tipo, toqueAtual + 1, r.texto, r.motivo)
  c.mensagens++
  await registrar('mensagem', `${tipo === 'encerramento' ? 'Encerramento' : `Follow-up ${toqueAtual}`} preparado para ${p.empresa}`)
}

// ------------------------------------------------------------ diagnóstico + 1º contato

export async function abordar(p: Prospect, c: Contadores) {
  // já diagnosticado e com canal de contato: só escreve a mensagem, sem pesquisar de novo
  if (p.diagnostico && (p.whatsapp || p.instagram || p.email) && p.encaixe !== 'C') {
    const prompt = `${MARCA}\n\n${VENDAS}\n${REGRAS}
Escreva a primeira mensagem para esta empresa, seguindo a estrutura de abordagem e usando uma observação real do diagnóstico.

LEAD:
${resumoLead(p)}

Responda só com JSON: {"canal": "whatsapp|instagram|email", "texto": "...", "motivo": "uma linha"}`
    c.chamadas++
    const r = extrairJson<{ canal?: string; texto: string; motivo: string }>(await perguntar(prompt, { maxTurns: 3 }))
    await enfileirar(p, 'abordagem', 1, r.texto, r.motivo, r.canal)
    c.mensagens++
    await registrar('mensagem', `1º contato preparado para ${p.empresa}`)
    return
  }
  const prompt = `${MARCA}\n\n${VENDAS}\n${REGRAS}
Prepare o primeiro contato com esta empresa.
1. Use WebSearch e WebFetch para olhar o site e o Instagram público da empresa (sem login). Confirme cidade, o que vendem, como vendem hoje (direct, WhatsApp, site, catálogo), e ache os canais de contato comerciais que a própria empresa divulga (WhatsApp comercial, e-mail de contato).
2. Escreva um diagnóstico com 2 ou 3 oportunidades concretas e verificáveis, no tom de quem quer ajudar.
3. Classifique o encaixe: A (dor clara e porte compatível), B (provável), C (fraco: não abordar).
4. Se for A ou B, escreva a primeira mensagem seguindo a estrutura de abordagem.

DADOS QUE JÁ TEMOS:
${resumoLead(p)}

Responda só com JSON:
{"diagnostico": "...", "encaixe": "A|B|C", "cidade": "", "uf": "", "site": "", "instagram": "sem @", "whatsapp": "só números, com DDD, se a empresa divulgar", "email": "", "canal": "whatsapp|instagram|email", "texto": "mensagem ou vazio se C", "motivo": "uma linha"}`
  c.chamadas++
  const r = extrairJson<Record<string, string>>(await perguntar(prompt, { tools: ['WebSearch', 'WebFetch'], maxTurns: 14 }))
  const atualiza: Partial<Prospect> = { diagnostico: r.diagnostico || p.diagnostico, encaixe: (['A', 'B', 'C'].includes(r.encaixe) ? r.encaixe : p.encaixe) as Prospect['encaixe'], atualizadoEm: new Date().toISOString() }
  for (const k of ['cidade', 'uf', 'site', 'instagram', 'whatsapp', 'email'] as const) if (r[k] && !p[k]) atualiza[k] = r[k].replace(/^@/, '')
  await db.collection('prospects').doc(p.id).update(atualiza)
  const atualizado = { ...p, ...atualiza } as Prospect
  if (atualiza.encaixe === 'C' || !r.texto?.trim()) {
    await db.collection('prospects').doc(p.id).update({ proximoPasso: 'encaixe C: não abordar agora' })
    await registrar('diagnostico', `${p.empresa}: encaixe C, sem abordagem`)
    return
  }
  await enfileirar(atualizado, 'abordagem', 1, r.texto, r.motivo, r.canal)
  c.mensagens++
  await registrar('mensagem', `1º contato preparado para ${p.empresa} (encaixe ${atualiza.encaixe})`)
}

// ------------------------------------------------------------ prospecção

function normal(s?: string) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^@/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]/g, '')
}

export async function prospectar(cfg: HarveyConfig, existentes: Prospect[], quantos: number, rodada: number, c: Contadores) {
  const cidade = cfg.cidades[rodada % Math.max(1, cfg.cidades.length)] ?? 'São Luís, MA'
  const segmento = cfg.segmentos[Math.floor(rodada / Math.max(1, cfg.cidades.length)) % Math.max(1, cfg.segmentos.length)] ?? 'varejo'
  const conhecidos = existentes.map((p) => `${p.empresa}${p.instagram ? ' @' + p.instagram : ''}`).slice(0, 200).join('; ')
  const prompt = `${MARCA}\n${REGRAS}
Encontre ${quantos} empresas em ${cidade} no segmento "${segmento}" (ver públicos acima) com presença digital fraca e sinais de que podem pagar: negócio ativo (posta, tem avaliações), mas com site ausente, lento, quebrado, sem versão mobile, sem catálogo/checkout, ou operação claramente manual (pedidos só por WhatsApp/direct, link da bio genérico).
Use WebSearch e WebFetch (páginas públicas, sem login). Descarte grandes redes, franquias e quem já tem site forte.
NÃO repita estas empresas que já estão no funil: ${conhecidos || 'nenhuma'}.

Responda só com JSON:
{"empresas": [{"empresa": "", "segmento": "${segmento}", "cidade": "", "uf": "", "instagram": "sem @", "site": "", "whatsapp": "só se a empresa divulgar", "email": "", "diagnostico": "2-3 oportunidades concretas", "encaixe": "A|B|C"}]}`
  c.chamadas++
  const r = extrairJson<{ empresas: Partial<Prospect>[] }>(await perguntar(prompt, { tools: ['WebSearch', 'WebFetch'], maxTurns: 20, timeoutMs: 10 * 60_000 }))
  const vistos = new Set(existentes.flatMap((p) => [normal(p.instagram), normal(p.site), normal(p.empresa + p.cidade)]).filter(Boolean))
  let novos = 0
  for (const e of r.empresas ?? []) {
    if (!e.empresa) continue
    const chaves = [normal(e.instagram), normal(e.site), normal(e.empresa + e.cidade)].filter(Boolean)
    if (chaves.some((k) => vistos.has(k))) continue
    chaves.forEach((k) => vistos.add(k))
    const agora = new Date().toISOString()
    await db.collection('prospects').add({
      empresa: e.empresa,
      segmento: e.segmento ?? segmento,
      cidade: e.cidade,
      uf: e.uf,
      instagram: e.instagram?.replace(/^@/, ''),
      site: e.site,
      whatsapp: e.whatsapp,
      email: e.email,
      diagnostico: e.diagnostico,
      encaixe: ['A', 'B', 'C'].includes(e.encaixe as string) ? e.encaixe : 'B',
      origem: 'prospeccao',
      etapa: 'mapeado',
      toque: 0,
      proximoPasso: 'preparar 1º contato',
      proximoData: hojeISO(),
      criadoPor: 'harvey',
      criadoEm: agora,
      atualizadoEm: agora,
      historico: [{ data: hojeISO(), resumo: `Encontrado pelo Harvey (${segmento}, ${cidade})`, autor: 'Harvey' }],
    })
    novos++
  }
  c.prospectados += novos
  await registrar('prospeccao', `${novos} empresa(s) nova(s) em ${cidade}, segmento ${segmento}`)
}
