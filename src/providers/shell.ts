// ─── Shell Provider ────────────────────────────────────────────────
// Execute shell commands with timeout and output capture

export interface ShellResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  timedOut: boolean
}

/**
 * Führt einen Prozess aus, sammelt dessen Standardausgabe und -fehler und bricht bei Überschreitung eines Zeitlimits ab.
 *
 * @param command - Das auszuführende Kommando oder der Pfad zur ausführbaren Datei
 * @param args - Optionale Argumentliste für das Kommando
 * @param timeoutMs - Maximale Ausführungsdauer in Millisekunden bevor der Prozess zwangsbeendet wird
 * @param useShell - Wenn `true`, wird das Kommando durch die Plattform-Shell (`cmd.exe` auf Windows, `sh` sonst) ausgeführt
 * @returns Ein Objekt mit Ausführungsinformationen:
 * - `success`: `true` wenn `exitCode` gleich `0`, sonst `false`
 * - `exitCode`: Numerischer Exit-Code (`-1` wenn das Kommando durch das Timeout beendet wurde)
 * - `stdout`: Gesammelte Standardausgabe, als getrimmter String
 * - `stderr`: Gesammelter Standardfehler, als getrimmter String
 * - `timedOut`: `true` wenn das Kommando aufgrund des Timeouts beendet wurde, sonst `false`
 */
export async function runShell(
  command: string,
  args: string[] = [],
  timeoutMs: number = 30000,
  useShell: boolean = false
): Promise<ShellResult> {
  const spawnOptions: any = {
    cwd: process.cwd(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  }

  const cmd = useShell
    ? [process.platform === 'win32' ? 'cmd.exe' : 'sh', '-c', `${command} ${args.join(' ')}`.trim()]
    : [command, ...args]

  const subprocess = Bun.spawn({
    cmd,
    ...spawnOptions,
  })

  let stdout = ''
  let stderr = ''
  let timedOut = false

  // Read stdout and stderr concurrently to prevent deadlock
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
      // ignore read errors
    } finally {
      reader.releaseLock()
    }
    return data
  }

  const stdoutPromise = subprocess.stdout ? readStream(subprocess.stdout) : Promise.resolve('')
  const stderrPromise = subprocess.stderr ? readStream(subprocess.stderr) : Promise.resolve('')

  // Wait for exit with timeout
  let exitCode: number
  try {
    // Wait for process exit or timeout, while draining streams
    await Promise.all([
      stdoutPromise.then(s => { stdout = s }),
      stderrPromise.then(s => { stderr = s }),
      Promise.race([
        subprocess.exited,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            timedOut = true
            subprocess.kill('SIGKILL')
            reject(new Error('timeout'))
          }, timeoutMs)
        })
      ])
    ])
    exitCode = await subprocess.exited
  } catch (err: any) {
    // Ensure streams are drained
    await Promise.allSettled([stdoutPromise, stderrPromise])
    if (err.message === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 100))
      exitCode = -1
    } else {
      throw err
    }
  }

  // Ensure we have the final values
  if (!stdout) stdout = await stdoutPromise
  if (!stderr) stderr = await stderrPromise

  return {
    success: exitCode === 0,
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    timedOut,
  }
}

// ─── Execute Command String ────────────────────────────────────────
// Uses shell mode to support pipes, redirects, &&, globbing, etc.
export async function executeCommand(commandStr: string): Promise<string> {
  const trimmed = commandStr.trim()
  if (!trimmed) {
    return 'Error: No command provided'
  }

  // Use shell mode to support full shell features
  const result = await runShell(trimmed, [], 30000, true)

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

  output += `\nExit code: ${result.exitCode}`

  return output
}
