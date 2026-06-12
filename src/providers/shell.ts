// ─── Shell Provider ────────────────────────────────────────────────
// Execute shell commands with timeout and output capture

import { spawn } from 'bun'

export interface ShellResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  timedOut: boolean
}

// ─── Run Shell Command ─────────────────────────────────────────────
export async function runShell(
  command: string,
  args: string[] = [],
  timeoutMs: number = 30000
): Promise<ShellResult> {
  const subprocess = Bun.spawn({
    program: command,
    args,
    cwd: Bun.cwd(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let stdout = ''
  let stderr = ''
  let timedOut = false

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

  // Wait for exit with timeout
  let exitCode: number
  try {
    exitCode = await Promise.race([
      subprocess.exited,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          timedOut = true
          subprocess.kill('SIGKILL')
          reject(new Error('timeout'))
        }, timeoutMs)
      })
    ])
  } catch (err: any) {
    if (err.message === 'timeout') {
      // Wait a bit for the process to actually die
      await new Promise(resolve => setTimeout(resolve, 100))
      exitCode = -1
    } else {
      throw err
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    timedOut,
  }
}

// ─── Execute Command String ────────────────────────────────────────
// Parses a command string and executes it
export async function executeCommand(commandStr: string): Promise<string> {
  // Trim and split command properly (respects quotes)
  const trimmed = commandStr.trim()
  if (!trimmed) {
    return 'Error: No command provided'
  }

  // Simple parsing: split by spaces but respect quoted strings
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    args.push(current)
  }

  const command = args[0]
  const commandArgs = args.slice(1)

  const result = await runShell(command, commandArgs)

  let output = ''

  if (result.timedOut) {
    output += `⏱️  Command timed out after 30 seconds\n\n`
  }

  if (result.stdout) {
    output += result.stdout + '\n'
  }

  if (result.stderr) {
    if (result.stdout) output += '\n'
    output += `stderr:\n${result.stderr}\n`
  }

  if (!result.stdout && !result.stderr && !result.timedOut) {
    output += '(No output)'
  }

  const statusColor = result.success ? 'green' : 'red'
  output += `\nExit code: ${result.exitCode}`

  return output
}
