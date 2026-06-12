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
      return { ...defaultConfig, ...config }
    }
  } catch {}
  return defaultConfig
}

async function main() {
  const config = await loadConfig()

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
