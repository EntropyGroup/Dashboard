// Analista semanal do Instagram: pega as métricas dos posts pelo Metricool (servidor MCP configurado
// no Claude Code do PC) e calcula a nota de cada post aqui, em código.
// Ativo só com HARVEY_METRICOOL_MCP definido (nome do servidor em `claude mcp list`).

import { db } from './db.ts'
import { extrairJson, perguntar } from './claude.ts'
import { registrar, type Contadores } from './tarefas.ts'

const BLOG_ID = process.env.HARVEY_METRICOOL_BLOG_ID || '7523751'

interface Linha {
  id: string
  data: string
  tipo?: string
  url?: string
  imagem?: string
  texto?: string
  alcance?: number
  curtidas?: number
  comentarios?: number
  salvos?: number
  compart?: number
  views?: number
  follows?: number
}

const PESOS = { compart: 0.3, salvos: 0.25, comentarios: 0.15, curtidas: 0.1, follows: 0.1 } as const
// referência antes de existir histórico (taxa que vale nota 7)
const REF7 = { compart: 0.01, salvos: 0.02, comentarios: 0.005, curtidas: 0.05, follows: 0.003 } as const

function mediana(xs: number[]) {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return 0
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export function notas(linhas: Linha[]) {
  const taxa = (l: Linha, k: keyof typeof PESOS) => ((l[k] ?? 0) / Math.max(1, l.alcance ?? 0))
  return linhas.map((l) => {
    const mesmos = linhas.filter((x) => (x.tipo ?? '') === (l.tipo ?? ''))
    const comHistorico = mesmos.length >= 8
    let total = 0
    for (const k of Object.keys(PESOS) as (keyof typeof PESOS)[]) {
      const base = comHistorico ? mediana(mesmos.map((x) => taxa(x, k))) : REF7[k] / 1.4
      const n = base > 0 ? Math.min(10, (taxa(l, k) / base) * 5) : 5
      total += n * PESOS[k]
    }
    const medAlc = mediana(mesmos.map((x) => x.alcance ?? 0))
    total += (medAlc > 0 ? Math.min(10, ((l.alcance ?? 0) / medAlc) * 5) : 5) * 0.1
    const t = (k: keyof typeof PESOS) => taxa(l, k)
    const leitura =
      t('compart') >= 0.01 ? 'Mandável: repetir o formato.'
      : t('salvos') >= 0.02 && (l.alcance ?? 0) < medAlc ? 'Conteúdo bom, capa fraca: testar outra capa.'
      : (l.alcance ?? 0) > medAlc * 1.5 && t('salvos') < 0.01 ? 'Chegou longe, mas entregou pouco valor.'
      : t('comentarios') >= 0.01 ? 'Gerou conversa: responder todos e fazer continuação.'
      : (l.follows ?? 0) > 0 && t('follows') >= 0.003 ? 'Converte em seguidor: bom candidato a fixar.'
      : 'Abaixo da média: revisar gancho, horário e tema.'
    return { ...l, nota: Math.round(total * 10) / 10, leitura }
  })
}

export async function analisar(c: Contadores) {
  const servidor = process.env.HARVEY_METRICOOL_MCP
  if (!servidor) return
  const fim = new Date()
  const ini = new Date(fim.getTime() - 60 * 86400000)
  const prompt = `Use as ferramentas do Metricool para buscar os posts e reels do Instagram da marca (blogId/brandId ${BLOG_ID}) entre ${ini.toISOString().slice(0, 10)} e ${fim.toISOString().slice(0, 10)}, fuso America/Fortaleza.
Use getAnalyticsAvailableMetrics para achar os IDs (conectores "posts" e "reels") e getAnalyticsDataByMetrics para buscar: data/hora, texto, tipo, id, url, imagem, alcance, curtidas, comentários, salvos, compartilhamentos, views e follows. Ignore campos marcados "Deprecated".
Não calcule nada: só devolva os dados.
Responda só com JSON: {"posts": [{"id": "", "data": "AAAA-MM-DD", "tipo": "POST|CAROUSEL|REEL", "url": "", "imagem": "", "texto": "primeiros 140 caracteres", "alcance": 0, "curtidas": 0, "comentarios": 0, "salvos": 0, "compart": 0, "views": 0, "follows": 0}]}`
  c.chamadas++
  const r = extrairJson<{ posts: Linha[] }>(await perguntar(prompt, { mcp: [servidor], maxTurns: 12 }))
  const lista = (r.posts ?? []).filter((p) => p.id && p.data)
  const com = notas(lista)
  const agora = new Date().toISOString()
  const batch = db.batch()
  for (const p of com) {
    const gancho = (p.texto ?? '').split('\n')[0].slice(0, 120)
    batch.set(db.collection('ig_posts').doc(String(p.id).replace(/\//g, '_')), { ...p, gancho, atualizadoEm: agora }, { merge: true })
  }
  await batch.commit()
  await db.collection('harvey').doc('status').set({ ultimaAnalise: agora }, { merge: true })
  await registrar('analise', `Nota de ${com.length} post(s) atualizada pelo Metricool`)
}
