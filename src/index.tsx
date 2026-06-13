import React from 'react'
import { render } from 'ink'
import { App } from './app'
import { defaultConfig } from './types'

// Load config from file or use default
async function loadConfig() {
  try {
    const configPath = `${process.env.HOME}/.config/ai-cli/config.json`
    const configFile = Bun.file(configPath)
    if (await configFile.exists()) {
      const config = await configFile.json()
      // Ensure providers is always an array
      if (!Array.isArray(config.providers)) {
        config.providers = defaultConfig.providers
      }
      // Ensure activeProvider is set
      if (!config.activeProvider) {
        config.activeProvider = defaultConfig.activeProvider
      }
      return { ...defaultConfig, ...config }
    }
  } catch {}
  return defaultConfig
}

/**
 * Initialisiert die Anwendung: lädt die Konfiguration, ergänzt fehlende Standardwerte und startet die Ink-UI.
 *
 * Lädt die Konfiguration über `loadConfig()`, stellt sicher, dass `providers`, `activeProvider` und `theme`
 * mit sinnvollen Standardwerten belegt sind (letztlich `defaultConfig` bzw. `'dark'`) und rendert die React Ink-Anwendung.
 * Setzt `exitOnCtrlC` abhängig davon, ob stdin Raw-Mode unterstützt wird (deaktiviert es, wenn Raw-Mode nicht verfügbar ist).
 */
async function main() {
  const config = await loadConfig()
  // Ensure defaults
  if (!config.providers) config.providers = defaultConfig.providers
  if (!config.activeProvider) config.activeProvider = defaultConfig.activeProvider
  if (!config.theme) config.theme = 'dark'

  // Check if stdin supports raw mode
  const isRawModeSupported = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function'

  render(
    <React.StrictMode>
      <App config={config} />
    </React.StrictMode>,
    {
      exitOnCtrlC: true,
      // For environments that don't support raw mode
      ...(isRawModeSupported ? {} : { exitOnCtrlC: false }),
    }
  )
}

main()
