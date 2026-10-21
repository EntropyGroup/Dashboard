// Importa para o Firestore os dados que estavam no "Painel Entropy" (artifact do Claude):
// leads → prospects, auditoria → ig_perfil, perfis acompanhados → ig_referencias,
// tendências → ig_tendencias. Roda uma vez, no PC:
//
//   node --env-file=.env scripts/importar-painel-claude.mjs caminho/painel-claude.json
//
// O JSON não fica no repositório (o repositório é público e tem dados de empresas prospectadas).
// Rodar de novo não duplica: os ids são os mesmos e documentos existentes são mesclados.

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Uso: node --env-file=.env scripts/importar-painel-claude.mjs painel-claude.json')
  process.exit(1)
}
const sa = process.env.HARVEY_SERVICE_ACCOUNT_FILE ? readFileSync(process.env.HARVEY_SERVICE_ACCOUNT_FILE, 'utf8') : process.env.FIREBASE_SERVICE_ACCOUNT
if (!sa) {
  console.error('Falta FIREBASE_SERVICE_ACCOUNT (ou HARVEY_SERVICE_ACCOUNT_FILE) no .env')
  process.exit(1)
}
initializeApp({ credential: cert(JSON.parse(sa)) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

const dados = JSON.parse(readFileSync(arquivo, 'utf8'))
const limpo = (v) => (typeof v === 'string' && /^não (informad|confirmad)/i.test(v.trim()) ? undefined : v || undefined)
const agora = new Date().toISOString()
let n = 0
const batch = db.batch()

for (const l of dados.leads ?? []) {
  const encaixe = l.encaixe || (l.notas?.match(/Encaixe ([ABC])/) ?? [])[1]
  batch.set(
    db.collection('prospects').doc(l.id),
    {
      empresa: l.empresa,
      segmento: l.segmento || 'outro',
      cidade: limpo(l.cidade),
      uf: limpo(l.uf),
      origem: l.origem || 'prospeccao',
      indicadoPor: l.indicadoPor || undefined,
      instagram: l.instagram?.replace(/^@/, '') || undefined,
      site: limpo(l.site),
      contato: l.contato || undefined,
      etapa: l.etapa || 'mapeado',
      encaixe: encaixe || undefined,
      toque: l.toque ?? 0,
      proximoPasso: l.proximoPasso === 'enviar abordagem' ? 'preparar 1º contato' : l.proximoPasso,
      proximoData: l.proximoData,
      valor: l.valor || null,
      diagnostico: l.diagnostico,
      notas: l.notas,
      historico: l.historico ?? [],
      criadoPor: 'harvey',
      criadoEm: l.criadoEm || agora,
      atualizadoEm: agora,
    },
    { merge: true },
  )
  n++
}
if (dados.perfil) {
  batch.set(db.collection('ig_perfil').doc('atual'), dados.perfil)
  batch.set(db.collection('ig_perfil').doc(dados.perfil.data), dados.perfil)
  n += 2
}
for (const r of dados.referencias ?? []) { batch.set(db.collection('ig_referencias').doc(r.handle), r, { merge: true }); n++ }
for (const t of dados.tendencias ?? []) { batch.set(db.collection('ig_tendencias').doc(t.id), { ...t, id: undefined }, { merge: true }); n++ }

await batch.commit()
console.log(`Importados ${n} documentos (${dados.leads?.length ?? 0} prospects).`)
process.exit(0)
