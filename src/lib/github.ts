export interface GithubRepoRef {
  owner: string
  repo: string
}

export interface GithubCommit {
  sha: string
  message: string
  authorName: string
  authorAvatar?: string
  date: string
  url: string
}

/** Accepts github.com/owner/repo, with or without protocol, trailing slash, .git, or a deeper path. */
export function parseGithubRepo(url: string | undefined): GithubRepoRef | null {
  if (!url) return null
  const match = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i.exec(url.trim())
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

export class GithubApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export async function fetchRecentCommits({ owner, repo }: GithubRepoRef, limit = 5): Promise<GithubCommit[]> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (res.status === 404) throw new GithubApiError('Repositório não encontrado ou privado.', 404)
  if (res.status === 403) throw new GithubApiError('Limite de requisições do GitHub atingido. Tente de novo em instantes.', 403)
  if (!res.ok) throw new GithubApiError(`GitHub respondeu ${res.status}.`, res.status)

  const data = await res.json()
  return (data as any[]).map((c) => ({
    sha: c.sha,
    message: (c.commit?.message ?? '').split('\n')[0],
    authorName: c.author?.login ?? c.commit?.author?.name ?? 'desconhecido',
    authorAvatar: c.author?.avatar_url,
    date: c.commit?.author?.date ?? c.commit?.committer?.date,
    url: c.html_url,
  }))
}
