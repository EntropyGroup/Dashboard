// Harvey da Entropy: agente de vendas que roda sozinho no PC do estúdio.
// A cada ciclo: acorda, confere pausa/silêncio/limites, decide o que mais precisa ser feito,
// faz, registra e dorme. Inspirado no Harvey de ethanplusai/harvey (MIT), adaptado para o
// funil da Entropy: nenhuma mensagem sai sozinha, tudo vai para a fila de aprovação do painel.
//
//   npm run harvey          # fica rodando
//   npm run harvey -- --once  # um ciclo só (para testar)

import { db } from './db.ts'
import type { HarveyConfig, HarveyStatus, OutboxItem, Prospect } from '../src/lib/store/types.ts'
import { hojeISO } from '../shared/vendas.ts'
import { abordar, followup, prospectar, registrar, responder, type Contadores } from './tarefas.ts'
import { analisar } from './analista.ts'

const VERSAO = '1.0.0'
const CHAMADAS_DIA = Number(process.env.HARVEY_CHAMADAS_DIA || 60)
const POR_CICLO = Number(process.env.HARVEY_MENSAGENS_POR_CICLO || 4)
const UMA_VEZ = process.argv.includes('--once')

const PADRAO: Omit<HarveyConfig, 'id'> = {
  pausado: false,
  cidades: ['São Luís, MA', 'Teresina, PI', 'Fortaleza, CE'],
  segmentos: ['varejo', 'premium', 'sistema'],
  minFunil: 10,
  prospeccaoDia: 10,
  abordagensDia: 5,
  silencioInicio: '21:00',
  silencioFim: '07:30',
  intervaloMin: 15,
}

const statusRef = db.collection('harvey').doc('status')

async function lerConfig(): Promise<HarveyConfig> {
  const snap = await db.collection('harvey').doc('config').get()
  return { id: 'config', ...PADRAO, ...(snap.exists ? (snap.data() as Partial<HarveyConfig>) : {}) }
}

function emSilencio(cfg: HarveyConfig, agora = new Date()) {
  const min = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0) }
  const t = agora.getHours() * 60 + agora.getMinutes()
  const ini = min(cfg.silencioInicio), fim = min(cfg.silencioFim)
  return ini > fim ? t >= ini || t < fim : t >= ini && t < fim
}

async function contadoresDeHoje(): Promise<Contadores & { data: string; abordagens: number; rodada: number }> {
  const s = (await statusRef.get()).data() as (HarveyStatus & { abordagensHoje?: number; rodada?: number }) | undefined
  const hoje = hojeISO()
  if (s?.hoje?.data === hoje) return { ...s.hoje, data: hoje, abordagens: s.abordagensHoje ?? 0, rodada: s.rodada ?? 0 }
  return { data: hoje, chamadas: 0, prospectados: 0, mensagens: 0, abordagens: 0, rodada: s?.rodada ?? 0 }
}

async function status(estado: HarveyStatus['estado'], extra: Record<string, unknown> = {}) {
  await statusRef.set({ heartbeat: new Date().toISOString(), estado, versao: VERSAO, ...extra }, { merge: true })
}

async function ciclo() {
  const cfg = await lerConfig()
  const proximo = new Date(Date.now() + cfg.intervaloMin * 60_000).toISOString()
  if (cfg.pausado) return status('pausado', { proximoCiclo: proximo })
  if (emSilencio(cfg)) return status('silencio', { proximoCiclo: proximo })

  const c = await contadoresDeHoje()
  if (c.chamadas >= CHAMADAS_DIA) return status('dormindo', { proximoCiclo: proximo, ultimaAcao: `Limite diário de ${CHAMADAS_DIA} chamadas atingido` })
  await status('trabalhando', { erro: null })

  const prospects = (await db.collection('prospects').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Prospect)
  const pend = (await db.collection('outbox').where('status', '==', 'pendente').get()).docs.map((d) => d.data() as OutboxItem)
  const comFila = new Set(pend.map((o) => o.prospectId))
  const jaTeveFila = new Set((await db.collection('outbox').select('prospectId').get()).docs.map((d) => d.get('prospectId') as string))
  const hoje = hojeISO()
  const ativo = (p: Prospect) => p.etapa !== 'fechado' && p.etapa !== 'perdido'
  const sobra = () => CHAMADAS_DIA - c.chamadas
  const acoes: string[] = []

  // 1. responder quem respondeu (o time colou a resposta no painel)
  for (const p of prospects.filter((p) => p.respostaPendente && !comFila.has(p.id)).slice(0, POR_CICLO)) {
    if (sobra() <= 0) break
    await responder(p, c); comFila.add(p.id); acoes.push(`resposta para ${p.empresa}`)
  }

  // 2. follow-ups vencidos da cadência
  const vencidos = prospects.filter((p) => p.etapa === 'abordado' && (p.toque ?? 0) >= 1 && p.proximoData && p.proximoData <= hoje && !comFila.has(p.id))
  for (const p of vencidos.slice(0, POR_CICLO)) {
    if (sobra() <= 0) break
    await followup(p, c); comFila.add(p.id); acoes.push(`follow-up para ${p.empresa}`)
  }

  // 3. primeiro contato com os mapeados (A antes de B), até o limite do dia
  const rank: Record<string, number> = { A: 0, B: 1 }
  const novos = prospects
    .filter((p) => p.etapa === 'mapeado' && p.encaixe !== 'C' && !jaTeveFila.has(p.id) && (p.toque ?? 0) === 0)
    .sort((a, b) => (rank[a.encaixe ?? 'B'] ?? 1) - (rank[b.encaixe ?? 'B'] ?? 1))
  for (const p of novos.slice(0, Math.max(0, Math.min(POR_CICLO, cfg.abordagensDia - c.abordagens)))) {
    if (sobra() <= 0) break
    await abordar(p, c); c.abordagens++; acoes.push(`1º contato com ${p.empresa}`)
  }

  // 4. prospectar quando o funil está baixo
  const prontos = prospects.filter((p) => ativo(p) && p.etapa === 'mapeado' && p.encaixe !== 'C' && !jaTeveFila.has(p.id)).length
  const falta = Math.min(5, cfg.prospeccaoDia - c.prospectados)
  if (prontos < cfg.minFunil && falta > 0 && sobra() > 0 && !acoes.length) {
    await prospectar(cfg, prospects, falta, c.rodada, c); c.rodada++; acoes.push('prospecção')
  }

  // 5. analista: uma vez por semana, a partir de segunda 8h
  const st = (await statusRef.get()).data() as { ultimaAnalise?: string } | undefined
  const agora = new Date()
  const semanaPassou = !st?.ultimaAnalise || Date.now() - new Date(st.ultimaAnalise).getTime() > 6 * 86400000
  if (process.env.HARVEY_METRICOOL_MCP && agora.getDay() === 1 && agora.getHours() >= 8 && semanaPassou && sobra() > 0 && !acoes.length) {
    await analisar(c); acoes.push('análise do Instagram')
  }

  await status('dormindo', {
    proximoCiclo: proximo,
    ultimaAcao: acoes.length ? acoes.join(', ') : 'Nada pendente: funil em dia',
    hoje: { data: c.data, chamadas: c.chamadas, prospectados: c.prospectados, mensagens: c.mensagens },
    abordagensHoje: c.abordagens,
    rodada: c.rodada,
  })
  return cfg.intervaloMin
}

async function podar() {
  // mantém só os 300 registros mais recentes do log
  const velhos = await db.collection('harvey_log').orderBy('criadoEm', 'desc').offset(300).limit(200).get()
  if (velhos.empty) return
  const b = db.batch()
  velhos.docs.forEach((d) => b.delete(d.ref))
  await b.commit()
}

async function main() {
  console.log(`Harvey ${VERSAO} online. Sempre fechando.`)
  await registrar('sistema', `Harvey ${VERSAO} iniciado no PC`)
  for (;;) {
    let intervalo = 15
    try {
      intervalo = (await ciclo()) ?? (await lerConfig()).intervaloMin
      await podar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[harvey]', msg)
      await status('erro', { erro: msg.slice(0, 500) }).catch(() => {})
      await registrar('erro', msg.slice(0, 500)).catch(() => {})
    }
    if (UMA_VEZ) break
    await new Promise((r) => setTimeout(r, Math.max(5, intervalo) * 60_000))
  }
  process.exit(0)
}

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, async () => {
    await status('dormindo', { ultimaAcao: 'Harvey desligado no PC' }).catch(() => {})
    process.exit(0)
  })
}

main()
