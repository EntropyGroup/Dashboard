import { useSearchParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { IgPerfil, TendenciaStatus } from '@/lib/store/types'

const ABAS = [
  ['conteudo', 'Conteúdo'],
  ['mercado', 'Mercado'],
] as const

const TST: [TendenciaStatus, string][] = [
  ['ideia', 'Ideia'],
  ['na-pauta', 'Na pauta'],
  ['feito', 'Feito'],
  ['descartada', 'Descartada'],
]
const TIPO_REF: Record<string, string> = { concorrente: 'Concorrente', 'referencia-formato': 'Referência de formato', 'cliente-ideal': 'Cliente ideal' }

const dm = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '')
const pct = (a?: number, b?: number) => (b ? `${((100 * (a ?? 0)) / b).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—')
const notaTom = (n: number) => (n >= 7 ? 'success' : n >= 4 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger'

export function InstagramPage() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'mercado' ? 'mercado' : 'conteudo'
  return (
    <div className="space-y-5">
      <nav className="glass-pill flex w-fit gap-1 rounded-full p-1" aria-label="Seções do Instagram">
        {ABAS.map(([id, label]) => (
          <button key={id} onClick={() => setParams(id === 'conteudo' ? {} : { aba: id })}
            className={cn('rounded-full px-4 py-1.5 text-xs font-medium transition-colors', aba === id ? 'bg-porcelain text-obsidian' : 'text-mist hover:text-porcelain')}>
            {label}
          </button>
        ))}
      </nav>
      {aba === 'conteudo' ? <Conteudo /> : <Mercado />}
    </div>
  )
}

function Conteudo() {
  const { igPosts, igPerfil } = useStore()
  const perfil = igPerfil.items.find((p) => p.id === 'atual') as IgPerfil | undefined
  const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const P = igPosts.items.filter((p) => (p.data ?? '') >= desde)
  const soma = (k: 'alcance' | 'salvos' | 'compart') => P.reduce((s, p) => s + (p[k] ?? 0), 0)
  const notaMedia = P.filter((p) => p.nota != null)
  const media = notaMedia.length ? notaMedia.reduce((s, p) => s + (p.nota ?? 0), 0) / notaMedia.length : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          [String(P.length), 'Posts em 30 dias'],
          [soma('alcance').toLocaleString('pt-BR'), 'Alcance somado'],
          [pct(soma('salvos'), soma('alcance')), 'Salvos / alcance'],
          [pct(soma('compart'), soma('alcance')), 'Envios / alcance'],
          [media == null ? '—' : media.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), 'Nota média'],
        ].map(([v, l]) => (
          <div key={l} className="glass rounded-xl px-4 py-3"><p className="text-xl font-medium tabular-nums text-porcelain">{v}</p><p className="text-[11px] text-steel">{l}</p></div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria do perfil</CardTitle>
          {perfil && <span className="flex items-center gap-2 text-[11px] text-steel">em {dm(perfil.data)} <Badge tone={notaTom(perfil.notaGeral)}>{perfil.notaGeral.toLocaleString('pt-BR')}</Badge></span>}
        </CardHeader>
        {perfil ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-steel"><tr><th className="py-1.5 font-normal">Área</th><th className="font-normal">Nota</th><th className="font-normal">Achado</th><th className="font-normal">O que fazer</th></tr></thead>
              <tbody className="divide-y divide-white/[0.06] align-top">
                {perfil.itens.map((it) => (
                  <tr key={it.area}><td className="py-2.5 pr-3 text-porcelain">{it.area}</td><td className="pr-3"><Badge tone={notaTom(it.nota)}>{it.nota}</Badge></td><td className="pr-3 text-mist">{it.achado}</td><td className="text-mist">{it.acao}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-steel">Sem auditoria ainda. O analista do Harvey roda toda segunda; também dá pra pedir ao Claude: "analisa o perfil".</p>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Posts</CardTitle><span className="text-[11px] text-steel">nota de 0 a 10 comparada com a mediana da própria conta</span></CardHeader>
        {igPosts.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-steel">
                <tr><th className="py-1.5 font-normal">Data</th><th className="font-normal">Formato</th><th className="font-normal">Gancho</th><th className="text-right font-normal">Alcance</th><th className="text-right font-normal">Salvos</th><th className="text-right font-normal">Envios</th><th className="text-right font-normal">Seguiram</th><th className="px-3 font-normal">Nota</th><th className="font-normal">Leitura</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] align-top">
                {igPosts.items.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 tabular-nums text-steel">{dm(p.data)}</td>
                    <td className="pr-3 text-mist">{p.tipo}</td>
                    <td className="max-w-[240px] pr-3 text-porcelain">{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.gancho || p.texto}</a> : p.gancho || p.texto}</td>
                    <td className="text-right tabular-nums">{(p.alcance ?? 0).toLocaleString('pt-BR')}</td>
                    <td className="text-right tabular-nums">{p.salvos ?? 0} <span className="text-steel">{pct(p.salvos, p.alcance)}</span></td>
                    <td className="text-right tabular-nums">{p.compart ?? 0} <span className="text-steel">{pct(p.compart, p.alcance)}</span></td>
                    <td className="text-right tabular-nums">{p.follows ?? 0}</td>
                    <td className="px-3">{p.nota != null && <Badge tone={notaTom(p.nota)}>{p.nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</Badge>}</td>
                    <td className="text-mist">{p.leitura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-steel">Os posts aparecem aqui quando o analista ler os dados do Metricool (1 a 2 dias depois de publicar).</p>
        )}
      </Card>
    </div>
  )
}

function Mercado() {
  const { igTendencias, igReferencias } = useStore()
  const lista = [...igTendencias.items].sort((a, b) => (a.status === 'ideia' ? 0 : 1) - (b.status === 'ideia' ? 0 : 1))
  return (
    <div className="space-y-4">
      <p className="text-xs text-steel">Formato e gancho para adaptar ao jeito da Entropy. Copiar conteúdo de outro perfil derruba o alcance (regra de originalidade do Instagram).</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((t) => (
          <Card key={t.id} className="flex flex-col gap-2.5">
            <p className="text-[10px] uppercase tracking-wider text-steel">{[t.formato, t.fonte].filter(Boolean).join(' · ')}</p>
            <h3 className="text-sm font-medium text-porcelain">{t.titulo}</h3>
            {t.gancho && <p className="font-mono text-[11px] text-signal">{t.gancho}</p>}
            {t.porqueFunciona && <p className="text-xs leading-relaxed text-mist"><span className="text-steel">Por que funciona: </span>{t.porqueFunciona}</p>}
            {t.comoAdaptar && <p className="text-xs leading-relaxed text-mist"><span className="text-steel">Como a Entropy faria: </span>{t.comoAdaptar}</p>}
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              {t.exemplo ? <a className="flex items-center gap-1 text-[11px] text-mist hover:text-porcelain" href={t.exemplo} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /> Exemplo</a> : <span />}
              <select className="input w-auto py-1 text-xs" value={t.status} aria-label={`Status de ${t.titulo}`} onChange={(e) => igTendencias.update(t.id, { status: e.target.value as TendenciaStatus })}>
                {TST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </Card>
        ))}
        {!lista.length && <p className="text-xs text-steel">Nenhuma tendência ainda.</p>}
      </div>
      <Card>
        <CardHeader><CardTitle>Perfis acompanhados</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-steel"><tr><th className="py-1.5 font-normal">Perfil</th><th className="font-normal">Tipo</th><th className="font-normal">Seguidores</th><th className="font-normal">Por que acompanhar</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06] align-top">
              {igReferencias.items.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3"><a className="text-porcelain hover:underline" href={`https://www.instagram.com/${r.handle}/`} target="_blank" rel="noopener noreferrer">@{r.handle}</a>{r.nome && <span className="block text-steel">{r.nome}</span>}</td>
                  <td className="pr-3 text-mist">{TIPO_REF[r.tipo] ?? r.tipo}</td>
                  <td className="pr-3 tabular-nums text-mist">{r.seguidores}</td>
                  <td className="text-mist">{r.porque}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
