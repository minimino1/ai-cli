import React, { useEffect, useState, useRef } from 'react'
import { Box, Text } from 'ink'

export type SpinnerStyle = 'dots' | 'line' | 'clock' | 'earth' | 'moon' | 'hearts' | 'bounce' | 'pulse'

export interface SpinnerProps {
  /** Spinner animation style */
  style?: SpinnerStyle
  /** Text to display next to spinner */
  text?: string
  /** Color of the spinner */
  color?: string
  /** Whether spinner is active */
  active?: boolean
  /** Animation speed (frames per second) */
  speed?: number
}

/**
 * Animated loading spinner component
 */
export const Spinner: React.FC<SpinnerProps> = ({
  style = 'dots',
  text = '',
  color = 'cyan',
  active = true,
  speed = 10,
}) => {
  const [frame, setFrame] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        setFrame(f => (f + 1) % getFrameCount(style))
      }, 1000 / speed)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [active, speed])

  const spinnerChar = getSpinnerFrame(style, frame)

  return (
    <Box>
      <Text color={color}>{spinnerChar}</Text>
      {text && (
        <Text color="gray" marginLeft={1}>
          {text}
        </Text>
      )}
    </Box>
  )
}

/**
 * Get the character for the current frame
 */
function getSpinnerFrame(style: SpinnerStyle, frame: number): string {
  switch (style) {
    case 'dots':
      return ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][frame % 10]
    case 'line':
      return ['-', '\\', '|', '/'][frame % 4]
    case 'clock':
      return ['◷', '◶', '◵', '◴'][frame % 4]
    case 'earth':
      return ['🌍', '🌎', '🌏'][frame % 3]
    case 'moon':
      return ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][frame % 8]
    case 'hearts':
      return ['❤', '💛', '💚', '💙', '💜'][frame % 5]
    case 'bounce':
      return ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'][frame % 8]
    case 'pulse':
      return ['⣾', '⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽'][frame % 8]
    default:
      return '⠋'
  }
}

/**
 * Get total frame count for style
 */
function getFrameCount(style: SpinnerStyle): number {
  switch (style) {
    case 'dots':
      return 10
    case 'line':
      return 4
    case 'clock':
      return 4
    case 'earth':
      return 3
    case 'moon':
      return 8
    case 'hearts':
      return 5
    case 'bounce':
      return 8
    case 'pulse':
      return 8
    default:
      return 10
  }
}

/**
 * Hook for controlling a spinner manually
 */
export function useSpinner(initialActive: boolean = false) {
  const [active, setActive] = useState(initialActive)
  const frameRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const start = () => {
    if (intervalRef.current) return
    setActive(true)
    intervalRef.current = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % 10
    }, 100)
  }

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActive(false)
  }

  const toggle = () => {
    if (active) {
      stop()
    } else {
      start()
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    active,
    start,
    stop,
    toggle,
    frame: frameRef.current,
  }
}

/**
 * Spinner with built-in loading state management
 */
export interface LoadingSpinnerProps {
  /** Loading state */
  isLoading: boolean
  /** Text to display */
  text?: string
  /** Spinner style */
  style?: SpinnerStyle
  /** Color */
  color?: string
  /** Text to show when not loading */
  children?: React.ReactNode
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  isLoading,
  text = 'Loading...',
  style = 'dots',
  color = 'cyan',
  children,
}) => {
  if (!isLoading && children) {
    return <>{children}</>
  }

  return <Spinner style={style} text={text} color={color} active={isLoading} />
}

/**
 * Create a spinner instance for imperative use
 */
export class SpinnerInstance {
  private frame: number = 0
  private intervalId: NodeJS.Timeout | null = null
  private style: SpinnerStyle
  private speed: number
  private callback: (char: string) => void

  constructor(style: SpinnerStyle = 'dots', speed: number = 10, callback: (char: string) => void) {
    this.style = style
    this.speed = speed
    this.callback = callback
  }

  start() {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      this.frame = (this.frame + 1) % getFrameCount(this.style)
      this.callback(getSpinnerFrame(this.style, this.frame))
    }, 1000 / this.speed)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null
  }
}
