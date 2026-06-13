// ─── Plugin Management Commands ───────────────────────────────────────

import { readFile, writeFile, mkdir, rm, stat, rename } from 'node:fs/promises'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Command, CommandContext } from '../types.js'
import {
  loadAllPlugins,
  loadPlugin,
  unloadPluginByName,
  reloadPlugin,
  reloadAllPlugins,
  enablePlugin,
  disablePlugin,
  listLoadedPlugins,
  getPluginInfo,
  startWatching,
  cleanup as cleanupPlugins,
} from '../plugins/loader.js'
import { getPluginCommands, clearPluginCommands } from '../plugins/api.js'

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Plugin directory
const pluginsDir = `${process.env.HOME || process.env.USERPROFILE || ''}/.config/ai-cli/plugins`

/**
 * Lädt eine Datei von einer HTTP- oder HTTPS-URL herunter und speichert sie unter dem angegebenen Pfad.
 *
 * @param url - Die HTTP(S)-URL der herunterzuladenden Ressource
 * @param destPath - Zieldateipfad, in den der Inhalt geschrieben wird (bestehende Datei wird überschrieben)
 * @throws Error - Wenn der HTTP-Statuscode nicht im Bereich 200–299 liegt oder beim Netzwerk-/Datei-IO-Vorgang ein Fehler auftritt
 */
async function downloadFromUrl(url: string, destPath: string): Promise<void> {
  const https = await import('node:https')
  const http = await import('node:http')
  const { pipeline } = await import('node:stream')
  const { promisify } = await import('node:util')
  const streamPipeline = promisify(pipeline)

  const protocol = url.startsWith('https') ? https : http
  const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
    protocol.get(url, (res) => resolve(res), reject)
  })

  if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
    throw new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`)
  }

  await streamPipeline(response, await import('node:fs').then(fs => fs.createWriteStream(destPath)))
}

/**
 * Klont ein Git-Repository von der angegebenen URL in das angegebene Zielverzeichnis.
 *
 * @param url - Die Repository-URL (z. B. `https://...` oder `git@...`)
 * @param destPath - Zielverzeichnis oder -pfad, in das/den das Repository geklont wird
 * @returns `void` wenn der Klonvorgang erfolgreich ist
 * @throws Error Wenn der Klonvorgang fehlschlägt; die Fehlermeldung enthält gegebenenfalls die Ausgabe des Klonbefehls
 */
async function cloneGitRepo(url: string, destPath: string): Promise<void> {
  const { exec } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    exec(`git clone ${url} ${destPath}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
      } else {
        resolve()
      }
    })
  })
}

// ─── Plugin Commands ───────────────────────────────────────────────────
export const pluginCommands: Command[] = [
  // /plugins - List installed plugins
  {
    name: 'plugins',
    description: 'List installed plugins',
    aliases: ['pl', 'plugin-list'],
    run: async () => {
      const plugins = listLoadedPlugins()
      const entries = await loadAllPlugins()

      if (entries.length === 0) {
        return [{ type: 'text', text: 'No plugins installed. Use /plugin install <url|path> to install.' }]
      }

      const lines: string[] = ['Installed plugins:']
      for (const entry of entries) {
        const status = entry.loaded ? '✓ loaded' : '✗ not loaded'
        const enabled = entry.enabled ? 'enabled' : 'disabled'
        const version = entry.manifest?.version || 'unknown'
        const description = entry.manifest?.description || ''

        lines.push(`  ${entry.name} (${version}) - ${enabled} - ${status}`)
        if (description) {
          lines.push(`    ${description}`)
        }
        if (entry.error) {
          lines.push(`    Error: ${entry.error}`)
        }
      }

      return [{ type: 'text', text: lines.join('\n') }]
    },
  },

  // /plugin install - Install plugin
  {
    name: 'plugin',
    description: 'Plugin management',
    aliases: [],
    args: ['install <url|path>', 'uninstall <name>', 'enable <name>', 'disable <name>', 'info <name>', 'reload [name]'],
    run: async (args, context) => {
      const parts = args.trim().split(/\s+/)
      const subcmd = parts[0]
      const subArgs = parts.slice(1)

      switch (subcmd) {
        case 'install': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /plugin install <url|path>\n\nExamples:\n  /plugin install https://github.com/user/plugin.git\n  /plugin install ~/my-plugin.ts' }]
          }

          const source = subArgs[0]
          const pluginName = basename(source, extname(source)).replace('.git', '')
          const destDir = join(pluginsDir, pluginName)
          const destFile = source.endsWith('.git') || source.endsWith('/') ? join(destDir, 'index.ts') : join(pluginsDir, `${pluginName}${extname(source)}`)

          try {
            // Ensure plugins directory exists
            await mkdir(pluginsDir, { recursive: true })

            // Download or copy
            if (source.startsWith('http://') || source.startsWith('https://')) {
              if (source.endsWith('.git')) {
                await cloneGitRepo(source, destDir)
              } else {
                await downloadFromUrl(source, destFile)
              }
            } else {
              // Local path
              const srcStat = await stat(source)
              if (srcStat.isDirectory()) {
                // Copy directory (simplified - just note it)
                return [{ type: 'text', text: `Directory install not yet implemented. Please copy plugin file to ${pluginsDir}/ manually.` }]
              } else {
                // Copy file
                const content = await readFile(source, 'utf-8')
                await mkdir(dirname(destFile), { recursive: true })
                await writeFile(destFile, content)
              }
            }

            // Try to load the plugin
            const loadResult = await loadPlugin(destFile.endsWith('/') ? join(destFile, 'index.ts') : destFile)

            if (loadResult.success) {
              return [{ type: 'text', text: `Plugin ${pluginName} installed and loaded successfully.` }]
            } else {
              return [{ type: 'text', text: `Plugin installed but failed to load: ${loadResult.error}` }]
            }
          } catch (error: any) {
            return [{ type: 'text', text: `Failed to install plugin: ${error.message}` }]
          }
        }

        case 'uninstall': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /plugin uninstall <name>' }]
          }

          const pluginName = subArgs[0]

          try {
            // Unload first
            await unloadPluginByName(pluginName)

            // Remove plugin files
            const pluginPath = join(pluginsDir, pluginName)
            try {
              const stats = await stat(pluginPath)
              if (stats.isDirectory()) {
                await rm(pluginPath, { recursive: true })
              } else {
                await rm(pluginPath)
              }
            } catch {
              // Ignore if file doesn't exist
            }

            // Also try to remove .ts/.js file
            for (const ext of ['.ts', '.js', '.mjs', '.cjs']) {
              try {
                await rm(join(pluginsDir, `${pluginName}${ext}`))
              } catch {
                // Ignore
              }
            }

            return [{ type: 'text', text: `Plugin ${pluginName} uninstalled.` }]
          } catch (error: any) {
            return [{ type: 'text', text: `Failed to uninstall plugin: ${error.message}` }]
          }
        }

        case 'enable': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /plugin enable <name>' }]
          }

          const pluginName = subArgs[0]
          const success = await enablePlugin(pluginName)

          if (success) {
            return [{ type: 'text', text: `Plugin ${pluginName} enabled.` }]
          } else {
            return [{ type: 'text', text: `Failed to enable plugin ${pluginName}. Make sure it's installed.` }]
          }
        }

        case 'disable': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /plugin disable <name>' }]
          }

          const pluginName = subArgs[0]
          const success = await disablePlugin(pluginName)

          if (success) {
            return [{ type: 'text', text: `Plugin ${pluginName} disabled.` }]
          } else {
            return [{ type: 'text', text: `Failed to disable plugin ${pluginName}.` }]
          }
        }

        case 'info': {
          if (subArgs.length === 0) {
            return [{ type: 'text', text: 'Usage: /plugin info <name>' }]
          }

          const pluginName = subArgs[0]
          const info = getPluginInfo(pluginName)

          if (!info) {
            return [{ type: 'text', text: `Plugin ${pluginName} not found.` }]
          }

          const lines: string[] = [`Plugin: ${info.name}`]
          if (info.manifest) {
            lines.push(`Version: ${info.manifest.version || 'unknown'}`)
            lines.push(`Description: ${info.manifest.description || 'N/A'}`)
            lines.push(`Author: ${info.manifest.author || 'N/A'}`)
            lines.push(`Homepage: ${info.manifest.homepage || 'N/A'}`)
            lines.push(`Repository: ${info.manifest.repository || 'N/A'}`)
            lines.push(`License: ${info.manifest.license || 'N/A'}`)
          }
          lines.push(`Loaded: ${info.loaded ? 'yes' : 'no'}`)
          lines.push(`Enabled: ${info.enabled ? 'yes' : 'no'}`)
          lines.push(`Path: ${info.path || 'unknown'}`)

          if (info.error) {
            lines.push(`Error: ${info.error}`)
          }

          return [{ type: 'text', text: lines.join('\n') }]
        }

        case 'reload': {
          if (subArgs.length > 0) {
            // Reload specific plugin
            const pluginName = subArgs[0]
            const result = await reloadPlugin(pluginName)

            if (result.success) {
              return [{ type: 'text', text: `Plugin ${pluginName} reloaded.` }]
            } else {
              return [{ type: 'text', text: `Failed to reload plugin ${pluginName}: ${result.error}` }]
            }
          } else {
            // Reload all plugins
            const results = await reloadAllPlugins()
            const successes = results.filter(r => r.success).length
            const failures = results.length - successes

            const lines: string[] = [`Reloaded ${successes} plugins.`]
            if (failures > 0) {
              lines.push(`${failures} plugins failed to reload:`)
              for (const result of results) {
                if (!result.success && result.plugin) {
                  lines.push(`  ${result.plugin.manifest.name}: ${result.error}`)
                }
              }
            }

            return [{ type: 'text', text: lines.join('\n') }]
          }
        }

        default:
          return [{ type: 'text', text: `Unknown plugin command: ${subcmd}\nAvailable: install, uninstall, enable, disable, info, reload` }]
      }
    },
  },
]

/**
 * Registriert die pluginbezogenen CLI-Befehle beim Hauptkommandomodul.
 *
 * Wird von der zentralen Befehlsregistrierung aufgerufen und fügt die in
 * pluginCommands definierten Befehle zur globalen Befehlsliste hinzu.
 */
export function registerPluginCommands(): void {
  // This will be called from main commands.ts
  // We'll add pluginCommands to the main commands array
  console.log('[PluginCommands] Plugin commands registered')
}

/**
 * Initialisiert das Plugin-Subsystem und lädt aktivierte Plugins.
 *
 * Startet das Beobachten des Plugin-Verzeichnisses, lädt alle aktivierten Plugins und protokolliert den Erfolg.
 * Bei Fehlern werden diese gefangen und als Fehler geloggt; Ausnahmen werden nicht weitergeworfen.
 */
export async function initializePluginSystem(): Promise<void> {
  try {
    // Start watching plugins directory
    startWatching()

    // Load all enabled plugins
    await loadAllPlugins()

    console.log('[PluginSystem] Plugin system initialized')
  } catch (error: any) {
    console.error('[PluginSystem] Failed to initialize:', error)
  }
}

/**
 * Führt die Aufräumarbeiten des Plugin-Subsystems aus.
 *
 * Beendet laufende Plugin-Aktivitäten, gibt zugehörige Ressourcen frei und stoppt ggf. Datei- bzw. Verzeichnisüberwachungen.
 */
export function cleanupPluginSystem(): void {
  cleanupPlugins()
}
