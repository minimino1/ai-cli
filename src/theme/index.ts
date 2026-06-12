// ─── Theme Manager ─────────────────────────────────────────────────────

import type { Theme } from './builtins.js'
import { builtinThemes } from './builtins.js'
import { applyTheme, validateTheme } from './apply.js'

// Theme storage path
const themesDir = `${process.env.HOME || process.env.USERPROFILE || ''}/.config/ai-cli/themes`
const configPath = `${process.env.HOME || process.env.USERPROFILE || ''}/.config/ai-cli/config.json`

// Current theme name (default: dark)
let currentThemeName = 'dark'
let customThemes: Record<string, Theme> = {}

// ─── Load Config ───────────────────────────────────────────────────────
async function loadConfig(): Promise<{ theme?: string }> {
  try {
    const fs = await import('node:fs/promises')
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

// ─── Save Config ───────────────────────────────────────────────────────
async function saveConfig(config: { theme?: string }): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const dir = await import('node:path').then(p => p.dirname(configPath))
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

// ─── Load Custom Themes ────────────────────────────────────────────────
async function loadCustomThemes(): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    await fs.mkdir(themesDir, { recursive: true })

    const files = await fs.readdir(themesDir)
    customThemes = {}

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const fullPath = path.join(themesDir, file)
      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        const themeData = JSON.parse(content) as Theme

        // Validate
        const errors = validateTheme(themeData)
        if (errors.length > 0) {
          console.warn(`[ThemeManager] Invalid theme in ${file}:`, errors.join(', '))
          continue
        }

        customThemes[themeData.name] = themeData
      } catch (error: any) {
        console.warn(`[ThemeManager] Failed to load theme ${file}:`, error.message)
      }
    }
  } catch (error) {
    console.error('[ThemeManager] Failed to load custom themes:', error)
  }
}

// ─── Initialize ────────────────────────────────────────────────────────
export async function initializeThemeManager(): Promise<void> {
  // Load saved config
  const config = await loadConfig()
  if (config.theme) {
    currentThemeName = config.theme
  }

  // Load custom themes
  await loadCustomThemes()

  // Apply current theme
  const theme = getTheme(currentThemeName)
  if (theme) {
    applyTheme(theme)
  } else {
    // Fallback to dark
    applyTheme(builtinThemes.dark)
    currentThemeName = 'dark'
  }

  console.log(`[ThemeManager] Initialized with theme: ${currentThemeName}`)
}

// ─── Get Theme ─────────────────────────────────────────────────────────
export function getTheme(name: string): Theme | null {
  // Check built-in themes first
  if (builtinThemes[name]) {
    return builtinThemes[name]
  }

  // Check custom themes
  if (customThemes[name]) {
    return customThemes[name]
  }

  return null
}

// ─── Set Current Theme ────────────────────────────────────────────────
export async function setTheme(name: string): Promise<boolean> {
  const theme = getTheme(name)
  if (!theme) {
    return false
  }

  currentThemeName = name

  // Apply the theme
  applyTheme(theme)

  // Save to config
  const config = await loadConfig()
  config.theme = name
  await saveConfig(config)

  return true
}

// ─── Get Current Theme Name ───────────────────────────────────────────
export function getCurrentThemeName(): string {
  return currentThemeName
}

// ─── Get Current Theme ────────────────────────────────────────────────
export function getCurrentTheme(): Theme {
  const theme = getTheme(currentThemeName)
  if (!theme) {
    return builtinThemes.dark
  }
  return theme
}

// ─── List All Themes ───────────────────────────────────────────────────
export function listThemes(): { name: string; type: 'builtin' | 'custom' }[] {
  const themes: { name: string; type: 'builtin' | 'custom' }[] = []

  for (const name of Object.keys(builtinThemes)) {
    themes.push({ name, type: 'builtin' })
  }

  for (const name of Object.keys(customThemes)) {
    themes.push({ name, type: 'custom' })
  }

  return themes.sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Create Custom Theme ───────────────────────────────────────────────
export async function createCustomTheme(
  name: string,
  colors: Partial<Theme['colors']>,
  overwrite = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already exists
    const existing = getTheme(name)
    if (existing && !overwrite) {
      return { success: false, error: `Theme "${name}" already exists` }
    }

    // Create theme based on dark as default
    const baseTheme = builtinThemes.dark
    const newTheme: Theme = {
      name,
      colors: {
        ...baseTheme.colors,
        ...colors,
      },
      styles: baseTheme.styles,
    }

    // Validate
    const errors = validateTheme(newTheme)
    if (errors.length > 0) {
      return { success: false, error: `Invalid theme: ${errors.join(', ')}` }
    }

    // Save to file
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const filePath = path.join(themesDir, `${name}.json`)

    await fs.mkdir(themesDir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(newTheme, null, 2))

    // Reload custom themes
    await loadCustomThemes()

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Delete Custom Theme ───────────────────────────────────────────────
export async function deleteCustomTheme(name: string): Promise<boolean> {
  try {
    // Only custom themes can be deleted
    if (builtinThemes[name]) {
      return false
    }

    if (!customThemes[name]) {
      return false
    }

    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const filePath = path.join(themesDir, `${name}.json`)

    await fs.unlink(filePath)
    delete customThemes[name]

    // If this was the current theme, switch to dark
    if (currentThemeName === name) {
      await setTheme('dark')
    }

    return true
  } catch (error: any) {
    console.error(`[ThemeManager] Failed to delete theme ${name}:`, error)
    return false
  }
}

// ─── Export Theme to File ──────────────────────────────────────────────
export async function exportTheme(name: string, outputPath: string): Promise<boolean> {
  const theme = getTheme(name)
  if (!theme) {
    return false
  }

  try {
    const fs = await import('node:fs/promises')
    await fs.writeFile(outputPath, JSON.stringify(theme, null, 2))
    return true
  } catch (error: any) {
    console.error(`[ThemeManager] Failed to export theme ${name}:`, error)
    return false
  }
}

// ─── Import Theme from File ────────────────────────────────────────────
export async function importTheme(filePath: string, newName?: string): Promise<{ success: boolean; error?: string; name?: string }> {
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    const content = await fs.readFile(filePath, 'utf-8')
    const theme = JSON.parse(content) as Theme

    // Validate
    const errors = validateTheme(theme)
    if (errors.length > 0) {
      return { success: false, error: `Invalid theme: ${errors.join(', ')}` }
    }

    // Use new name or existing name
    const themeName = newName || theme.name
    if (!themeName) {
      return { success: false, error: 'Theme name required' }
    }

    // Check for conflicts
    if (getTheme(themeName)) {
      return { success: false, error: `Theme "${themeName}" already exists` }
    }

    // Save with new name
    theme.name = themeName
    const destPath = path.join(themesDir, `${themeName}.json`)
    await fs.mkdir(themesDir, { recursive: true })
    await fs.writeFile(destPath, JSON.stringify(theme, null, 2))

    // Reload custom themes
    await loadCustomThemes()

    return { success: true, name: themeName }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ─── Get Theme Preview Colors ──────────────────────────────────────────
export function getThemePreview(theme: Theme): string {
  const c = theme.colors
  return `
${theme.name}:
  Primary:    ${c.primary}
  Secondary:  ${c.secondary}
  Accent:     ${c.accent}
  Error:      ${c.error}
  Warning:    ${c.warning}
  Success:    ${c.success}
  Info:       ${c.info}
  Text:       ${c.text}
  Background: ${c.background}
  Border:     ${c.border}
`.trim()
}
