// ─── Theme Application ────────────────────────────────────────────────

import type { Theme } from './builtins.js'
import { opencodeTheme } from '../theme.js'

/**
 * Erzeugt ein Objekt mit den Farbwerten aus `theme`, abgeglichen auf die Struktur von `opencodeTheme`.
 *
 * @param theme - Theme, dessen `colors` in die Felder von `opencodeTheme` gemappt werden
 * @returns Ein Partial von `opencodeTheme`, das nur die abgebildeten Farbfelder enthält
 */
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

/**
 * Wendet das übergebene Theme auf das globale OpenCode-Theme an und benachrichtigt registrierte Listener über die Änderung.
 *
 * @param theme - Das Theme, dessen Farben und Einstellungen übernommen werden; die relevanten Felder werden auf das globale `opencodeTheme` gemappt und ein Theme-Änderungsereignis ausgelöst
 */
export function applyTheme(theme: Theme): void {
  const mapped = mapThemeToOpenCode(theme)

  // Update opencodeTheme
  Object.assign(opencodeTheme, mapped)

  // Emit event for components to react
  emitThemeChangeEvent(theme)
}

/**
 * Benachrichtigt interessierte Empfänger über eine Theme-Änderung.
 *
 * Versendet ein browserseitiges `CustomEvent` mit dem Namen `theme:change` (Detail enthält `theme`) wenn `window` verfügbar ist, und versucht zusätzlich, dasselbe Ereignis über ein process-globales Node.js `EventEmitter`-Singleton (`global.__themeEventEmitter`) zu emitten; Fehler beim Node-Pfad werden stillschweigend ignoriert.
 *
 * @param theme - Das neue Theme-Objekt, das an die Event-Empfänger übergeben wird
 */
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

/**
 * Registriert einen Listener, der bei Theme-Änderungen aufgerufen wird.
 *
 * @param callback - Funktion, die mit dem neuen `Theme` aufgerufen wird
 * @returns Eine Funktion zum Abmelden des Listeners; wenn die interne Einrichtung fehlschlägt, ist die Rückgabe eine No‑Op-Funktion
 */
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

/**
 * Ermittelt alle string-basierten Farbwerte im globalen `opencodeTheme` und gibt sie als flaches Schlüssel‑Wert‑Objekt zurück.
 *
 * @returns Ein Objekt (`Record<string, string>`) mit Theme‑Schlüsseln und ihren Farbwerten; nur Einträge werden aufgenommen, deren Wert vom Typ `string` ist.
 */
export function getCurrentThemeColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const key of Object.keys(opencodeTheme)) {
    if (typeof opencodeTheme[key as keyof typeof opencodeTheme] === 'string') {
      colors[key] = opencodeTheme[key as keyof typeof opencodeTheme] as string
    }
  }
  return colors
}

/**
 * Prüft ein Theme auf fehlende, erforderliche Farbdefinitionen und auf ungültige Hex-Farbwerte.
 *
 * Prüft, ob alle erwarteten Farbschlüssel in `theme.colors` vorhanden sind und ob alle Werte dem
 * Format `#RRGGBB` entsprechen. Für jedes Problem wird eine prägnante Fehlermeldung erzeugt.
 *
 * @param theme - Das zu überprüfende Theme (insbesondere dessen `colors`-Objekt)
 * @returns Eine Liste von Fehlermeldungen; leer, wenn keine Probleme gefunden wurden.
 *          Fehlermeldungen haben z. B. das Format `Missing required color: <color>` oder
 *          `Invalid hex color for <key>: <value>`.
 */
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

/**
 * Erstellt ein Theme-Objekt aus einem Namen und einer partiellen Farbüberschreibung.
 *
 * @param name - Der Name des neuen Themes
 * @param colors - Partielle Zuordnung von Farben; vorhandene Einträge überschreiben die entsprechenden Farben des Basis-Themes
 * @param baseTheme - Optionales Basis-Theme; wenn nicht angegeben, wird `darkTheme` verwendet
 * @returns Das zusammengesetzte `Theme` mit `colors` (Zusammenführung von Basis- und übergebenen Farben) und den `styles` des Basis-Themes
 */
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
