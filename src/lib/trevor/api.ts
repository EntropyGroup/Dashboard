import { auth } from '../firebase'
import { localDateKey } from '../utils'
import { parseTrevorReply, type ChatTurn } from '../../../shared/trevor'

const baseUrl = (import.meta.env.VITE_TREVOR_API_URL || '').replace(/\/$/, '')
export async function inspectTrevorApi(signal?: AbortSignal): Promise<{ ready: boolean; error: string }> {
  try {
    const response = await fetch(`${baseUrl}/api/trevor/health`, { signal: signal ?? AbortSignal.timeout(10000), cache: 'no-store' })
    if (!response.ok) return { ready: false, error: response.status >= 500
      ? `O servidor do Trevor falhou (HTTP ${response.status}). Confira os logs do deploy na Vercel.`
      : response.status === 404 ? 'A API do Trevor não foi encontrada. Confira se o deploy inclui o backend atualizado.'
      : `Não foi possível acessar o Trevor (HTTP ${response.status}).` }
    const data = await response.json().catch(() => null)
    if (!data || data.provider !== 'gemini' || typeof data.ready !== 'boolean') return { ready: false, error: 'O endereço da API não retornou uma resposta válida do Trevor. Confira o deploy e a URL configurada.' }
    return data.ready ? { ready: true, error: '' } : { ready: false, error: 'A chave GEMINI_API_KEY não está configurada no servidor. Salve a variável na Vercel e faça um novo deploy.' }
  } catch {
    return { ready: false, error: 'Não foi possível conectar ao servidor do Trevor. Confira a conexão e o endereço da API.' }
  }
}

export async function requestTrevor(message: string, history: ChatTurn[], context: unknown) {
  if (!auth?.currentUser) throw new Error('Use o login Firebase para conversar com o Gemini. O modo de demonstração usa apenas análises locais.')
  const token = await auth.currentUser.getIdToken()
  const recentHistory = history.slice(-12).map((turn) => ({ ...turn, content: turn.content.slice(-12000) }))
  while (recentHistory.reduce((total, turn) => total + turn.content.length, 0) > 18000) recentHistory.splice(0, 2)
  const response = await fetch(`${baseUrl}/api/trevor`, {
    method: 'POST', signal: AbortSignal.timeout(35000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, history: recentHistory, context, today: localDateKey(new Date()), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'O serviço do Trevor está indisponível.')
  return parseTrevorReply(data)
}
