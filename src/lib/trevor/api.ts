import { auth } from '../firebase'
import { localDateKey } from '../utils'
import { parseTrevorReply, type ChatTurn } from '../../../shared/trevor'

const baseUrl = (import.meta.env.VITE_TREVOR_API_URL || '').replace(/\/$/, '')
export async function checkTrevorApi(signal?: AbortSignal) {
  try {
    const response = await fetch(`${baseUrl}/api/trevor/health`, { signal })
    if (!response.ok) return false
    const data = await response.json()
    return data.ready === true && data.provider === 'gemini'
  } catch { return false }
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
