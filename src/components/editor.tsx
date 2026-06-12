import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { opencodeTheme } from '../theme'

interface EditorProps {
  filePath: string
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
}

export const Editor: React.FC<EditorProps> = ({
  filePath,
  initialContent,
  onSave,
  onCancel,
}) => {
  const [lines, setLines] = useState<string[]>(initialContent.split('\n'))
  const [currentLine, setCurrentLine] = useState(0)
  const [inputValue, setInputValue] = useState(initialContent.split('\n')[0] || '')
  const [isModified, setIsModified] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const { exit } = useApp()
  const inputRef = useRef<any>(null)

  // Update input when current line changes
  useEffect(() => {
    if (currentLine < lines.length) {
      setInputValue(lines[currentLine])
    } else {
      setInputValue('')
    }
  }, [currentLine, lines])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    setIsModified(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const newLines = [...lines]
    newLines[currentLine] = inputValue
    setLines(newLines)

    // Move to next line
    if (currentLine < newLines.length - 1) {
      setCurrentLine(prev => prev + 1)
    } else {
      // Add new line at end
      setLines(prev => [...prev, ''])
      setCurrentLine(prev => prev + 1)
    }
    setInputValue('')
  }, [currentLine, inputValue, lines])

  const handleKeyPress = useCallback((inputChar: string, key: any) => {
    // Ctrl+S - Save
    if (key.ctrl && inputChar === 's') {
      const content = lines.join('\n')
      onSave(content)
      return
    }

    // Escape - Cancel
    if (key.escape) {
      onCancel()
      return
    }

    // Up arrow - Previous line
    if (key.upArrow) {
      if (currentLine > 0) {
        // Save current line before moving
        const newLines = [...lines]
        newLines[currentLine] = inputValue
        setLines(newLines)
        setCurrentLine(prev => prev - 1)
      }
      return
    }

    // Down arrow - Next line
    if (key.downArrow) {
      if (currentLine < lines.length - 1) {
        // Save current line before moving
        const newLines = [...lines]
        newLines[currentLine] = inputValue
        setLines(newLines)
        setCurrentLine(prev => prev + 1)
      }
      return
    }

    // Backspace at start of line - merge with previous
    if (key.backspace && inputValue === '' && currentLine > 0) {
      const newLines = [...lines]
      newLines.splice(currentLine, 1)
      setLines(newLines)
      setCurrentLine(prev => prev - 1)
      return
    }

    // Enter - submit current line and move to next
    if (key.return) {
      handleSubmit()
      return
    }

    // Tab - insert spaces
    if (key.tab) {
      setInputValue(prev => prev + '  ')
      return
    }

    // ? - toggle help
    if (inputChar === '?' && !key.ctrl && !key.meta) {
      setShowHelp(prev => !prev)
    }
  }, [currentLine, inputValue, lines, handleSubmit, onSave, onCancel])

  useInput(handleKeyPress)

  const maxLineNumWidth = String(lines.length).length

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box
        backgroundColor={opencodeTheme.backgroundElement}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color={opencodeTheme.primary} bold>
          {filePath} {isModified ? '(modified)' : ''}
        </Text>
        <Text color={opencodeTheme.textMuted} dimColor>
          Line {currentLine + 1}/{lines.length}
        </Text>
      </Box>

      {/* Editor area */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {lines.map((line, index) => {
          const isCurrentLine = index === currentLine
          const isAfterCurrent = index > currentLine

          return (
            <Box key={index} flexDirection="row">
              {/* Line number */}
              <Text
                color={isCurrentLine ? opencodeTheme.primary : opencodeTheme.textMuted}
                dimColor={!isCurrentLine}
              >
                {String(index + 1).padStart(maxLineNumWidth)}{' '}
              </Text>

              {/* Line content or input */}
              {isCurrentLine ? (
                <Box>
                  <Text color={opencodeTheme.cursor}>|</Text>
                  <TextInput
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    placeholder={showHelp ? 'Type... (Ctrl+S save, Esc cancel, ? help)' : ''}
                  />
                </Box>
              ) : (
                <Text wrap="truncate">{line}</Text>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Footer / Help */}
      {showHelp && (
        <Box
          backgroundColor={opencodeTheme.backgroundElement}
          paddingX={1}
          justifyContent="space-between"
        >
          <Text color={opencodeTheme.textMuted} dimColor>
            Ctrl+S: Save | Esc: Cancel | ↑↓: Navigate | Enter: New line | Tab: Indent | Backspace at start: Merge | ?: Toggle help
          </Text>
          <Text color={isModified ? opencodeTheme.warning : opencodeTheme.success}>
            {isModified ? 'MODIFIED' : 'SAVED'}
          </Text>
        </Box>
      )}
    </Box>
  )
}
