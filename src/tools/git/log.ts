// ─── Advanced Git Log ───────────────────────────────────────────────────
// Formatted git log with graph, filtering, and statistics

import { spawn } from 'bun'

export interface GitResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

export interface LogOptions {
  since?: string       // e.g., "2 weeks ago", "2024-01-01"
  until?: string       // e.g., "2024-12-31"
  author?: string      // author name or email
  grep?: string        // commit message grep pattern
  path?: string        // limit to specific path
  limit?: number       // max number of commits (default: 50)
  format?: string      // custom format: %H, %h, %s, %an, %ae, %ad, %cr
  graph?: boolean      // show ASCII graph (default: true)
  stats?: boolean      // show insertions/deletions per commit
  oneline?: boolean    // one line per commit
  decorate?: boolean   // show ref names (branches, tags)
}

// ─── Color Codes ───────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

// ─── Run Git Command ───────────────────────────────────────────────
async function runGit(args: string[]): Promise<GitResult> {
  const subprocess = Bun.spawn({
    program: 'git',
    args,
    cwd: Bun.cwd(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let stdout = ''
  let stderr = ''

  if (subprocess.stdout) {
    const reader = subprocess.stdout.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) stdout += new TextDecoder().decode(value)
      }
    } catch {}
    finally {
      reader.releaseLock()
    }
  }

  if (subprocess.stderr) {
    const reader = subprocess.stderr.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) stderr += new TextDecoder().decode(value)
      }
    } catch {}
    finally {
      reader.releaseLock()
    }
  }

  const exitCode = await subprocess.exited
  return { success: exitCode === 0, exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

// ─── Parse Log Line ─────────────────────────────────────────────────
function parseLogLine(line: string, format: string): Record<string, string> {
  const placeholders = ['%H', '%h', '%s', '%an', '%ae', '%ad', '%cr']
  const values: Record<string, string> = {}

  // Extract values based on format
  // For simplicity, we'll parse common formats
  if (format === 'oneline' || format === '%h %s') {
    const match = line.match(/^([a-f0-9]+)\s+(.+)$/)
    if (match) {
      values['%h'] = match[1]
      values['%s'] = match[2]
    }
  } else if (format.includes('%an')) {
    // Try to extract author
    const parts = line.split('|')
    if (parts.length >= 3) {
      values['%h'] = parts[0].trim()
      values['%an'] = parts[1].trim()
      values['%s'] = parts[2].trim()
    }
  }

  return values
}

// ─── Colorize Log Line ──────────────────────────────────────────────
function colorizeLogLine(line: string, useGraph: boolean): string {
  // Graph lines start with |, /, \, etc.
  if (useGraph && (line.startsWith('|') || line.startsWith('/') || line.startsWith('\\') || line.startsWith('*'))) {
    return `${colors.dim}${line}${colors.reset}`
  }

  // Commit hash (first 7-8 chars)
  const hashMatch = line.match(/^([a-f0-9]{7,40})\s/)
  if (hashMatch) {
    const hash = hashMatch[1]
    const rest = line.slice(hash.length)
    return `${colors.cyan}${hash}${colors.reset}${rest}`
  }

  return line
}

// ─── Main: Pretty Log ───────────────────────────────────────────────
export async function prettyLog(options: LogOptions = {}): Promise<string> {
  const {
    since,
    until,
    author,
    grep,
    path,
    limit = 50,
    format,
    graph = true,
    stats = false,
    oneline = false,
    decorate = true,
  } = options

  const args: string[] = []

  // Add graph if requested
  if (graph) {
    args.push('--graph')
  }

  // Add decorate if requested
  if (decorate) {
    args.push('--decorate')
  }

  // Format selection
  if (oneline) {
    args.push('--oneline')
  } else if (format) {
    args.push(`--pretty=format:${format}`)
  } else {
    args.push('--pretty=format:%C(yellow)%h%Creset %Cgreen%ad%Creset %Cblue%an%Creset %C(bold)%s%Creset %C(dim)%d%Creset')
    args.push('--date=short')
  }

  // Add stats if requested
  if (stats) {
    args.push('--stat')
  }

  // Filters
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (author) args.push(`--author=${author}`)
  if (grep) args.push(`--grep=${grep}`)
  if (path) args.push('--', path)

  // Limit
  args.push(`-${limit}`)

  const result = await runGit(['log', ...args])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No commits found${colors.reset}`
  }

  // Colorize output
  const lines = result.stdout.split('\n')
  const colored = lines.map(line => colorizeLogLine(line, graph))

  return colored.join('\n')
}

// ─── Convenience Wrappers ───────────────────────────────────────────

/**
 * Get commit log with graph (default)
 */
export async function gitLog(options: LogOptions = {}): Promise<string> {
  return prettyLog({ ...options, graph: true, oneline: false })
}

/**
 * Get simple oneline log
 */
export async function gitLogOneline(limit?: number): Promise<string> {
  return prettyLog({ oneline: true, limit: limit ?? 20, graph: false })
}

/**
 * Get log by author
 */
export async function gitLogByAuthor(author: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, author, limit: options?.limit ?? 30 })
}

/**
 * Get log for specific file
 */
export async function gitLogFile(filePath: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, path: filePath, limit: options?.limit ?? 20 })
}

/**
 * Get log with stats (insertions/deletions)
 */
export async function gitLogWithStats(limit?: number): Promise<string> {
  return prettyLog({ stats: true, limit: limit ?? 20 })
}

/**
 * Get log for date range
 */
export async function gitLogSince(since: string, until?: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, since, until, limit: options?.limit ?? 50 })
}
