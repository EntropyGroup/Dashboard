// Chamada ao Claude pelo CLI do Claude Code, usando a assinatura logada no PC (`claude login`).
// Sem chave de API: o custo é o da assinatura, dentro dos limites dela.

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface ClaudeOpts {
  /** ferramentas liberadas, ex.: ['WebSearch', 'WebFetch'] */
  tools?: string[]
  /** servidores MCP liberados (por nome, como em `claude mcp list`) */
  mcp?: string[]
  maxTurns?: number
  timeoutMs?: number
}

const BIN = process.env.HARVEY_CLAUDE_BIN || 'claude'

export async function perguntar(prompt: string, opts: ClaudeOpts = {}): Promise<string> {
  // pasta vazia: o Claude não lê CLAUDE.md, código nem arquivos do PC
  const cwd = mkdtempSync(join(tmpdir(), 'harvey-'))
  const allowed = [...(opts.tools ?? []), ...(opts.mcp ?? []).map((s) => `mcp__${s}`)]
  const args = ['-p', '--output-format', 'json', '--max-turns', String(opts.maxTurns ?? 12)]
  if (allowed.length) args.push('--allowedTools', allowed.join(','))
  if (!opts.mcp?.length) args.push('--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}')
  if (process.env.HARVEY_MODEL) args.push('--model', process.env.HARVEY_MODEL)

  try {
    const out = await new Promise<string>((resolve, reject) => {
      const child = spawn(BIN, args, { cwd, env: process.env, shell: process.platform === 'win32' })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('o Claude demorou demais para responder'))
      }, opts.timeoutMs ?? 6 * 60_000)
      child.stdout.on('data', (d) => (stdout += d))
      child.stderr.on('data', (d) => (stderr += d))
      child.on('error', (e) => { clearTimeout(timer); reject(new Error(`não consegui rodar "${BIN}": ${e.message}. O Claude Code está instalado e logado?`)) })
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code !== 0 && !stdout.trim()) reject(new Error(`claude saiu com código ${code}: ${stderr.slice(0, 400)}`))
        else resolve(stdout)
      })
      child.stdin.write(prompt)
      child.stdin.end()
    })
    let parsed: { result?: string; is_error?: boolean; subtype?: string }
    try {
      parsed = JSON.parse(out)
    } catch {
      throw new Error(`resposta do CLI fora do formato esperado: ${out.slice(0, 300)}`)
    }
    if (parsed.is_error || !parsed.result) throw new Error(`o Claude não terminou a tarefa (${parsed.subtype ?? 'sem resultado'})`)
    return parsed.result
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

/** Extrai o primeiro objeto JSON da resposta (aceita bloco ```json ou texto em volta). */
export function extrairJson<T>(texto: string): T {
  const bloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/)
  const bruto = bloco ? bloco[1] : texto
  const ini = bruto.indexOf('{')
  const fim = bruto.lastIndexOf('}')
  if (ini < 0 || fim < ini) throw new Error('a resposta não trouxe JSON')
  return JSON.parse(bruto.slice(ini, fim + 1)) as T
}
