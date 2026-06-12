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

// ─── Load Plugin from File ────────────────────────────────────────────
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

// ─── Initialize Plugin ───────────────────────────────────────────────
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

// ─── Unload Plugin ────────────────────────────────────────────────────
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

// ─── Scan Plugins Directory ───────────────────────────────────────────
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

// ─── Load All Plugins ────────────────────────────────────────────────
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

// ─── Load Single Plugin ───────────────────────────────────────────────
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

// ─── Unload Plugin by Name ────────────────────────────────────────────
export async function unloadPluginByName(pluginName: string): Promise<boolean> {
  return await unloadPlugin(pluginName)
}

// ─── Reload Plugin ────────────────────────────────────────────────────
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

// ─── Reload All Plugins ───────────────────────────────────────────────
export async function reloadAllPlugins(): Promise<PluginLoadResult[]> {
  const results: PluginLoadResult[] = []
  const pluginNames = Array.from(loadedPlugins.keys())

  for (const name of pluginNames) {
    const result = await reloadPlugin(name)
    results.push(result)
  }

  return results
}

// ─── Enable Plugin ────────────────────────────────────────────────────
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

// ─── Disable Plugin ───────────────────────────────────────────────────
export async function disablePlugin(pluginName: string): Promise<boolean> {
  const unloaded = await unloadPlugin(pluginName)
  enabledPlugins.delete(pluginName)
  return unloaded
}

// ─── Get Plugin Info ──────────────────────────────────────────────────
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

// ─── List Loaded Plugins ──────────────────────────────────────────────
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

// ─── Get Plugin Context ───────────────────────────────────────────────
export function getPluginContext(pluginName: string): PluginContext | undefined {
  return pluginContexts.get(pluginName)
}

// ─── Get All Plugin Commands ──────────────────────────────────────────
export function getAllPluginCommands(): Map<string, PluginCommand> {
  return getPluginCommands()
}

// ─── File Watcher Setup ───────────────────────────────────────────────
function setupFileWatcher(filePath: string, pluginName: string): void {
  if (watchers.has(filePath)) {
    return
  }

  try {
    const { watch } = require('node:fs')
    const watcher = watch(filePath, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`[PluginLoader] Plugin file changed: ${pluginName}, reloading...`)
        reloadPlugin(pluginName).catch((error) => {
          console.error(`[PluginLoader] Failed to reload plugin ${pluginName}:`, error)
        })
      }
    })

    watchers.set(filePath, { close: () => watcher.close() })
  } catch (error) {
    console.warn(`[PluginLoader] File watching not available for ${pluginName}:`, error)
  }
}

// ─── Start Watching Plugins Directory ─────────────────────────────────
export function startWatching(): void {
  const fs = require('node:fs')
  const path = require('node:path')

  try {
    const watcher = fs.watch(pluginsDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return

      const fullPath = path.join(pluginsDir, filename)
      const ext = path.extname(filename).toLowerCase()

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
}

// ─── Stop Watching ────────────────────────────────────────────────────
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

// ─── Cleanup ─────────────────────────────────────────────────────────
export function cleanup(): void {
  stopWatching()
  clearPluginCommands()
  loadedPlugins.clear()
  pluginContexts.clear()
  pluginFiles.clear()
  enabledPlugins.clear()
}
