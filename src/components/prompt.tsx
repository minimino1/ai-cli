import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'

export type PromptType = 'confirm' | 'input' | 'select' | 'multiselect' | 'password' | 'editor'

export interface PromptOptions<T = any> {
  /** Prompt message */
  message: string
  /** Default value (for input/select) */
  defaultValue?: T
  /** Options for select/multiselect */
  choices?: T[]
  /** Get label from choice */
  getLabel?: (choice: T) => string
  /** Get value from choice */
  getValue?: (choice: T) => string | number
  /** Validation function */
  validate?: (value: T) => boolean | string
  /** Error message */
  errorMessage?: string
  /** Placeholder for input */
  placeholder?: string
  /** Whether to trim input */
  trim?: boolean
}

export interface PromptResult<T = any> {
  cancelled: boolean
  value?: T
}

/**
 * Rendert eine Ja/Nein-Bestätigungsabfrage und verarbeitet Tastatureingaben zur Auswahl und Bestätigung.
 *
 * @param message - Die angezeigte Prompt-Nachricht
 * @param defaultValue - Anfangsauswahl; `true` setzt "Yes", `false` setzt "No" (Standard: `false`)
 * @param onConfirm - Wird bei Bestätigung (Enter) mit `true` für "Yes" oder `false` für "No" aufgerufen
 * @param onCancel - Wird bei Abbruch (Escape) aufgerufen
 */
export function ConfirmPrompt({
  message,
  defaultValue = false,
  onConfirm,
  onCancel,
}: {
  message: string
  defaultValue?: boolean
  onConfirm?: (value: boolean) => void
  onCancel?: () => void
}) {
  const [selected, setSelected] = useState(defaultValue ? 'yes' : 'no')

  useInput((input, key) => {
    if (key.return) {
      const result = selected === 'yes'
      onConfirm?.(result)
    } else if (key.escape) {
      onCancel?.()
    } else if (input === 'y' || input === 'Y' || input === 'j') {
      setSelected('yes')
    } else if (input === 'n' || input === 'N' || input === 'k') {
      setSelected('no')
    }
  })

  return (
    <Box>
      <Text>{message} </Text>
      <Text color={selected === 'yes' ? 'green' : 'gray'}>[Yes]</Text>
      <Text> </Text>
      <Text color={selected === 'no' ? 'red' : 'gray'}>[No]</Text>
      <Text color="gray"> (y/n)</Text>
    </Box>
  )
}

/**
 * Rendert ein einzeiliges Texteingabe-Prompt mit optionaler Validierung, Platzhalter und blinkendem Cursor.
 *
 * @param message - Der Text, der über dem Eingabefeld angezeigt wird
 * @param defaultValue - Anfangswert der Eingabe
 * @param validate - Validierungsfunktion, die `true` für gültige Werte oder einen Fehlerstring/`false` für ungültige Werte zurückgibt
 * @param errorMessage - Fallback-Fehlermeldung, wenn `validate` kein String liefert
 * @param placeholder - Platzhaltertext, der angezeigt wird, wenn die Eingabe leer ist
 * @param trim - Ob die Eingabe beim Absenden automatisch getrimmt werden soll
 * @param onSubmit - Callback mit dem finalen (gegebenenfalls getrimmten) Wert bei Bestätigung
 * @param onCancel - Callback, wenn der Nutzer das Prompt abbricht (z. B. Escape)
 * @returns Das gerenderte InputPrompt-Element
 */
export function InputPrompt<T extends string = string>({
  message,
  defaultValue = '',
  validate,
  errorMessage = 'Invalid input',
  placeholder,
  trim = true,
  onSubmit,
  onCancel,
}: PromptOptions<T> & {
  onSubmit?: (value: T) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState(String(defaultValue))
  const [error, setError] = useState<string | null>(null)
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const validateValue = useCallback((val: string) => {
    if (validate) {
      const result = validate(val as T)
      if (result !== true) {
        return typeof result === 'string' ? result : errorMessage
      }
    }
    return null
  }, [validate, errorMessage])

  useEffect(() => {
    const err = validateValue(value)
    setError(err)
  }, [value, validateValue])

  useInput((input, key) => {
    if (key.return) {
      if (!error) {
        const finalValue = trim ? (value as T).trim() : (value as T)
        onSubmit?.(finalValue)
      }
    } else if (key.escape) {
      onCancel?.()
    } else if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1))
    } else if (input.length === 1 && !key.ctrl && !key.meta) {
      setValue(v => v + input)
    }
  })

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{message} </Text>
        <Text color="cyan">{value}</Text>
        <Text color={cursorVisible ? 'blue' : 'gray'}>_</Text>
      </Box>
      {error && (
        <Text color="red">{error}</Text>
      )}
      {placeholder && !value && (
        <Text color="gray" dimColor>
          {placeholder}
        </Text>
      )}
    </Box>
  )
}

/**
 * Rendert eine Passwort-Eingabe, die eingegebene Zeichen maskiert und einen blinkenden Cursor anzeigt.
 *
 * @param message - Die anzuzeigende Aufforderungstextzeile
 * @param onSubmit - Wird aufgerufen, wenn Enter gedrückt wird; erhält das eingegebene Passwort
 * @param onCancel - Wird aufgerufen, wenn Escape gedrückt wird, um die Eingabe abzubrechen
 */
export function PasswordPrompt({
  message,
  onSubmit,
  onCancel,
}: {
  message: string
  onSubmit?: (password: string) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useInput((input, key) => {
    if (key.return) {
      onSubmit?.(value)
    } else if (key.escape) {
      onCancel?.()
    } else if (key.backspace || key.delete) {
      setValue(v => v.slice(0, -1))
    } else if (input.length === 1 && !key.ctrl && !key.meta) {
      setValue(v => v + input)
    }
  })

  return (
    <Box>
      <Text>{message} </Text>
      <Text color="cyan">{'*'.repeat(value.length)}</Text>
      <Text color={cursorVisible ? 'blue' : 'gray'}>_</Text>
    </Box>
  )
}

/**
 * Rendert eine einzelne Auswahlaufforderung, mit der Nutzer per Pfeiltasten eine Option auswählen können.
 *
 * Zeigt die übergebene Nachricht und eine durch `choices` bestimmte Liste an; die fokussierte Option wird hervorgehoben.
 *
 * @param message - Die angezeigte Aufforderungstextzeile
 * @param choices - Array verfügbarer Auswahloptionen
 * @param getLabel - Funktion zur Erzeugung des Anzeigetextes für eine Wahl (Standard: String)
 * @param getValue - Funktion zur Erzeugung eines eindeutigen Schlüssels für eine Wahl (Standard: String)
 * @param defaultValue - Optional vorausgewählte Wahl; falls gesetzt wird der Fokus darauf initialisiert
 * @param onSubmit - Wird mit der gewählten Option aufgerufen, wenn Enter gedrückt wird
 * @param onCancel - Wird aufgerufen, wenn Escape gedrückt wird
 */
export function SelectPrompt<T>({
  message,
  choices,
  getLabel = (c) => String(c),
  getValue = (c) => String(c),
  defaultValue,
  onSubmit,
  onCancel,
}: PromptOptions<T> & {
  onSubmit?: (value: T) => void
  onCancel?: () => void
}) {
  const [focusedIndex, setFocusedIndex] = useState(
    defaultValue !== undefined
      ? choices.findIndex(c => getValue(c) === getValue(defaultValue))
      : 0
  )

  useInput((input, key) => {
    if (key.return) {
      onSubmit?.(choices[focusedIndex])
    } else if (key.escape) {
      onCancel?.()
    } else if (key.upArrow) {
      setFocusedIndex(i => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setFocusedIndex(i => Math.min(choices.length - 1, i + 1))
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{message}</Text>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" marginTop={1}>
        {choices.map((choice, idx) => {
          const label = getLabel(choice)
          const isFocused = idx === focusedIndex

          return (
            <Box
              key={getValue(choice)}
              backgroundColor={isFocused ? 'blue' : undefined}
              paddingX={1}
            >
              <Text color={isFocused ? 'white' : 'gray'}>
                {isFocused ? '▶' : ' '} {label}
              </Text>
            </Box>
          )
        })}
      </Box>
      <Text color="gray" dimColor>
        ↑↓ to navigate, Enter to select
      </Text>
    </Box>
  )
}

/**
 * Rendert ein interaktives Mehrfachauswahl-Prompt mit Tastatursteuerung.
 *
 * Unterstützt Navigation mit Pfeiltasten, Umschalten einzelner Optionen (Leertaste / `a`),
 * Bestätigung mit Enter und Abbrechen mit Esc. Zeigt außerdem die Anzahl ausgewählter Optionen.
 *
 * @param getLabel - Wandelt eine Choice in das anzuzeigende Label um (Standard: String(choice))
 * @param getValue - Liefert einen stabilen Schlüssel für eine Choice als String (Standard: String(choice))
 * @param defaultValue - Anfangs ausgewählte Choices
 * @param onSubmit - Wird mit dem Array der ausgewählten Choices aufgerufen, wenn der Nutzer bestätigt
 * @param onCancel - Wird aufgerufen, wenn der Nutzer das Prompt abbricht
 * @returns Das gerenderte Prompt-Element
 */
export function MultiSelectPrompt<T>({
  message,
  choices,
  getLabel = (c) => String(c),
  getValue = (c) => String(c),
  defaultValue = [],
  onSubmit,
  onCancel,
}: PromptOptions<T> & {
  onSubmit?: (values: T[]) => void
  onCancel?: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultValue.map(getValue))
  )
  const [focusedIndex, setFocusedIndex] = useState(0)

  const toggle = (choice: T) => {
    const key = getValue(choice)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  useInput((input, key) => {
    if (key.return) {
      const result = choices.filter(c => selected.has(getValue(c)))
      onSubmit?.(result)
    } else if (key.escape) {
      onCancel?.()
    } else if (key.upArrow) {
      setFocusedIndex(i => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setFocusedIndex(i => Math.min(choices.length - 1, i + 1))
    } else if (input === ' ' || input === 'a') {
      toggle(choices[focusedIndex])
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{message}</Text>
      <Text color="gray">
        Selected: {selected.size}/{choices.length} (Space to toggle, Enter to confirm)
      </Text>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" marginTop={1}>
        {choices.map((choice, idx) => {
          const label = getLabel(choice)
          const key = getValue(choice)
          const isSelected = selected.has(key)
          const isFocused = idx === focusedIndex

          return (
            <Box
              key={key}
              backgroundColor={isFocused ? 'blue' : undefined}
              paddingX={1}
            >
              <Box width={3}>
                <Text color={isSelected ? 'green' : 'gray'}>
                  {isSelected ? '✓' : ' '}
                </Text>
              </Box>
              <Text color={isFocused ? 'white' : 'gray'}>
                {label}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * Zeigt einen mehrzeiligen Texteingabe-Editor an und verwaltet Cursor-, Einfüge- und Löschoperationen.
 *
 * Der Editor unterstützt Zeilenumbruch (Shift+Enter), Einfügen von Zeichen, Rückschritt/Delete,
 * Zeilenverschmelzung/-aufteilung sowie Navigation mit den Pfeiltasten. Enter (ohne Shift) löst
 * die Übergabe des aktuellen Texts an `onSubmit` aus; Esc ruft `onCancel` auf.
 *
 * @param message - Die Anzeigeaufforderung oberhalb des Editors
 * @param defaultValue - Anfangstext, wird in Zeilen aufgeteilt (`\n` als Trenner)
 * @param onSubmit - Callback mit dem aktuellen Text (`lines.join('\n')`) bei Bestätigung
 * @param onCancel - Callback bei Abbruch (z. B. durch Esc)
 * @param placeholder - Platzhaltertext (optional; wird angezeigt, wenn kein Inhalt vorhanden ist)
 * @returns Das gerenderte Editor-Prompt-Element
 */
export function EditorPrompt({
  message,
  defaultValue = '',
  onSubmit,
  onCancel,
  placeholder,
}: PromptOptions<string> & {
  onSubmit?: (value: string) => void
  onCancel?: () => void
}) {
  const [lines, setLines] = useState(String(defaultValue).split('\n'))
  const [cursorLine, setCursorLine] = useState(0)
  const [cursorCol, setCursorCol] = useState(0)

  const currentLine = lines[cursorLine] || ''

  const moveCursor = useCallback((lineDelta: number, colDelta: number) => {
    setCursorLine(l => {
      const newLine = Math.max(0, Math.min(lines.length - 1, l + lineDelta))
      return newLine
    })
    setCursorCol(c => {
      const line = lines[cursorLine + lineDelta] || ''
      return Math.max(0, Math.min(line.length, c + colDelta))
    })
  }, [lines, cursorLine])

  useInput((input, key) => {
    if (key.return) {
      if (key.shift) {
        // Shift+Enter: new line
        setLines(prev => {
          const newLines = [...prev]
          const line = prev[cursorLine] || ''
          const before = line.slice(0, cursorCol)
          const after = line.slice(cursorCol)
          newLines[cursorLine] = before
          newLines.splice(cursorLine + 1, 0, after)
          return newLines
        })
        setCursorLine(l => l + 1)
        setCursorCol(0)
      } else {
        // Enter: submit
        onSubmit?.(lines.join('\n'))
      }
    } else if (key.escape) {
      onCancel?.()
    } else if (key.backspace) {
      if (cursorCol > 0) {
        setLines(prev => {
          const newLines = [...prev]
          const line = newLines[cursorLine] || ''
          newLines[cursorLine] = line.slice(0, cursorCol - 1) + line.slice(cursorCol)
          return newLines
        })
        setCursorCol(c => c - 1)
      } else if (cursorLine > 0) {
        setLines(prev => {
          const newLines = [...prev]
          const prevLine = newLines[cursorLine - 1]
          const currentLine = newLines[cursorLine] || ''
          newLines[cursorLine - 1] = prevLine + currentLine
          newLines.splice(cursorLine, 1)
          return newLines
        })
        setCursorLine(l => l - 1)
        setCursorCol(c => (lines[cursorLine - 1] || '').length)
      }
    } else if (key.delete) {
      if (cursorCol < currentLine.length) {
        setLines(prev => {
          const newLines = [...prev]
          const line = newLines[cursorLine] || ''
          newLines[cursorLine] = line.slice(0, cursorCol) + line.slice(cursorCol + 1)
          return newLines
        })
      } else if (cursorLine < lines.length - 1) {
        setLines(prev => {
          const newLines = [...prev]
          const current = newLines[cursorLine] || ''
          const next = newLines[cursorLine + 1] || ''
          newLines[cursorLine] = current + next
          newLines.splice(cursorLine + 1, 1)
          return newLines
        })
      }
    } else if (key.upArrow) {
      moveCursor(-1, 0)
    } else if (key.downArrow) {
      moveCursor(1, 0)
    } else if (key.leftArrow) {
      moveCursor(0, -1)
    } else if (key.rightArrow) {
      moveCursor(0, 1)
    } else if (input.length === 1 && !key.ctrl && !key.meta) {
      setLines(prev => {
        const newLines = [...prev]
        const line = newLines[cursorLine] || ''
        newLines[cursorLine] = line.slice(0, cursorCol) + input + line.slice(cursorCol)
        return newLines
      })
      setCursorCol(c => c + 1)
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{message}</Text>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" marginTop={1}>
        {lines.map((line, idx) => (
          <Box key={idx}>
            {idx === cursorLine && (
              <Text color="cyan">{line.slice(0, cursorCol)}</Text>
            )}
            {idx === cursorLine && cursorCol < line.length && (
              <Text color="white" backgroundColor="blue">
                {line[cursorCol]}
              </Text>
            )}
            {idx === cursorLine && cursorCol < line.length && (
              <Text>{line.slice(cursorCol + 1)}</Text>
            )}
            {idx !== cursorLine && <Text>{line}</Text>}
          </Box>
        ))}
      </Box>
      <Text color="gray" dimColor>
        Line {cursorLine + 1}, Col {cursorCol + 1} | ↑↓←→ navigate | Enter to submit | Esc to cancel
      </Text>
    </Box>
  )
}

/**
 * Öffnet einen CLI-Prompt des angegebenen Typs und liefert das Ergebnis des Nutzereingriffs.
 *
 * @param type - Der Typ des anzuzeigenden Prompts (`'confirm' | 'input' | 'select' | 'multiselect' | 'password' | 'editor'`)
 * @param options - Konfiguration und Verhalten des Prompts (Nachricht, Standardwerte, Auswahlmöglichkeiten, Validierung usw.)
 * @returns Ein PromptResult mit den Feldern `cancelled` und optional `value`. Aktuelle Implementierung ist ein Platzhalter und liefert immer `{ cancelled: true }`.
 */
export async function prompt<T>(
  type: PromptType,
  options: PromptOptions<T>
): Promise<PromptResult<T>> {
  return new Promise((resolve) => {
    // This would be used with a render callback in a real implementation
    // For now, this is a type definition
    resolve({ cancelled: true })
  })
}
