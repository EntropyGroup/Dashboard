import { useEffect, useMemo, useState } from 'react'
import {
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
import { db, isFirebaseConfigured } from '@/lib/firebase'
import { uid } from '@/lib/utils'

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
        () => setLoading(false),
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
          await setDoc(doc(db, path, id), data as any)
        } else {
          const store = getMemoryStore(path)
          store[id] = { id, ...data }
          notify(path)
        }
        return id
      },
      async update(id: string, data: Partial<T>) {
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, path, id), data as any)
        } else {
          const store = getMemoryStore(path)
          if (store[id]) Object.assign(store[id], data)
          notify(path)
        }
      },
      async remove(id: string) {
        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, path, id))
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
