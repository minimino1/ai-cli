// ─── Code Execution Provider ───────────────────────────────────────
// Execute code files based on their language/extension

import { extname } from 'node:path'

export interface ExecuteResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  language: string
  command: string
  timedOut?: boolean
}

// ─── Language to Command Mapping ────────────────────────────────────
const languageCommands: Record<string, { command: string; args?: string[] }> = {
  python: { command: 'python', args: [] },
  javascript: { command: 'node', args: [] },
  typescript: { command: 'tsx', args: [] },  // or ts-node
  go: { command: 'go', args: ['run'] },
  rust: { command: 'cargo', args: ['run'] },
  ruby: { command: 'ruby', args: [] },
  java: { command: 'java', args: [] },
  c: { command: 'gcc', args: ['-o', '/tmp/a.out', '&&', '/tmp/a.out'] }, // Special handling
  cpp: { command: 'g++', args: ['-o', '/tmp/a.out', '&&', '/tmp/a.out'] },
  bash: { command: 'bash', args: [] },
  sh: { command: 'sh', args: [] },
  php: { command: 'php', args: [] },
}

// ─── Detect Language from Extension ────────────────────────────────
export function detectLanguage(filename: string): string {
  const ext = extname(filename).toLowerCase()
  const langMap: Record<string, string> = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.php': 'php',
  }
  return langMap[ext] || 'text'
}

// ─── Run Command ───────────────────────────────────────────────────
async function runCommand(
  command: string,
  args: string[],
  timeoutMs: number = 30000
): Promise<ExecuteResult> {
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
    language: '',
    command: `${command} ${args.join(' ')}`,
    timedOut,
  }
}

// ─── Execute File ──────────────────────────────────────────────────
export async function executeFile(filePath: string): Promise<string> {
  const language = detectLanguage(filePath)
  const langConfig = languageCommands[language]

  if (!langConfig) {
    return `Error: Unsupported language "${language}" for file ${filePath}`
  }

  // Build command
  let command = langConfig.command
  let args = [...(langConfig.args || [])]

  // Special handling for compiled languages
  if (language === 'c' || language === 'cpp') {
    // For C/C++, we need to compile and run
    const compileResult = await runCommand(langConfig.command, [
      ...args.slice(0, 2), // -o /tmp/a.out
      filePath
    ])

    if (!compileResult.success) {
      return `Compilation failed:\n${compileResult.stderr}`
    }

    // Run the compiled binary
    const runResult = await runCommand('/tmp/a.out', [])
    return formatResult(runResult, language, filePath)
  }

  // For interpreted/run languages, just pass the file
  args.push(filePath)

  const result = await runCommand(command, args)
  return formatResult(result, language, filePath)
}

// ─── Execute Code Snippet ──────────────────────────────────────────
// Execute a code snippet directly (for /exec command)
export async function executeCode(code: string, language: string): Promise<string> {
  const langConfig = languageCommands[language]

  if (!langConfig) {
    return `Error: Unsupported language "${language}"`
  }

  // For interpreted languages, we can pipe code to stdin
  // For compiled languages, we'd need to write to a temp file
  const command = langConfig.command
  const args = [...(langConfig.args || [])]

  // For now, we'll just show a message that inline execution is not fully supported
  // for all languages. In a full implementation, we'd create temp files.
  return `Inline execution for ${language} not yet implemented. Please use /run <file> instead.`
}

// ─── Format Result ─────────────────────────────────────────────────
function formatResult(
  result: ExecuteResult,
  language: string,
  filePath: string
): string {
  let output = ''

  output += `📄 ${filePath} (${language})\n`
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

  if (result.timedOut) {
    output += `⏱️  Execution timed out after 30 seconds\n\n`
  }

  if (result.stdout) {
    output += `${result.stdout}\n`
  }

  if (result.stderr) {
    if (result.stdout) output += '\n'
    output += `stderr:\n${result.stderr}\n`
  }

  if (!result.stdout && !result.stderr && !result.timedOut) {
    output += '(No output)\n'
  }

  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  output += `Exit code: ${result.exitCode}\n`
  output += `Command: ${result.command}`

  return output
}
