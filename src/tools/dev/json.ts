// JSON Formatter/Validator/Minifier
// Supports: format, minify, validate, convert, JSONPath queries

/**
 * Pretty print JSON with custom indent
 */
export function formatJSON(str: string, indent: number = 2): string {
  try {
    const parsed = JSON.parse(str)
    return JSON.stringify(parsed, null, indent)
  } catch (error: any) {
    throw new Error(`Invalid JSON: ${error.message}`)
  }
}

/**
 * Minify JSON (remove all whitespace)
 */
export function minifyJSON(str: string): string {
  try {
    const parsed = JSON.parse(str)
    return JSON.stringify(parsed)
  } catch (error: any) {
    throw new Error(`Invalid JSON: ${error.message}`)
  }
}

/**
 * Validate JSON and return detailed error info
 */
export function validateJSON(str: string): { valid: boolean; error?: string; line?: number; col?: number } {
  try {
    JSON.parse(str)
    return { valid: true }
  } catch (error: any) {
    const match = error.message.match(/position (\d+)/)
    const position = match ? parseInt(match[1]) : undefined

    let line = undefined
    let col = undefined
    if (position !== undefined) {
      const before = str.substring(0, position)
      const lines = before.split('\n')
      line = lines.length
      col = lines[lines.length - 1].length + 1
    }

    return {
      valid: false,
      error: error.message,
      line,
      col,
    }
  }
}

/**
 * Convert JSON to another format (YAML, TOML, CSV)
 * Note: For YAML/TOML conversion, we use simple string building
 * CSV conversion assumes array of objects with same keys
 */
export function convertJSON(str: string, format: 'yaml' | 'toml' | 'csv'): string {
  const data = JSON.parse(str)
  const targetFormat = format.toLowerCase()

  if (targetFormat === 'yaml') {
    return jsonToYaml(data)
  } else if (targetFormat === 'toml') {
    return jsonToToml(data)
  } else if (targetFormat === 'csv') {
    return jsonToCsv(data)
  } else {
    throw new Error(`Unsupported format: ${format}. Use yaml, toml, or csv.`)
  }
}

/**
 * Simple JSON to YAML converter
 */
function jsonToYaml(data: any, indent: number = 0): string {
  const indentStr = '  '.repeat(indent)
  const lines: string[] = []

  if (data === null) {
    return 'null'
  }

  if (typeof data === 'boolean' || typeof data === 'number') {
    return String(data)
  }

  if (typeof data === 'string') {
    // Escape special characters for YAML
    if (data.includes(':') || data.includes('#') || data.includes('\n')) {
      return `"${data.replace(/"/g, '\\"')}"`
    }
    return data
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    for (const item of data) {
      lines.push(`${indentStr}- ${jsonToYaml(item, indent + 1).split('\n').join(`\n${indentStr}  `)}`)
    }
    return lines.join('\n')
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) return '{}'

    for (const key of keys) {
      const value = data[key]
      const valueStr = jsonToYaml(value, indent + 1)
      if (valueStr.includes('\n')) {
        lines.push(`${indentStr}${key}:`)
        lines.push(valueStr.split('\n').join(`\n${indentStr}  `))
      } else {
        lines.push(`${indentStr}${key}: ${valueStr}`)
      }
    }
    return lines.join('\n')
  }

  return String(data)
}

/**
 * Simple JSON to TOML converter
 */
function jsonToToml(data: any, prefix: string = ''): string {
  const lines: string[] = []

  if (data === null) {
    return ''
  }

  if (typeof data === 'boolean' || typeof data === 'number' || typeof data === 'string') {
    if (typeof data === 'string') {
      return `"${data.replace(/"/g, '\\"')}"`
    }
    return String(data)
  }

  if (Array.isArray(data)) {
    const values = data.map(item => jsonToToml(item)).join(', ')
    return `[${values}]`
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    for (const key of keys) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      const value = data[key]

      if (value === null) {
        lines.push(`${fullKey} = null`)
      } else if (typeof value === 'boolean') {
        lines.push(`${fullKey} = ${value}`)
      } else if (typeof value === 'number') {
        lines.push(`${fullKey} = ${value}`)
      } else if (typeof value === 'string') {
        lines.push(`${fullKey} = "${value.replace(/"/g, '\\"')}"`)
      } else if (Array.isArray(value)) {
        const items = value.map(v => jsonToToml(v)).join(', ')
        lines.push(`${fullKey} = [${items}]`)
      } else if (typeof value === 'object') {
        lines.push(`\n[${fullKey}]`)
        lines.push(jsonToToml(value, fullKey))
      }
    }
    return lines.join('\n')
  }

  return String(data)
}

/**
 * Convert JSON array of objects to CSV
 */
function jsonToCsv(data: any): string {
  if (!Array.isArray(data) || data.length === 0) {
    return ''
  }

  const headers = Object.keys(data[0])
  const lines: string[] = []

  // Header row
  lines.push(headers.join(','))

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) {
        return ''
      }
      const str = String(value)
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}

/**
 * Simple JSONPath query implementation
 * Supports: $.store.book[*].author, $.store..price, $.*.author
 */
export function queryJSONPath(str: string, path: string): any {
  const data = JSON.parse(str)

  // Remove leading $.
  let pathStr = path.replace(/^\$\.?/, '')

  // Handle recursive descent ..
  if (pathStr.includes('..')) {
    return recursiveDescent(data, pathStr.split('..').pop() || '')
  }

  // Split by dots
  const parts = pathStr.split('.')

  let current: any = data
  for (const part of parts) {
    if (part === '*') {
      if (Array.isArray(current)) {
        current = current.map(item => item)
      } else if (typeof current === 'object' && current !== null) {
        current = Object.values(current)
      } else {
        return undefined
      }
    } else if (part.includes('[')) {
      // Array access like book[0] or book[*]
      const baseName = part.split('[')[0]
      const indexStr = part.match(/\[(\*|\d+)\]/)?.[1]

      if (baseName) {
        current = current[baseName]
      }

      if (indexStr !== undefined) {
        if (indexStr === '*') {
          if (Array.isArray(current)) {
            current = current
          } else {
            return undefined
          }
        } else {
          const index = parseInt(indexStr)
          current = current?.[index]
        }
      }
    } else {
      current = current?.[part]
    }

    if (current === undefined || current === null) {
      return undefined
    }
  }

  return current
}

/**
 * Recursive descent for JSONPath .. operator
 */
function recursiveDescent(obj: any, key: string): any[] {
  const results: any[] = []

  function search(o: any): void {
    if (o === null || typeof o !== 'object') return

    if (Array.isArray(o)) {
      for (const item of o) {
        search(item)
      }
    } else {
      if (key in o) {
        results.push(o[key])
      }
      for (const value of Object.values(o)) {
        search(value)
      }
    }
  }

  search(obj)
  return results
}
