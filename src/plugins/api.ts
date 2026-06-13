// ─── Plugin API Implementation ───────────────────────────────────────

import type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginCommand,
  PluginConfig,
  PluginEventType,
  PluginEventHandler,
  PluginEventSubscription,
  MessagePart,
} from './types.js'
import type { Command } from '../types.js'

// Global event bus for plugins
const eventBus = new Map<PluginEventType, Set<PluginEventHandler>>()

// Plugin command registry (shared with main app)
const pluginCommands = new Map<string, PluginCommand>()

// Plugin config storage (in-memory, persisted to ~/.config/ai-cli/plugins-config.json)
const configPath = `${process.env.HOME || process.env.USERPROFILE || ''}/.config/ai-cli/plugins-config.json`
let pluginConfig: Record<string, PluginConfig> = {}

/**
 * Lädt die persistente Plugin-Konfiguration von der Datei `configPath` in den Modulzustand `pluginConfig`.
 *
 * Falls das Laden oder Parsen fehlschlägt, wird `pluginConfig` auf ein leeres Objekt zurückgesetzt.
 */
async function loadPluginConfig(): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const content = await fs.readFile(configPath, 'utf-8')
    pluginConfig = JSON.parse(content)
  } catch {
    pluginConfig = {}
  }
}

/**
 * Persistiert die aktuelle Plugin-Konfiguration auf Festplatte unter dem in `configPath` definierten Pfad.
 *
 * Erstellt bei Bedarf das Zielverzeichnis und schreibt die Konfiguration als formatiertes JSON. Bei Fehlern beim Schreiben wird ein Fehlerprotokoll ausgegeben.
 */
async function savePluginConfig(): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const dir = await import('node:path').then(p => p.dirname(configPath))
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(pluginConfig, null, 2))
  } catch (error) {
    console.error('Failed to save plugin config:', error)
  }
}

// Initialize config
await loadPluginConfig()

/**
 * Erstellt einen Plugin-spezifischen Kontext mit API für Befehlsregistrierung, konfigurations‑Persistenz,
 * Messaging, Date- und Shell-Operationen, Ereignisverwaltung sowie Logging und Hilfswerte.
 *
 * @param manifest - Manifest des Plugins; `manifest.name` wird als Pluginkennung (prefix für Befehle) verwendet
 * @param deps - Optionale Integrationen:
 *   - `sendToAI` zur Weiterleitung von Nachrichten an die Host-AI,
 *   - `registerMainCommand`/`unregisterMainCommand` zum Registrieren/Entfernen von Befehlen in der Hauptanwendung
 * @returns Ein PluginContext-Objekt mit Methoden zum Registrieren/Abmelden von Befehlen, Lesen/Schreiben von plugin‑konfigurationsdaten,
 *          Senden von Nachrichten an die Host-AI (oder Fallback), Dateioperationen (`readFile`, `listFiles`, `writeFile`, `deleteFile`),
 *          Ausführen von Shell-Befehlen (`executeCommand`), Ereignis-Subscription/Emission (`onEvent`, `emitEvent`),
 *          Logging (`log`) sowie `cwd` und `env`.
 */
export function createPluginContext(
  manifest: PluginManifest,
  deps: {
    sendToAI?: (parts: MessagePart[]) => Promise<MessagePart[]>
    registerMainCommand?: (command: Command) => void
    unregisterMainCommand?: (name: string) => void
  } = {}
): PluginContext {
  const pluginName = manifest.name

  return {
    manifest,

    // ─── Command Registration ───────────────────────────────────────
    registerCommand: (command: PluginCommand) => {
      const fullName = `${pluginName}:${command.name}`
      if (pluginCommands.has(fullName)) {
        throw new Error(`Command ${fullName} already registered`)
      }
      pluginCommands.set(fullName, command)

      // Register with main app if provided
      if (deps.registerMainCommand) {
        deps.registerMainCommand({
          name: fullName,
          description: `[${pluginName}] ${command.description}`,
          aliases: command.aliases?.map(a => `${pluginName}:${a}`),
          args: command.args,
          run: async (args, context) => {
            const result = await command.run(args, {
              ...context,
              // Override sendToAI to use plugin's context
              sendToAI: deps.sendToAI
                ? (parts) => deps.sendToAI!(parts)
                : context.sendToAI,
            } as PluginContext)
            return Array.isArray(result) ? result : [{ type: 'text', text: String(result) }]
          },
        })
      }
    },

    unregisterCommand: (name: string) => {
      const fullName = `${pluginName}:${name}`
      pluginCommands.delete(fullName)
      if (deps.unregisterMainCommand) {
        deps.unregisterMainCommand(fullName)
      }
    },

    // ─── Config Management ───────────────────────────────────────────
    getConfig: (key?: string) => {
      const pluginConfigData = pluginConfig[pluginName] || {}
      if (key) {
        return pluginConfigData[key]
      }
      return pluginConfigData
    },

    setConfig: async (key: string, value: unknown) => {
      if (!pluginConfig[pluginName]) {
        pluginConfig[pluginName] = {}
      }
      pluginConfig[pluginName][key] = value
      await savePluginConfig()
    },

    // ─── Messaging ───────────────────────────────────────────────────
    sendMessage: async (text: string): Promise<MessagePart[]> => {
      if (deps.sendToAI) {
        return deps.sendToAI([{ type: 'text', text }])
      }
      return [{ type: 'text', text: 'AI not available' }]
    },

    // ─── File Operations ─────────────────────────────────────────────
    readFile: async (path: string): Promise<string> => {
      const fs = await import('node:fs/promises')
      try {
        return await fs.readFile(path, 'utf-8')
      } catch (error: any) {
        throw new Error(`Failed to read file ${path}: ${error.message}`)
      }
    },

    listFiles: async (path: string): Promise<string[]> => {
      const fs = await import('node:fs/promises')
      try {
        const entries = await fs.readdir(path, { withFileTypes: true })
        return entries
          .filter(e => !e.name.startsWith('.'))
          .map(e => e.name)
      } catch (error: any) {
        throw new Error(`Failed to list files in ${path}: ${error.message}`)
      }
    },

    writeFile: async (path: string, content: string): Promise<void> => {
      const fs = await import('node:fs/promises')
      try {
        await fs.mkdir(await import('node:path').then(p => p.dirname(path)), { recursive: true })
        await fs.writeFile(path, content, 'utf-8')
      } catch (error: any) {
        throw new Error(`Failed to write file ${path}: ${error.message}`)
      }
    },

    deleteFile: async (path: string): Promise<void> => {
      const fs = await import('node:fs/promises')
      try {
        await fs.unlink(path)
      } catch (error: any) {
        throw new Error(`Failed to delete file ${path}: ${error.message}`)
      }
    },

    // ─── Shell Execution ─────────────────────────────────────────────
    executeCommand: async (cmd: string): Promise<string> => {
      const { exec } = await import('node:child_process')
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message))
          } else {
            resolve(stdout.trim())
          }
        })
      })
    },

    // ─── Event System ────────────────────────────────────────────────
    onEvent: <T = unknown>(event: PluginEventType, handler: PluginEventHandler<T>): PluginEventSubscription => {
      if (!eventBus.has(event)) {
        eventBus.set(event, new Set())
      }
      eventBus.get(event)!.add(handler as PluginEventHandler)

      return {
        event,
        handler: handler as PluginEventHandler,
        unsubscribe: () => {
          eventBus.get(event)?.delete(handler as PluginEventHandler)
        },
      }
    },

    emitEvent: <T = unknown>(event: PluginEventType, data?: T): void => {
      const handlers = eventBus.get(event)
      if (handlers) {
        for (const handler of handlers) {
          try {
            Promise.resolve(handler(data)).catch((error) => {
              console.error(`Plugin event handler error for ${event}:`, error)
            })
          } catch (error) {
            console.error(`Plugin event handler error for ${event}:`, error)
          }
        }
      }
    },

    // ─── Logging ─────────────────────────────────────────────────────
    log: (message: string, level: 'info' | 'warn' | 'error' = 'info'): void => {
      const prefix = `[Plugin:${pluginName}]`
      switch (level) {
        case 'error':
          console.error(prefix, message)
          break
        case 'warn':
          console.warn(prefix, message)
          break
        default:
          console.log(prefix, message)
      }
    },

    // ─── Utilities ───────────────────────────────────────────────────
    cwd: process.cwd(),
    env: process.env,
  }
}

/**
 * Liefert die globale Map mit registrierten Plugin-Befehlen, wobei der Schlüssel im Format `pluginName:commandName` vorliegt.
 *
 * @returns Die Map von vollqualifizierten Befehlsnamen zu den zugehörigen `PluginCommand`-Definitionen
 */
export function getPluginCommands(): Map<string, PluginCommand> {
  return pluginCommands
}

/**
 * Entfernt alle Einträge aus dem gemeinsamen Registry mit Plugin-Befehlen.
 *
 * Diese Funktion löscht sämtliche gespeicherten Plugin-Kommandos aus der internen
 * Map, wodurch das Registry leer ist.
 */
export function clearPluginCommands(): void {
  pluginCommands.clear()
}

/**
 * Löst ein globales Plugin-Ereignis aus und ruft alle dafür registrierten Handler auf.
 *
 * Jeder Handler wird mit dem optionalen `data`-Payload aufgerufen; auftretende synchrone oder
 * asynchrone Fehler werden abgefangen und auf der Konsole geloggt, aber nicht weitergeworfen.
 *
 * @param event - Der Typ des auszulösenden Plugin-Ereignisses
 * @param data - Optionaler Nutzdaten-Payload, der an die Handler übergeben wird
 */
export function emitPluginEvent<T = unknown>(event: PluginEventType, data?: T): void {
  const handlers = eventBus.get(event)
  if (handlers) {
    for (const handler of handlers) {
      try {
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`Plugin event handler error for ${event}:`, error)
        })
      } catch (error) {
        console.error(`Plugin event handler error for ${event}:`, error)
      }
    }
  }
}
