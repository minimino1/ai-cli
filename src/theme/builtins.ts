// ─── Built-in Theme Definitions ───────────────────────────────────────

import type { Theme } from '../theme.js'

// Color palette helper
function hex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ─── Dark Theme (Default) ─────────────────────────────────────────────
export const darkTheme: Theme = {
  name: 'dark',

  colors: {
    // Core colors
    primary: '#fab283',
    secondary: '#5c9cf5',
    accent: '#9d7cd8',
    error: '#e06c75',
    warning: '#f5a742',
    success: '#7fd88f',
    info: '#56b6c2',

    // Text colors
    text: '#eeeeee',
    textMuted: '#808080',

    // Background colors
    background: '#0a0a0a',
    backgroundPanel: '#141414',
    backgroundElement: '#1e1e1e',
    backgroundMenu: '#1e1e1e',

    // Border colors
    border: '#484848',
    borderActive: '#606060',
    borderSubtle: '#3c3c3c',

    // Diff colors
    diffAdded: '#4fd6be',
    diffAddedBg: '#20303b',
    diffRemoved: '#c53b53',
    diffRemovedBg: '#37222c',
    diffContext: '#828bb8',
    diffHighlightAdded: '#b8db87',
    diffHighlightRemoved: '#e26a75',

    // Review severity colors
    reviewError: '#e06c75',
    reviewWarning: '#f5a742',
    reviewInfo: '#56b6c2',
    reviewSuggestion: '#9d7cd8',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Light Theme ───────────────────────────────────────────────────────
export const lightTheme: Theme = {
  name: 'light',

  colors: {
    primary: '#d2641e',
    secondary: '#5c9cf5',
    accent: '#9d7cd8',
    error: '#c50f1f',
    warning: '#e87d1e',
    success: '#2ea043',
    info: '#1f6feb',

    text: '#1a1a1a',
    textMuted: '#6e7681',

    background: '#ffffff',
    backgroundPanel: '#f6f8fa',
    backgroundElement: '#ffffff',
    backgroundMenu: '#ffffff',

    border: '#d0d7de',
    borderActive: '#9ca3af',
    borderSubtle: '#e5e7eb',

    diffAdded: '#1a7f37',
    diffAddedBg: '#dafbe1',
    diffRemoved: '#cf222e',
    diffRemovedBg: '#ffebe9',
    diffContext: '#6e7781',
    diffHighlightAdded: '#9be9a8',
    diffHighlightRemoved: '#ff7b72',

    reviewError: '#cf222e',
    reviewWarning: '#e87d1e',
    reviewInfo: '#1f6feb',
    reviewSuggestion: '#9d7cd8',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Midnight Theme ────────────────────────────────────────────────────
export const midnightTheme: Theme = {
  name: 'midnight',

  colors: {
    primary: '#58a6ff',
    secondary: '#bc8cff',
    accent: '#ff7b72',
    error: '#ff7b72',
    warning: '#d29922',
    success: '#3fb950',
    info: '#58a6ff',

    text: '#c9d1d9',
    textMuted: '#8b949e',

    background: '#0d1117',
    backgroundPanel: '#161b22',
    backgroundElement: '#21262d',
    backgroundMenu: '#21262d',

    border: '#30363d',
    borderActive: '#484f58',
    borderSubtle: '#21262d',

    diffAdded: '#238636',
    diffAddedBg: '#0d2228',
    diffRemoved: '#f85149',
    diffRemovedBg: '#2a1b1b',
    diffContext: '#8b949e',
    diffHighlightAdded: '#2ea043',
    diffHighlightRemoved: '#f85149',

    reviewError: '#ff7b72',
    reviewWarning: '#d29922',
    reviewInfo: '#58a6ff',
    reviewSuggestion: '#bc8cff',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Ocean Theme ───────────────────────────────────────────────────────
export const oceanTheme: Theme = {
  name: 'ocean',

  colors: {
    primary: '#48bb78',
    secondary: '#4299e1',
    accent: '#9f7aea',
    error: '#fc8181',
    warning: '#f6ad55',
    success: '#48bb78',
    info: '#4299e1',

    text: '#a0c4e4',
    textMuted: '#6b8c9e',

    background: '#0b1622',
    backgroundPanel: '#132436',
    backgroundElement: '#1a2c42',
    backgroundMenu: '#1a2c42',

    border: '#2a4a6a',
    borderActive: '#3a5a7a',
    borderSubtle: '#1f3548',

    diffAdded: '#2ecc71',
    diffAddedBg: '#0a2e1a',
    diffRemoved: '#e74c3c',
    diffRemovedBg: '#2e1a1a',
    diffContext: '#6b8c9e',
    diffHighlightAdded: '#58d68d',
    diffHighlightRemoved: '#ec7063',

    reviewError: '#fc8181',
    reviewWarning: '#f6ad55',
    reviewInfo: '#4299e1',
    reviewSuggestion: '#9f7aea',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Forest Theme ──────────────────────────────────────────────────────
export const forestTheme: Theme = {
  name: 'forest',

  colors: {
    primary: '#68d391',
    secondary: '#4fd1c5',
    accent: '#b794f4',
    error: '#fc8181',
    warning: '#f6e05e',
    success: '#68d391',
    info: '#4fd1c5',

    text: '#a8d5a8',
    textMuted: '#6b9c6b',

    background: '#0a1a0a',
    backgroundPanel: '#142814',
    backgroundElement: '#1e381e',
    backgroundMenu: '#1e381e',

    border: '#2a5a2a',
    borderActive: '#3a6a3a',
    borderSubtle: '#1f481f',

    diffAdded: '#38a169',
    diffAddedBg: '#0a2e15',
    diffRemoved: '#e53e3e',
    diffRemovedBg: '#2e0a0a',
    diffContext: '#6b9c6b',
    diffHighlightAdded: '#9ae6b4',
    diffHighlightRemoved: '#feb2b2',

    reviewError: '#fc8181',
    reviewWarning: '#f6e05e',
    reviewInfo: '#4fd1c5',
    reviewSuggestion: '#b794f4',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Sunset Theme ──────────────────────────────────────────────────────
export const sunsetTheme: Theme = {
  name: 'sunset',

  colors: {
    primary: '#f6ad55',
    secondary: '#ed8936',
    accent: '#d69e2e',
    error: '#e53e3e',
    warning: '#f6ad55',
    success: '#48bb78',
    info: '#4299e1',

    text: '#f5d0a9',
    textMuted: '#a67c52',

    background: '#1a0a0a',
    backgroundPanel: '#2a1414',
    backgroundElement: '#3a1e1e',
    backgroundMenu: '#3a1e1e',

    border: '#5a2a2a',
    borderActive: '#6a3a3a',
    borderSubtle: '#4a2222',

    diffAdded: '#2ecc71',
    diffAddedBg: '#1a2e1a',
    diffRemoved: '#e74c3c',
    diffRemovedBg: '#2e1a1a',
    diffContext: '#a67c52',
    diffHighlightAdded: '#f6dba7',
    diffHighlightRemoved: '#f5a9a9',

    reviewError: '#e53e3e',
    reviewWarning: '#f6ad55',
    reviewInfo: '#4299e1',
    reviewSuggestion: '#d69e2e',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── Neon Theme ────────────────────────────────────────────────────────
export const neonTheme: Theme = {
  name: 'neon',

  colors: {
    primary: '#ff00ff',
    secondary: '#00ffff',
    accent: '#ffff00',
    error: '#ff0000',
    warning: '#ffaa00',
    success: '#00ff00',
    info: '#00ffff',

    text: '#00ff00',
    textMuted: '#00aa00',

    background: '#0a0a0a',
    backgroundPanel: '#141414',
    backgroundElement: '#1e1e1e',
    backgroundMenu: '#1e1e1e',

    border: '#ff00ff',
    borderActive: '#ff66ff',
    borderSubtle: '#660066',

    diffAdded: '#00ff00',
    diffAddedBg: '#0a2e0a',
    diffRemoved: '#ff0000',
    diffRemovedBg: '#2e0a0a',
    diffContext: '#00ffff',
    diffHighlightAdded: '#66ff66',
    diffHighlightRemoved: '#ff6666',

    reviewError: '#ff0000',
    reviewWarning: '#ffaa00',
    reviewInfo: '#00ffff',
    reviewSuggestion: '#ffff00',
  },

  styles: {
    bold: true,
    italic: true,
    underline: true,
  },
}

// ─── All Built-in Themes ───────────────────────────────────────────────
export const builtinThemes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  midnight: midnightTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  neon: neonTheme,
}

// ─── Theme Type Definition ────────────────────────────────────────────
export interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    error: string
    warning: string
    success: string
    info: string
    text: string
    textMuted: string
    background: string
    backgroundPanel: string
    backgroundElement: string
    backgroundMenu: string
    border: string
    borderActive: string
    borderSubtle: string
    diffAdded: string
    diffAddedBg: string
    diffRemoved: string
    diffRemovedBg: string
    diffContext: string
    diffHighlightAdded: string
    diffHighlightRemoved: string
    reviewError: string
    reviewWarning: string
    reviewInfo: string
    reviewSuggestion: string
  }
  styles: {
    bold: boolean
    italic: boolean
    underline: boolean
  }
}
