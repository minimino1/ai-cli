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
 * Auto-detect format from extension and content
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
 * View JSON with syntax highlighting
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
 * View YAML with syntax highlighting
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
 * View CSV as formatted table
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

function padRight(str: string, width: number): string {
  return str.padEnd(width, ' ')
}

/**
 * View Markdown with basic formatting
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
 * View log with colored log levels
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
 * View hex dump
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
 * Main viewer function - auto-detect and render
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
 * View content directly (without file)
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
