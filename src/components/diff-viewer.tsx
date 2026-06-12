import React from 'react'
import { Box, Text } from 'ink'
import { opencodeTheme } from '../theme'
import type { DiffHunk, DiffLine } from '../types'

interface DiffViewerProps {
  filename: string
  hunks: DiffHunk[]
  compact?: boolean
}

const DiffLineComponent: React.FC<{ line: DiffLine; maxLineNumWidth: number }> = ({
  line,
  maxLineNumWidth,
}) => {
  const getPrefix = () => {
    switch (line.type) {
      case 'added':
        return '+'
      case 'removed':
        return '-'
      case 'hunk':
        return '@'
      default:
        return ' '
    }
  }

  const getColor = () => {
    switch (line.type) {
      case 'added':
        return opencodeTheme.diffAdded
      case 'removed':
        return opencodeTheme.diffRemoved
      case 'hunk':
        return opencodeTheme.accent
      default:
        return opencodeTheme.text
    }
  }

  const getBgColor = () => {
    switch (line.type) {
      case 'added':
        return opencodeTheme.diffAddedBg
      case 'removed':
        return opencodeTheme.diffRemovedBg
      default:
        return undefined
    }
  }

  const prefix = getPrefix()
  const color = getColor()
  const bgColor = getBgColor()
  const prefixColor = line.type === 'added'
    ? opencodeTheme.diffHighlightAdded
    : line.type === 'removed'
    ? opencodeTheme.diffHighlightRemoved
    : opencodeTheme.textMuted

  return (
    <Box flexDirection="row">
      {/* Line numbers */}
      <Text color={opencodeTheme.textMuted} dimColor>
        {line.oldLineNum != null ? String(line.oldLineNum).padStart(maxLineNumWidth) : ' '.repeat(maxLineNumWidth)}
        {' '}
        {line.newLineNum != null ? String(line.newLineNum).padStart(maxLineNumWidth) : ' '.repeat(maxLineNumWidth)}
      </Text>

      {/* Prefix */}
      <Text color={prefixColor}> {prefix} </Text>

      {/* Content */}
      <Text color={color} backgroundColor={bgColor} wrap="wrap">
        {line.content}
      </Text>
    </Box>
  )
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filename,
  hunks,
  compact = false,
}) => {
  // Calculate max line number width
  const allLines = hunks.flatMap(h => h.lines)
  const maxOldLine = Math.max(...allLines.map(l => l.oldLineNum ?? 0), 1)
  const maxNewLine = Math.max(...allLines.map(l => l.newLineNum ?? 0), 1)
  const maxLineNumWidth = String(Math.max(maxOldLine, maxNewLine)).length

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* File header */}
      <Box
        backgroundColor={opencodeTheme.backgroundElement}
        paddingLeft={1}
        paddingRight={1}
      >
        <Text color={opencodeTheme.primary} bold>
          {filename}
        </Text>
        <Text color={opencodeTheme.textMuted}>
          {' '}({hunks.length} {hunks.length === 1 ? 'hunk' : 'hunks'})
        </Text>
      </Box>

      {/* Hunks */}
      {!compact && hunks.map((hunk, hunkIndex) => (
        <Box key={hunkIndex} flexDirection="column">
          {/* Hunk header */}
          <Text color={opencodeTheme.accent} dimColor>
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </Text>

          {/* Lines */}
          {hunk.lines.map((line, lineIndex) => (
            <DiffLineComponent
              key={lineIndex}
              line={line}
              maxLineNumWidth={maxLineNumWidth}
            />
          ))}
        </Box>
      ))}

      {/* Compact mode: show only summary */}
      {compact && (
        <Box paddingLeft={1}>
          <Text color={opencodeTheme.textMuted}>
            {hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'added').length, 0)} additions,{' '}
            {hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'removed').length, 0)} removals
          </Text>
        </Box>
      )}
    </Box>
  )
}

// Helper to create a diff from two strings
export function createDiff(oldCode: string, newCode: string, filename: string): { filename: string; hunks: DiffHunk[] } {
  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')

  // Simple line-by-line diff (not LCS-based, but good enough for display)
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLineNum = 1
  let newLineNum = 1

  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      // Context line
      if (currentHunk) {
        hunks.push(currentHunk)
        currentHunk = null
      }
      oldLineNum++
      newLineNum++
    } else {
      // Start new hunk if needed
      if (!currentHunk) {
        currentHunk = {
          oldStart: oldLineNum,
          oldLines: 0,
          newStart: newLineNum,
          newLines: 0,
          lines: [],
        }
      }

      if (oldLine != null) {
        currentHunk.lines.push({
          type: 'removed',
          content: oldLine,
          oldLineNum: oldLineNum,
        })
        currentHunk.oldLines++
        oldLineNum++
      }

      if (newLine != null) {
        currentHunk.lines.push({
          type: 'added',
          content: newLine,
          newLineNum: newLineNum,
        })
        currentHunk.newLines++
        newLineNum++
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk)
  }

  return { filename, hunks }
}
