import React from 'react'
import { Box, Text } from 'ink'
import { opencodeTheme } from '../theme'
import { CodeBlock } from './code-block'
import { DiffViewer } from './diff-viewer'
import type { ReviewPart, ExplainPart, FixPart, MessagePart } from '../types'

interface ToolOutputProps {
  part: MessagePart
}

const SeverityIcon: React.FC<{ severity: string }> = ({ severity }) => {
  const icon = {
    error: '✖',
    warning: '⚠',
    info: 'ℹ',
    suggestion: '💡',
  }[severity] || '•'

  const color = {
    error: opencodeTheme.reviewError,
    warning: opencodeTheme.reviewWarning,
    info: opencodeTheme.reviewInfo,
    suggestion: opencodeTheme.reviewSuggestion,
  }[severity] || opencodeTheme.textMuted

  return <Text color={color} bold>{icon}</Text>
}

const ReviewOutput: React.FC<{ review: ReviewPart }> = ({ review }) => {
  const borderColor = {
    error: opencodeTheme.reviewError,
    warning: opencodeTheme.reviewWarning,
    info: opencodeTheme.reviewInfo,
    suggestion: opencodeTheme.reviewSuggestion,
  }[review.severity] || opencodeTheme.border

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="single"
        borderColor={borderColor}
        borderLeft={true}
        borderTop={false}
        borderBottom={false}
        borderRight={false}
        paddingLeft={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box flexDirection="row" gap={1}>
          <SeverityIcon severity={review.severity} />
          <Text color={opencodeTheme.primary} bold>
            {review.filename}
          </Text>
          {review.line && (
            <Text color={opencodeTheme.textMuted}>:{review.line}</Text>
          )}
          <Text color={opencodeTheme.textMuted}> [{review.severity}]</Text>
        </Box>

        {/* Message */}
        <Box marginTop={0}>
          <Text color={opencodeTheme.text}>{review.message}</Text>
        </Box>

        {/* Suggestion */}
        {review.suggestion && (
          <Box marginTop={0} paddingLeft={2}>
            <Text color={opencodeTheme.success}>→ {review.suggestion}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

const ExplainOutput: React.FC<{ explain: ExplainPart }> = ({ explain }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="single"
        borderColor={opencodeTheme.info}
        borderLeft={true}
        borderTop={false}
        borderBottom={false}
        borderRight={false}
        paddingLeft={1}
        flexDirection="column"
      >
        {/* Title */}
        <Box flexDirection="row" gap={1}>
          <Text color={opencodeTheme.info} bold>ℹ</Text>
          <Text color={opencodeTheme.primary} bold>{explain.title}</Text>
        </Box>

        {/* Content */}
        <Box marginTop={0}>
          <Text color={opencodeTheme.text} wrap="wrap">{explain.content}</Text>
        </Box>

        {/* Code block if provided */}
        {explain.code && (
          <Box marginTop={1}>
            <CodeBlock
              code={explain.code.code}
              language={explain.code.language}
              filename={explain.code.filename}
            />
          </Box>
        )}

        {/* References */}
        {explain.references && explain.references.length > 0 && (
          <Box marginTop={1} flexDirection="column">
            <Text color={opencodeTheme.textMuted}>References:</Text>
            {explain.references.map((ref, i) => (
              <Text key={i} color={opencodeTheme.secondary}>  → {ref}</Text>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

const FixOutput: React.FC<{ fix: FixPart }> = ({ fix }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        borderStyle="single"
        borderColor={fix.applied ? opencodeTheme.success : opencodeTheme.warning}
        borderLeft={true}
        borderTop={false}
        borderBottom={false}
        borderRight={false}
        paddingLeft={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box flexDirection="row" gap={1}>
          <Text color={fix.applied ? opencodeTheme.success : opencodeTheme.warning} bold>
            {fix.applied ? '✔' : '🔧'}
          </Text>
          <Text color={opencodeTheme.primary} bold>Fix</Text>
          {fix.applied && (
            <Text color={opencodeTheme.success}> (applied)</Text>
          )}
        </Box>

        {/* Description */}
        <Box marginTop={0}>
          <Text color={opencodeTheme.text}>{fix.description}</Text>
        </Box>

        {/* Diff */}
        <Box marginTop={1}>
          <DiffViewer
            filename={fix.diff.filename}
            hunks={fix.diff.hunks}
            compact={false}
          />
        </Box>
      </Box>
    </Box>
  )
}

export const ToolOutput: React.FC<ToolOutputProps> = ({ part }) => {
  switch (part.type) {
    case 'review':
      return <ReviewOutput review={part} />
    case 'explain':
      return <ExplainOutput explain={part} />
    case 'fix':
      return <FixOutput fix={part} />
    case 'code':
      return (
        <CodeBlock
          code={part.code}
          language={part.language}
          filename={part.filename}
        />
      )
    case 'diff':
      return (
        <DiffViewer
          filename={part.filename}
          hunks={part.hunks}
        />
      )
    case 'file':
      return (
        <CodeBlock
          code={part.content}
          language={part.language}
          filename={part.filename}
        />
      )
    case 'text':
    default:
      return (
        <Text color={opencodeTheme.text} wrap="wrap">
          {part.text}
        </Text>
      )
  }
}
