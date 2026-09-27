import { useEffect, useState } from 'react'
import { GitCommitHorizontal, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { parseGithubRepo, fetchRecentCommits, GithubApiError, type GithubCommit } from '@/lib/github'
import { relativeTime } from '@/lib/utils'

export function GithubActivity({ link }: { link: string | undefined }) {
  const repo = parseGithubRepo(link)
  const [commits, setCommits] = useState<GithubCommit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelled = false
    setCommits(null)
    setError(null)
    fetchRecentCommits(repo)
      .then((c) => !cancelled && setCommits(c))
      .catch((err) => !cancelled && setError(err instanceof GithubApiError ? err.message : 'Não foi possível carregar os commits.'))
    return () => {
      cancelled = true
    }
  }, [repo?.owner, repo?.repo])

  if (!repo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade no GitHub</CardTitle>
        <a
          href={`https://github.com/${repo.owner}/${repo.repo}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[11px] text-steel hover:text-porcelain"
        >
          {repo.owner}/{repo.repo}
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>

      {error && <p className="text-xs text-danger">{error}</p>}

      {!error && !commits && (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="glass-inset h-11 animate-pulse rounded-lg" />
          ))}
        </ul>
      )}

      {commits && commits.length === 0 && <p className="text-xs text-steel">Nenhum commit encontrado.</p>}

      {commits && commits.length > 0 && (
        <ul className="space-y-1.5">
          {commits.map((c) => (
            <li key={c.sha}>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="glass-inset flex items-center gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-white/[0.05]"
              >
                {c.authorAvatar ? (
                  <img src={c.authorAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full" />
                ) : (
                  <div className="glass flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-steel">
                    <GitCommitHorizontal className="h-3 w-3" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-porcelain">{c.message}</p>
                  <p className="text-[10px] text-steel">
                    {c.authorName} · {relativeTime(c.date)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-steel">{c.sha.slice(0, 7)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
