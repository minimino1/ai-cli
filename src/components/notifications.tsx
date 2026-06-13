import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text } from 'ink'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number // ms, default 5000
  timestamp: Date
}

interface NotificationContextType {
  notifications: Notification[]
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  remove: (id: string) => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

/**
 * Ermöglicht den Zugriff auf den globalen Notification-Kontext.
 *
 * @returns Das `NotificationContextType`-Objekt mit aktuellen Benachrichtigungen und Aktionen (`success`, `error`, `warning`, `info`, `remove`, `clear`).
 * @throws Error Wenn der Hook außerhalb von `NotificationProvider` verwendet wird.
 */
export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

/**
 * Notification Provider Component
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id)!)
      timersRef.current.delete(id)
    }
  }, [])

  const add = useCallback((type: NotificationType, message: string, duration: number = 5000) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const notification: Notification = {
      id,
      type,
      message,
      duration,
      timestamp: new Date(),
    }

    setNotifications(prev => [...prev, notification])

    // Auto-dismiss
    const timer = setTimeout(() => {
      remove(id)
    }, duration)
    timersRef.current.set(id, timer)

    return id
  }, [remove])

  const success = useCallback((message: string, duration?: number) => {
    return add('success', message, duration)
  }, [add])

  const error = useCallback((message: string, duration?: number) => {
    return add('error', message, duration)
  }, [add])

  const warning = useCallback((message: string, duration?: number) => {
    return add('warning', message, duration)
  }, [add])

  const info = useCallback((message: string, duration?: number) => {
    return add('info', message, duration)
  }, [add])

  const clear = useCallback(() => {
    // Clear all timers
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer)
    }
    timersRef.current.clear()
    setNotifications([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, success, error, warning, info, remove, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Toast notification display component
 */
export const ToastContainer: React.FC<{
  /** Position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Maximum visible notifications */
  maxNotifications?: number
}> = ({ position = 'bottom-right', maxNotifications = 5 }) => {
  const { notifications, remove } = useNotification()

  // Sort by timestamp (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const visibleNotifications = sortedNotifications.slice(0, maxNotifications)

  // Position styles
  const isRight = position.includes('right')
  const isBottom = position.includes('bottom')

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <Box
      flexDirection="column"
      position="absolute"
      right={isRight ? 0 : undefined}
      left={isRight ? undefined : 0}
      bottom={isBottom ? 0 : undefined}
      top={isBottom ? undefined : 0}
      width={40}
      margin={1}
    >
      {visibleNotifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => remove(notification.id)}
          style={{ marginBottom: index < visibleNotifications.length - 1 ? 1 : 0 }}
        />
      ))}
    </Box>
  )
}

/**
 * Individual notification toast
 */
interface NotificationToastProps {
  notification: Notification
  onClose: () => void
  style?: React.CSSProperties
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose, style }) => {
  const { type, message } = notification

  const colors: Record<NotificationType, { bg: string; fg: string; icon: string }> = {
    success: { bg: 'green', fg: 'white', icon: '✓' },
    error: { bg: 'red', fg: 'white', icon: '✗' },
    warning: { bg: 'yellow', fg: 'black', icon: '⚠' },
    info: { bg: 'blue', fg: 'white', icon: 'ℹ' },
  }

  const colorScheme = colors[type]

  return (
    <Box
      backgroundColor={colorScheme.bg}
      borderStyle="round"
      borderColor={colorScheme.fg}
      paddingX={1}
      paddingY={0}
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      style={style}
    >
      <Box>
        <Text color={colorScheme.fg} bold>
          {colorScheme.icon}{' '}
        </Text>
        <Text color={colorScheme.fg}>{message}</Text>
      </Box>
      <Box marginLeft={1}>
        <Text
          color={colorScheme.fg}
          dimColor
          onPress={onClose}
        >
          ✕
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Simple notification component (without provider)
 */
export interface SimpleNotificationProps {
  type: NotificationType
  message: string
  onClose?: () => void
  duration?: number
}

export const SimpleNotification: React.FC<SimpleNotificationProps> = ({
  type,
  message,
  onClose,
  duration,
}) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        onClose?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!visible) return null

  const colors: Record<NotificationType, { bg: string; fg: string; icon: string }> = {
    success: { bg: 'green', fg: 'white', icon: '✓' },
    error: { bg: 'red', fg: 'white', icon: '✗' },
    warning: { bg: 'yellow', fg: 'black', icon: '⚠' },
    info: { bg: 'blue', fg: 'white', icon: 'ℹ' },
  }

  const colorScheme = colors[type]

  return (
    <Box
      backgroundColor={colorScheme.bg}
      borderStyle="round"
      borderColor={colorScheme.fg}
      paddingX={1}
      paddingY={0}
      flexDirection="row"
      alignItems="center"
    >
      <Text color={colorScheme.fg} bold>
        {colorScheme.icon}{' '}
      </Text>
      <Text color={colorScheme.fg}>{message}</Text>
      {onClose && (
        <Box marginLeft={1}>
          <Text color={colorScheme.fg} dimColor onPress={() => { setVisible(false); onClose() }}>
            ✕
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Notification queue for sequential display
 */
export class NotificationQueue {
  private queue: Notification[] = []
  private isProcessing: boolean = false
  private maxConcurrent: number
  private onNotification: (notification: Notification) => void
  private onRemove: (id: string) => void

  constructor(
    maxConcurrent: number = 3,
    onNotification: (notification: Notification) => void,
    onRemove: (id: string) => void
  ) {
    this.maxConcurrent = maxConcurrent
    this.onNotification = onNotification
    this.onRemove = onRemove
  }

  enqueue(type: NotificationType, message: string, duration?: number): void {
    const notification: Notification = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      message,
      duration,
      timestamp: new Date(),
    }
    this.queue.push(notification)
    this.process()
  }

  private process(): void {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true
    const notification = this.queue.shift()!

    this.onNotification(notification)

    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.onRemove(notification.id)
        this.isProcessing = false
        this.process()
      }, notification.duration)
    } else {
      this.isProcessing = false
      this.process()
    }
  }

  clear(): void {
    this.queue = []
  }

  getLength(): number {
    return this.queue.length
  }
}
