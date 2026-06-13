// ─── Plugin Loader ───────────────────────────────────────────────────

import type {
  Plugin,
  PluginManifest,
  PluginLoadResult,
  PluginDirectoryEntry,
  PluginContext,
  PluginCommand,
} from './types.js'
import { createPluginContext, getPluginCommands, clearPluginCommands, emitPluginEvent } from './api.js'
import type { Command } from '../types.js'

// Plugin directory path
const pluginsDir = `${process.env.HOME || process.env.USERPROFILE || ''}/.config/ai-cli/plugins`

// Plugin state
const loadedPlugins = new Map<string, Plugin>()
const pluginContexts = new Map<string, PluginContext>()
const pluginFiles = new Map<string, string>() // file path -> plugin name
const watchers = new Map<string, { close: () => void }>()
const enabledPlugins = new Set<string>()

/**
 * Lädt ein Plugin-Modul von der angegebenen Datei und validiert, dass es ein Manifest mit `name` enthält.
 *
 * @param filePath - Pfad zur Plugin-Datei (z. B. absolute oder relative Pfadangabe zur .js/.ts-Datei)
 * @returns `{ success: true, plugin }` bei erfolgreichem Laden und Validierung; `{ success: false, error }` mit einer aussagekräftigen Fehlermeldung sonst
 */
async function loadPluginFromFile(filePath: string): Promise<PluginLoadResult> {
  try {
    // Dynamic import the plugin module
    const module = await import(filePath)

    // Check for default export or named exports
    let plugin: Plugin | undefined

    if (module.default) {
      plugin = module.default
    } else if (module.plugin) {
      plugin = module.plugin
    } else if (module.Plugin) {
      plugin = module.Plugin
    } else if (module.name) {
      // Assume the module itself is the plugin
      plugin = module as Plugin
    }

    if (!plugin) {
      return {
        success: false,
        error: 'No plugin export found. Export default, plugin, Plugin, or an object with name property.',
      }
    }

    // Validate manifest
    if (!plugin.manifest?.name) {
      return {
        success: false,
        error: 'Plugin must have a manifest with a name property',
      }
    }

    const pluginName = plugin.manifest.name

    // Check if already loaded
    if (loadedPlugins.has(pluginName)) {
      return {
        success: false,
        error: `Plugin ${pluginName} is already loaded`,
      }
    }

    return {
      success: true,
      plugin,
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to load plugin: ${error.message}`,
    }
  }
}

/**
 * Initialisiert ein geladenes Plugin: erstellt seinen Kontext, registriert Befehle, führt das optionale `onLoad` aus und speichert den Loader-Status.
 *
 * @param plugin - Das Plugin-Objekt; sein `manifest.name` wird als eindeutiger Plugin-Name verwendet.
 * @param filePath - Pfad zur Plugin-Quelldatei, wird zur Zuordnung und für späteres Neuladen gespeichert.
 * @returns Bei Erfolg `{ success: true, plugin }`; bei Fehler `{ success: false, error }` mit einer beschreibenden Fehlermeldung.
 */
async function initializePlugin(plugin: Plugin, filePath: string): Promise<PluginLoadResult> {
  const { manifest, commands = [], onLoad } = plugin
  const pluginName = manifest.name

  try {
    // Create plugin context
    const context = createPluginContext(manifest, {
      registerMainCommand: (command: Command) => {
        // This will be provided by the main app
        console.log(`[PluginLoader] Plugin ${pluginName} registered command: ${command.name}`)
      },
      unregisterMainCommand: (name: string) => {
        console.log(`[PluginLoader] Plugin ${pluginName} unregistered command: ${name}`)
      },
    })

    pluginContexts.set(pluginName, context)

    // Register plugin commands
    for (const command of commands) {
      try {
        context.registerCommand(command)
      } catch (error: any) {
        console.warn(`[PluginLoader] Failed to register command ${command.name} for plugin ${pluginName}: ${error.message}`)
      }
    }

    // Call onLoad if provided
    if (onLoad) {
      await onLoad(context)
    }

    // Store plugin
    loadedPlugins.set(pluginName, plugin)
    pluginFiles.set(filePath, pluginName)
    enabledPlugins.add(pluginName)

    // Emit event
    emitPluginEvent('plugin:load', { plugin: manifest })

    return {
      success: true,
      plugin,
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to initialize plugin ${pluginName}: ${error.message}`,
    }
  }
}

/**
 * Lädt ein Plugin ab und entfernt alle zugehörigen Ressourcen (Kontext, Befehle, Zuordnungen).
 *
 * @param pluginName - Der Name des Plugins wie in seinem Manifest
 * @returns `true` wenn das Plugin erfolgreich entladen wurde, `false` andernfalls
 */
async function unloadPlugin(pluginName: string): Promise<boolean> {
  const plugin = loadedPlugins.get(pluginName)
  const context = pluginContexts.get(pluginName)

  if (!plugin || !context) {
    return false
  }

  try {
    // Call onUnload if provided
    if (plugin.onUnload) {
      await plugin.onUnload(context)
    }

    // Unregister commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        try {
          context.unregisterCommand(command.name)
        } catch (error: any) {
          console.warn(`[PluginLoader] Failed to unregister command ${command.name} for plugin ${pluginName}: ${error.message}`)
        }
      }
    }

    // Clean up
    loadedPlugins.delete(pluginName)
    pluginContexts.delete(pluginName)
    enabledPlugins.delete(pluginName)

    // Remove from file mapping
    for (const [path, name] of pluginFiles.entries()) {
      if (name === pluginName) {
        pluginFiles.delete(path)
      }
    }

    // Emit event
    emitPluginEvent('plugin:unload', { plugin: plugin.manifest })

    return true
  } catch (error: any) {
    console.error(`[PluginLoader] Failed to unload plugin ${pluginName}:`, error)
    return false
  }
}

/**
 * Durchsucht das Plugins-Verzeichnis und erstellt eine Liste verfügbarer Plugin-Einträge.
 *
 * Liefert für jede erkannte Plugin-Datei einen Eintrag mit Name, Pfad, Aktivierungsstatus,
 * optionalem manifest (falls aus der Datei erkannt) und Ladezustand. Es werden nur Dateien
 * mit den Endungen `.ts`, `.js`, `.mjs` und `.cjs` berücksichtigt.
 *
 * @returns Eine Liste von `PluginDirectoryEntry`-Objekten; bei einem Fehler beim Lesen des Verzeichnisses
 *          oder der Dateien wird ein leeres Array zurückgegeben.
 */
async function scanPluginsDirectory(): Promise<PluginDirectoryEntry[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true })
    const result: PluginDirectoryEntry[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) continue

      const ext = path.extname(entry.name).toLowerCase()
      if (!['.ts', '.js', '.mjs', '.cjs'].includes(ext)) continue

      const fullPath = path.join(pluginsDir, entry.name)
      const pluginName = path.basename(entry.name, ext)

      // Try to read manifest without loading
      let manifest: PluginManifest | null = null
      try {
        // Quick check: read first few lines to find manifest
        const content = await fs.readFile(fullPath, 'utf-8')
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/)
        const versionMatch = content.match(/version:\s*['"`]([^'"`]+)['"`]/)

        if (nameMatch && versionMatch) {
          manifest = {
            name: nameMatch[1],
            version: versionMatch[1],
          }
        }
      } catch {
        // Ignore
      }

      result.push({
        name: pluginName,
        path: fullPath,
        enabled: enabledPlugins.has(pluginName),
        manifest,
        loaded: loadedPlugins.has(pluginName),
      })
    }

    return result
  } catch (error: any) {
    console.error('[PluginLoader] Failed to scan plugins directory:', error)
    return []
  }
}

/**
 * Scannt das Plugin-Verzeichnis und versucht, alle als aktiviert markierten Plugins zu laden.
 *
 * Führt für jede gefundene, aktivierte Plugin-Datei einen Ladevorgang durch und sammelt die jeweiligen Ergebnisse.
 *
 * @returns Ein Array von `PluginLoadResult`-Einträgen mit dem Ergebnis für jedes versuchte Plugin, in der Reihenfolge des Scan-Vorgangs.
 */
export async function loadAllPlugins(): Promise<PluginLoadResult[]> {
  const results: PluginLoadResult[] = []

  try {
    const entries = await scanPluginsDirectory()

    for (const entry of entries) {
      if (!entry.enabled) continue

      const result = await loadPlugin(entry.path)
      results.push(result)

      if (!result.success && result.error) {
        console.warn(`[PluginLoader] Failed to load plugin ${entry.name}:`, result.error)
      }
    }

    return results
  } catch (error: any) {
    console.error('[PluginLoader] Failed to load plugins:', error)
    return results
  }
}

/**
 * Lädt ein Plugin-Modul von der angegebenen Datei, initialisiert es und ersetzt bei Bedarf eine bereits geladene Version.
 *
 * @param filePath - Dateisystempfad zur Plugin-Datei
 * @returns Ein Objekt mit dem Ladeergebnis; bei Erfolg (`success: true`) enthält es das initialisierte Plugin unter `plugin`, bei Fehlern enthält es eine `error`-Beschreibung und `success: false`.
 */
export async function loadPlugin(filePath: string): Promise<PluginLoadResult> {
  const result = await loadPluginFromFile(filePath)

  if (!result.success || !result.plugin) {
    return result
  }

  const pluginName = result.plugin.manifest.name

  // If already loaded, unload first
  if (loadedPlugins.has(pluginName)) {
    await unloadPlugin(pluginName)
  }

  // Initialize
  return await initializePlugin(result.plugin, filePath)
}

/**
 * Entfernt das geladenen Plugin mit dem angegebenen Namen aus dem Laufzeitzustand.
 *
 * @param pluginName - Der Name des zu entfernenden Plugins
 * @returns `true` wenn das Plugin erfolgreich entladen wurde, `false` andernfalls
 */
export async function unloadPluginByName(pluginName: string): Promise<boolean> {
  return await unloadPlugin(pluginName)
}

/**
 * Lädt ein bereits geladenes Plugin neu.
 *
 * @param pluginName - Der in `manifest.name` definierte Name des Plugins
 * @returns Ein Objekt mit dem Ladeergebnis; bei Erfolg enthält es das geladene `plugin`, sonst ein `error`-Feld mit einer Fehlermeldung
 */
export async function reloadPlugin(pluginName: string): Promise<PluginLoadResult> {
  const plugin = loadedPlugins.get(pluginName)
  if (!plugin) {
    return {
      success: false,
      error: `Plugin ${pluginName} is not loaded`,
    }
  }

  // Find file path
  let filePath: string | undefined
  for (const [path, name] of pluginFiles.entries()) {
    if (name === pluginName) {
      filePath = path
      break
    }
  }

  if (!filePath) {
    return {
      success: false,
      error: `Plugin file not found for ${pluginName}`,
    }
  }

  // Unload and reload
  await unloadPlugin(pluginName)
  return await loadPlugin(filePath)
}

/**
 * Lädt alle aktuell geladenen Plugins neu.
 *
 * @returns Ein Array von PluginLoadResult-Objekten — eines pro Plugin, in der Reihenfolge der zuvor geladenen Plugins.
 */
export async function reloadAllPlugins(): Promise<PluginLoadResult[]> {
  const results: PluginLoadResult[] = []
  const pluginNames = Array.from(loadedPlugins.keys())

  for (const name of pluginNames) {
    const result = await reloadPlugin(name)
    results.push(result)
  }

  return results
}

/**
 * Aktiviert ein Plugin und lädt es aus dem Plugins-Verzeichnis, falls eine passende Datei vorhanden ist.
 *
 * @param pluginName - Der Name des Plugins wie in dessen Manifest (`manifest.name`)
 * @returns `true` wenn das Plugin nach dem Aktivieren erfolgreich geladen wurde, `false` sonst.
 */
export async function enablePlugin(pluginName: string): Promise<boolean> {
  enabledPlugins.add(pluginName)

  // Find file and load
  const entries = await scanPluginsDirectory()
  const entry = entries.find(e => e.name === pluginName)

  if (entry) {
    const result = await loadPlugin(entry.path)
    return result.success
  }

  return false
}

/**
 * Deaktiviert ein Plugin und entfernt seinen Namen aus der Menge aktivierter Plugins.
 *
 * @param pluginName - Der Name des zu deaktivierenden Plugins
 * @returns `true`, wenn das Plugin erfolgreich entladen wurde, `false` andernfalls
 */
export async function disablePlugin(pluginName: string): Promise<boolean> {
  const unloaded = await unloadPlugin(pluginName)
  enabledPlugins.delete(pluginName)
  return unloaded
}

/**
 * Liefert Metadaten zu einem aktuell geladenen Plugin.
 *
 * @returns Ein `PluginDirectoryEntry` mit `name`, `enabled`, `manifest` und `loaded: true` für das geladene Plugin; `null` wenn kein Plugin mit `pluginName` geladen ist. Das Feld `path` ist absichtlich leer und muss aus `pluginFiles` ermittelt werden.
 */
export function getPluginInfo(pluginName: string): PluginDirectoryEntry | null {
  const plugin = loadedPlugins.get(pluginName)
  if (!plugin) return null

  return {
    name: pluginName,
    path: '', // Will be filled from pluginFiles
    enabled: enabledPlugins.has(pluginName),
    manifest: plugin.manifest,
    loaded: true,
  }
}

/**
 * Gibt eine Liste aller aktuell geladenen Plugins mit Pfad, Aktivierungsstatus und Manifest zurück.
 *
 * @returns Ein Array von PluginDirectoryEntry — für jedes geladene Plugin enthält der Eintrag `name`, `path` (Dateipfad oder leer), `enabled` (`true`/`false`), `manifest` und `loaded: true`.
 */
export function listLoadedPlugins(): PluginDirectoryEntry[] {
  const entries: PluginDirectoryEntry[] = []

  for (const [name, plugin] of loadedPlugins) {
    let path = ''
    for (const [p, n] of pluginFiles.entries()) {
      if (n === name) {
        path = p
        break
      }
    }

    entries.push({
      name,
      path,
      enabled: enabledPlugins.has(name),
      manifest: plugin.manifest,
      loaded: true,
    })
  }

  return entries
}

/**
 * Gibt den Plugin-Kontext für das angegebene Plugin zurück.
 *
 * @returns Den zugehörigen `PluginContext`, oder `undefined`, wenn das Plugin nicht geladen ist.
 */
export function getPluginContext(pluginName: string): PluginContext | undefined {
  return pluginContexts.get(pluginName)
}

/**
 * Liefert eine Map aller aktuell registrierten Plugin-Befehle.
 *
 * @returns Eine Map (`Map<string, PluginCommand>`) von Befehlsnamen zu `PluginCommand`-Objekten für alle registrierten Plugin-Befehle
 */
export function getAllPluginCommands(): Map<string, PluginCommand> {
  return getPluginCommands()
}

/**
 * Erstellt einen Dateisystem-Watcher für eine Plugin-Datei und löst bei Änderungen einen Plugin-Neuladevorgang aus.
 *
 * Registriert einen Watcher für `filePath` (sofern noch keiner existiert) und speichert dessen Schließfunktion in der internen `watchers`-Map. Bei einer Dateiänderung wird `reloadPlugin(pluginName)` aufgerufen; wenn das Betriebssystem oder die Laufzeit kein File-Watching unterstützt, wird die Einrichtung stillschweigend abgebrochen.
 *
 * @param filePath - Absoluter Pfad zur Plugin-Datei, die überwacht werden soll
 * @param pluginName - Name des Plugins, das beim Erkennen von Änderungen neu geladen werden soll
 */
function setupFileWatcher(filePath: string, pluginName: string): void {
  if (watchers.has(filePath)) {
    return
  }

  try {
    import('node:fs').then(({ watch }) => {
      const watcher = watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
          console.log(`[PluginLoader] Plugin file changed: ${pluginName}, reloading...`)
          reloadPlugin(pluginName).catch((error) => {
            console.error(`[PluginLoader] Failed to reload plugin ${pluginName}:`, error)
          })
        }
      })

      watchers.set(filePath, { close: () => watcher.close() })
    }).catch(error => {
      console.warn(`[PluginLoader] File watching not available for ${pluginName}:`, error)
    })
  } catch (error) {
    console.warn(`[PluginLoader] File watching not available for ${pluginName}:`, error)
  }
}

/**
 * Überwacht das Plugins-Verzeichnis und reagiert auf Dateiänderungen und Umbenennungen.
 *
 * Bei Dateiänderungen (.ts, .js, .mjs, .cjs) löst die Funktion für die betroffene Plugin-Datei
 * ein Neuladen des zugeordneten Plugins aus; bei Umbenennungen startet sie einen vollständigen
 * Neuabgleich (Rescan) aller Plugins. Sie legt einen Dateisystem-Watcher unter dem Schlüssel
 * 'plugins-dir' ab und protokolliert, falls das Watchen nicht verfügbar ist.
 */
export function startWatching(): void {
  import('node:fs').then(({ watch }) => {
    import('node:path').then(({ join, extname }) => {
      try {
        const watcher = watch(pluginsDir, { recursive: true }, (eventType, filename) => {
          if (!filename) return

          const fullPath = join(pluginsDir, filename)
          const ext = extname(filename).toLowerCase()

          if (!['.ts', '.js', '.mjs', '.cjs'].includes(ext)) return

          if (eventType === 'change') {
            // Reload the changed plugin
            const pluginName = pluginFiles.get(fullPath)
            if (pluginName) {
              console.log(`[PluginLoader] Plugin file changed: ${pluginName}, reloading...`)
              reloadPlugin(pluginName).catch((error) => {
                console.error(`[PluginLoader] Failed to reload plugin ${pluginName}:`, error)
              })
            }
          } else if (eventType === 'rename') {
            // Plugin added or removed
            console.log(`[PluginLoader] Plugins directory changed, rescanning...`)
            loadAllPlugins().catch((error) => {
              console.error('[PluginLoader] Failed to rescan plugins:', error)
            })
          }
        })

        // Store watcher reference
        watchers.set('plugins-dir', { close: () => watcher.close() })
      } catch (error) {
        console.warn('[PluginLoader] File watching not available:', error)
      }
    }).catch(error => {
      console.warn('[PluginLoader] File watching not available:', error)
    })
  }).catch(error => {
    console.warn('[PluginLoader] File watching not available:', error)
  })
}

/**
 * Beendet alle aktiven Datei-/Verzeichnis-Watcher des Plugin-Loaders.
 *
 * Versucht, jeden registrierten Watcher zu schließen; schlägt das Schließen eines Watchers fehl, wird eine Warnung ausgegeben. Entfernt danach alle Einträge aus der internen Watcher-Sammlung.
 */
export function stopWatching(): void {
  for (const [key, watcher] of watchers.entries()) {
    try {
      watcher.close()
    } catch (error) {
      console.warn(`[PluginLoader] Failed to close watcher for ${key}:`, error)
    }
  }
  watchers.clear()
}

/**
 * Räumt den Plugin-Loader vollständig auf und setzt seinen internen Zustand zurück.
 *
 * Stoppt laufende Dateiwatcher, entfernt alle registrierten Plugin-Befehle und leert die internen Sammlungen für geladene Plugins, Plugin-Kontexte, Datei-Zuordnungen und aktivierte Plugins. Nach dem Aufruf sind keine Plugins geladen und keine Watcher aktiv.
 */
export function cleanup(): void {
  stopWatching()
  clearPluginCommands()
  loadedPlugins.clear()
  pluginContexts.clear()
  pluginFiles.clear()
  enabledPlugins.clear()
}
