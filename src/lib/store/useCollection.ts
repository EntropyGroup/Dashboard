import { useEffect, useMemo, useState } from 'react'
import {
  runTransaction,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type QueryConstraint,
} from 'firebase/firestore'
import { toast } from 'sonner'
import { db, isFirebaseConfigured } from '@/lib/firebase'
import { uid } from '@/lib/utils'

function firestoreMessage(err: unknown, action: string) {
  const code = (err as { code?: string })?.code
  if (code === 'permission-denied') return `Sem permissão para ${action}. Confira as regras do Firestore.`
  if (code === 'unavailable') return `Sem conexão com o banco para ${action}. Tente de novo.`
  return `Não foi possível ${action}${code ? ` (${code})` : ''}.`
}

async function guarded<R>(action: string, run: () => Promise<R>): Promise<R> {
  try {
    return await run()
  } catch (err) {
    console.error(`[firestore] ${action}`, err)
    toast.error(firestoreMessage(err, action))
    throw err
  }
}

const memoryStores = new Map<string, Record<string, any>>()
const memoryListeners = new Map<string, Set<() => void>>()

function getMemoryStore(path: string) {
  if (!memoryStores.has(path)) memoryStores.set(path, {})
  return memoryStores.get(path)!
}

function notify(path: string) {
  memoryListeners.get(path)?.forEach((fn) => fn())
}

/**
 * Generic realtime collection hook. Uses Firestore when configured,
 * otherwise falls back to an in-memory store so the app is fully usable
 * before Firebase credentials are added.
 */
export function useCollection<T extends { id: string }>(
  path: string,
  opts?: { orderByField?: string; direction?: 'asc' | 'desc' },
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const constraints: QueryConstraint[] = []
      if (opts?.orderByField) constraints.push(orderBy(opts.orderByField, opts.direction ?? 'asc'))
      const q = query(collection(db, path), ...constraints)
      const unsub = onSnapshot(
        q,
        (snap) => {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T))
          setLoading(false)
        },
        (err) => {
          console.error(`[firestore] leitura de "${path}" falhou`, err)
          // one toast for all collections failing at once (e.g. rules not published)
          toast.error(firestoreMessage(err, 'carregar os dados'), { id: 'firestore-read' })
          setLoading(false)
        },
      )
      return unsub
    }

    const sync = () => {
      const store = getMemoryStore(path)
      let list = Object.values(store) as T[]
      if (opts?.orderByField) {
        const field = opts.orderByField
        list = [...list].sort((a: any, b: any) => {
          const av = a[field] ?? ''
          const bv = b[field] ?? ''
          return av > bv ? 1 : av < bv ? -1 : 0
        })
        if (opts.direction === 'desc') list.reverse()
      }
      setItems(list)
      setLoading(false)
    }

    sync()
    const listeners = memoryListeners.get(path) ?? new Set()
    listeners.add(sync)
    memoryListeners.set(path, listeners)
    return () => {
      listeners.delete(sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, opts?.orderByField, opts?.direction])

  const api = useMemo(
    () => ({
      async add(data: Omit<T, 'id'>, id: string = uid()) {
        if (isFirebaseConfigured && db) {
          const firestore = db
          await guarded('salvar', () => setDoc(doc(firestore, path, id), data as any))
        } else {
          const store = getMemoryStore(path)
          store[id] = { id, ...data }
          notify(path)
        }
        return id
      },
      async update(id: string, data: Partial<T>) {
        if (isFirebaseConfigured && db) {
          const firestore = db
          await guarded('salvar', () => updateDoc(doc(firestore, path, id), data as any))
        } else {
          const store = getMemoryStore(path)
          if (store[id]) Object.assign(store[id], data)
          notify(path)
        }
      },
      async remove(id: string) {
        if (isFirebaseConfigured && db) {
          const firestore = db
          await guarded('excluir', () => deleteDoc(doc(firestore, path, id)))
        } else {
          const store = getMemoryStore(path)
          delete store[id]
          notify(path)
        }
      },
    }),
    [path],
  )

  return { items, loading, ...api }
}

export function seedMemoryStore(path: string, entries: Record<string, any>) {
  if (isFirebaseConfigured) return
  if (!memoryStores.has(path)) {
    memoryStores.set(path, entries)
    notify(path)
  }
}

/** Commit all conversion changes together, including in the demo store. */
export async function saveProjectWithLead(leadId: string, projectId: string, data: Record<string, unknown>, editing: boolean) {
  const clienteId = `lead-${leadId}`
  function clientData(lead: Record<string, any>) {
    return {
      nome: lead.nome,
      ...(lead.contato?.includes('@') ? { email: lead.contato } : { celular: lead.contato || '' }),
      projetos: [projectId],
      criadoEm: new Date().toISOString(),
    }
  }
  if (isFirebaseConfigured && db) {
    const firestore = db
    await guarded('converter lead', () => runTransaction(firestore, async (tx) => {
      const leadRef = doc(firestore, 'leads', leadId)
      const lead = await tx.get(leadRef)
      if (!lead.exists()) throw new Error('Este lead já foi convertido ou removido.')
      tx.set(doc(firestore, 'clientes', clienteId), clientData(lead.data()))
      const projectRef = doc(firestore, 'projetos', projectId)
      if (editing) tx.update(projectRef, { ...data, clienteId })
      else tx.set(projectRef, { ...data, clienteId })
      tx.delete(leadRef)
    }))
  } else {
    const lead = getMemoryStore('leads')[leadId]
    if (!lead) throw new Error('Este lead já foi convertido ou removido.')
    getMemoryStore('clientes')[clienteId] = { id: clienteId, ...clientData(lead) }
    const store = getMemoryStore('projetos')
    store[projectId] = { ...(editing ? store[projectId] : {}), id: projectId, ...data, clienteId }
    delete getMemoryStore('leads')[leadId]
    ;['clientes', 'projetos', 'leads'].forEach(notify)
  }
}
