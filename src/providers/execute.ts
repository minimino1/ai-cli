// ─── Code Execution Provider ───────────────────────────────────────
// Execute code files based on their language/extension

import { extname } from 'node:path'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Erzeugt einen eindeutigen temporären Pfad für eine kompiliierte Binärdatei.
 *
 * @returns Ein Pfad im `/tmp`-Verzeichnis im Format `/tmp/ai-cli-out-<timestamp>-<random>`.
 */
function getTempBinaryPath(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `/tmp/ai-cli-out-${timestamp}-${random}`
}

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
const languageCommands: Record<string, { command: string; args: string[] }> = {
  python: { command: 'python3', args: [] },
  javascript: { command: 'node', args: [] },
  typescript: { command: 'tsx', args: [] },
  go: { command: 'go', args: ['run'] },
  ruby: { command: 'ruby', args: [] },
  java: { command: 'java', args: [] },
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

/**
 * Führt ein externes Kommando mit Argumenten aus, sammelt stdout/stderr, und liefert das Ausführungsresultat.
 *
 * @param command - Pfad oder Name des auszuführenden Programms
 * @param args - Argumentliste für das Programm
 * @param timeoutMs - Maximale Ausführungsdauer in Millisekunden bevor der Prozess mit SIGKILL beendet wird
 * @param stdin - Optionaler Inhalt, der dem Prozess über STDIN geschrieben wird
 * @returns Das Ausführungsresultat: `success` ist `true` bei Exit-Code `0`, `exitCode` ist der numerische Rückgabewert, `stdout`/`stderr` sind getrimmte Ausgaben, `language` ist leer, `command` ist die ausgeführte Befehlszeile und `timedOut` zeigt an, ob ein Timeout aufgetreten ist.
 */
async function runCommand(
  command: string,
  args: string[],
  timeoutMs: number = 30000,
  stdin?: string
): Promise<ExecuteResult> {
  const spawnOptions: any = {
    cwd: Bun.cwd(),
    stdin: stdin ? 'pipe' : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  }

  const subprocess = Bun.spawn({
    program: command,
    args,
    ...spawnOptions,
  })

  // Write stdin if provided
  if (stdin && subprocess.stdin) {
    const writer = subprocess.stdin.getWriter()
    await writer.write(new TextEncoder().encode(stdin))
    await writer.close()
  }

  let stdout = ''
  let stderr = ''
  let timedOut = false

  // Read stdout and stderr concurrently
  const readStream = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
    let data = ''
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          data += new TextDecoder().decode(value)
        }
      }
    } catch {
      // ignore
    } finally {
      reader.releaseLock()
    }
    return data
  }

   const stdoutPromise = subprocess.stdout ? readStream(subprocess.stdout) : Promise.resolve('')
   const stderrPromise = subprocess.stderr ? readStream(subprocess.stderr) : Promise.resolve('')

   // Create timeout promise
   const timeoutPromise = new Promise<never>((_, reject) => {
     setTimeout(() => {
       timedOut = true
       subprocess.kill('SIGKILL')
       reject(new Error('timeout'))
     }, timeoutMs)
   })

   let exitCode: number
   try {
     // Wait for both streams and exit (with timeout)
     const [stdoutResult, stderrResult, exit] = await Promise.all([
       stdoutPromise,
       stderrPromise,
       Promise.race([subprocess.exited, timeoutPromise])
     ])
     stdout = stdoutResult
     stderr = stderrResult
     exitCode = exit as number
   } catch (err: any) {
     // Ensure streams are drained on timeout or other errors
     await Promise.all([stdoutPromise, stderrPromise])
     if (err.message === 'timeout') {
       // Give process a moment to clean up
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

/**
 * Führt die gegebene Quelldatei aus oder kompiliert und führt sie aus, je nach erkannter Programmiersprache.
 *
 * @returns Eine formatierte Ergebnisbeschreibung der Ausführung für `filePath`; bei Kompilierungsfehlern wird der String `Compilation failed:\n<stderr>` zurückgegeben; bei nicht unterstützter Sprache wird eine entsprechende Fehlermeldung zurückgegeben.
 */
export async function executeFile(filePath: string): Promise<string> {
  const language = detectLanguage(filePath)

   // Handle C (compile then run)
   if (language === 'c') {
     const binaryPath = getTempBinaryPath()
     const compileResult = await runCommand('gcc', ['-o', binaryPath, filePath])
     if (!compileResult.success) {
       return `Compilation failed:\n${compileResult.stderr}`
     }
     const runResult = await runCommand(binaryPath, [])
     await unlink(binaryPath).catch(() => {})
     return formatResult(runResult, language, filePath)
   }

   // Handle C++ (compile then run)
   if (language === 'cpp') {
     const binaryPath = getTempBinaryPath()
     const compileResult = await runCommand('g++', ['-o', binaryPath, filePath])
     if (!compileResult.success) {
       return `Compilation failed:\n${compileResult.stderr}`
     }
     const runResult = await runCommand(binaryPath, [])
     await unlink(binaryPath).catch(() => {})
     return formatResult(runResult, language, filePath)
   }

   // Handle Rust (compile then run with rustc)
   if (language === 'rust') {
     const binaryPath = getTempBinaryPath()
     const compileResult = await runCommand('rustc', ['-o', binaryPath, filePath])
     if (!compileResult.success) {
       return `Compilation failed:\n${compileResult.stderr}`
     }
     const runResult = await runCommand(binaryPath, [])
     await unlink(binaryPath).catch(() => {})
     return formatResult(runResult, language, filePath)
   }

  // Handle Java (compile then run)
  if (language === 'java') {
    const className = filePath.replace(/\.java$/, '').split('/').pop() || 'Main'
    const compileResult = await runCommand('javac', [filePath])
    if (!compileResult.success) {
      return `Compilation failed:\n${compileResult.stderr}`
    }
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    const runResult = await runCommand('java', ['-cp', dir, className])
    return formatResult(runResult, language, filePath)
  }

  // Interpreted languages
  const langConfig = languageCommands[language]
  if (!langConfig) {
    return `Error: Unsupported language "${language}" for file ${filePath}`
  }

  const args = [...langConfig.args, filePath]
  const result = await runCommand(langConfig.command, args)
  return formatResult(result, language, filePath)
}

/**
  * Führt den übergebenen Quellcode in der angegebenen Sprache aus und gibt einen formatierten Ausführungsbericht zurück.
  *
  * @param code - Der auszuführende Quellcode
  * @param language - Sprachbezeichner; unterstützt: `python`, `javascript`, `typescript`, `go`, `rust`, `ruby`, `bash`, `sh`, `php`, `c`, `cpp`
  * @returns Einen formatieren Bericht mit Datei-, Ausgabe- und Fehlermeldungen, Exit-Code und dem ausgeführten Befehl oder eine Fehlermeldung, wenn die Sprache nicht unterstützt wird
  */
export async function executeCode(code: string, language: string): Promise<string> {
  const tmpFile = `/tmp/ai-cli-exec-${Date.now()}`

  // Map language to extension
  const extMap: Record<string, string> = {
    python: '.py',
    javascript: '.js',
    typescript: '.ts',
    go: '.go',
    rust: '.rs',
    ruby: '.rb',
    bash: '.sh',
    sh: '.sh',
    php: '.php',
    c: '.c',
    cpp: '.cpp',
  }

  const ext = extMap[language]
  if (!ext) {
    return `Error: Unsupported language "${language}"\nSupported: python, javascript, typescript, go, rust, ruby, bash, sh, php, c, cpp`
  }

   const filePath = tmpFile + ext
   await writeFile(filePath, code, 'utf-8')

   try {
     return await executeFile(filePath)
   } finally {
     await unlink(filePath).catch(() => {})
   }
 }

/**
 * Erzeugt einen formatierten Bericht über die Ausführung eines Prozesses.
 *
 * Der Bericht enthält: Kopfzeile mit Dateipfad und Sprache, Trennlinie, optionalen Timeout-Hinweis,
 * die zusammengeführten `stdout`- und `stderr`-Blöcke (bei beiden Ausgaben wird vor `stderr` eine Leerzeile eingefügt),
 * oder `(No output)` falls keine Ausgabe vorliegt, gefolgt von einer abschließenden Trennlinie, dem Exit-Code und dem ausgeführten Befehl.
 *
 * @param result - Das Ausführungsergebnis (z. B. `stdout`, `stderr`, `exitCode`, `command`, optional `timedOut`)
 * @param language - Die angezeigte Programmiersprache für die Kopfzeile
 * @param filePath - Der angezeigte Pfad oder Name der ausgeführten Datei
 * @returns Den vollständigen, mehrzeiligen Bericht als String
 */
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
