// ─── Plugin Types ─────────────────────────────────────────────────────

// Plugin manifest - metadata about the plugin
export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  dependencies?: string[]
}

// Plugin command definition (similar to Command but for plugins)
export interface PluginCommand {
  name: string
  description: string
  aliases?: string[]
  args?: string[]
  run: (args: string, context: PluginContext) => Promise<string | MessagePart[]>
}

// Message part (re-export from types for convenience)
export type MessagePart = import('./types').MessagePart

// Plugin event types
export type PluginEventType =
  | 'message:before'      // Before message is sent to AI
  | 'message:after'       // After message response received
  | 'command:before'      // Before command executes
  | 'command:after'       // After command executes
  | 'command:error'       // When command throws error
  | 'plugin:load'         // When plugin is loaded
  | 'plugin:unload'       // When plugin is unloaded
  | 'theme:change'        // When theme changes
  | 'config:change'       // When config changes
  | 'error'               // Global error event

// Event handler function
export type PluginEventHandler<T = unknown> = (data: T) => void | Promise<void>

// Event subscription
export interface PluginEventSubscription {
  event: PluginEventType
  handler: PluginEventHandler
  unsubscribe: () => void
}

// Plugin configuration storage
export interface PluginConfig {
  [key: string]: unknown
}

// Plugin context - API exposed to plugins
export interface PluginContext {
  // Plugin metadata
  manifest: PluginManifest

  // Command registration
  registerCommand: (command: PluginCommand) => void
  unregisterCommand: (name: string) => void

  // Config management
  getConfig: (key?: string) => PluginConfig | unknown
  setConfig: (key: string, value: unknown) => void

  // Messaging
  sendMessage: (text: string) => Promise<MessagePart[]>

  // File operations
  readFile: (path: string) => Promise<string>
  listFiles: (path: string) => Promise<string[]>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>

  // Shell execution
  executeCommand: (cmd: string) => Promise<string>

  // Event system
  onEvent: <T = unknown>(event: PluginEventType, handler: PluginEventHandler<T>) => PluginEventSubscription
  emitEvent: <T = unknown>(event: PluginEventType, data?: T) => void

  // Logging
  log: (message: string, level?: 'info' | 'warn' | 'error') => void

  // Utilities
  cwd: string
  env: NodeJS.ProcessEnv
}

// Plugin definition (what loader expects)
export interface Plugin {
  manifest: PluginManifest
  commands?: PluginCommand[]
  onLoad?: (context: PluginContext) => Promise<void> | void
  onUnload?: (context: PluginContext) => Promise<void> | void
}

// Plugin load result
export interface PluginLoadResult {
  success: boolean
  plugin?: Plugin
  error?: string
  warnings?: string[]
}

// Plugin directory entry
export interface PluginDirectoryEntry {
  name: string
  path: string
  enabled: boolean
  manifest: PluginManifest | null
  loaded: boolean
  error?: string
}

// Plugin manager state
export interface PluginManagerState {
  plugins: Map<string, Plugin>
  enabled: Set<string>
  contexts: Map<string, PluginContext>
  subscriptions: Map<string, PluginEventSubscription[]>
  watchers: Map<string, FSWatcher>
}
