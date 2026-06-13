import { readFile } from 'fs/promises'
import { extname, basename } from 'path'

export interface ViewResult {
  format: string
  content: string
  metadata?: {
    rows?: number
    cols?: number
    keys?: string[]
    errors?: string[]
  }
}

/**
 * Ermittelt das wahrscheinliche Format eines Textinhalts anhand des Dateipfads und des Inhalts.
 *
 * Verwendet zuerst die Dateiendung/den Dateinamen als Hinweis und fällt bei unbekannter oder fehlender Endung auf einfache inhaltliche Muster (z. B. JSON-, YAML- oder CSV-Charakteristika) zurück.
 *
 * @param filePath - Der Dateipfad oder -name, der für die Auswertung der Erweiterung und des Namens verwendet wird
 * @param content - Der Dateiinhalt, der auf charakteristische Muster zur genaueren Formatbestimmung untersucht wird
 * @returns Eines der Format-Labels: 'json', 'yaml', 'csv', 'markdown', 'log', 'hex' oder 'text'
 */
export function detectFormat(filePath: string, content: string): string {
  const ext = extname(filePath).toLowerCase()
  const name = basename(filePath).toLowerCase()

  // Check by extension
  switch (ext) {
    case '.json':
      return 'json'
    case '.yaml':
    case '.yml':
      return 'yaml'
    case '.csv':
      return 'csv'
    case '.md':
      return 'markdown'
    case '.log':
      return 'log'
    case '.hex':
    case '.bin':
      return 'hex'
    case '.txt':
      return 'text'
    default:
      // Check by content
      if (content.startsWith('{') || content.startsWith('[')) {
        return 'json'
      }
      if (content.includes(':') && (content.includes('- ') || content.match(/[a-z_]+:/))) {
        return 'yaml'
      }
      if (content.includes(',') && content.includes('\n')) {
        return 'csv'
      }
      if (name.includes('log')) {
        return 'log'
      }
      return 'text'
  }
}

/**
 * Gibt den JSON-Inhalt formatiert und mit ANSI-Syntaxhervorhebung zurück.
 *
 * Wenn `content` gültiges JSON ist, wird er schön eingerückt und farblich hervorgehoben.
 * Bei ungültigem JSON wird eine rot gefärbte Fehlermeldung ausgegeben, gefolgt vom ursprünglichen Inhalt.
 *
 * @param content - Der rohe JSON-Text
 * @returns Den formatierten und farblich markierten JSON-Text oder bei Fehlern eine rot gefärbte Fehlermeldung gefolgt vom Originalinhalt
 */
export function viewJSON(content: string): string {
  try {
    const parsed = JSON.parse(content)
    const formatted = JSON.stringify(parsed, null, 2)
    return syntaxHighlightJSON(formatted)
  } catch (e) {
    return `\x1b[31mInvalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}\x1b[0m\n${content}`
  }
}

/**
 * Hebt JSON-Quelltext mit ANSI-Farbcodes für die Terminalausgabe hervor.
 *
 * Verwendet Farben für JSON-Strings, Objekt-Schlüssel, Booleans, `null` und Zahlen.
 *
 * @param json - Der zu kolorierende JSON-Text (idealerweise bereits formatiert)
 * @returns Den Eingabetext mit eingefügten ANSI-Escape-Sequenzen zur farbigen Hervorhebung von JSON-Tokens
 */
function syntaxHighlightJSON(json: string): string {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = '\x1b[36m' // cyan for strings
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = '\x1b[33m' // yellow for keys
      }
    } else if (/true|false/.test(match)) {
      cls = '\x1b[35m' // magenta for booleans
    } else if (/null/.test(match)) {
      cls = '\x1b[31m' // red for null
    } else {
      cls = '\x1b[32m' // green for numbers
    }
    return cls + match + '\x1b[0m'
  })
}

/**
 * Gibt YAML-Inhalt mit ANSI-Syntaxhervorhebung für Schlüssel und Werte zurück.
 *
 * @param content - Der rohe YAML-Text
 * @returns Der Eingabetext mit ANSI-Farbcodes zur Hervorhebung von Schlüsseln, `true`/`false`/`null`-Werten, Zahlen und einfachen/doppelten Zeichenketten
 */
export function viewYAML(content: string): string {
  const lines = content.split('\n')
  const highlighted = lines.map(line => {
    // Key highlighting
    const highlightedLine = line.replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, indent, key) => {
      return indent + '\x1b[33m' + key + '\x1b[0m:'
    })

    // Value highlighting
    return highlightedLine
      .replace(/:\s*(true|false|null)$/g, ':\x1b[35m$1\x1b[0m')
      .replace(/:\s*(-?\d+(\.\d+)?)/g, ':\x1b[32m$1\x1b[0m')
      .replace(/'(.*?)'/g, "'\x1b[36m$1\x1b[0m'")
      .replace(/"(.*?)"/g, '"\x1b[36m$1\x1b[0m"')
  })

  return highlighted.join('\n')
}

/**
 * Stellt CSV-Inhalt als formatiertes ASCII-Tableau mit ANSI-Farben dar.
 *
 * Verwendet die erste Zeile als Kopfzeile, richtet Spalten auf eine Mindestbreite von 10 Zeichen aus und fügt am Ende eine graue Fußzeile mit der Anzahl der Datenzeilen und Spalten hinzu. Der CSV-Parser ist einfach und behandelt keine in Anführungszeichen eingeschlossenen Kommata.
 *
 * @param content - Der rohe CSV-Text (Zeilen durch `\n`, Spalten durch `,`)
 * @returns Den gerenderten, ANSI-farbigen Tabellen-String (inkl. Kopfzeile, Trennzeile, Datenzeilen und Fußzeile); bei leerem Inhalt eine rote `Empty CSV`-Nachricht
 */
export function viewCSV(content: string): string {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return '\x1b[31mEmpty CSV\x1b[0m'

  // Parse CSV (simple, doesn't handle quoted commas)
  const rows = lines.map(line => line.split(',').map(cell => cell.trim()))

  if (rows.length === 0) return '\x1b[31mEmpty CSV\x1b[0m'

  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Calculate column widths
  const colWidths = headers.map((_, colIdx) => {
    const headerWidth = headers[colIdx].length
    const maxDataWidth = Math.max(...dataRows.map(row => row[colIdx]?.length || 0))
    return Math.max(headerWidth, maxDataWidth, 10)
  })

  // Build output
  const output: string[] = []

  // Header
  const headerLine = headers.map((h, i) => padRight(h, colWidths[i])).join(' │ ')
  output.push('\x1b[1m' + headerLine + '\x1b[0m')

  // Separator
  const separator = colWidths.map(w => '─'.repeat(w)).join('─┼─')
  output.push(separator)

  // Data rows
  for (const row of dataRows) {
    const rowLine = row.map((cell, i) => padRight(cell, colWidths[i])).join(' │ ')
    output.push(rowLine)
  }

  output.push(`\n\x1b[90m${dataRows.length} rows, ${headers.length} columns\x1b[0m`)

  return output.join('\n')
}

/**
 * Füllt einen String rechts mit Leerzeichen auf, sodass seine Länge mindestens der angegebenen Breite beträgt.
 *
 * @param str - Der zu formatierende String
 * @param width - Gewünschte Mindestbreite des zurückgegebenen Strings; bleibt `str` unverändert, wenn dessen Länge bereits größer oder gleich ist
 * @returns Den String, der rechts mit Leerzeichen auf die Mindestbreite aufgefüllt wurde
 */
function padRight(str: string, width: number): string {
  return str.padEnd(width, ' ')
}

/**
 * Rendert einfachen Markdown-Text zu farbiger ANSI-Terminalausgabe.
 *
 * Unterstützt Überschriften (#, ##, ###), fett (`**...**`), kursiv (`*...*`), Inline-Code (`` `...` ``),
 * Links (`[text](url)`), Listen und Blockzitate; ersetzt Markdown-Syntax durch ANSI-Farbcodes.
 *
 * @param content - Der Markdown-Quelltext
 * @returns Den gerenderten Text mit ANSI-Farbcodes, geeignet für die Anzeige in einem Terminal
 */
export function viewMarkdown(content: string): string {
  const lines = content.split('\n')
  const output: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headers
    if (line.startsWith('# ')) {
      output.push('\x1b[1;36m' + line + '\x1b[0m')
      continue
    }
    if (line.startsWith('## ')) {
      output.push('\x1b[1;35m' + line + '\x1b[0m')
      continue
    }
    if (line.startsWith('### ')) {
      output.push('\x1b[1;34m' + line + '\x1b[0m')
      continue
    }

    // Bold
    let processedLine = line.replace(/\*\*(.+?)\*\*/g, '\x1b[1m$1\x1b[22m')

    // Italic
    processedLine = processedLine.replace(/\*(.+?)\*/g, '\x1b[3m$1\x1b[23m')

    // Code blocks
    processedLine = processedLine.replace(/`([^`]+)`/g, '\x1b[36m$1\x1b[0m')

    // Links
    processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x1b[34m[$1]\x1b[0m(\x1b[90m$2\x1b[0m)')

    // Lists
    if (line.match(/^[\s]*[-*+]\s/)) {
      processedLine = '\x1b[33m' + line + '\x1b[0m'
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      processedLine = '\x1b[90m' + line + '\x1b[0m'
    }

    output.push(processedLine)
  }

  return output.join('\n')
}

/**
 * Formatiert Log-Text mit ANSI-Farbcodierung für Log-Level und Zeitstempel.
 *
 * Markiert erkennbare Log-Level und bestimmte Token mit Farben, z. B.:
 * - `DEBUG`/`TRACE`: cyan
 * - `INFO`: grün
 * - `WARN`/`WARNING`: gelb
 * - `ERROR`/`FATAL`/`CRITICAL`: rot
 * - `HTTP/1xx`/`HTTP/2xx`: cyan
 * - ISO‑ähnliche Zeitstempel (z. B. 2023-01-01T12:00:00Z): grau
 *
 * @param content - Der rohe Log-Text (mehrere Zeilen)
 * @returns Den Log-Text mit ANSI-Farbcodes zur Hervorhebung der genannten Token
 */
export function viewLog(content: string): string {
  const lines = content.split('\n')
  const output: string[] = []

  for (const line of lines) {
    let processedLine = line

    // Color log levels
    processedLine = processedLine.replace(/\b(DEBUG|TRACE)\b/gi, '\x1b[36m$1\x1b[0m')
    processedLine = processedLine.replace(/\b(INFO)\b/gi, '\x1b[32m$1\x1b[0m')
    processedLine = processedLine.replace(/\b(WARN|WARNING)\b/gi, '\x1b[33m$1\x1b[0m')
    processedLine = processedLine.replace(/\b(ERROR|FATAL|CRITICAL)\b/gi, '\x1b[31m$1\x1b[0m')
    processedLine = processedLine.replace(/\b(HTTP\/[12]\d{2})\b/gi, '\x1b[36m$1\x1b[0m')

    // Timestamps (common patterns)
    processedLine = processedLine.replace(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\b/g, '\x1b[90m$1\x1b[0m')

    output.push(processedLine)
  }

  return output.join('\n')
}

/**
 * Erzeugt eine klassische Hex-Dump-Darstellung aus dem gegebenen Text.
 *
 * Die Ausgabe enthält pro Zeile den hexadezimalen Offset, die Hex-Bytes und eine druckbare ASCII-Spalte sowie eine Fußzeile mit der Gesamtzahl der Bytes.
 *
 * @param content - Eingabedaten als UTF‑8-kodierter String, die als Bytefolge dargestellt werden sollen
 * @returns Die formatierte Hex-Dump-Zeichenkette (Offset, Hex-Bytes, ASCII-Spalte und Gesamtbytes)
 */
export function viewHex(content: string): string {
  const bytes = Buffer.from(content, 'utf-8')
  const lines: string[] = []
  const bytesPerLine = 16

  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    const chunk = bytes.slice(i, i + bytesPerLine)
    const offset = i.toString(16).padStart(8, '0')
    const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ')
    const paddedHex = (hex + '   '.repeat(bytesPerLine)).slice(0, 48)

    // ASCII representation
    const ascii = chunk.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('')

    lines.push(`${offset}  ${paddedHex} |${ascii}|`)
  }

  lines.push(`\n\x1b[90mTotal: ${bytes.length} bytes\x1b[0m`)

  return lines.join('\n')
}

/**
 * Ermittelt das Format einer Datei, rendert ihren Inhalt für die Terminal-Ausgabe und liefert Format, gerenderten Text sowie einfache Metadaten.
 *
 * @param filePath - Pfad zur Datei, die gelesen und gerendert werden soll
 * @returns Ein ViewResult mit `format` (erkanntes Format), `content` (gerenderte, terminal-farbige Darstellung oder Rohtext) und optionalem `metadata`-Objekt mit `rows` (Anzahl Zeilen) und `cols` (maximale Zeilenlänge)
 */
export async function viewFile(filePath: string): Promise<ViewResult> {
  const content = await readFile(filePath, 'utf-8')
  const format = detectFormat(filePath, content)

  let rendered: string

  switch (format) {
    case 'json':
      rendered = viewJSON(content)
      break
    case 'yaml':
      rendered = viewYAML(content)
      break
    case 'csv':
      rendered = viewCSV(content)
      break
    case 'markdown':
      rendered = viewMarkdown(content)
      break
    case 'log':
      rendered = viewLog(content)
      break
    case 'hex':
      rendered = viewHex(content)
      break
    default:
      rendered = content
  }

  return {
    format,
    content: rendered,
    metadata: {
      rows: content.split('\n').length,
      cols: Math.max(...content.split('\n').map(l => l.length)),
    },
  }
}

/**
 * Rendert einen Textinhalt für die Anzeige und erkennt das Format automatisch oder verwendet einen Hinweis.
 *
 * @param content - Zu rendernder roher Textinhalt
 * @param formatHint - Optionaler Hinweis auf das Format (z. B. "json", "yaml", "csv", "markdown", "log", "hex"); wenn nicht gesetzt, wird das Format aus Inhalt/Dateiname ermittelt
 * @returns Ein ViewResult mit dem erkannten oder verwendeten `format`, dem gerenderten `content` und `metadata` mit `rows` (Anzahl Zeilen) und `cols` (Länge der längsten Zeile)
 */
export function viewContent(content: string, formatHint?: string): ViewResult {
  const format = formatHint || detectFormat('', content)

  let rendered: string

  switch (format) {
    case 'json':
      rendered = viewJSON(content)
      break
    case 'yaml':
      rendered = viewYAML(content)
      break
    case 'csv':
      rendered = viewCSV(content)
      break
    case 'markdown':
      rendered = viewMarkdown(content)
      break
    case 'log':
      rendered = viewLog(content)
      break
    case 'hex':
      rendered = viewHex(content)
      break
    default:
      rendered = content
  }

  return {
    format,
    content: rendered,
    metadata: {
      rows: content.split('\n').length,
      cols: Math.max(...content.split('\n').map(l => l.length)),
    },
  }
}
