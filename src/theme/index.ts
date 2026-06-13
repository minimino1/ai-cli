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

/**
 * Lädt die gespeicherte Theme-Konfiguration aus der Konfigurationsdatei.
 *
 * Gibt ein Objekt mit einer optionalen `theme`-Eigenschaft zurück; bei Fehlern (z. B. fehlende Datei oder ungültiges JSON) wird ein leeres Objekt zurückgegeben.
 *
 * @returns `{ theme?: string }` — das konfigurierte Theme (falls vorhanden), ansonsten ein leeres Objekt
 */
async function loadConfig(): Promise<{ theme?: string }> {
  try {
    const fs = await import('node:fs/promises')
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

/**
 * Persistiert die angegebene Konfiguration in die modulweite Konfigurationsdatei.
 *
 * Schreibt das `config`-Objekt als JSON in den an `configPath` gebundenen Speicherort und stellt sicher, dass das Zielverzeichnis existiert.
 *
 * @param config - Objekt mit optionaler `theme`-Eigenschaft, die als aktuelles Theme gespeichert wird
 */
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

/**
 * Lädt alle benutzerdefinierten Theme-Dateien aus dem Themes-Verzeichnis und aktualisiert den In-Memory-Cache `customThemes`.
 *
 * Stellt sicher, dass das Themes-Verzeichnis existiert; liest vorhandene `.json`-Dateien, validiert jede gefundene Theme-Definition und fügt gültige Themes dem `customThemes`-Objekt hinzu. Ungültige oder nicht lesbare Dateien werden mit einer Warnung protokolliert; bei einem Fehler auf Verzeichnisebene wird ein Fehler protokolliert.
 */
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

/**
 * Initialisiert den Theme-Manager, lädt gespeicherte Einstellungen und benutzerdefinierte Themes und setzt das aktive Theme.
 *
 * Lädt die gespeicherte Konfiguration und die benutzerdefinierten Themes, wendet das gefundene Theme an oder fällt auf das eingebaute `dark`-Theme zurück; aktualisiert dabei den internen aktuellen Theme-Namen und schreibt eine Initialisierungsnachricht in die Konsole.
 */
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

/**
 * Gibt das Theme mit dem angegebenen Namen zurück, falls vorhanden.
 *
 * @param name - Der Name des gesuchten Themes
 * @returns Das `Theme`-Objekt, wenn ein Builtin- oder Custom-Theme mit diesem Namen existiert, sonst `null`
 */
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

/**
 * Setzt das aktive Theme auf den angegebenen Namen und wendet es sofort an.
 *
 * @param name - Name des gewünschten Themes
 * @returns `true` wenn das Theme gefunden, angewendet und in der Konfiguration gespeichert wurde, `false` ansonsten
 */
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

/**
 * Gibt den Namen des aktuell aktiven Themes zurück.
 *
 * @returns Der Name des aktuell aktiven Themes
 */
export function getCurrentThemeName(): string {
  return currentThemeName
}

/**
 * Gibt das Theme-Objekt des derzeit aktiven Themes zurück.
 *
 * @returns Das Theme-Objekt für das aktuell aktive Theme. Falls kein Theme mit dem aktuellen Namen gefunden wird, wird das eingebaute `dark`-Theme zurückgegeben.
 */
export function getCurrentTheme(): Theme {
  const theme = getTheme(currentThemeName)
  if (!theme) {
    return builtinThemes.dark
  }
  return theme
}

/**
 * Gibt eine alphabetisch nach Namen sortierte Liste aller verfügbaren Themes zurück.
 *
 * @returns Ein Array von Objekten mit den Eigenschaften `name` und `type`, wobei `type` entweder `'builtin'` oder `'custom'` ist.
 */
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

/**
 * Erstellt ein neues benutzerdefiniertes Theme basierend auf dem Dark-Basis-Theme, speichert es in der Themes-Ordnerstruktur und lädt die benutzerdefinierten Themes neu.
 *
 * @param name - Name des zu erstellenden Themes
 * @param colors - Teilmenge der Farbwerte, die die Standardfarben des Dark-Basis-Themes überschreiben
 * @param overwrite - Wenn `true`, wird ein bereits existierendes Theme mit demselben Namen überschrieben
 * @returns `{ success: true }` bei erfolgreicher Erstellung; sonst `{ success: false, error: <Fehlermeldung> }`
 */
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

/**
 * Entfernt ein benutzerdefiniertes Theme aus dem Dateisystem und dem Laufzeitspeicher.
 *
 * Löscht die Datei `${themesDir}/{name}.json` und entfernt den Eintrag aus dem in-memory-Cache.
 * Eingebaute Themes können nicht gelöscht; existiert das benutzerdefinierte Theme nicht, wird nichts verändert.
 * Falls das gelöschte Theme aktuell aktiv war, wird auf das eingebaute `dark`-Theme umgeschaltet.
 *
 * @param name - Der Name des zu löschenden Themes
 * @returns `true`, wenn das Theme erfolgreich gelöscht wurde, `false` andernfalls
 */
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

/**
 * Exportiert ein aufgelöstes Theme als JSON-Datei an den angegebenen Pfad.
 *
 * @param name - Name des zu exportierenden Themes
 * @param outputPath - Ziel-Dateipfad für die erzeugte JSON-Datei
 * @returns `true`, wenn das Theme gefunden und erfolgreich geschrieben wurde, `false` andernfalls
 */
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

/**
 * Importiert ein Theme aus einer JSON-Datei und speichert es als benutzerdefiniertes Theme.
 *
 * @param filePath - Pfad zur Theme-JSON-Datei, die importiert werden soll
 * @param newName - Optionaler Name, unter dem das Theme gespeichert werden soll; falls nicht angegeben, wird `name` aus der Datei verwendet
 * @returns Bei Erfolg `{ success: true, name: <importierter Name> }`; bei Fehler `{ success: false, error: <Fehlermeldung> }`
 */
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

/**
 * Erzeugt eine kurze, formatierte Vorschauzeichenfolge mit den wichtigsten Farben eines Themes.
 *
 * @param theme - Das Theme-Objekt, dessen Farben angezeigt werden sollen
 * @returns Eine mehrzeilige Zeichenkette mit dem Theme-Namen und den Farbwerten für `primary`, `secondary`, `accent`, `error`, `warning`, `success`, `info`, `text`, `background` und `border`
 */
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
