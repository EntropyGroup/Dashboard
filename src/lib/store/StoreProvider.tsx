import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { seedMemoryStore, useCollection } from './useCollection'
import { seededCollections } from './seed'
import type {
  Atividade,
  Board,
  Client,
  Evento,
  Lancamento,
  Lead,
  PersonalProject,
  Project,
  SyncStatus,
} from './types'

interface StoreValue {
  projetos: ReturnType<typeof useCollection<Project>>
  projetosPessoais: ReturnType<typeof useCollection<PersonalProject>>
  clientes: ReturnType<typeof useCollection<Client>>
  lancamentos: ReturnType<typeof useCollection<Lancamento>>
  eventos: ReturnType<typeof useCollection<Evento>>
  atividades: ReturnType<typeof useCollection<Atividade>>
  leads: ReturnType<typeof useCollection<Lead>>
  quadroEquipe: ReturnType<typeof useCollection<Board>>
  minhasNotas: ReturnType<typeof useCollection<Board>>
  /** last bank sync, written by scripts/sync-pluggy.mjs */
  syncBanco: SyncStatus | undefined
  log: (texto: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    seedMemoryStore('clientes', seededCollections.clientes)
    seedMemoryStore('projetos', seededCollections.projetos)
    seedMemoryStore('lancamentos', seededCollections.lancamentos)
    seedMemoryStore('eventos', seededCollections.eventos)
    seedMemoryStore('atividades', seededCollections.atividades)
    seedMemoryStore('leads', seededCollections.leads)
  }, [])

  const projetos = useCollection<Project>('projetos', { orderByField: 'criadoEm', direction: 'desc' })
  const projetosPessoais = useCollection<PersonalProject>(`projetosPessoais/${user?.uid ?? 'anon'}/itens`)
  const clientes = useCollection<Client>('clientes', { orderByField: 'nome' })
  const lancamentosAll = useCollection<Lancamento>('lancamentos', { orderByField: 'data', direction: 'desc' })
  // hidden bank entries stay in Firestore so the sync doesn't recreate them, but vanish everywhere in the app
  const lancamentos = useMemo(
    () => ({ ...lancamentosAll, items: lancamentosAll.items.filter((l) => !l.oculto) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lancamentosAll.items, lancamentosAll.loading],
  )
  const eventos = useCollection<Evento>('eventos', { orderByField: 'data' })
  const atividades = useCollection<Atividade>('atividades', { orderByField: 'criadoEm', direction: 'desc' })
  const leads = useCollection<Lead>('leads', { orderByField: 'criadoEm', direction: 'desc' })
  const quadroEquipe = useCollection<Board>('quadros')
  const minhasNotas = useCollection<Board>(`quadros_usuario/${user?.uid ?? 'anon'}/itens`)
  const sync = useCollection<SyncStatus>('sync')
  const syncBanco = sync.items.find((s) => s.id === 'pluggy')

  function log(texto: string) {
    atividades.add({
      texto,
      autorUid: user?.uid,
      autorNome: user?.displayName ?? user?.email ?? undefined,
      criadoEm: new Date().toISOString(),
    }).catch(() => {}) // the failure is already toasted; the logged action itself succeeded
  }

  return (
    <StoreContext.Provider
      value={{
        projetos,
        projetosPessoais,
        clientes,
        lancamentos,
        eventos,
        atividades,
        leads,
        quadroEquipe,
        minhasNotas,
        syncBanco,
        log,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
