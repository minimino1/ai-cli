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

/**
 * Führt `git` mit den angegebenen Argumenten im aktuellen Arbeitsverzeichnis aus und sammelt Exit-Code sowie Ausgabe.
 *
 * @param args - Die Argumente, die an `git` übergeben werden (z. B. `['log', '--oneline']`)
 * @returns Ein Objekt mit:
 *          - `success`: `true` wenn der Exit-Code `0` ist, `false` sonst
 *          - `exitCode`: der numerische Exit-Code des Prozesses
 *          - `stdout`: die standardmäßige Ausgabe, getrimmt
 *          - `stderr`: die Fehlerausgabe, getrimmt
 */
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

/**
 * Extrahiert bekannte Platzhalterwerte aus einer einzelnen Zeile der Ausgabe von `git log`.
 *
 * Versucht, Commit-Felder wie Commit-Kurz-Hash (`%h`), Betreff (`%s`) und Autorname (`%an`) aus
 * der übergebenen Zeile zu lesen. Unterstützte Erkennungsmodi:
 * - Format `'oneline'` oder `'%h %s'`: liefert `%h` und `%s`.
 * - Formate, die `%an` enthalten: erwartet durch `|` getrennte Teile und liefert `%h`, `%an` und `%s`
 *   falls mindestens drei Teile gefunden werden.
 *
 * @param line - Eine einzelne Ausgabezeile aus `git log`
 * @param format - Das verwendete `--pretty`/Format-Template oder `'oneline'`
 * @returns Ein Objekt mit gefundenen Platzhaltern als Schlüssel (`'%h'`, `'%s'`, `'%an'`); ist keine
 *          Übereinstimmung möglich, wird ein leeres Objekt zurückgegeben.
 */
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

/**
 * Färbt eine einzelne Ausgabezeile von `git log` für die Konsole.
 *
 * Wenn `useGraph` gesetzt ist und die Zeile mit Graph-Zeichen (z. B. `|`, `/`, `\`, `*`) beginnt,
 * wird die gesamte Zeile gedimmt ausgegeben. Andernfalls wird, falls die Zeile mit einem Commit-Hash
 * (7–40 hexadezimale Zeichen) beginnt, nur der Hash cyan gefärbt; sonst bleibt die Zeile unverändert.
 *
 * @param line - Die einzelne Log-Zeile, die gefärbt werden soll
 * @param useGraph - Ob Graph-Zeilen (ASCII-Graph) speziell gedimmt werden sollen
 * @returns Die ggf. mit ANSI-Farbcodes versehene Version von `line`
 */
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

/**
 * Gibt eine formatierte, optional farbige Darstellung von `git log` zurück, basierend auf den übergebenen Optionen.
 *
 * @param options - Konfiguriert die `git log`-Ausgabe (z. B. `since`, `until`, `author`, `grep`, `path`, `limit`, `format`, `graph`, `stats`, `oneline`, `decorate`); Standardwerte werden angewendet, wenn Felder fehlen.
 * @returns Die formatierte `git log`-Ausgabe als String mit ANSI-Farbsequenzen; bei einem Git-Fehler enthält der String eine `Error:`-Meldung mit `stderr`, und wenn keine Commits gefunden werden, enthält der String die Meldung `No commits found`.
 */
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
 * Gibt das Git-Commit-Protokoll formatiert und mit Commit-Graphen zurück.
 *
 * @param options - Optionen zur Filterung und Formatierung der Ausgabe; `graph` wird auf `true` und `oneline` auf `false` gesetzt.
 * @returns Den formatierten Log-String. Bei Git-Fehlern enthält der String eine Fehlermeldung, bei keinem Ergebnis eine "No commits found"-Nachricht.
 */
export async function gitLog(options: LogOptions = {}): Promise<string> {
  return prettyLog({ ...options, graph: true, oneline: false })
}

/**
 * Liefert eine kompakte, einzeilige Darstellung des Git-Logs.
 *
 * @param limit - Maximale Anzahl an Commits im Ergebnis; Standard ist `20`
 * @returns Die formatierte One-line-Ausgabe von `git log` als String
 */
export async function gitLogOneline(limit?: number): Promise<string> {
  return prettyLog({ oneline: true, limit: limit ?? 20, graph: false })
}

/**
 * Liefert die formatierte Git-Log-Ausgabe für Commits eines bestimmten Autors.
 *
 * @param author - Der Autor, nach dem die Commits gefiltert werden
 * @param options - Zusätzliche Log-Optionen; übergebene Werte werden weitergereicht, `author` wird überschrieben. Falls `options.limit` nicht gesetzt ist, wird `limit` auf 30 gesetzt.
 * @returns Die formatierte (ggf. farbige) Ausgabe von `git log` als String; wenn keine Commits gefunden werden, enthält der String eine entsprechende Hinweisnachricht; bei einem Git-Fehler enthält der String eine Fehlermeldung mit der stderr-Ausgabe.
 */
export async function gitLogByAuthor(author: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, author, limit: options?.limit ?? 30 })
}

/**
 * Gibt das formatierte Git-Log für eine bestimmte Datei zurück.
 *
 * @param filePath - Pfad zur Datei relativ zum Repository-Stamm
 * @param options - Optionale Filter und Ausgabeoptionen (z. B. `since`, `author`, `format`). Wenn `options.limit` nicht gesetzt ist, wird `limit` auf `20` gesetzt.
 * @returns Die formatierte Ausgabe von `git log` für die angegebene Datei; enthält bei Fehlern eine Fehlermeldung oder bei fehlenden Commits eine Hinweisnachricht.
 */
export async function gitLogFile(filePath: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, path: filePath, limit: options?.limit ?? 20 })
}

/**
 * Erzeugt ein formatiertes Git-Log, das Einfügungs- und Löschstatistiken (stats) enthält.
 *
 * @param limit - Maximale Anzahl von Commits im Ergebnis; Standard ist 20
 * @returns Die formatierte Log-Ausgabe als String; bei fehlgeschlagenem Git-Aufruf enthält sie eine Fehlermeldung
 */
export async function gitLogWithStats(limit?: number): Promise<string> {
  return prettyLog({ stats: true, limit: limit ?? 20 })
}

/**
 * Erzeugt eine formatierte Git-Log-Ausgabe für den angegebenen Zeitraum.
 *
 * Wenn `options.limit` nicht gesetzt ist, wird standardmäßig `50` verwendet.
 *
 * @param since - Startzeitpunkt, Commit-Ref oder Ausdruck für `--since`
 * @param until - Optionaler Endzeitpunkt, Commit-Ref oder Ausdruck für `--until`
 * @param options - Zusätzliche Log-Optionen (z. B. `author`, `grep`, `graph`, `format`, `stats`)
 * @returns Eine formatierte Log-Ausgabe als String; kann eine farbige Commit-Liste, die Meldung `No commits found` oder eine Fehlerzeile (beginnend mit `Error:`) enthalten
 */
export async function gitLogSince(since: string, until?: string, options?: LogOptions): Promise<string> {
  return prettyLog({ ...options, since, until, limit: options?.limit ?? 50 })
}
