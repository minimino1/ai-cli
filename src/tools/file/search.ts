import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { existsSync } from 'fs'

export interface SearchOptions {
  recursive?: boolean
  ignoreCase?: boolean
  maxResults?: number
  followSymlinks?: boolean
}

export interface SearchResult {
  path: string
  size?: number
  modified?: Date
  type: 'file' | 'directory'
  match?: string // for content search - the matching line
  lineNumber?: number
}

export interface SizeRange {
  min?: number
  max?: number
}

export interface DateRange {
  after?: Date
  before?: Date
}

/**
 * Erzeugt ein RegExp, das einem Glob-Pattern entspricht.
 *
 * Unterstützt `*` als beliebige Zeichenfolge und `?` als genau ein Zeichen; das
 * resultierende RegExp ist so verankert, dass es den gesamten zu testenden
 * String abgleicht.
 *
 * @param pattern - Glob-Pattern, z. B. `src/**/*.ts` oder `file?.txt`
 * @param ignoreCase - Wenn `true`, wird das Muster ohne Berücksichtigung der Groß-/Kleinschreibung verglichen
 * @returns Ein RegExp, das das angegebene Glob-Pattern gegen komplette Strings prüft
 */
function globToRegex(pattern: string, ignoreCase: boolean = false): RegExp {
  // Escape special regex characters except * and ?
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  // Convert glob wildcards to regex
  regexStr = regexStr.replace(/\*/g, '.*').replace(/\?/g, '.')
  // Match full path
  regexStr = '^' + regexStr + '$'

  return new RegExp(regexStr, ignoreCase ? 'i' : '')
}

/**
 * Bestimmt, ob ein Pfad mit einem Glob-Muster übereinstimmt.
 *
 * Das Muster unterstützt `*` (beliebige Zeichenfolge) und `?` (ein einzelnes Zeichen) und wird so in einen regulären Ausdruck umgewandelt, dass das gesamte `filePath` abgeglichen wird. Bei `ignoreCase = true` erfolgt der Vergleich ohne Berücksichtigung der Groß-/Kleinschreibung.
 *
 * @param filePath - Der zu prüfende Pfad
 * @param pattern - Das Glob-Muster
 * @param ignoreCase - Wenn `true`, wird die Groß-/Kleinschreibung ignoriert
 * @returns `true`, wenn `filePath` dem Muster entspricht, `false` sonst
 */
function matchesGlob(filePath: string, pattern: string, ignoreCase: boolean = false): boolean {
  const regex = globToRegex(pattern, ignoreCase)
  return regex.test(filePath)
}

/**
 * Durchsucht ein Verzeichnis nach Dateien und Unterverzeichnissen, deren Pfad oder Name einem Glob-Muster entspricht.
 *
 * Durchsucht Einträge ab `path` und liefert für jede Übereinstimmung ein `SearchResult` mit Pfad und Metadaten.
 *
 * @param path - Stammverzeichnis, in dem die Suche gestartet wird (relativ oder absolut)
 * @param pattern - Glob-Muster, das gegen den Pfad relativ zum Suchstamm und gegen den Eintragsnamen geprüft wird
 * @param options - Zusätzliche Suchoptionen; unterstützt `recursive` (standard: true), `ignoreCase` (standard: false) und `maxResults` (standard: 1000)
 * @returns Eine Liste von `SearchResult`-Objekten; jedes Ergebnis enthält mindestens `path` und `type` (`'file' | 'directory'`) und kann optional `size` und `modified` enthalten
 */
export async function searchFiles(
  path: string,
  pattern: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const regex = globToRegex(pattern, ignoreCase)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue // Skip hidden

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        // Check if matches pattern
        if (regex.test(relPath) || regex.test(entry.name)) {
          try {
            const fileStat = await stat(fullPath)
            results.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              type: entry.isDirectory() ? 'directory' : 'file',
            })
          } catch {
            // Skip if can't stat
          }

          if (results.length >= maxResults) return
        }

        // Recurse into directories
        if (recursive && entry.isDirectory()) {
          await walk(fullPath)
          if (results.length >= maxResults) return
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Durchsucht Dateien unter einem Verzeichnis nach Zeilen, die das angegebene reguläre Ausdrucks‑Pattern matchen.
 *
 * Unterstützt rekursive Suche (standardmäßig), optionale Filterung von Dateinamen per Glob und begrenzt die Anzahl der Ergebnisse über `maxResults`. Verzeichnisse und Dateien, deren Name mit `.` beginnt, sowie nicht lesbare Dateien/Verzeichnisse werden übersprungen.
 *
 * @param path - Wurzelverzeichnis, in dem gesucht wird
 * @param pattern - Regulärer Ausdruck als String, der gegen jede Zeile der durchsuchten Dateien getestet wird; das `ignoreCase`-Flag in `options` beeinflusst die Groß-/Kleinschreibung
 * @param options - Zusätzliche Suchoptionen; unterstützt Felder aus `SearchOptions` sowie:
 *   - `filePattern` — optionaler Glob (z. B. `*.ts`, `*.js`) zur Filterung der zu lesenden Dateinamen
 *   - `showContext` — Anzahl Kontextzeilen vor und nach der Trefferzeile (wird aktuell akzeptiert, aber nicht in den Ergebnissen zurückgegeben)
 * @returns Eine Liste von `SearchResult`-Objekten; Treffer enthalten `path`, `type: 'file'`, `match` (die getrimmte Trefferzeile) und `lineNumber`
 */
export async function grepFiles(
  path: string,
  pattern: string,
  options: SearchOptions & {
    filePattern?: string // e.g., '*.ts', '*.js'
    showContext?: number // lines before/after
  } = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000, filePattern, showContext = 0 } = options

  const searchDir = resolvePath(path)
  const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g')

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        // Check file pattern if specified
        if (filePattern && !matchesGlob(entry.name, filePattern, ignoreCase)) {
          if (recursive && entry.isDirectory()) {
            await walk(fullPath)
          }
          continue
        }

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          // Search file content
          try {
            const content = await readFile(fullPath, 'utf-8')
            const lines = content.split('\n')

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]
              if (regex.test(line)) {
                // Get context lines
                const contextStart = Math.max(0, i - showContext)
                const contextEnd = Math.min(lines.length - 1, i + showContext)

                results.push({
                  path: relPath,
                  type: 'file',
                  match: line.trim(),
                  lineNumber: i + 1,
                })

                if (results.length >= maxResults) break
              }
            }
          } catch {
            // Skip files we can't read
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // Skip unreadable directories
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Sucht Dateien innerhalb eines gegebenen Größenbereichs unterhalb eines Startverzeichnisses.
 *
 * Diese Funktion traversiert rekursiv (standard) das angegebene Verzeichnis, überspringt Einträge mit führendem Punkt, ignoriert Lesefehler und stoppt, sobald `maxResults` erreicht ist.
 *
 * @param path - Startverzeichnis für die Suche
 * @param sizeRange - Objekt mit optionalen Grenzen in Bytes: `min` (>=) und `max` (<=)
 * @param options - Zusätzliche Optionen; `recursive` (default `true`) steuert das Absteigen in Unterverzeichnisse, `maxResults` (default `1000`) begrenzt die Anzahl zurückgegebener Treffer
 * @returns Eine Liste von `SearchResult`-Einträgen für jede gefundene Datei, jeweils mit `path`, `size`, `modified` und `type: 'file'`
 */
export async function searchBySize(
  path: string,
  sizeRange: SizeRange,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          try {
            const fileStat = await stat(fullPath)
            const size = fileStat.size

            const matchesMin = sizeRange.min === undefined || size >= sizeRange.min
            const matchesMax = sizeRange.max === undefined || size <= sizeRange.max

            if (matchesMin && matchesMax) {
              results.push({
                path: relative(searchDir, fullPath),
                size,
                modified: fileStat.mtime,
                type: 'file',
              })
            }
          } catch {
            // skip
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Findet Dateien, deren Änderungszeit (mtime) innerhalb des angegebenen Datumsbereichs liegt.
 *
 * Durchsucht das Verzeichnis (standardmäßig rekursiv) und sammelt Dateitreffer bis zur Grenze von `options.maxResults`.
 * Versteckte Einträge (Namen, die mit `.` beginnen) sowie nicht lesbare Dateien/Verzeichnisse werden übersprungen.
 *
 * @param path - Startverzeichnis (absolut oder relativ)
 * @param dateRange - Bereich für die Modifikationszeit; `after` grenzt die untere, `before` die obere Grenze ein
 * @param options - Suchoptionen; relevante Felder: `recursive` (standard `true`) und `maxResults` (standard `1000`)
 * @returns Eine Liste von `SearchResult`-Einträgen für gefundene Dateien. Jedes Ergebnis enthält mindestens `path`, `type: 'file'`, `size` und `modified`
 */
export async function searchByDate(
  path: string,
  dateRange: DateRange,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          try {
            const fileStat = await stat(fullPath)
            const mtime = fileStat.mtime

            const matchesAfter = !dateRange.after || mtime >= dateRange.after
            const matchesBefore = !dateRange.before || mtime <= dateRange.before

            if (matchesAfter && matchesBefore) {
              results.push({
                path: relative(searchDir, fullPath),
                size: fileStat.size,
                modified: mtime,
                type: 'file',
              })
            }
          } catch {
            // skip
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Findet Dateien mit den angegebenen Erweiterungen unterhalb des gegebenen Verzeichnisses.
 *
 * @param type - Komma-getrennte Liste von Dateiendungen (z. B. `js,ts` oder `.md,.txt`). Ein führender Punkt wird ignoriert. Verwende `all`, um alle Dateien zu matchen.
 * @param options - Suchoptionen; gängige Felder: `recursive` (default: `true`) zur Rekursion in Unterverzeichnisse und `maxResults` (default: `1000`) zur Begrenzung der zurückgegebenen Ergebnisse.
 * @returns Gefundene Treffer als Array von `SearchResult`-Objekten; jedes Ergebnis repräsentiert eine Datei (`type: 'file'`) und enthält mindestens `path`, `size` und `modified`, sofern verfügbar.
 */
export async function searchByType(
  path: string,
  type: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const { recursive = true, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const extensions = type.split(',').map(ext => ext.trim().toLowerCase().replace(/^\./, ''))

  const walk = async (dir: string): Promise<void> => {
    if (results.length >= maxResults) return

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          if (recursive) {
            await walk(fullPath)
          }
        } else {
          const fileExt = extname(entry.name).toLowerCase().replace(/^\./, '')

          if (extensions.includes(fileExt) || extensions.includes('all')) {
            try {
              const fileStat = await stat(fullPath)
              results.push({
                path: relative(searchDir, fullPath),
                size: fileStat.size,
                modified: fileStat.mtime,
                type: 'file',
              })
            } catch {
              // skip
            }
          }
        }

        if (results.length >= maxResults) return
      }
    } catch {
      // skip
    }
  }

  await walk(searchDir)
  return results
}

/**
 * Formatiert eine Liste von Suchergebnissen zu einer menschenlesbaren, ANSI-farbigen Zeichenkette.
 *
 * @param results - Die zu formatierenden Suchergebnisse
 * @returns Eine formatierte Zeichenkette, die eine Kopfzeile mit der Anzahl der Treffer und für jedes Ergebnis eine Zeile mit Typ-Icon, Pfad sowie optionaler Größe und Änderungszeit enthält; bei Inhalts-Treffer werden zusätzlich die gefundene Zeile und gegebenenfalls die Zeilennummer angezeigt.
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return '\x1b[90mNo results found\x1b[0m'
  }

  const lines: string[] = []
  lines.push(`\x1b[1mFound ${results.length} results:\x1b[0m`)
  lines.push('')

  for (const result of results) {
    const sizeStr = result.size ? formatSize(result.size) : ''
    const dateStr = result.modified ? formatDate(result.modified) : ''
    const typeIcon = result.type === 'directory' ? '📁' : '📄'

    let line = `${typeIcon} ${result.path}`
    if (sizeStr) line += ` \x1b[90m(${sizeStr})\x1b[0m`
    if (dateStr) line += ` \x1b[90m[${dateStr}]\x1b[0m`
    if (result.match) {
      line += `\n  \x1b[33m→ ${result.match}\x1b[0m`
      if (result.lineNumber) {
        line += ` \x1b[90m(line ${result.lineNumber})\x1b[0m`
      }
    }

    lines.push(line)
  }

  return lines.join('\n')
}

/**
 * Formatiert eine Bytezahl in eine kompakte, menschlich lesbare Einheit.
 *
 * @param bytes - Die Größe in Bytes (erwartet >= 0)
 * @returns Die formatierte Größe als String mit einer Nachkommastelle und einer Einheit (`B`, `KB`, `MB`, `GB`)
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Formatiert ein Datum als lokale Datums- und Uhrzeitdarstellung (Stunden und Minuten).
 *
 * @param date - Das zu formatierende Datum
 * @returns Die lokalisierte Datumskomponente gefolgt von der Uhrzeit im `HH:MM`-Format
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Löst eine Pfadangabe relativ zum aktuellen Arbeitsverzeichnis auf.
 *
 * @param path - Eine Pfadangabe; darf absolut (beginnt mit `/`) oder relativ sein
 * @returns Den resultierenden Pfad; bei einem absoluten Eingabepfad (`/...`) identisch zur Eingabe, sonst mit `process.cwd()` kombiniert
 */
function resolvePath(path: string): string {
  if (path.startsWith('/')) return path
  return join(process.cwd(), path)
}

/**
 * Berechnet den relativen Pfad, der von `from` zum Ziel `to` führt.
 *
 * @param from - Ausgangspfad
 * @param to - Zielpfad
 * @returns Den relativen Pfad von `from` zu `to`. Gibt `'.'` zurück, wenn beide Pfade gleich sind oder das Ergebnis leer wäre.
 */
function relative(from: string, to: string): string {
  // Simple relative path calculation
  const fromParts = from.split('/').filter(p => p)
  const toParts = to.split('/').filter(p => p)

  let common = 0
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common++
  }

  const up = fromParts.length - common
  const down = toParts.slice(common)

  const result = [...Array(up).fill('..'), ...down].join('/')
  return result || '.'
}

// Import for sync version
import { readdirSync, statSync } from 'fs'

/**
 * Durchsucht ein Verzeichnisbaum nach Einträgen, deren Pfad oder Name einem Glob-Muster entspricht.
 *
 * @param path - Wurzelverzeichnis der Suche; relative Pfade werden gegen das aktuelle Arbeitsverzeichnis aufgelöst
 * @param pattern - Glob-Muster (unterstützt `*` und `?`) das gegen den relativen Pfad und den Eintragsnamen getestet wird
 * @param options - Suchoptionen; unterstützte Felder: `recursive` (standard: `true`), `ignoreCase` (standard: `false`), `maxResults` (standard: `1000`)
 * @returns Eine Array von `SearchResult`-Objekten für jede gefundene Übereinstimmung; jedes Ergebnis enthält den Pfad relativ zur Suchwurzel, den Eintragstyp und ggf. Metadaten wie Größe und Änderungszeit
 */
export function searchFilesSync(path: string, pattern: string, options: SearchOptions = {}): SearchResult[] {
  const results: SearchResult[] = []
  const { recursive = true, ignoreCase = false, maxResults = 1000 } = options

  const searchDir = resolvePath(path)
  const regex = globToRegex(pattern, ignoreCase)

  const walkSync = (dir: string): void => {
    if (results.length >= maxResults) return

    try {
      const entries = readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue

        const fullPath = join(dir, entry.name)
        const relPath = relative(searchDir, fullPath)

        if (regex.test(relPath) || regex.test(entry.name)) {
          try {
            const fileStat = statSync(fullPath)
            results.push({
              path: relPath,
              size: fileStat.size,
              modified: fileStat.mtime,
              type: entry.isDirectory() ? 'directory' : 'file',
            })
          } catch {
            // skip
          }

          if (results.length >= maxResults) return
        }

        if (recursive && entry.isDirectory()) {
          walkSync(fullPath)
          if (results.length >= maxResults) return
        }
      }
    } catch {
      // skip
    }
  }

  walkSync(searchDir)
  return results
}
