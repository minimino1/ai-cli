// ─── Git Interactive Operations ────────────────────────────────────────
// Advanced interactive git operations: stash, bisect, worktree

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

// ─── Stash Operations ───────────────────────────────────────────────

/**
 * Create a stash with optional message
 * Usage: git stash push -m "message"
 */
export async function stashCreate(message?: string): Promise<string> {
  const args = ['stash', 'push']
  if (message) {
    args.push('-m', message)
  }

  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error creating stash:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Stash created${colors.reset}\n${result.stdout}`
}

/**
 * List all stashes
 * Usage: git stash list
 */
export async function stashList(): Promise<string> {
  const result = await runGit(['stash', 'list'])

  if (!result.success) {
    return `${colors.red}Error listing stashes:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No stashes found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    // Stash entries look like: stash@{0}: WIP on branch: message
    if (line.startsWith('stash@')) {
      const match = line.match(/(stash@\{?\d+\}?):\s+(.+)/)
      if (match) {
        return `${colors.cyan}${match[1]}${colors.reset}: ${match[2]}`
      }
    }
    return line
  }).join('\n')
}

/**
 * Apply a stash by index (default 0)
 * Usage: git stash apply [stash@{index}]
 */
export async function stashApply(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'apply', stashRef])

  if (!result.success) {
    return `${colors.red}Error applying stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Applied ${stashRef}${colors.reset}\n${result.stdout}`
}

/**
 * Pop a stash (apply and drop)
 * Usage: git stash pop [stash@{index}]
 */
export async function stashPop(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'pop', stashRef])

  if (!result.success) {
    return `${colors.red}Error popping stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Popped ${stashRef}${colors.reset}\n${result.stdout}`
}

/**
 * Drop a stash by index
 * Usage: git stash drop [stash@{index}]
 */
export async function stashDrop(index: number = 0): Promise<string> {
  const stashRef = `stash@{${index}}`
  const result = await runGit(['stash', 'drop', stashRef])

  if (!result.success) {
    return `${colors.red}Error dropping stash ${stashRef}:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Dropped ${stashRef}${colors.reset}`
}

// ─── Bisect Operations ───────────────────────────────────────────────

/**
 * Start a bisect session
 * Usage: git bisect start <bad> <good>
 */
export async function bisectStart(good: string, bad: string = 'HEAD'): Promise<string> {
  const result = await runGit(['bisect', 'start', bad, good])

  if (!result.success) {
    return `${colors.red}Error starting bisect:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Bisect started${colors.reset}\n${result.stdout}`
}

/**
 * Mark current commit as good
 * Usage: git bisect good
 */
export async function bisectGood(): Promise<string> {
  const result = await runGit(['bisect', 'good'])

  if (!result.success) {
    return `${colors.red}Error marking as good:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Marked as good${colors.reset}\n${result.stdout}`
}

/**
 * Mark current commit as bad
 * Usage: git bisect bad
 */
export async function bisectBad(): Promise<string> {
  const result = await runGit(['bisect', 'bad'])

  if (!result.success) {
    return `${colors.red}Error marking as bad:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Marked as bad${colors.reset}\n${result.stdout}`
}

/**
 * Reset bisect session
 * Usage: git bisect reset
 */
export async function bisectReset(): Promise<string> {
  const result = await runGit(['bisect', 'reset'])

  if (!result.success) {
    return `${colors.red}Error resetting bisect:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Bisect reset${colors.reset}\n${result.stdout}`
}

// ─── Worktree Operations ─────────────────────────────────────────────

/**
 * Add a new worktree
 * Usage: git worktree add <path> [branch]
 */
export async function worktreeAdd(path: string, branch?: string): Promise<string> {
  const args = ['worktree', 'add', path]
  if (branch) {
    args.push(branch)
  }

  const result = await runGit(args)

  if (!result.success) {
    return `${colors.red}Error adding worktree:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Worktree added: ${path}${colors.reset}\n${result.stdout}`
}

/**
 * List all worktrees
 * Usage: git worktree list
 */
export async function worktreeList(): Promise<string> {
  const result = await runGit(['worktree', 'list'])

  if (!result.success) {
    return `${colors.red}Error listing worktrees:${colors.reset} ${result.stderr}`
  }

  if (!result.stdout) {
    return `${colors.yellow}No worktrees found${colors.reset}`
  }

  const lines = result.stdout.split('\n').filter(l => l.trim())
  return lines.map(line => {
    // Worktree lines: <path> <branch> [detached]
    const parts = line.split(/\s+/)
    if (parts.length >= 2) {
      const path = parts[0]
      const branch = parts[1]
      const rest = parts.slice(2).join(' ')
      return `${colors.cyan}${path}${colors.reset} ${colors.green}${branch}${colors.reset}${rest ? ` ${rest}` : ''}`
    }
    return line
  }).join('\n')
}

/**
 * Remove a worktree
 * Usage: git worktree remove <path>
 */
export async function worktreeRemove(path: string): Promise<string> {
  const result = await runGit(['worktree', 'remove', path])

  if (!result.success) {
    return `${colors.red}Error removing worktree:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Worktree removed: ${path}${colors.reset}\n${result.stdout}`
}

// ─── Interactive Rebase ──────────────────────────────────────────────

/**
 * Start an interactive rebase
 * Usage: git rebase -i <commit>
 */
export async function interactiveRebase(commit: string): Promise<string> {
  const result = await runGit(['rebase', '-i', commit])

  if (!result.success) {
    return `${colors.red}Error starting interactive rebase:${colors.reset} ${result.stderr}`
  }

  return `${colors.green}✓ Interactive rebase started${colors.reset}\n${result.stdout}`
}
