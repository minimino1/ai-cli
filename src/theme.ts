export interface Theme {
  // Core colors
  primary: string      // #fab283 (orange)
  secondary: string    // #5c9cf5 (blue)
  accent: string       // #9d7cd8 (purple)
  error: string        // #e06c75 (red)
  warning: string      // #f5a742 (orange)
  success: string      // #7fd88f (green)
  info: string         // #56b6c2 (cyan)

  // Text colors
  text: string         // #eeeeee
  textMuted: string    // #808080

  // Background colors
  background: string       // #0a0a0a
  backgroundPanel: string  // #141414
  backgroundElement: string // #1e1e1e
  backgroundMenu: string   // #1e1e1e

  // Border colors
  border: string          // #484848
  borderActive: string    // #606060
  borderSubtle: string    // #3c3c3c
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
}

// Dark step scale from OpenCode
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
