export interface Theme {
  // Core colors
  primary: string
  secondary: string
  accent: string
  error: string
  warning: string
  success: string
  info: string

  // Text colors
  text: string
  textMuted: string

  // Background colors
  background: string
  backgroundPanel: string
  backgroundElement: string
  backgroundMenu: string

  // Border colors
  border: string
  borderActive: string
  borderSubtle: string

  // Diff colors
  diffAdded: string
  diffAddedBg: string
  diffRemoved: string
  diffRemovedBg: string
  diffContext: string
  diffHighlightAdded: string
  diffHighlightRemoved: string

  // Review colors
  reviewError: string
  reviewWarning: string
  reviewInfo: string
  reviewSuggestion: string
}

export const opencodeTheme: Theme = {
  primary: '#fab283',
  secondary: '#5c9cf5',
  accent: '#9d7cd8',
  error: '#e06c75',
  warning: '#f5a742',
  success: '#7fd88f',
  info: '#56b6c2',

  text: '#eeeeee',
  textMuted: '#808080',

  background: '#0a0a0a',
  backgroundPanel: '#141414',
  backgroundElement: '#1e1e1e',
  backgroundMenu: '#1e1e1e',

  border: '#484848',
  borderActive: '#606060',
  borderSubtle: '#3c3c3c',

  // OpenCode diff colors
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
}

export const darkScale = {
  step1: '#0a0a0a',
  step2: '#141414',
  step3: '#1e1e1e',
  step4: '#282828',
  step5: '#323232',
  step6: '#3c3c3c',
  step7: '#484848',
  step8: '#606060',
  step9: '#fab283',
  step10: '#ffc09f',
  step11: '#808080',
  step12: '#eeeeee',
}
