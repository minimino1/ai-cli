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
 * Confirm prompt (yes/no)
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
 * Text input prompt
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
 * Password input prompt (hidden)
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
 * Single select prompt
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
 * Multi-select prompt
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
 * Editor prompt (multi-line)
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
 * Generic prompt function
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
