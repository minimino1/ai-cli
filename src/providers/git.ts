// ─── Git Provider ───────────────────────────────────────────────────
// Provides git operations with colored output

import { spawn } from 'bun'

export interface GitResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

// ─── Color Codes ───────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
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

  // Read stdout
  if (subprocess.stdout) {
    const reader = subprocess.stdout.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          stdout += new TextDecoder().decode(value)
        }
      }
    } catch {
      // ignore read errors
    } finally {
      reader.releaseLock()
    }
  }

  // Read stderr
  if (subprocess.stderr) {
    const reader = subprocess.stderr.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          stderr += new TextDecoder().decode(value)
        }
      }
    } catch {
      // ignore read errors
    } finally {
      reader.releaseLock()
    }
  }

  const exitCode = await subprocess.exited

  return {
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  }
}

// ─── Git Status ────────────────────────────────────────────────────
export async function gitStatus(): Promise<string> {
  const result = await runGit(['status', '--porcelain', '--branch'])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.green}✓ Working tree clean${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  const output: string[] = []

  for (const line of lines) {
    if (line.startsWith('##')) {
      // Branch info
      output.push(`${colors.cyan}${line}${colors.reset}`)
    } else {
      // File status
      const status = line.slice(0, 2)
      const file = line.slice(3)
      let color = colors.reset

      if (status.includes('M')) color = colors.yellow
      else if (status.includes('A')) color = colors.green
      else if (status.includes('D')) color = colors.red
      else if (status.includes('R')) color = colors.blue
      else if (status.includes('?')) color = colors.bold

      output.push(`  ${color}${status}${colors.reset} ${file}`)
    }
  }

  return output.join('\n')
}

// ─── Git Diff ──────────────────────────────────────────────────────
export async function gitDiff(staged: boolean = false): Promise<string> {
  const args = staged ? ['diff', '--cached'] : ['diff']
  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return staged
      ? `${colors.yellow}No staged changes${colors.reset}`
      : `${colors.yellow}No unstaged changes${colors.reset}`
  }

  // Simple colorization for diff
  const lines = result.stdout.split('\n')
  const colored: string[] = []

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      colored.push(`${colors.green}${line}${colors.reset}`)
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      colored.push(`${colors.red}${line}${colors.reset}`)
    } else if (line.startsWith('@@')) {
      colored.push(`${colors.cyan}${line}${colors.reset}`)
    } else {
      colored.push(line)
    }
  }

  return colored.join('\n')
}

// ─── Git Log ───────────────────────────────────────────────────────
export async function gitLog(limit: number = 20): Promise<string> {
  const result = await runGit(['log', `--oneline`, `-${limit}`])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No commits found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    const parts = line.split(' ', 2)
    if (parts.length === 2) {
      return `${colors.green}${parts[0]}${colors.reset} ${parts[1]}`
    }
    return line
  }).join('\n')
}

// ─── Git Add ───────────────────────────────────────────────────────
export async function gitAdd(files: string[]): Promise<string> {
  if (files.length === 0) {
    return `${colors.yellow}Usage: git add <file>...${colors.reset}`
  }

  const result = await runGit(['add', ...files])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Staged ${files.length} file(s)${colors.reset}`
}

// ─── Git Commit ─────────────────────────────────────────────────────
export async function gitCommit(message: string): Promise<string> {
  if (!message.trim()) {
    return `${colors.yellow}Usage: git commit -m "message"${colors.reset}`
  }

  const result = await runGit(['commit', '-m', message])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Committed changes${colors.reset}\n${result.stdout}`
}

// ─── Git Branch ─────────────────────────────────────────────────────
export async function gitBranch(): Promise<string> {
  const result = await runGit(['branch', '-a', '--list', '--color=always'])

  if (!result.success) {
    return `${colors.red}Error:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No branches found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    if (line.startsWith('*')) {
      return `${colors.green}${line}${colors.reset}`
    }
    return line
  }).join('\n')
}
