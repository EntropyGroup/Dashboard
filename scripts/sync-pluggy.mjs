// Pulls bank transactions from Pluggy (MeuPluggy) into Firestore `lancamentos`.
// Runs on GitHub Actions (.github/workflows/sync-banco.yml) or locally:
//   node --env-file=.env scripts/sync-pluggy.mjs
//
// Env:
//   PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET  — Pluggy dashboard → application credentials
//   PLUGGY_ITEM_IDS                         — comma-separated item ids (one per bank connection)
//   FIREBASE_SERVICE_ACCOUNT                — service account JSON (the whole file, as one string)
//   SYNC_DAYS                               — how far back to read (default 30)
//   PLUGGY_SKIP_REGEX                       — optional extra descriptions to ignore (case-insensitive)

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const API = 'https://api.pluggy.ai'

const env = process.env
const missing = ['PLUGGY_CLIENT_ID', 'PLUGGY_CLIENT_SECRET', 'PLUGGY_ITEM_IDS', 'FIREBASE_SERVICE_ACCOUNT'].filter(
  (k) => !env[k]?.trim(),
)
if (missing.length) {
  console.error(`Faltam variáveis de ambiente: ${missing.join(', ')}`)
  process.exit(1)
}

const itemIds = env.PLUGGY_ITEM_IDS.split(',').map((s) => s.trim()).filter(Boolean)
const syncDays = Math.max(1, Number(env.SYNC_DAYS || 30))
const extraSkip = env.PLUGGY_SKIP_REGEX ? new RegExp(env.PLUGGY_SKIP_REGEX, 'i') : null

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

// ---------- Pluggy ----------

async function pluggy(pathOrUrl, apiKey, init = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}), ...init.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pluggy ${init.method ?? 'GET'} ${url.replace(API, '')} → ${res.status} ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function authenticate() {
  const { apiKey } = await pluggy('/auth', null, {
    method: 'POST',
    body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }),
  })
  return apiKey
}

// GET /v2/transactions paginates with a cursor; `next` is a ready-made query string (or a URL).
async function fetchTransactions(apiKey, accountId, dateFrom, dateTo) {
  const all = []
  let next = `?accountId=${accountId}&dateFrom=${dateFrom}&dateTo=${dateTo}`
  for (let guard = 0; next && guard < 200; guard++) {
    const target = next.startsWith('http') ? next : `/v2/transactions${next.startsWith('?') ? next : `?${next}`}`
    const page = await pluggy(target, apiKey)
    all.push(...(page.results ?? []))
    next = page.next || null
  }
  return all
}

// ---------- mapping ----------

const CATEGORIAS = {
  'Food and drinks': 'Alimentação',
  Restaurants: 'Restaurantes',
  Groceries: 'Mercado',
  'Eating out': 'Restaurantes',
  'Food delivery': 'Delivery',
  Transportation: 'Transporte',
  'Taxi and ride-hailing': 'Transporte',
  'Gas stations': 'Combustível',
  Shopping: 'Compras',
  'Online shopping': 'Compras online',
  Services: 'Serviços',
  'Digital services': 'Serviços digitais',
  'Video streaming': 'Streaming',
  'Music streaming': 'Streaming',
  Telecommunications: 'Telefone e internet',
  Health: 'Saúde',
  Pharmacy: 'Farmácia',
  Education: 'Educação',
  Travel: 'Viagem',
  Housing: 'Moradia',
  Utilities: 'Contas da casa',
  Leisure: 'Lazer',
  Taxes: 'Impostos',
  'Bank fees': 'Tarifas bancárias',
  Income: 'Receita',
  Salary: 'Salário',
  Transfer: 'Transferência',
  Transfers: 'Transferência',
  'Transfer - PIX': 'Pix',
  Investments: 'Investimentos',
  Insurance: 'Seguros',
}

function categoria(tx) {
  if (!tx.category) return 'Sem categoria'
  return CATEGORIAS[tx.category] ?? tx.category
}

/**
 * Card purchases already come from the card account. Paying the bill from the checking
 * account (and the matching "payment received" on the card) would count them twice.
 */
function shouldSkip(tx, account) {
  const cat = tx.category ?? ''
  const desc = `${tx.description ?? ''} ${tx.descriptionRaw ?? ''}`
  if (/credit card payment|same person transfer/i.test(cat)) return true
  if (account.type === 'CREDIT' && tx.type === 'CREDIT' && /pagamento|pgto|payment/i.test(desc)) return true
  if (account.type === 'BANK' && tx.type === 'DEBIT' && /fatura/i.test(desc)) return true
  if (extraSkip?.test(desc)) return true
  return false
}

function toLancamento(tx, account) {
  const meta = tx.creditCardMetadata
  const parcela =
    meta?.installmentNumber && meta?.totalInstallments > 1
      ? `${meta.installmentNumber}/${meta.totalInstallments}`
      : undefined
  return {
    // `type` is the direction for every account kind; the sign of `amount` flips on cards
    tipo: tx.type === 'CREDIT' ? 'entrada' : 'saida',
    valor: Math.round(Math.abs(Number(tx.amount)) * 100) / 100,
    data: new Date(tx.date).toISOString(),
    descricao: (tx.merchant?.businessName || tx.merchant?.name || tx.description || 'Transação').trim(),
    categoria: categoria(tx),
    banco: {
      provedor: 'pluggy',
      transacaoId: tx.id,
      contaId: account.id,
      contaNome: account.marketingName || account.name || (account.type === 'CREDIT' ? 'Cartão' : 'Conta'),
      contaTipo: account.type,
      status: tx.status,
      parcela,
    },
  }
}

// ---------- sync ----------

const day = (d) => d.toISOString().slice(0, 10)

async function run() {
  const apiKey = await authenticate()
  const to = new Date()
  const from = new Date(to.getTime() - syncDays * 86400000)

  const existingSnap = await db.collection('lancamentos').where('origem', '==', 'banco').get()
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]))

  const writer = db.bulkWriter()
  const stats = { novos: 0, atualizados: 0, removidos: 0, ignorados: 0 }
  const contas = []

  for (const itemId of itemIds) {
    const item = await pluggy(`/items/${itemId}`, apiKey)
    if (item.status && !['UPDATED', 'UPDATING'].includes(item.status)) {
      console.warn(`Item ${itemId} (${item.connector?.name ?? '?'}) está ${item.status}: os dados podem estar desatualizados.`)
    }
    const { results: accounts = [] } = await pluggy(`/accounts?itemId=${itemId}`, apiKey)

    for (const account of accounts) {
      if (!['BANK', 'CREDIT'].includes(account.type)) continue
      const nome = account.marketingName || account.name
      contas.push(nome)
      const txs = await fetchTransactions(apiKey, account.id, day(from), day(to))
      const seen = new Set()

      for (const tx of txs) {
        if (shouldSkip(tx, account)) {
          stats.ignorados++
          continue
        }
        const id = `pluggy_${tx.id}`
        seen.add(id)
        const data = toLancamento(tx, account)
        const prev = existing.get(id)
        const ref = db.collection('lancamentos').doc(id)

        if (!prev) {
          writer.set(ref, { ...data, origem: 'banco', criadoEm: new Date().toISOString() })
          stats.novos++
        } else {
          // bank-owned fields only: descricao, categoria, projetoId and oculto belong to the team
          const changed =
            prev.valor !== data.valor ||
            prev.data !== data.data ||
            prev.tipo !== data.tipo ||
            prev.banco?.status !== data.banco.status
          if (changed) {
            writer.update(ref, {
              valor: data.valor,
              data: data.data,
              tipo: data.tipo,
              'banco.status': data.banco.status,
              'banco.parcela': data.banco.parcela ?? null,
            })
            stats.atualizados++
          }
        }
      }

      // a pending transaction the bank later dropped: remove it, unless the team hid it
      for (const [id, prev] of existing) {
        if (prev.banco?.contaId !== account.id || seen.has(id) || prev.oculto) continue
        if (new Date(prev.data) >= from) {
          writer.delete(db.collection('lancamentos').doc(id))
          stats.removidos++
        }
      }
    }
  }

  await writer.close()

  await db.doc('sync/pluggy').set({
    ultimaExecucao: new Date().toISOString(),
    status: 'ok',
    novos: stats.novos,
    atualizados: stats.atualizados,
    removidos: stats.removidos,
    contas,
    mensagem: null,
  })

  if (stats.novos > 0) {
    await db.collection('atividades').add({
      texto: `Banco sincronizado: <b>${stats.novos}</b> novo(s) lançamento(s)`,
      autorNome: 'Sincronização bancária',
      criadoEm: new Date().toISOString(),
    })
  }

  console.log(
    `OK — ${contas.length} conta(s), últimos ${syncDays} dias: ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.removidos} removidos, ${stats.ignorados} ignorados (fatura/transferência própria).`,
  )
}

run().catch(async (err) => {
  console.error(err)
  try {
    await db.doc('sync/pluggy').set(
      { ultimaExecucao: new Date().toISOString(), status: 'erro', mensagem: String(err.message ?? err).slice(0, 300) },
      { merge: true },
    )
  } catch {}
  process.exit(1)
})
