// Regras de venda compartilhadas entre o painel (src/) e o Harvey (harvey/).
// Sem imports: roda no navegador e no Node 22.18+ (type stripping).

export const ETAPAS = [
  ['mapeado', 'Mapeado'],
  ['abordado', 'Abordado'],
  ['respondeu', 'Respondeu'],
  ['reuniao', 'Reunião'],
  ['proposta', 'Proposta'],
  ['fechado', 'Fechado'],
  ['perdido', 'Perdido'],
] as const

export type Etapa = (typeof ETAPAS)[number][0]

/** Ordem do funil, sem "perdido". */
export const ORDEM_FUNIL: Etapa[] = ['mapeado', 'abordado', 'respondeu', 'reuniao', 'proposta', 'fechado']

export const SEGMENTOS = [
  ['sistema', 'Sistema / SaaS / IA'],
  ['varejo', 'Varejo / e-commerce'],
  ['premium', 'Serviços premium'],
  ['outro', 'Outro'],
] as const

export const MOTIVOS_PERDA = ['preço', 'timing', 'sem resposta', 'escolheu outro', 'sem encaixe'] as const

/**
 * Cadência de lead frio: dias depois do toque anterior até o próximo.
 * Toque 1 = abordagem (D0), 2 = D+3, 3 = D+7, 4 = D+14, 5 = encerramento (D+21).
 */
export const CADENCIA: Record<number, { dias: number; tipo: 'followup' | 'encerramento'; passo: string }> = {
  1: { dias: 3, tipo: 'followup', passo: 'follow-up 1 (print ou sugestão aplicada)' },
  2: { dias: 4, tipo: 'followup', passo: 'follow-up 2 (case ou produto parecido)' },
  3: { dias: 7, tipo: 'followup', passo: 'follow-up 3 (conteúdo útil, sem pedir nada)' },
  4: { dias: 7, tipo: 'encerramento', passo: 'mensagem de encerramento' },
}

export const ULTIMO_TOQUE = 5

export function hojeISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + dias)
  return hojeISO(dt)
}

/**
 * O que muda num prospect depois que o time marca uma mensagem como enviada.
 * `toqueEnviado` é o número do toque da mensagem (1 = abordagem).
 */
export function aposEnvio(
  prospect: { etapa: Etapa; toque?: number },
  msg: { tipo: string; toque?: number },
  hoje = hojeISO(),
): { etapa: Etapa; toque: number; ultimoContato: string; proximoPasso: string; proximoData: string; motivoPerda?: string } {
  const toque = Math.max(prospect.toque ?? 0, msg.toque ?? (prospect.toque ?? 0) + 1)
  if (msg.tipo === 'encerramento' || toque >= ULTIMO_TOQUE) {
    return { etapa: 'perdido', toque, ultimoContato: hoje, proximoPasso: 'retomar em 90 dias', proximoData: somarDias(hoje, 90), motivoPerda: 'sem resposta' }
  }
  if (msg.tipo === 'resposta' || msg.tipo === 'proposta') {
    // conversa ativa: acompanha em 2 dias; a etapa continua a que o time definiu
    return { etapa: prospect.etapa, toque, ultimoContato: hoje, proximoPasso: msg.tipo === 'proposta' ? 'follow-up da proposta' : 'acompanhar conversa', proximoData: somarDias(hoje, msg.tipo === 'proposta' ? 3 : 2) }
  }
  const prox = CADENCIA[toque]
  return {
    etapa: prospect.etapa === 'mapeado' ? 'abordado' : prospect.etapa,
    toque,
    ultimoContato: hoje,
    proximoPasso: prox ? prox.passo : 'encerrar',
    proximoData: somarDias(hoje, prox ? prox.dias : 7),
  }
}

/** Link que abre o app com o texto pronto. O envio é sempre feito pela pessoa. */
export function linkDeEnvio(canal: string, destino: string | undefined, texto: string): string | null {
  if (!destino) return null
  if (canal === 'whatsapp') {
    let num = destino.replace(/\D/g, '')
    if (num.length >= 10 && num.length <= 11) num = '55' + num
    return num ? `https://wa.me/${num}?text=${encodeURIComponent(texto)}` : null
  }
  if (canal === 'instagram') {
    const h = destino.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '')
    return h ? `https://ig.me/m/${h}` : null
  }
  if (canal === 'email') return `mailto:${destino}?body=${encodeURIComponent(texto)}`
  return null
}

/** Quantos chegaram até cada etapa (perdidos contam até onde chegaram pelo toque). */
export function alcancouEtapa(p: { etapa: Etapa; toque?: number }, etapa: Etapa): boolean {
  let e: Etapa = p.etapa
  if (e === 'perdido') e = (p.toque ?? 0) > 0 ? 'abordado' : 'mapeado'
  return ORDEM_FUNIL.indexOf(e) >= ORDEM_FUNIL.indexOf(etapa)
}
