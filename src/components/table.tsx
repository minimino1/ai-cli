import React, { useState, useMemo } from 'react'
import { Box, Text } from 'ink'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T, index: number) => React.ReactNode
  sortable?: boolean
}

export interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  options?: {
    border?: boolean
    padding?: number
    showHeader?: boolean
    sortable?: boolean
    striped?: boolean
    highlightRow?: number | null
  }
  onSort?: (key: string, direction: 'asc' | 'desc') => void
}

/**
 * Table component for TUI with borders and sorting
 */
export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  options = {},
  onSort,
}: TableProps<T>) {
  const {
    border = true,
    padding = 1,
    showHeader = true,
    sortable = true,
    striped = false,
    highlightRow = null,
  } = options

  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Calculate column widths
  const colWidths = useMemo(() => {
    const widths: number[] = []

    columns.forEach((col, idx) => {
      let maxWidth = col.width || col.header.length

      for (const row of rows) {
        const value = getValue(row, col.key)
        const cellContent = col.render
          ? String(col.render(value, row, idx))
          : String(value ?? '')
        maxWidth = Math.max(maxWidth, cellContent.length)
      }

      widths[idx] = maxWidth + padding * 2
    })

    return widths
  }, [columns, rows])

  // Handle sorting
  const handleSort = (col: Column<T>) => {
    if (!sortable || !col.sortable) return

    const key = String(col.key)

    if (sortKey === key) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc'
      setSortDir(newDir)
      onSort?.(key, newDir)
    } else {
      setSortKey(key)
      setSortDir('asc')
      onSort?.(key, 'asc')
    }
  }

  // Build border characters
  const borderChars = {
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    topT: '┬',
    bottomLeft: '└',
    bottomRight: '┘',
    bottomT: '┴',
    leftT: '├',
    rightT: '┤',
    cross: '┼',
  }

  // Build header separator line
  const buildSeparator = (lineChar: string, left: string, mid: string, right: string) => {
    const parts = colWidths.map((w, i) => lineChar.repeat(w))
    return left + parts.join(mid) + right
  }

  // Render a single row
  const renderRow = (row: T, index: number, isHeader: boolean = false) => {
    const cells: React.ReactNode[] = []

    columns.forEach((col, idx) => {
      const value = getValue(row, col.key)
      let content: React.ReactNode

      if (col.render) {
        content = col.render(value, row, index)
      } else {
        const text = String(value ?? '')
        content = <Text>{text}</Text>
      }

      const width = colWidths[idx] - padding * 2
      const align = col.align || 'left'

      cells.push(
        <Box key={idx} width={colWidths[idx]} paddingLeft={padding} paddingRight={padding}>
          <Text
            bold={isHeader}
            wrap="truncate"
            align={align}
          >
            {content}
          </Text>
        </Box>
      )
    })

    return (
      <Box key={index}>
        {border && <Text>{borderChars.vertical}</Text>}
        {cells}
        {border && <Text>{borderChars.vertical}</Text>}
      </Box>
    )
  }

  // Build table
  const elements: React.ReactNode[] = []

  // Top border
  if (border) {
    elements.push(
      <Text key="top-border">{buildSeparator(borderChars.horizontal, borderChars.topLeft, borderChars.topT, borderChars.topRight)}</Text>
    )
  }

  // Header row
  if (showHeader) {
    const headerCells = columns.map((col, idx) => {
      const width = colWidths[idx] - padding * 2
      const align = col.align || 'left'

      let headerContent = col.header

      // Add sort indicator
      if (sortable && col.sortable) {
        if (sortKey === String(col.key)) {
          headerContent += sortDir === 'asc' ? ' ▲' : ' ▼'
        } else {
          headerContent += ' ◀'
        }
      }

      return (
        <Box key={idx} width={colWidths[idx]} paddingLeft={padding} paddingRight={padding}>
          <Text
            bold
            color="blue"
            wrap="truncate"
            align={align}
            underline={sortable && col.sortable}
          >
            {headerContent}
          </Text>
        </Box>
      )
    })

    elements.push(
      <Box key="header">
        {border && <Text>{borderChars.vertical}</Text>}
        {headerCells}
        {border && <Text>{borderChars.vertical}</Text>}
      </Box>
    )

    // Header separator
    if (border) {
      elements.push(
        <Text key="header-sep">{buildSeparator(borderChars.horizontal, borderChars.leftT, borderChars.cross, borderChars.rightT)}</Text>
      )
    }
  }

  // Data rows
  rows.forEach((row, index) => {
    const isHighlighted = highlightRow === index
    const isStriped = striped && index % 2 === 1

    if (border) {
      elements.push(
        <Text key={`row-${index}`}>{borderChars.vertical}</Text>
      )
    }

    const rowElement = renderRow(row, index)

    // Add background for highlighted/striped rows
    if (isHighlighted || isStriped) {
      // In Ink, we'd wrap in Box with backgroundColor
      elements.push(
        <Box key={`row-box-${index}`} backgroundColor={isHighlighted ? 'blue' : isStriped ? 'gray' : undefined}>
          {rowElement}
        </Box>
      )
    } else {
      elements.push(rowElement)
    }

    if (border) {
      elements.push(
        <Text key={`row-end-${index}`}>{borderChars.vertical}</Text>
      )
    }

    // Row separator (for borders)
    if (border && index < rows.length - 1) {
      elements.push(
        <Text key={`row-sep-${index}`}>{buildSeparator(borderChars.horizontal, borderChars.leftT, borderChars.cross, borderChars.rightT)}</Text>
      )
    }
  })

  // Bottom border
  if (border) {
    elements.push(
      <Text key="bottom-border">{buildSeparator(borderChars.horizontal, borderChars.bottomLeft, borderChars.bottomT, borderChars.bottomRight)}</Text>
    )
  }

  return <Box flexDirection="column">{elements}</Box>
}

/**
 * Helper to get value from row by key (supports nested keys with dot notation)
 */
function getValue<T extends Record<string, unknown>>(row: T, key: keyof T | string): unknown {
  const keyStr = String(key)

  // Support nested keys like 'user.name'
  if (keyStr.includes('.')) {
    const parts = keyStr.split('.')
    let value: unknown = row
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }
    return value
  }

  return row[key]
}

/**
 * Simple table for quick use (non-generic)
 */
export interface SimpleTableProps {
  headers: string[]
  rows: string[][]
  options?: {
    border?: boolean
    padding?: number
    align?: ('left' | 'center' | 'right')[]
  }
}

export function SimpleTable({ headers, rows, options = {} }: SimpleTableProps) {
  const { border = true, padding = 1, align = [] } = options

  const colWidths = useMemo(() => {
    const widths: number[] = headers.map((h, i) => {
      let max = h.length
      for (const row of rows) {
        max = Math.max(max, row[i]?.length || 0)
      }
      return max + padding * 2
    })
    return widths
  }, [headers, rows])

  const borderChars = {
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    topT: '┬',
    bottomLeft: '└',
    bottomRight: '┘',
    bottomT: '┴',
    leftT: '├',
    rightT: '┤',
    cross: '┼',
  }

  const buildSeparator = (lineChar: string, left: string, mid: string, right: string) => {
    const parts = colWidths.map(w => lineChar.repeat(w))
    return left + parts.join(mid) + right
  }

  const elements: React.ReactNode[] = []

  if (border) {
    elements.push(
      <Text key="top">{buildSeparator(borderChars.horizontal, borderChars.topLeft, borderChars.topT, borderChars.topRight)}</Text>
    )
  }

  // Header
  if (border) elements.push(<Text key="v1">{borderChars.vertical}</Text>)
  headers.forEach((header, i) => {
    const width = colWidths[i] - padding * 2
    const alignment = align[i] || 'left'
    elements.push(
      <Box key={`h-${i}`} width={colWidths[i]} paddingLeft={padding} paddingRight={padding}>
        <Text bold color="blue" align={alignment}>
          {header}
        </Text>
      </Box>
    )
  })
  if (border) elements.push(<Text key="v2">{borderChars.vertical}</Text>)

  if (border) {
    elements.push(
      <Text key="sep">{buildSeparator(borderChars.horizontal, borderChars.leftT, borderChars.cross, borderChars.rightT)}</Text>
    )
  }

  // Rows
  rows.forEach((row, rowIdx) => {
    if (border) elements.push(<Text key={`v-${rowIdx}`}>{borderChars.vertical}</Text>)
    row.forEach((cell, colIdx) => {
      const width = colWidths[colIdx] - padding * 2
      const alignment = align[colIdx] || 'left'
      elements.push(
        <Box key={`${rowIdx}-${colIdx}`} width={colWidths[colIdx]} paddingLeft={padding} paddingRight={padding}>
          <Text align={alignment}>{cell}</Text>
        </Box>
      )
    })
    if (border) elements.push(<Text key={`v-${rowIdx}-end`}>{borderChars.vertical}</Text>)

    if (border && rowIdx < rows.length - 1) {
      elements.push(
        <Text key={`sep-${rowIdx}`}>{buildSeparator(borderChars.horizontal, borderChars.leftT, borderChars.cross, borderChars.rightT)}</Text>
      )
    }
  })

  if (border) {
    elements.push(
      <Text key="bottom">{buildSeparator(borderChars.horizontal, borderChars.bottomLeft, borderChars.bottomT, borderChars.bottomRight)}</Text>
    )
  }

  return <Box flexDirection="column">{elements}</Box>
}
