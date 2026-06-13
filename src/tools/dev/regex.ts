// Regex tester and debugger
// Test, find, explain, and suggest regex patterns

/**
 * Prüft ein reguläres Ausdrucksmuster gegen einen Eingabetext und liefert Trefferinformation sowie gefundene Gruppen.
 *
 * @param pattern - Das Regex-Muster als Zeichenkette
 * @param flags - Optionale Regex-Flags (z. B. `"g"`, `"i"`, `"m"`)
 * @param input - Der zu testende Eingabetext
 * @returns Ein Objekt mit:
 * - `match`: `true` wenn mindestens ein Treffer gefunden wurde, `false` sonst.
 * - `matches`: Das erste `RegExpMatchArray`-Ergebnis oder `null` wenn kein Treffer vorliegt.
 * - `groups` (optional): Ein Mapping gefangener Gruppen; positionsbasierte Gruppen sind als `group1`, `group2`, … vorhanden und benannte Gruppen (falls vorhanden) werden zusätzlich eingefügt.
 * @throws Error Wenn das Muster oder die Flags ungültig sind (Fehlermeldung beginnt mit `Invalid regex:`)
 */
export function testRegex(pattern: string, flags: string = '', input: string): {
  match: boolean
  matches: RegExpMatchArray | null
  groups?: { [key: string]: string }
} {
  try {
    const regex = new RegExp(pattern, flags)
    const match = regex.test(input)
    const fullMatch = regex.exec(input)

    // Reset lastIndex for global regex
    regex.lastIndex = 0

    let groups: { [key: string]: string } | undefined
    if (fullMatch && fullMatch.length > 1) {
      groups = {}
      for (let i = 1; i < fullMatch.length; i++) {
        groups[`group${i}`] = fullMatch[i] || ''
      }
      // Named groups
      if (regex.exec('') && typeof regex.exec('') === 'object') {
        const namedGroups = (regex as any).exec('')?.groups
        if (namedGroups) {
          for (const [key, value] of Object.entries(namedGroups)) {
            groups[key] = value as string
          }
        }
      }
    }

    return { match, matches: fullMatch, groups }
  } catch (error: any) {
    throw new Error(`Invalid regex: ${error.message}`)
  }
}

/**
 * Sucht alle Vorkommen eines regulären Ausdrucks im Eingabetext und liefert Treffer mit Positionen und gefangenen Gruppen.
 *
 * @param pattern - Die Regex-Vorlage (ohne umschließende Schrägstriche)
 * @param flags - Regex-Flags; falls `g` fehlt, wird sie automatisch angefügt, damit alle Vorkommen gefunden werden
 * @param input - Der zu durchsuchende Text
 * @returns Ein Array von Treffern; jedes Element enthält `match` (die gefundene Zeichenkette), `index` (Startposition im Eingabetext) und optional `groups` (positional als `group1`, `group2`, … mit leeren Strings für nicht gefangene Gruppen sowie alle benannten Gruppen)
 * 
 * Hinweis: Bei null-langen Treffern wird die Suche vorwärts verschoben, um Endlosschleifen zu vermeiden.
 */
export function findRegex(pattern: string, flags: string = '', input: string): Array<{
  match: string
  index: number
  groups?: { [key: string]: string }
}> {
  try {
    const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
    const results: Array<{ match: string; index: number; groups?: { [key: string]: string } }> = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(input)) !== null) {
      const groups: { [key: string]: string } = {}
      if (match.length > 1) {
        for (let i = 1; i < match.length; i++) {
          groups[`group${i}`] = match[i] || ''
        }
      }
      // Named groups
      if ((regex as any).exec('')?.groups) {
        const namedGroups = (regex as any).exec('')?.groups
        if (namedGroups) {
          for (const [key, value] of Object.entries(namedGroups)) {
            groups[key] = value as string
          }
        }
      }

      results.push({
        match: match[0],
        index: match.index,
        groups: Object.keys(groups).length > 0 ? groups : undefined,
      })

      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++
      }
    }

    return results
  } catch (error: any) {
    throw new Error(`Invalid regex: ${error.message}`)
  }
}

/**
 * Erzeugt eine zeilenweise menschenlesbare Erklärung eines Regex-Patterns.
 *
 * Beschreibt die im Pattern vorkommenden Token und Konstrukte (z. B. Escape-Sequenzen, Zeichenklassen,
 * Gruppen, Lookarounds, Alternation, Anker und Quantifizierer) und hängt am Ende eine kurze Erläuterung
 * gängiger Regex-Flags an.
 *
 * @param pattern - Das zu erklärende Regex-Muster
 * @returns Mehrzeilige Textbeschreibung der einzelnen Token, Gruppen, Klassen, Quantifizierer, Assertions und gängigen Flags
 */
export function explainRegex(pattern: string): string {
  const explanation: string[] = []
  explanation.push(`Pattern: ${pattern}`)
  explanation.push('')

  // Parse pattern character by character
  let i = 0
  const len = pattern.length
  let inCharClass = false
  let inGroup = 0

  while (i < len) {
    const char = pattern[i]

    if (char === '\\' && i + 1 < len) {
      const escaped = pattern[i + 1]
      explanation.push(`  \\${escaped}: ` + getEscapedMeaning(escaped))
      i += 2
    } else if (char === '[') {
      inCharClass = true
      const end = pattern.indexOf(']', i)
      if (end !== -1) {
        const content = pattern.slice(i + 1, end)
        explanation.push(`  [${content}]: character class - ${getCharClassMeaning(content)}`)
        i = end + 1
        inCharClass = false
      } else {
        i++
      }
    } else if (char === '(') {
      inGroup++
      if (pattern[i + 1] === '?') {
        // Special group
        if (pattern[i + 2] === ':') {
          explanation.push(`  (?:...): non-capturing group`)
          i += 3
        } else if (pattern[i + 2] === '=') {
          explanation.push(`  (?=...): positive lookahead`)
          i += 3
        } else if (pattern[i + 2] === '!') {
          explanation.push(`  (?!...): negative lookahead`)
          i += 3
        } else if (pattern[i + 2] === '<') {
          if (pattern[i + 3] === '=') {
            explanation.push(`  (?<=...): positive lookbehind`)
            i += 4
          } else if (pattern[i + 3] === '!') {
            explanation.push(`  (?<!...): negative lookbehind`)
            i += 4
          }
        }
      } else {
        explanation.push(`  (...): capturing group (group ${inGroup})`)
        i++
      }
    } else if (char === ')') {
      inGroup--
      i++
    } else if (char === '|') {
      explanation.push(`  |: OR (alternation)`)
      i++
    } else if (char === '.') {
      explanation.push(`  .: any single character except newline`)
      i++
    } else if (char === '^') {
      explanation.push(`  ^: start of string/line`)
      i++
    } else if (char === '$') {
      explanation.push(`  $: end of string/line`)
      i++
    } else if (char === '*') {
      explanation.push(`  *: zero or more repetitions`)
      i++
    } else if (char === '+') {
      explanation.push(`  +: one or more repetitions`)
      i++
    } else if (char === '?') {
      explanation.push(`  ?: zero or one repetition (optional)`)
      i++
    } else if (char === '{') {
      const end = pattern.indexOf('}', i)
      if (end !== -1) {
        const content = pattern.slice(i + 1, end)
        explanation.push(`  {${content}}: quantifier (${content} repetitions)`)
        i = end + 1
      } else {
        i++
      }
    } else if (char === '\\') {
      i++ // already handled above
    } else {
      explanation.push(`  ${char}: literal character`)
      i++
    }
  }

  // Add common flags explanation
  explanation.push('')
  explanation.push('Common flags:')
  explanation.push('  g: global - find all matches')
  explanation.push('  i: case-insensitive')
  explanation.push('  m: multiline - ^ and $ match line boundaries')
  explanation.push('  s: dotAll - . matches newlines')
  explanation.push('  u: unicode - treat pattern as unicode')
  explanation.push('  y: sticky - match from lastIndex only')

  return explanation.join('\n')
}

/**
 * Liefert eine kurze, menschenlesbare Beschreibung für ein einzelnes Regex-Escape-Zeichen.
 *
 * @param escaped - Das nach dem Backslash stehende Zeichen (z. B. `'d'` für `\d`)
 * @returns Eine beschreibende Zeichenkette für das Escape (z. B. `digit (0-9)`). Für unbekannte Escape-Zeichen wird `special character: <zeichen>` zurückgegeben.
 */
function getEscapedMeaning(escaped: string): string {
  const meanings: Record<string, string> = {
    d: 'digit (0-9)',
    D: 'non-digit',
    w: 'word character (a-z, A-Z, 0-9, _)',
    W: 'non-word character',
    s: 'whitespace (space, tab, newline)',
    S: 'non-whitespace',
    n: 'newline',
    r: 'carriage return',
    t: 'tab',
    b: 'word boundary',
    B: 'non-word boundary',
  }
  return meanings[escaped] || `special character: ${escaped}`
}

/**
 * Gibt eine kurze, menschenlesbare Beschreibung des Inhalts einer Regex-Zeichenklasse zurück.
 *
 * @param content - Der Inhalt der Zeichenklasse ohne die umschließenden eckigen Klammern (z. B. `a-z`, `^0-9`, `a-zA-Z0-9`)
 * @returns Eine lesbare Beschreibung des Inhalts (z. B. `digits 0-9`, `lowercase letters a-z`, `negated - any character except: ...` oder `character set: ...`)
 */
function getCharClassMeaning(content: string): string {
  if (content.startsWith('^')) {
    return `negated - any character except: ${content.slice(1)}`
  }
  if (content === '0-9') return 'digits 0-9'
  if (content === 'a-z') return 'lowercase letters a-z'
  if (content === 'A-Z') return 'uppercase letters A-Z'
  if (content === 'a-zA-Z') return 'letters a-z and A-Z'
  if (content === 'a-zA-Z0-9') return 'alphanumeric characters'
  return `character set: ${content}`
}

/**
 * Common regex patterns library
 */
export const commonPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  emailStrict: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  phone: /^\+?1?\d{10,11}$/,
  phoneUS: /^(\+1|1)?[\s\-]?\(?[2-9]\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{4}$/,
  url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  dateISO: /^\d{4}-\d{2}-\d{2}$/,
  time24: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  creditCard: /^(?:\d{4}[-\s]?){3}\d{4}$/,
  hexColor: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  username: /^[a-zA-Z0-9_-]{3,16}$/,
  zipCodeUS: /^\d{5}(-\d{4})?$/,
  semver: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
}

/**
 * Gibt ein vordefiniertes reguläres Muster anhand seines Schlüssels zurück.
 *
 * @param name - Der Schlüssel des gewünschten Musters aus `commonPatterns`
 * @returns Das zugehörige `RegExp`-Objekt, oder `undefined`, wenn kein Muster unter dem Namen existiert
 */
export function getCommonPattern(name: keyof typeof commonPatterns): RegExp | undefined {
  return commonPatterns[name]
}

/**
 * Schlägt basierend auf einer freitextlichen Beschreibung ein passendes Regex-Muster, die zugehörigen Flags und eine kurze Erklärung vor.
 *
 * @param description - Freitextbeschreibung oder Stichworte (z. B. "email", "phone", "iso date")
 * @returns Ein Objekt mit den Feldern:
 * - `pattern`: das vorgeschlagene reguläre Ausdrucksmuster als Zeichenkette (leer, wenn keine Empfehlung vorliegt),
 * - `flags`: die empfohlenen RegExp-Flags als Zeichenkette,
 * - `explanation`: eine kurze, menschenlesbare Beschreibung des Vorschlags
 */
export function suggestRegex(description: string): { pattern: string; flags: string; explanation: string } {
  const desc = description.toLowerCase()

  // Email
  if (desc.includes('email')) {
    return {
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      flags: '',
      explanation: 'Matches email addresses with standard format',
    }
  }

  // Phone number
  if (desc.includes('phone') || desc.includes('telephone')) {
    if (desc.includes('us') || desc.includes('american')) {
      return {
        pattern: '^\\+?1?[\\s\\-]?\\(?[2-9]\\d{2}\\)?[\\s\\-]?\\d{3}[\\s\\-]?\\d{4}$',
        flags: '',
        explanation: 'Matches US phone numbers with optional country code',
      }
    }
    return {
      pattern: '^\\+?\\d{10,15}$',
      flags: '',
      explanation: 'Matches international phone numbers (10-15 digits with optional +)',
    }
  }

  // URL
  if (desc.includes('url') || desc.includes('website') || desc.includes('link')) {
    return {
      pattern: '^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$',
      flags: 'i',
      explanation: 'Matches HTTP/HTTPS URLs',
    }
  }

  // IP address
  if (desc.includes('ip') && desc.includes('v6')) {
    return {
      pattern: '^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$',
      flags: '',
      explanation: 'Matches IPv6 addresses',
    }
  }
  if (desc.includes('ip')) {
    return {
      pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
      flags: '',
      explanation: 'Matches IPv4 addresses',
    }
  }

  // Date
  if (desc.includes('date')) {
    if (desc.includes('iso') || desc.includes('yyyy')) {
      return {
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        flags: '',
        explanation: 'Matches ISO 8601 dates (YYYY-MM-DD)',
      }
    }
    return {
      pattern: '^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\\d{4}$',
      flags: '',
      explanation: 'Matches US dates (MM/DD/YYYY)',
    }
  }

  // Time
  if (desc.includes('time')) {
    return {
      pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
      flags: '',
      explanation: 'Matches 24-hour time format (HH:MM)',
    }
  }

  // Credit card
  if (desc.includes('credit') || desc.includes('card')) {
    return {
      pattern: '^(?:\\d{4}[\\s-]?){3}\\d{4}$',
      flags: '',
      explanation: 'Matches credit card numbers (with optional spaces/dashes)',
    }
  }

  // Hex color
  if (desc.includes('color') || desc.includes('hex')) {
    return {
      pattern: '^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$',
      flags: '',
      explanation: 'Matches hex color codes (#RGB or #RRGGBB)',
    }
  }

  // Password (strong)
  if (desc.includes('password') && (desc.includes('strong') || desc.includes('secure'))) {
    return {
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
      flags: '',
      explanation: 'Strong password: min 8 chars, uppercase, lowercase, number, special char',
    }
  }

  // Username
  if (desc.includes('username') || desc.includes('user name')) {
    return {
      pattern: '^[a-zA-Z0-9_-]{3,16}$',
      flags: '',
      explanation: 'Username: 3-16 alphanumeric chars, underscores, hyphens',
    }
  }

  // Zip code (US)
  if (desc.includes('zip') || desc.includes('postal')) {
    return {
      pattern: '^\\d{5}(-\\d{4})?$',
      flags: '',
      explanation: 'US ZIP code (5 digits or 5+4)',
    }
  }

  // Integer
  if (desc.includes('integer') || desc.includes('whole number')) {
    return {
      pattern: '^-?\\d+$',
      flags: '',
      explanation: 'Matches integer numbers (positive or negative)',
    }
  }

  // Float/Decimal
  if (desc.includes('float') || desc.includes('decimal')) {
    return {
      pattern: '^-?\\d+\\.\\d+$',
      flags: '',
      explanation: 'Matches decimal numbers',
    }
  }

  // Alphanumeric
  if (desc.includes('alphanumeric')) {
    return {
      pattern: '^[a-zA-Z0-9]+$',
      flags: '',
      explanation: 'Only letters and numbers',
    }
  }

  // Letters only
  if (desc.includes('letter') && !desc.includes('alphanumeric')) {
    return {
      pattern: '^[a-zA-Z]+$',
      flags: '',
      explanation: 'Only letters (uppercase and lowercase)',
    }
  }

  return {
    pattern: '',
    flags: '',
    explanation: 'No suggestion available. Try describing with keywords like: email, phone, URL, IP, date, time, password, etc.',
  }
}
