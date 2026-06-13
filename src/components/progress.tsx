import React, { useEffect, useState, useMemo } from 'react'
import { Box, Text } from 'ink'

export interface ProgressProps {
  /** Current progress (0-100) */
  percent: number
  /** Total value for calculating percentage */
  total?: number
  /** Completed count */
  completed?: number
  /** Width of progress bar in characters */
  width?: number
  /** Color of the filled portion */
  color?: string
  /** Color of the unfilled portion */
  unfilledColor?: string
  /** Show percentage text */
  showPercent?: boolean
  /** Show completed/total */
  showCount?: boolean
  /** Indeterminate mode (spinner-like) */
  indeterminate?: boolean
  /** ETA in seconds */
  eta?: number
  /** Custom label */
  label?: string
  /** Animation speed for indeterminate */
  speed?: number
}

/**
 * Progress bar component with ETA
 */
export const Progress: React.FC<ProgressProps> = ({
  percent,
  total,
  completed,
  width = 40,
  color = 'green',
  unfilledColor = 'gray',
  showPercent = true,
  showCount = false,
  indeterminate = false,
  eta,
  label,
  speed = 10,
}) => {
  const [indeterminateFrame, setIndeterminateFrame] = useState(0)

  useEffect(() => {
    if (indeterminate) {
      const interval = setInterval(() => {
        setIndeterminateFrame(f => (f + 1) % width)
      }, 1000 / speed)
      return () => clearInterval(interval)
    }
  }, [indeterminate, speed, width])

  // Normalize percent
  const normalizedPercent = useMemo(() => {
    if (indeterminate) return 0
    if (total !== undefined && completed !== undefined) {
      return total > 0 ? Math.min(100, (completed / total) * 100) : 0
    }
    return Math.min(100, Math.max(0, percent))
  }, [percent, total, completed, indeterminate])

  // Build progress bar
  const filledWidth = indeterminate ? indeterminateFrame : Math.round((normalizedPercent / 100) * width)
  const unfilledWidth = width - filledWidth

  const filledBar = '█'.repeat(filledWidth)
  const unfilledBar = '░'.repeat(unfilledWidth)

  // Format ETA
  const etaText = useMemo(() => {
    if (eta === undefined || eta <= 0) return ''
    if (eta < 60) return `ETA: ${Math.round(eta)}s`
    const mins = Math.floor(eta / 60)
    const secs = Math.round(eta % 60)
    return `ETA: ${mins}m ${secs}s`
  }, [eta])

  // Format count
  const countText = useMemo(() => {
    if (!showCount || total === undefined) return ''
    return `${completed ?? 0}/${total}`
  }, [showCount, total, completed])

  // Format percent
  const percentText = useMemo(() => {
    if (!showPercent) return ''
    if (indeterminate) return ''
    return `${Math.round(normalizedPercent)}%`
  }, [showPercent, indeterminate, normalizedPercent])

  return (
    <Box flexDirection="column">
      {/* Main progress bar */}
      <Box>
        {label && (
          <Text bold color="blue">
            {label}
          </Text>
        )}
        {label && <Text> </Text>}
        <Text color={color}>{filledBar}</Text>
        <Text color={unfilledColor}>{unfilledBar}</Text>
        {showPercent && (
          <Text color="cyan" bold marginLeft={1}>
            {percentText}
          </Text>
        )}
        {showCount && (
          <Text color="gray" marginLeft={1}>
            {countText}
          </Text>
        )}
        {etaText && (
          <Text color="yellow" marginLeft={1}>
            {etaText}
          </Text>
        )}
      </Box>
    </Box>
  )
}

/**
 * Multi-progress bars for concurrent operations
 */
export interface MultiProgressProps {
  bars: Array<{
    id: string
    percent: number
    total?: number
    completed?: number
    label?: string
    color?: string
  }>
  width?: number
  showEta?: boolean
}

export const MultiProgress: React.FC<MultiProgressProps> = ({
  bars,
  width = 40,
  showEta = true,
}) => {
  return (
    <Box flexDirection="column">
      {bars.map((bar, idx) => (
        <Box key={bar.id} marginBottom={idx < bars.length - 1 ? 1 : 0}>
          <Progress
            percent={bar.percent}
            total={bar.total}
            completed={bar.completed}
            width={width}
            color={bar.color || 'green'}
            showPercent
            showCount
            eta={showEta ? bar.eta : undefined}
            label={bar.label}
          />
        </Box>
      ))}
    </Box>
  )
}

/**
 * Verwaltet den Fortschrittszustand für eine zählbare Aufgabe.
 *
 * @param total - Gesamtanzahl der zu verarbeitenden Einheiten
 * @returns Ein Objekt mit dem aktuellen Fortschritt und Steuerfunktionen:
 *  - `completed` — Anzahl bereits abgeschlossener Einheiten
 *  - `percent` — Fortschritt in Prozent (0–100)
 *  - `eta` — Geschätzte verbleibende Zeit in Sekunden oder `undefined`, wenn nicht berechenbar
 *  - `increment` — Funktion, die den Fortschritt um einen angegebenen Betrag (Standard: 1) erhöht; Ergebnis wird auf `[0, total]` begrenzt
 *  - `setProgress` — Setzt `completed` auf einen Wert, der auf `[0, total]` begrenzt wird
 *  - `reset` — Setzt `completed` auf `0`
 *  - `complete` — Setzt `completed` auf `total`
 *  - `isComplete` — `true`, wenn `completed >= total`
 */
export function useProgress(total: number) {
  const [completed, setCompleted] = useState(0)
  const [startTime] = useState(() => Date.now())

  const percent = total > 0 ? (completed / total) * 100 : 0

  // Calculate ETA based on elapsed time and completed items
  const eta = useMemo(() => {
    if (completed === 0) return undefined
    const elapsed = (Date.now() - startTime) / 1000
    const itemsPerSecond = completed / elapsed
    if (itemsPerSecond === 0) return undefined
    const remaining = total - completed
    return remaining / itemsPerSecond
  }, [completed, total, startTime])

  const increment = (amount?: number) => {
    setCompleted(c => Math.min(total, c + (amount ?? 1)))
  }

  const setProgress = (value: number) => {
    setCompleted(Math.min(total, Math.max(0, value)))
  }

  const reset = () => {
    setCompleted(0)
  }

  const complete = () => {
    setCompleted(total)
  }

  return {
    completed,
    percent,
    eta,
    increment,
    setProgress,
    reset,
    complete,
    isComplete: completed >= total,
  }
}

/**
 * Progress component with built-in state management
 */
export interface SmartProgressProps {
  /** Total items */
  total: number
  /** Current completed count */
  completed: number
  /** Width of bar */
  width?: number
  /** Label */
  label?: string
  /** Show ETA */
  showEta?: boolean
  /** Callback when complete */
  onComplete?: () => void
}

export const SmartProgress: React.FC<SmartProgressProps> = ({
  total,
  completed,
  width = 40,
  label,
  showEta = true,
  onComplete,
}) => {
  const [prevCompleted, setPrevCompleted] = useState(completed)
  const [startTime] = useState(() => Date.now())

  // Track changes for ETA calculation
  useEffect(() => {
    if (completed > prevCompleted) {
      setPrevCompleted(completed)
    }
  }, [completed, prevCompleted])

  const percent = total > 0 ? (completed / total) * 100 : 0

  // Calculate ETA
  const eta = useMemo(() => {
    if (completed === 0) return undefined
    const elapsed = (Date.now() - startTime) / 1000
    const rate = completed / elapsed
    if (rate === 0) return undefined
    const remaining = total - completed
    return remaining / rate
  }, [completed, total, startTime])

  // Trigger onComplete
  useEffect(() => {
    if (completed >= total && total > 0 && onComplete) {
      onComplete()
    }
  }, [completed, total, onComplete])

  return (
    <Progress
      percent={percent}
      total={total}
      completed={completed}
      width={width}
      showPercent
      showCount
      eta={showEta ? eta : undefined}
      label={label}
    />
  )
}
