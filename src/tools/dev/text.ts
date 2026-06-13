// Text statistics and analysis
// word count, char frequency, readability, diff, similarity, summarize, case conversions

/**
 * Ermittelt grundlegende Textstatistiken für einen gegebenen Eingabestring.
 *
 * @param str - Der zu analysierende Text
 * @returns Ein Objekt mit folgenden Metriken:
 * - `words`: Anzahl der Wörter (Trennung an beliebigen Whitespace-Zeichen)
 * - `chars`: Anzahl der Zeichen (`str.length`)
 * - `lines`: Anzahl der Zeilen (Anzahl der Segmente getrennt durch `\n`)
 * - `sentences`: Anzahl der Sätze (Aufteilung an `[.!?]+`, einfache Heuristik)
 * - `paragraphs`: Anzahl nicht-leerer Absätze (Trennung an Leerzeilen)
 */
export function wordCount(str: string): {
  words: number
  chars: number
  lines: number
  sentences: number
  paragraphs: number
} {
  const chars = str.length
  const lines = str.split('\n').length
  const paragraphs = str.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

  // Word count: split by whitespace, filter empty
  const words = str.trim().split(/\s+/).filter(w => w.length > 0).length

  // Sentence count: split by . ! ? (basic)
  const sentences = str.split(/[.!?]+/).filter(s => s.trim().length > 0).length

  return { words, chars, lines, sentences, paragraphs }
}

/**
 * Erstellt eine Häufigkeitskarte der Zeichen in einem String.
 *
 * @param str - Der Eingabetext, dessen einzelne Zeichen gezählt werden
 * @returns Eine Map, die jedem Zeichen seine Anzahl von Vorkommen zuordnet
 */
export function charFrequency(str: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1)
  }
  return freq
}

/**
 * Schätzt die Lesbarkeit eines Texts mit einem Flesch‑Reading‑Ease‑ähnlichen Score.
 *
 * Gibt einen numerischen Lesbarkeitswert sowie eine zugeordnete Schul-/Bildungsstufe und eine kurze Interpretation zurück.
 * Bei leerem oder unzureichendem Text wird `score` auf `0`, `grade` auf `'N/A'` und `interpretation` auf eine passende Hinweisnachricht gesetzt.
 *
 * @returns `score` — Lesbarkeitswert von 0 bis 100 (höher = leichter lesbar); `grade` — angenäherte Schul-/Bildungsstufe als String; `interpretation` — kurze Erläuterung der Lesbarkeit
 */
export function readabilityScore(str: string): {
  score: number
  grade: string
  interpretation: string
} {
  const text = str.trim()
  if (text.length === 0) {
    return { score: 0, grade: 'N/A', interpretation: 'No text provided' }
  }

  const words = text.split(/\s+/).filter(w => w.length > 0).length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const syllables = countSyllables(text)

  if (words === 0 || sentences === 0) {
    return { score: 0, grade: 'N/A', interpretation: 'Insufficient text' }
  }

  const wordsPerSentence = words / sentences
  const syllablesPerWord = syllables / words

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord
  const clampedScore = Math.max(0, Math.min(100, score))

  let grade: string
  let interpretation: string

  if (score >= 90) {
    grade = '5th grade'
    interpretation = 'Very easy to read. Easily understood by an average 11-year-old student.'
  } else if (score >= 80) {
    grade = '6th grade'
    interpretation = 'Easy to read. Conversational English for consumers.'
  } else if (score >= 70) {
    grade = '7th grade'
    interpretation = 'Fairly easy to read.'
  } else if (score >= 60) {
    grade = '8th-9th grade'
    interpretation = 'Standard English. Easily understood by 13- to 15-year-old students.'
  } else if (score >= 50) {
    grade = '10th-12th grade'
    interpretation = 'Fairly difficult to read.'
  } else if (score >= 30) {
    grade = 'College'
    interpretation = 'Difficult to read.'
  } else {
    grade = 'College graduate'
    interpretation = 'Very difficult to read. Best understood by university graduates.'
  }

  return {
    score: Math.round(clampedScore * 10) / 10,
    grade,
    interpretation,
  }
}

/**
 * Schätzt die Anzahl der Silben in einem Text.
 *
 * Liefert eine ungefähre Silbenanzahl; nicht phonologisch exakt. Nicht-buchstabige Zeichen werden vor der Auswertung entfernt und einfache Heuristiken (z. B. Zählen von Vokalgruppen, Behandlung endendem `e` und `le`-Endungen) verwendet.
 *
 * @param text - Der Eingabetext; Wörter werden anhand von Leerraum getrennt
 * @returns Die geschätzte Gesamtanzahl der Silben im Text
 */
function countSyllables(text: string): number {
  let count = 0
  const words = text.toLowerCase().split(/\s+/)

  for (const word of words) {
    // Remove non-alphabetic characters
    const cleanWord = word.replace(/[^a-z]/g, '')
    if (cleanWord.length === 0) continue

    // Count vowel groups
    const vowelGroups = cleanWord.match(/[aeiouy]+/g)
    const wordSyllables = vowelGroups ? vowelGroups.length : 1

    // Adjust for silent e
    let adjusted = wordSyllables
    if (cleanWord.endsWith('e') && wordSyllables > 1) {
      adjusted--
    }

    // Adjust for 'le' ending
    if (cleanWord.length > 2 && cleanWord.endsWith('le') && !cleanWord.endsWith('ble') && cleanWord[cleanWord.length - 3] !== 'a' && cleanWord[cleanWord.length - 3] !== 'e' && cleanWord[cleanWord.length - 3] !== 'i' && cleanWord[cleanWord.length - 3] !== 'o' && cleanWord[cleanWord.length - 3] !== 'u') {
      adjusted++
    }

    count += Math.max(1, adjusted)
  }

  return count
}

/**
 * Ermittelt zeilenweise Unterschiede zwischen zwei Texten und erzeugt eine Hunk- sowie eine Unified-diff-Darstellung.
 *
 * Liefert eine Liste von Hunks, in denen für jede Änderung die Startpositionen und die jeweils entfernten/neu hinzugefügten Zeilen enthalten sind, sowie eine zusammengeführte Unified-diff-Stringdarstellung.
 *
 * @returns Ein Objekt mit zwei Feldern:
 *  - `hunks`: Array von Änderungen; jedes Hunk hat `oldStart` (1-basierte Startzeile in der Originaldatei), `newStart` (1-basierte Startzeile in der modifizierten Datei), `oldLines` (entfernte Zeilen) und `newLines` (hinzugefügte Zeilen).
 *  - `unified`: Die Diff-Ausgabe im Unified-Diff-Format als einzelner String (mehrere Zeilen durch `\n` getrennt).
 */
export function diffText(a: string, b: string): {
  hunks: Array<{
    oldStart: number
    newStart: number
    oldLines: string[]
    newLines: string[]
  }>
  unified: string
} {
  const linesA = a.split('\n')
  const linesB = b.split('\n')

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(linesA, linesB)
  const hunks: Array<{ oldStart: number; newStart: number; oldLines: string[]; newLines: string[] }> = []

  let i = 0, j = 0
  let oldHunk: string[] = []
  let newHunk: string[] = []
  let oldStart = 0
  let newStart = 0

  const flushHunk = () => {
    if (oldHunk.length > 0 || newHunk.length > 0) {
      hunks.push({
        oldStart,
        newStart,
        oldLines: [...oldHunk],
        newLines: [...newHunk],
      })
    }
    oldHunk = []
    newHunk = []
  }

  for (const idx of lcs) {
    // Process differences before this common element
    while (i < idx && i < linesA.length) {
      oldHunk.push(linesA[i])
      i++
    }
    while (j < idx && j < linesB.length) {
      newHunk.push(linesB[j])
      j++
    }

    if (oldHunk.length > 0 || newHunk.length > 0) {
      oldStart = i - oldHunk.length + 1
      newStart = j - newHunk.length + 1
      flushHunk()
    }

    // Skip common element
    if (i < linesA.length && j < linesB.length && linesA[i] === linesB[j]) {
      i++
      j++
    }
  }

  // Process remaining lines
  while (i < linesA.length) {
    oldHunk.push(linesA[i])
    i++
  }
  while (j < linesB.length) {
    newHunk.push(linesB[j])
    j++
  }
  if (oldHunk.length > 0 || newHunk.length > 0) {
    oldStart = i - oldHunk.length + 1
    newStart = j - newHunk.length + 1
    flushHunk()
  }

  // Generate unified diff
  const unifiedLines: string[] = []
  unifiedLines.push('--- original')
  unifiedLines.push('+++ modified')

  for (const hunk of hunks) {
    unifiedLines.push(`@@ -${hunk.oldStart},${hunk.oldLines.length} +${hunk.newStart},${hunk.newLines.length} @@`)
    for (const line of hunk.oldLines) {
      unifiedLines.push(`-${line}`)
    }
    for (const line of hunk.newLines) {
      unifiedLines.push(`+${line}`)
    }
  }

  return { hunks, unified: unifiedLines.join('\n') }
}

/**
 * Bestimmt die Indizes der Elemente in `a`, die zu einer längsten gemeinsamen Teilfolge (LCS) mit `b` gehören.
 *
 * @param a - Erstes Array von Zeichenketten zur Vergleichsgrundlage
 * @param b - Zweites Array von Zeichenketten, gegen das `a` verglichen wird
 * @returns Ein Array mit den Indizes aus `a` (in aufsteigender Reihenfolge), die Teil einer längsten gemeinsamen Teilfolge zwischen `a` und `b` sind
 */
function longestCommonSubsequence(a: string[], b: string[]): number[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to get indices
  const indices: number[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      indices.unshift(i - 1)
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return indices
}

/**
 * Berechnet die Levenshtein-Edit-Distanz zwischen zwei Zeichenketten und leitet daraus normalisierte Ähnlichkeitswerte ab.
 *
 * @param a - Erste Zeichenkette
 * @param b - Zweite Zeichenkette
 * @returns Ein Objekt mit den Feldern:
 *  - `distance`: die minimale Anzahl von Einfüge-, Lösch- oder Ersetzoperationen, um `a` in `b` zu verwandeln
 *  - `similarity`: der ungerundete Ähnlichkeitswert im Bereich [0, 1] (1 = identisch), berechnet als `1 - distance / maxLen`
 *  - `normalized`: derselbe Ähnlichkeitswert auf drei Dezimalstellen gerundet
 */
export function similarity(a: string, b: string): {
  distance: number
  similarity: number
  normalized: number
} {
  const lenA = a.length
  const lenB = b.length

  if (lenA === 0 && lenB === 0) {
    return { distance: 0, similarity: 1, normalized: 1 }
  }

  const matrix: number[][] = Array(lenA + 1).fill(null).map(() => Array(lenB + 1).fill(0))

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  const distance = matrix[lenA][lenB]
  const maxLen = Math.max(lenA, lenB)
  const normalized = 1 - distance / maxLen

  return {
    distance,
    similarity: normalized,
    normalized: Math.round(normalized * 1000) / 1000,
  }
}

/**
 * Erstellt eine kurze extraktive Zusammenfassung durch Auswahl und Bewertung von Sätzen.
 *
 * Wählt die besten `sentenceCount` Sätze basierend auf Worthäufigkeiten im Text (kurze Wörter mit Länge ≤ 3 werden ignoriert)
 * und gibt diese in ihrer ursprünglichen Reihenfolge zusammengefügt zurück. Der erste und der letzte Satz erhalten
 * eine leichte Gewichtung, um einführende und abschließende Sätze zu bevorzugen. Wenn der Text bereits aus
 * höchstens `sentenceCount` Sätzen besteht, wird der Originaltext unverändert zurückgegeben.
 *
 * @param sentenceCount - Anzahl der Sätze, die in der Zusammenfassung enthalten sein sollen (Standard: 3)
 * @returns Die extraktive Zusammenfassung als zusammengefügte Sätze
 */
export function summarize(str: string, sentenceCount: number = 3): string {
  const sentences = str.match(/[^.!?]+[.!?]+/g) || [str]
  if (sentences.length <= sentenceCount) {
    return str
  }

  // Score sentences based on word frequency
  const wordFreq = new Map<string, number>()
  const words = str.toLowerCase().match(/\b\w+\b/g) || []
  for (const word of words) {
    if (word.length > 3) { // Ignore short words
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  }

  // Score each sentence
  const scoredSentences = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || []
    let score = 0
    for (const word of sentenceWords) {
      score += wordFreq.get(word) || 0
    }
    // Normalize by sentence length
    score /= sentenceWords.length || 1
    // Boost first and last sentences slightly
    if (index === 0 || index === sentences.length - 1) {
      score *= 1.1
    }
    return { sentence, score, index }
  })

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a, b) => a.index - b.index) // Restore original order

  return topSentences.map(s => s.sentence.trim()).join(' ')
}

/**
 * Case conversion utilities
 */
export const caseConvert = {
  /**
   * Convert to camelCase
   */
  camelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^([A-Z])/, (c) => c.toLowerCase())
  },

  /**
   * Convert to snake_case
   */
  snakeCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[-\s]+/g, '_')
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
  },

  /**
   * Convert to PascalCase
   */
  pascalCase(str: string): string {
    const camel = caseConvert.camelCase(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  },

  /**
   * Convert to kebab-case
   */
  kebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/([A-Z])/g, '-$1')
      .replace(/^-/, '')
  },

  /**
   * Convert to UPPERCASE
   */
  upperCase(str: string): string {
    return str.toUpperCase()
  },

  /**
   * Convert to lowercase
   */
  lowerCase(str: string): string {
    return str.toLowerCase()
  },

  /**
   * Convert to Title Case
   */
  titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  },

  /**
   * Convert to CONSTANT_CASE (SCREAMING_SNAKE_CASE)
   */
  constantCase(str: string): string {
    return caseConvert.snakeCase(str).toUpperCase()
  },
}
