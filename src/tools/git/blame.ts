// ─── Git Blame ─────────────────────────────────────────────────────────
// Line-by-line blame and author statistics

import { spawn } from 'bun'

export interface GitResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

export interface BlameLine {
  lineNumber: number
  commit: string
  author: string
  date: string
  content: string
}

export interface BlameSummary {
  author: string
  lines: number
  percentage: number
  commits: number
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

// ─── Parse Blame Output ─────────────────────────────────────────────
function parseBlameLine(line: string, lineNum: number): BlameLine | null {
  // Git blame default format: <commit-hash> (<author> <date> <time>) <line-number> <content>
  // Example: 5e2a3b4 (John Doe 2024-01-15 10:30:15 +0000 1)  import React from 'react'

  // Try to parse the default blame format
  const regex = /^([a-f0-9]+)\s+\(([^)]+)\)\s+(\d+)\s+(.+)$/
  const match = line.match(regex)

  if (!match) return null

  const [, commit, authorDate, contentLineNum, content] = match
  const authorDateParts = authorDate.trim().split(/\s+/)

  // Extract author (first two+ words until date pattern)
  let author = authorDateParts.slice(0, -2).join(' ')
  let date = authorDateParts.slice(-2).join(' ')

  return {
    lineNumber: lineNum,
    commit: commit.slice(0, 8),
    author: author || 'Unknown',
    date,
    content,
  }
}

// ─── Blame File ─────────────────────────────────────────────────────
/**
 * Get line-by-line blame for a file
 */
export async function blame(filePath: string): Promise<string> {
  const result = await runGit(['blame', '--line-porcelain', filePath])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No blame information available${colors.reset}`
  }

  const lines = result.stdout.split('\n')
  const blameLines: BlameLine[] = []
  let currentLineNum = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Line number marker
    if (line.startsWith('line ')) {
      currentLineNum = parseInt(line.split(' ')[1]) || 0
      continue
    }

    // Commit line
    if (line.startsWith('commit ')) {
      const commit = line.split(' ')[1]
      const authorLine = lines.find(l => l.startsWith('author '))
      const author = authorLine ? authorLine.replace('author ', '') : 'Unknown'
      const authorTimeLine = lines.find(l => l.startsWith('author-time '))
      const timestamp = authorTimeLine ? authorTimeLine.replace('author-time ', '') : ''
      const date = timestamp ? new Date(parseInt(timestamp) * 1000).toLocaleDateString() : ''

      // Find content line (the actual code)
      const contentIdx = i + 1
      while (contentIdx < lines.length && lines[contentIdx].startsWith('\t')) {
        const content = lines[contentIdx].slice(1) // Remove leading tab
        blameLines.push({
          lineNumber: currentLineNum,
          commit: commit.slice(0, 8),
          author,
          date,
          content,
        })
        break
      }
    }
  }

  if (blameLines.length === 0) {
    return `${colors.yellow}No blame data parsed${colors.reset}`
  }

  // Format output
  const output: string[] = []
  output.push(`${colors.bold}Line  Commit    Author              Date       Content${colors.reset}`)
  output.push('─'.repeat(80))

  for (const bl of blameLines) {
    const lineNum = String(bl.lineNumber).padStart(4)
    const commit = bl.commit.padEnd(10)
    const author = bl.author.padEnd(20)
    const date = bl.date.padEnd(10)
    const content = bl.content

    output.push(`${lineNum}  ${colors.cyan}${commit}${colors.reset} ${colors.yellow}${author}${colors.reset} ${colors.dim}${date}${colors.reset} ${content}`)
  }

  return output.join('\n')
}

// ─── Blame Summary ──────────────────────────────────────────────────
/**
 * Get blame summary grouped by author
 */
export async function blameSummary(filePath: string): Promise<string> {
  const result = await runGit(['blame', '--line-porcelain', filePath])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No blame information available${colors.reset}`
  }

  const lines = result.stdout.split('\n')
  const authorLines = new Map<string, { lines: number; commits: Set<string> }>()

  let currentCommit = ''
  let currentAuthor = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('commit ')) {
      currentCommit = line.split(' ')[1]
    } else if (line.startsWith('author ')) {
      currentAuthor = line.replace('author ', '')
    } else if (line.startsWith('\t') && currentAuthor) {
      if (!authorLines.has(currentAuthor)) {
        authorLines.set(currentAuthor, { lines: 0, commits: new Set() })
      }
      const entry = authorLines.get(currentAuthor)!
      entry.lines++
      entry.commits.add(currentCommit)
    }
  }

  if (authorLines.size === 0) {
    return `${colors.yellow}No blame data available${colors.reset}`
  }

  // Calculate total lines
  const totalLines = Array.from(authorLines.values()).reduce((sum, entry) => sum + entry.lines, 0)

  // Sort by lines descending
  const sorted = Array.from(authorLines.entries())
    .map(([author, data]) => ({
      author,
      lines: data.lines,
      percentage: (data.lines / totalLines) * 100,
      commits: data.commits.size,
    }))
    .sort((a, b) => b.lines - a.lines)

  // Format output
  const output: string[] = []
  output.push(`${colors.bold}Blame Summary: ${filePath}${colors.reset}`)
  output.push(`Total lines: ${totalLines}`)
  output.push('')
  output.push(`${colors.bold}Author                          Lines    %        Commits${colors.reset}`)
  output.push('─'.repeat(80))

  for (const entry of sorted) {
    const author = entry.author.padEnd(30)
    const lines = String(entry.lines).padStart(6)
    const percentage = entry.percentage.toFixed(1).padStart(6)
    const commits = String(entry.commits).padStart(8)

    output.push(`${colors.yellow}${author}${colors.reset} ${colors.green}${lines}${colors.reset} ${colors.cyan}${percentage}%${colors.reset} ${colors.magenta}${commits}${colors.reset}`)
  }

  return output.join('\n')
}

// ─── Blame Date Range ───────────────────────────────────────────────
/**
 * Get blame for a specific date range
 */
export async function blameDateRange(filePath: string, since: string, until?: string): Promise<string> {
  const args = ['blame', '--line-porcelain', '--since', since]
  if (until) {
    args.push('--until', until)
  }
  args.push(filePath)

  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No commits found in date range${colors.reset}`
  }

  // Parse similar to regular blame but filter by date
  const lines = result.stdout.split('\n')
  const blameLines: BlameLine[] = []
  let currentLineNum = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('line ')) {
      currentLineNum = parseInt(line.split(' ')[1]) || 0
      continue
    }

    if (line.startsWith('commit ')) {
      const commit = line.split(' ')[1]
      const authorLine = lines.find(l => l.startsWith('author '))
      const author = authorLine ? authorLine.replace('author ', '') : 'Unknown'
      const authorTimeLine = lines.find(l => l.startsWith('author-time '))
      const timestamp = authorTimeLine ? authorTimeLine.replace('author-time ', '') : ''
      const date = timestamp ? new Date(parseInt(timestamp) * 1000).toLocaleDateString() : ''

      const contentIdx = i + 1
      while (contentIdx < lines.length && lines[contentIdx].startsWith('\t')) {
        const content = lines[contentIdx].slice(1)
        blameLines.push({
          lineNumber: currentLineNum,
          commit: commit.slice(0, 8),
          author,
          date,
          content,
        })
        break
      }
    }
  }

  if (blameLines.length === 0) {
    return `${colors.yellow}No blame data in date range${colors.reset}`
  }

  const output: string[] = []
  output.push(`${colors.bold}Blame (${since}${until ? ` to ${until}` : ''}): ${filePath}${colors.reset}`)
  output.push('')
  output.push(`${colors.bold}Line  Commit    Author              Date       Content${colors.reset}`)
  output.push('─'.repeat(80))

  for (const bl of blameLines) {
    const lineNum = String(bl.lineNumber).padStart(4)
    const commit = bl.commit.padEnd(10)
    const author = bl.author.padEnd(20)
    const date = bl.date.padEnd(10)

    output.push(`${lineNum}  ${colors.cyan}${commit}${colors.reset} ${colors.yellow}${author}${colors.reset} ${colors.dim}${date}${colors.reset} ${bl.content}`)
  }

  return output.join('\n')
}
