import React from 'react'
import { Box, Text } from 'ink'
import { opencodeTheme } from '../theme'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
}

// Simple syntax highlighting for common patterns
function highlightLine(line: string, language?: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = line
  let key = 0

  // Keywords per language
  const keywords: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'interface', 'type', 'enum', 'extends', 'implements', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'default', 'true', 'false', 'null', 'undefined', 'void', 'never', 'any', 'unknown'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'extends', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'default', 'true', 'false', 'null', 'undefined'],
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield', 'lambda', 'pass', 'break', 'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'self', 'print'],
    go: ['func', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'go', 'defer', 'chan', 'select', 'type', 'struct', 'interface', 'map', 'var', 'const', 'true', 'false', 'nil'],
    rust: ['fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'self'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'export', 'source', 'alias', 'local', 'readonly', 'unset', 'true', 'false'],
  }

  const lang = language?.toLowerCase() || ''
  const kws = keywords[lang] || keywords.typescript || []

  // Patterns to match
  const patterns = [
    // Comments (single line)
    { regex: /(\/\/.*$|#.*$)/gm, color: opencodeTheme.textMuted, italic: true },
    // Strings
    { regex: /('[^']*'|"[^"]*"|`[^`]*`)/g, color: opencodeTheme.success },
    // Numbers
    { regex: /\b(\d+\.?\d*)\b/g, color: opencodeTheme.warning },
    // Functions
    { regex: /\b([a-zA-Z_]\w*)\s*\(/g, color: opencodeTheme.secondary },
    // Types (PascalCase)
    { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, color: opencodeTheme.info },
  ]

  // Simple approach: just color the whole line based on content
  // This is a simplified highlighting - for production, use a proper tokenizer
  let result = remaining

  // Check for comment
  const commentMatch = remaining.match(/(\/\/.*$|#.*$)/)
  if (commentMatch) {
    const idx = remaining.indexOf(commentMatch[1])
    if (idx > 0) {
      parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
    }
    parts.push(
      <Text key={key++} color={opencodeTheme.textMuted} italic>
        {commentMatch[1]}
      </Text>
    )
    return parts
  }

  // Check for string
  const stringMatch = remaining.match(/('[^']*'|"[^"]*"|`[^`]*`)/)
  if (stringMatch) {
    const idx = remaining.indexOf(stringMatch[1])
    if (idx > 0) {
      parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
    }
    parts.push(
      <Text key={key++} color={opencodeTheme.success}>
        {stringMatch[1]}
      </Text>
    )
    const rest = remaining.slice(idx + stringMatch[1].length)
    if (rest) {
      parts.push(...highlightLine(rest, language))
    }
    return parts
  }

  // Check for keywords
  for (const kw of kws) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'g')
    const kwMatch = remaining.match(kwRegex)
    if (kwMatch) {
      const idx = remaining.indexOf(kwMatch[0])
      if (idx > 0) {
        parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
      }
      parts.push(
        <Text key={key++} color={opencodeTheme.accent} italic>
          {kwMatch[0]}
        </Text>
      )
      const rest = remaining.slice(idx + kwMatch[0].length)
      if (rest) {
        parts.push(...highlightLine(rest, language))
      }
      return parts
    }
  }

  // Check for number
  const numMatch = remaining.match(/\b(\d+\.?\d*)\b/)
  if (numMatch) {
    const idx = remaining.indexOf(numMatch[1])
    if (idx > 0) {
      parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
    }
    parts.push(
      <Text key={key++} color={opencodeTheme.warning}>
        {numMatch[1]}
      </Text>
    )
    const rest = remaining.slice(idx + numMatch[1].length)
    if (rest) {
      parts.push(...highlightLine(rest, language))
    }
    return parts
  }

  // Check for function call
  const fnMatch = remaining.match(/\b([a-zA-Z_]\w*)\s*\(/)
  if (fnMatch) {
    const idx = remaining.indexOf(fnMatch[1])
    if (idx > 0) {
      parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
    }
    parts.push(
      <Text key={key++} color={opencodeTheme.secondary}>
        {fnMatch[1]}
      </Text>
    )
    const rest = remaining.slice(idx + fnMatch[1].length)
    if (rest) {
      parts.push(...highlightLine(rest, language))
    }
    return parts
  }

  // Check for type (PascalCase)
  const typeMatch = remaining.match(/\b([A-Z][a-zA-Z0-9]*)\b/)
  if (typeMatch) {
    const idx = remaining.indexOf(typeMatch[1])
    if (idx > 0) {
      parts.push(<Text key={key++}>{remaining.slice(0, idx)}</Text>)
    }
    parts.push(
      <Text key={key++} color={opencodeTheme.info}>
        {typeMatch[1]}
      </Text>
    )
    const rest = remaining.slice(idx + typeMatch[1].length)
    if (rest) {
      parts.push(...highlightLine(rest, language))
    }
    return parts
  }

  // No highlighting
  return [<Text key={key++}>{remaining}</Text>]
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  filename,
  showLineNumbers = true,
  highlightLines = [],
}) => {
  const lines = code.split('\n')
  const maxLineNumWidth = String(lines.length).length

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      {filename && (
        <Box
          backgroundColor={opencodeTheme.backgroundElement}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
        >
          <Text color={opencodeTheme.primary} bold>
            {filename}
          </Text>
          {language && (
            <Text color={opencodeTheme.textMuted}> ({language})</Text>
          )}
        </Box>
      )}

      {/* Code lines */}
      <Box flexDirection="column">
        {lines.map((line, index) => {
          const lineNum = index + 1
          const isHighlighted = highlightLines.includes(lineNum)

          return (
            <Box key={index} flexDirection="row">
              {/* Line number */}
              {showLineNumbers && (
                <Text
                  color={isHighlighted ? opencodeTheme.primary : opencodeTheme.textMuted}
                  dimColor={!isHighlighted}
                >
                  {String(lineNum).padStart(maxLineNumWidth)}{' '}
                </Text>
              )}

              {/* Code content */}
              <Text
                backgroundColor={isHighlighted ? opencodeTheme.backgroundElement : undefined}
                wrap="wrap"
              >
                {highlightLine(line, language)}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
