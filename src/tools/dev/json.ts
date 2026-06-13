// JSON Formatter/Validator/Minifier
// Supports: format, minify, validate, convert, JSONPath queries

/**
 * Formatiert (pretty-prints) einen JSON-String mit der angegebenen Einrückung.
 *
 * @param str - Der zu formatierende JSON-String
 * @param indent - Anzahl Leerzeichen pro Einrückungsstufe (Standard: 2)
 * @returns Den formatierten JSON-String
 * @throws Wenn `str` kein gültiger JSON-String ist; die Fehlermeldung enthält die Parser-Fehlermeldung
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
 * Entfernt alle nicht-signifikanten Leerzeichen aus einem JSON-Text.
 *
 * @param str - Die Eingabe-Zeichenkette, die gültiges JSON enthalten muss
 * @returns Die komprimierte JSON-Zeichenkette ohne unnötige Leerzeichen
 * @throws Wenn `str` kein gültiges JSON ist, wird ein Error mit `Invalid JSON: <ursprüngliche Meldung>` geworfen
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
 * Prüft, ob ein String gültiges JSON ist und liefert bei Fehlern strukturierte Diagnoseinformationen.
 *
 * @param str - Der zu prüfende JSON-Text
 * @returns Ein Objekt mit `valid: true` bei erfolgreichem Parsen; bei `valid: false` enthält `error` die Fehlermeldung und `line`/`col` (1-basiert) die geschätzte Position des Fehlers, falls verfügbar.
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
 * Konvertiert eine JSON-Zeichenkette in das angegebene Zielformat.
 *
 * @param str - Die Eingabe-JSON als Zeichenkette
 * @param format - Zielformat: `yaml`, `toml` oder `csv` (kleingeschrieben oder gemischt)
 * @returns Die konvertierten Daten als Zeichenkette im gewählten Format
 * @throws Error wenn `format` nicht `yaml`, `toml` oder `csv` ist
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
 * Konvertiert einen JavaScript-Wert in eine einfache YAML-Darstellung.
 *
 * Unterstützte Eingabetypen: `null`, `boolean`, `number`, `string`, Arrays und Objekte.
 * Leere Arrays/Objekte werden als `[]` bzw. `{}` ausgegeben. Zeichenketten, die `:`, `#`
 * oder Zeilenumbrüche enthalten, werden in doppelte Anführungszeichen gesetzt und `"`-Zeichen escaped.
 *
 * @param data - Der zu konvertierende Wert
 * @param indent - Aktuelles Einzugsniveau für verschachtelte Strukturen (je Level werden zwei Leerzeichen hinzugefügt)
 * @returns Die YAML-Repräsentation von `data` als String
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
 * Konvertiert einen JSON-kompatiblen Wert in eine TOML-Repräsentation.
 *
 * Diese Funktion wandelt primitive Werte, Arrays und verschachtelte Objekte in ein TOML-Fragment um.
 * Bei verschachtelten Objekten werden Abschnittsüberschriften (`[section]`) erzeugt; `null` auf oberster Ebene ergibt eine leere Zeichenkette.
 *
 * @param data - Der JSON-kompatible Eingabewert (Primitiven, Array oder Objekt), der in TOML konvertiert werden soll
 * @param prefix - Optionaler Schlüsselpräfix für verschachtelte Objektfelder; wird zur Bildung von Tabellenpfaden verwendet
 * @returns Eine Zeichenkette mit der TOML-Darstellung von `data` (kann ein Fragment mit Tabellen/Schlüsseln, ein Array-Literal oder eine Primitive als String sein)
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
 * Konvertiert ein JSON-Array von Objekten in eine CSV-Zeichenfolge.
 *
 * Die Kopfzeile wird aus den Schlüsseln des ersten Objekts gebildet; Felder mit `null` oder `undefined` werden als leere Einträge ausgegeben. Felder, die Komma, Anführungszeichen oder neue Zeilen enthalten, werden gemäß CSV-Regeln in doppelte Anführungszeichen gesetzt und enthaltene Anführungszeichen werden verdoppelt.
 *
 * @param data - Ein Array von Objekten. Wenn `data` kein Array ist oder leer ist, wird eine leere Zeichenfolge zurückgegeben.
 * @returns Den CSV-Text mit einer Kopfzeile aus den Objekt-Schlüsseln des ersten Elements oder eine leere Zeichenfolge, falls `data` kein nicht-leeres Array ist.
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
 * Führt eine vereinfachte JSONPath-ähnliche Abfrage auf einem JSON-String aus.
 *
 * Unterstützte Syntax: Root `$` (optional), Punkt-Notation (`a.b.c`), Wildcard `*` (für Objekte oder Arrays), Array-Indexierung `key[n]` oder `key[*]`, und rekursive Suche mit `..` (z. B. `$.store..price`).
 *
 * @param str - Der zu durchsuchende JSON-String
 * @param path - Der JSONPath-Ausdruck (unterstützter Teilmengen-Syntax wie oben beschrieben)
 * @returns Den gefundenen Wert oder `undefined`, falls der Pfad nicht aufgelöst werden kann oder kein Treffer vorliegt
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
 * Sucht rekursiv in einem JSON-Objekt alle Werte, die unter einem bestimmten Schlüssel vorkommen.
 *
 * @param obj - Das zu durchsuchende Objekt oder Array
 * @param key - Der Schlüsselname, nach dem gesucht werden soll
 * @returns Ein Array mit allen gefundenen Werten für `key` (leer, wenn keine gefunden wurden)
 */
function recursiveDescent(obj: any, key: string): any[] {
  const results: any[] = []

  /**
   * Durchsucht rekursiv einen JSON-knoten und sammelt alle Werte für das im äußeren Kontext definierte `key`.
   *
   * Ignoriert Nicht-Objekte; bei Arrays wird jedes Element rekursiv durchsucht, bei Objekten werden
   * gefundene `key`-Werte in das äußere `results`-Array gepusht und alle Eigenschaftswerte weiter durchsucht.
   *
   * @param o - Aktueller Knoten (Objekt oder Array), der durchsucht wird
   */
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
