// ─── Theme Application ────────────────────────────────────────────────

import type { Theme } from './builtins.js'
import { opencodeTheme } from '../theme.js'

// Map Theme colors to opencodeTheme structure
function mapThemeToOpenCode(theme: Theme): Partial<typeof opencodeTheme> {
  const colors = theme.colors

  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
    text: colors.text,
    textMuted: colors.textMuted,
    background: colors.background,
    backgroundPanel: colors.backgroundPanel,
    backgroundElement: colors.backgroundElement,
    backgroundMenu: colors.backgroundMenu,
    border: colors.border,
    borderActive: colors.borderActive,
    borderSubtle: colors.borderSubtle,
    diffAdded: colors.diffAdded,
    diffAddedBg: colors.diffAddedBg,
    diffRemoved: colors.diffRemoved,
    diffRemovedBg: colors.diffRemovedBg,
    diffContext: colors.diffContext,
    diffHighlightAdded: colors.diffHighlightAdded,
    diffHighlightRemoved: colors.diffHighlightRemoved,
    reviewError: colors.reviewError,
    reviewWarning: colors.reviewWarning,
    reviewInfo: colors.reviewInfo,
    reviewSuggestion: colors.reviewSuggestion,
  }
}

// ─── Apply Theme ───────────────────────────────────────────────────────
export function applyTheme(theme: Theme): void {
  const mapped = mapThemeToOpenCode(theme)

  // Update opencodeTheme
  Object.assign(opencodeTheme, mapped)

  // Emit event for components to react
  emitThemeChangeEvent(theme)
}

// ─── Event Emitter for Theme Changes ───────────────────────────────────
function emitThemeChangeEvent(theme: Theme): void {
  // This will be used by components to re-render with new colors
  // For now, we'll use a simple global event
  const event = new CustomEvent('theme:change', { detail: { theme } })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event)
  }

  // Also emit via Node.js EventEmitter if available
  try {
    const { EventEmitter } = require('node:events')
    const globalEmitter = global as any
    if (!globalEmitter.__themeEventEmitter) {
      globalEmitter.__themeEventEmitter = new EventEmitter()
    }
    globalEmitter.__themeEventEmitter.emit('theme:change', theme)
  } catch {
    // Ignore - not critical
  }
}

// ─── Subscribe to Theme Changes ────────────────────────────────────────
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  try {
    const { EventEmitter } = require('node:events')
    const globalEmitter = global as any
    if (!globalEmitter.__themeEventEmitter) {
      globalEmitter.__themeEventEmitter = new EventEmitter()
    }

    globalEmitter.__themeEventEmitter.on('theme:change', callback)

    return () => {
      globalEmitter.__themeEventEmitter.off('theme:change', callback)
    }
  } catch {
    // Fallback: return no-op unsubscribe
    return () => {}
  }
}

// ─── Get Current Theme Colors ──────────────────────────────────────────
export function getCurrentThemeColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const key of Object.keys(opencodeTheme)) {
    if (typeof opencodeTheme[key as keyof typeof opencodeTheme] === 'string') {
      colors[key] = opencodeTheme[key as keyof typeof opencodeTheme] as string
    }
  }
  return colors
}

// ─── Validate Theme ────────────────────────────────────────────────────
export function validateTheme(theme: Theme): string[] {
  const errors: string[] = []

  // Check required colors
  const requiredColors = [
    'primary', 'secondary', 'accent', 'error', 'warning', 'success', 'info',
    'text', 'textMuted', 'background', 'backgroundPanel', 'backgroundElement',
    'backgroundMenu', 'border', 'borderActive', 'borderSubtle',
    'diffAdded', 'diffAddedBg', 'diffRemoved', 'diffRemovedBg', 'diffContext',
    'diffHighlightAdded', 'diffHighlightRemoved',
    'reviewError', 'reviewWarning', 'reviewInfo', 'reviewSuggestion'
  ]

  for (const color of requiredColors) {
    if (!theme.colors[color as keyof typeof theme.colors]) {
      errors.push(`Missing required color: ${color}`)
    }
  }

  // Validate hex color format
  const hexRegex = /^#[0-9a-fA-F]{6}$/
  for (const [key, value] of Object.entries(theme.colors)) {
    if (!hexRegex.test(value)) {
      errors.push(`Invalid hex color for ${key}: ${value}`)
    }
  }

  return errors
}

// ─── Create Custom Theme from Colors ───────────────────────────────────
export function createTheme(
  name: string,
  colors: Partial<Theme['colors']>,
  baseTheme?: Theme
): Theme {
  const base = baseTheme || darkTheme

  return {
    name,
    colors: {
      ...base.colors,
      ...colors,
    },
    styles: base.styles,
  }
}
