# Plugin Development Guide

Plugins extend ai-cli with custom commands, tools, and integrations. The plugin system is designed to be simple yet powerful.

## Plugin Structure

A plugin is a TypeScript/JavaScript file (or directory) with:

```
my-plugin/
├── manifest.json    # Plugin metadata (optional if in code)
├── index.ts         # Main plugin code (compiled to .js)
└── README.md        # Documentation (optional)
```

Or as a single file:
```
~/.config/ai-cli/plugins/my-plugin.ts
```

**Example structure:**
```
~/.config/ai-cli/plugins/
└── weather/
    ├── manifest.json
    ├── index.js
    └── README.md
```

---

## Plugin Manifest

The manifest can be either a separate `manifest.json` file or a `manifest` property in your plugin export.

### As JSON file (`manifest.json`):

```json
{
  "name": "weather",
  "version": "1.0.0",
  "description": "Weather forecast plugin",
  "author": "Your Name",
  "license": "MIT",
  "homepage": "https://github.com/you/weather",
  "repository": "https://github.com/you/weather",
  "keywords": ["weather", "forecast"],
  "dependencies": []
}
```

### As code export:

```typescript
export const manifest = {
  name: 'weather',
  version: '1.0.0',
  description: 'Weather forecast plugin',
  author: 'Your Name',
  license: 'MIT',
}
```

**Required fields:**
- `name` - Unique plugin identifier (lowercase, no spaces, alphanumeric and hyphens only)
- `version` - Semantic version (e.g., `1.0.0`, `2.1.3-beta.1`)

**Optional fields:**
- `description` - Short description
- `author` - Author name
- `license` - License identifier
- `homepage` - Plugin homepage URL
- `repository` - Source repository URL
- `keywords` - Array of keywords
- `dependencies` - Array of required plugins or external dependencies

---

## Plugin API

Plugins receive a `PluginContext` with these capabilities:

### Plugin Interface

```typescript
interface Plugin {
  manifest: PluginManifest
  commands?: PluginCommand[]
  onLoad?: (context: PluginContext) => Promise<void> | void
  onUnload?: (context: PluginContext) => Promise<void> | void
}
```

### PluginContext Interface

```typescript
interface PluginContext {
  // Plugin metadata
  manifest: PluginManifest

  // Command registration
  registerCommand: (command: PluginCommand) => void
  unregisterCommand: (name: string) => void

  // Config management
  getConfig: (key?: string) => unknown
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
```

---

## Creating a Plugin

### 1. Create plugin file

`~/.config/ai-cli/plugins/hello-world.ts`:

```typescript
// Manifest (optional, can be separate file)
export const manifest = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Simple hello world plugin',
  author: 'You',
  license: 'MIT',
}

// Plugin definition
export default {
  manifest,

  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      aliases: ['hi', 'hey'],
      args: '[name]',
      run: async (args, ctx) => {
        const name = args || 'World'
        return [{ type: 'text', text: `Hello, ${name}!` }]
      },
    },
  ],

  onLoad: async (ctx) => {
    ctx.log('Hello World plugin loaded!')
  },

  onUnload: async (ctx) => {
    ctx.log('Hello World plugin unloaded')
  },
}
```

### 2. Install plugin

```bash
# From ai-cli:
/plugin install ~/.config/ai-cli/plugins/hello-world.ts

# Or from git:
/plugin install https://github.com/you/hello-world.git

# Or from local directory:
/plugin install /path/to/plugin
```

### 3. Use plugin

```
/hello
/hello Alice
/hi
```

---

## Command Handlers

Commands are defined in the `commands` array:

```typescript
interface PluginCommand {
  name: string
  description: string
  aliases?: string[]
  args?: string // Usage description
  run: (args: string, context: CommandContext) => Promise<string | MessagePart[]>
}
```

**Example with options:**

```typescript
{
  name: 'weather',
  description: 'Get weather for city',
  args: '[city] [--units metric]',
  run: async (args, ctx) => {
    const parts = args.split(/\s+/)
    const city = parts[0] || 'London'
    const units = parts.includes('--units') ? parts[parts.indexOf('--units') + 1] : 'metric'

    const forecast = await fetchWeather(city, units)
    return [
      { type: 'text', text: `Weather in ${city}:` },
      { type: 'code', language: 'json', code: JSON.stringify(forecast, null, 2) },
    ]
  },
}
```

---

## Message Parts

Return these message part types from commands:

| Type | Description | Example |
|------|-------------|---------|
| `text` | Plain text | `{ type: 'text', text: 'Hello' }` |
| `code` | Code block | `{ type: 'code', language: 'ts', code: '...' }` |
| `diff` | Diff view | `{ type: 'diff', hunks: [...] }` |
| `file` | File content | `{ type: 'file', filename: 'app.ts', content: '...', language: 'ts' }` |

**Example:**

```typescript
return [
  { type: 'text', text: 'Here\'s the weather:' },
  {
    type: 'code',
    language: 'json',
    code: JSON.stringify(forecast, null, 2)
  },
  { type: 'text', text: 'Have a nice day!' }
]
```

---

## Event System

Listen to ai-cli events:

### Available Events

| Event | When triggered | Data |
|-------|----------------|------|
| `message:before` | Before message sent to AI | `{ text, parts }` |
| `message:after` | After AI response received | `{ text, parts }` |
| `command:before` | Before command executes | `{ command, args }` |
| `command:after` | After command completes | `{ command, args, result }` |
| `command:error` | When command throws error | `{ command, args, error }` |
| `plugin:load` | When plugin is loaded | `{ plugin }` |
| `plugin:unload` | When plugin is unloaded | `{ plugin }` |
| `theme:change` | When theme changes | `{ theme }` |
| `config:change` | When config changes | `{ key, value }` |
| `error` | Global error event | `{ error, context }` |

### Example: Event Listener

```typescript
export default {
  manifest: {
    name: 'logger',
    version: '1.0.0',
  },

  commands: [],

  onLoad: async (ctx) => {
    // Listen to events
    ctx.onEvent('message:before', (data) => {
      ctx.log(`User message: ${data.text?.slice(0, 50)}...`, 'info')
    })

    ctx.onEvent('message:after', (data) => {
      ctx.log(`AI response: ${data.text?.slice(0, 50)}...`, 'info')
    })

    ctx.onEvent('command:error', (data) => {
      ctx.log(`Command error: ${data.command} - ${data.error}`, 'error')
    })
  },

  onUnload: async (ctx) => {
    ctx.log('Logger plugin unloaded')
  },
}
```

---

## State Persistence

Plugins can store persistent state:

```typescript
// Save state
ctx.setConfig('lastCity', 'London')

// Load state
const city = ctx.getConfig('lastCity') || 'New York'
```

State is automatically persisted to `~/.config/ai-cli/plugins-state.json`:

```json
{
  "plugins": {
    "weather": {
      "lastCity": "London",
      "units": "metric"
    }
  }
}
```

---

## File Operations

Read and write files:

```typescript
// Read file
const content = await ctx.readFile('/path/to/file')

// Write file
await ctx.writeFile('/path/to/file', 'content')

// List files
const files = await ctx.listFiles('/path/to/dir')

// Delete file
await ctx.deleteFile('/path/to/file')
```

**Note:** Paths are relative to current working directory or absolute.

---

## Shell Execution

Run shell commands:

```typescript
const result = await ctx.executeCommand('curl https://api.example.com')

if (result) {
  // Command succeeded, result contains stdout
  const data = JSON.parse(result)
}
```

---

## Logging

Log messages appear in ai-cli logs:

```typescript
ctx.log('Info message', 'info')    // Default
ctx.log('Warning!', 'warn')
ctx.log('Error occurred', 'error')
```

Logs stored in: `~/.config/ai-cli/logs/plugins/`

---

## Complete Example: Weather Plugin

`manifest.json`:
```json
{
  "name": "weather",
  "version": "1.0.0",
  "description": "Weather forecast plugin using OpenWeatherMap",
  "author": "You",
  "license": "MIT",
  "homepage": "https://github.com/you/weather-plugin",
  "repository": "https://github.com/you/weather-plugin"
}
```

`index.ts`:
```typescript
import type { Plugin, PluginContext, MessagePart } from 'ai-cli/plugins/types'

interface WeatherResponse {
  main: { temp: number; humidity: number }
  weather: [{ description: string }]
  name: string
}

export const manifest = {
  name: 'weather',
  version: '1.0.0',
  description: 'Get weather forecasts',
  author: 'You',
  license: 'MIT',
}

export default {
  manifest,

  commands: [
    {
      name: 'weather',
      description: 'Get weather for a city',
      aliases: ['w'],
      args: '[city] [--units metric|imperial]',
      run: async (args, ctx) => {
        const parts = args.split(/\s+/)
        const city = parts[0] || await ctx.getConfig('lastCity') || 'London'
        let units = 'metric'

        // Parse --units flag
        const unitsIdx = parts.indexOf('--units')
        if (unitsIdx !== -1 && parts[unitsIdx + 1]) {
          units = parts[unitsIdx + 1] === 'imperial' ? 'imperial' : 'metric'
        }

        // Save preference
        await ctx.setConfig('lastCity', city)
        await ctx.setConfig('units', units)

        // Get API key from config
        const apiKey = ctx.getConfig('apiKey')
        if (!apiKey) {
          return [{
            type: 'text',
            text: 'Error: Set OpenWeatherMap API key via:\n/export plugins.weather.apiKey "your-key"'
          }]
        }

        try {
          const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const data: WeatherResponse = await response.json()

          const tempUnit = units === 'metric' ? '°C' : '°F'
          const text = `
Weather in ${data.name}:
  Temperature: ${data.main.temp}${tempUnit}
  Humidity: ${data.main.humidity}%
  Conditions: ${data.weather[0].description}
          `.trim()

          return [{ type: 'text', text }]
        } catch (error: any) {
          return [{
            type: 'text',
            text: `Error fetching weather: ${error.message}`
          }]
        }
      },
    },
  ],

  onLoad: async (ctx) => {
    ctx.log('Weather plugin loaded')
  },

  onUnload: async (ctx) => {
    ctx.log('Weather plugin unloaded')
  },
}
```

**Installation:**
```bash
# Compile to JavaScript
bun build index.ts --outdir .

# Install
/plugin install /path/to/weather
```

**Usage:**
```
/weather London
/w Tokyo --units imperial
```

---

## Plugin Settings

Define plugin settings in manifest (optional):

```json
{
  "name": "my-plugin",
  "ai-cli-settings": {
    "apiKey": {
      "type": "string",
      "description": "API key for service",
      "default": "",
      "secret": true
    },
    "units": {
      "type": "string",
      "description": "Units of measurement",
      "default": "metric",
      "enum": ["metric", "imperial"]
    },
    "cacheTimeout": {
      "type": "number",
      "description": "Cache timeout in seconds",
      "default": 300,
      "minimum": 0,
      "maximum": 86400
    }
  }
}
```

**Access settings:**
```typescript
const apiKey = ctx.getConfig('plugins.weather.apiKey')
const units = ctx.getConfig('plugins.weather.units') || 'metric'
```

**User sets via:**
```bash
/export plugins.weather.apiKey "secret-key"
/export plugins.weather.units "imperial"
```

---

## Publishing Plugins

### Package for Distribution

```bash
# Create directory structure
my-plugin/
├── manifest.json
├── index.js (compiled)
└── README.md

# Create tarball
tar -czf my-plugin-1.0.0.tar.gz my-plugin/

# Or publish to GitHub Releases
git tag v1.0.0
git push origin v1.0.0
```

### Share Plugin

Users install via:
```
/plugin install https://github.com/you/my-plugin/releases/download/v1.0.0/my-plugin-1.0.0.tar.gz
```

Or from local:
```
/plugin install /path/to/my-plugin-1.0.0.tar.gz
```

---

## Debugging Plugins

### Enable debug logging
```bash
export AI_CLI_DEBUG=plugin
```

### Check plugin logs
```bash
cat ~/.config/ai-cli/logs/plugins/weather.log
```

### Reload plugin
```
/plugin disable weather
/plugin enable weather
```

---

## Best Practices

1. **Error handling:** Always catch errors and return user-friendly messages
2. **Async operations:** Use `async/await`, don't block
3. **State management:** Use `ctx.getConfig/setConfig` for persistence
4. **Logging:** Use `ctx.log()` for debugging
5. **Permissions:** Don't access files outside allowed directories
6. **Network:** Respect timeouts, handle rate limits
7. **Documentation:** Include README with examples
8. **Versioning:** Follow semver, specify version in manifest
9. **Security:** Never log secrets, validate inputs
10. **Testing:** Write tests for your plugin

---

## Plugin Registry (Optional)

Host a plugin registry:

`registry.json`:
```json
{
  "plugins": [
    {
      "name": "weather",
      "version": "1.0.0",
      "description": "Weather forecasts",
      "download": "https://example.com/weather-1.0.0.tar.gz",
      "homepage": "https://github.com/you/weather",
      "author": "You",
      "license": "MIT"
    }
  ]
}
```

Users browse:
```
/plugin browse
```

Install from registry:
```
/plugin install weather
```

---

## API Reference

### Types

```typescript
// Plugin manifest
interface PluginManifest {
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

// Plugin command
interface PluginCommand {
  name: string
  description: string
  aliases?: string[]
  args?: string
  run: (args: string, context: CommandContext) => Promise<string | MessagePart[]>
}

// Plugin context (see above for full interface)
interface PluginContext {
  manifest: PluginManifest
  registerCommand: (command: PluginCommand) => void
  unregisterCommand: (name: string) => void
  getConfig: (key?: string) => unknown
  setConfig: (key: string, value: unknown) => Promise<void>
  sendMessage: (text: string) => Promise<MessagePart[]>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  listFiles: (path: string) => Promise<string[]>
  deleteFile: (path: string) => Promise<void>
  executeCommand: (cmd: string) => Promise<string>
  onEvent: <T>(event: PluginEventType, handler: PluginEventHandler<T>) => PluginEventSubscription
  emitEvent: <T>(event: PluginEventType, data?: T) => void
  log: (message: string, level?: LogLevel) => void
  cwd: string
  env: NodeJS.ProcessEnv
}

// Event types
type PluginEventType =
  | 'message:before'
  | 'message:after'
  | 'command:before'
  | 'command:after'
  | 'command:error'
  | 'plugin:load'
  | 'plugin:unload'
  | 'theme:change'
  | 'config:change'
  | 'error'

type PluginEventHandler<T = unknown> = (data: T) => void | Promise<void>

interface PluginEventSubscription {
  event: PluginEventType
  handler: PluginEventHandler
  unsubscribe: () => void
}

// Plugin definition
interface Plugin {
  manifest: PluginManifest
  commands?: PluginCommand[]
  onLoad?: (context: PluginContext) => Promise<void> | void
  onUnload?: (context: PluginContext) => Promise<void> | void
}
```

---

## Troubleshooting

### Plugin not loading
- Check `manifest.json` is valid JSON
- Ensure `index.js` exists and is JavaScript (not TypeScript unless using ts-node)
- Check permissions: `chmod 755 index.js`
- View logs: `~/.config/ai-cli/logs/plugins/{name}.log`
- Ensure plugin exports correctly (default export or named `plugin`/`Plugin`)

### Command not found
- Plugin must be enabled: `/plugin enable {name}`
- Command name must match exactly (case-sensitive)
- Restart ai-cli after installing
- Check plugin loaded successfully: `/plugins`

### Events not firing
- Event names are case-sensitive
- Handler must be function: `(data) => {}`
- Plugin must be loaded before events fire
- Subscribe in `onLoad`, not at module top level

### State not persisting
- Use `ctx.getConfig/setConfig` not module variables
- State file must be writable: `~/.config/ai-cli/plugins-state.json`
- Don't store large data in state (keep < 1MB)
- Call `await ctx.setConfig()` to persist

### Import errors
- Use relative imports within plugin directory
- Don't import from ai-cli internal paths (they may change)
- Bundle dependencies or use Bun's built-in modules
- For npm packages, install them alongside plugin or use Bun's package manager

---

## Examples Repository

Check out the official plugin examples:
https://github.com/minimino1/ai-cli-plugins

Includes:
- `weather` - OpenWeatherMap integration
- `jira` - Jira issue management
- `todo` - Todo list manager
- `translate` - Translation via AI
- `currency` - Currency conversion
- `qr` - QR code generator
- `github` - GitHub API integration
- `notion` - Notion database access

---

## Getting Help

- **Plugin API:** See `src/plugins/types.ts` in ai-cli source
- **Examples:** https://github.com/minimino1/ai-cli-plugins
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)

---

## Advanced: Plugin with File Watcher

```typescript
export default {
  manifest: {
    name: 'auto-reload',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'watch',
      description: 'Watch file for changes and run command',
      args: '<file> <command>',
      run: async (args, ctx) => {
        const [file, ...cmdParts] = args.split(/\s+/)
        const command = cmdParts.join(' ')

        if (!file || !command) {
          return [{ type: 'text', text: 'Usage: /watch <file> <command>' }]
        }

        // Use chokidar or similar (would need to be bundled)
        ctx.log(`Watching ${file} for changes...`)

        return [{ type: 'text', text: `Watching ${file}. Run /unwatch to stop.` }]
      },
    },
    {
      name: 'unwatch',
      description: 'Stop watching files',
      run: async () => {
        // Stop watchers
        return [{ type: 'text', text: 'Stopped watching files' }]
      },
    },
  ],

  onLoad: async (ctx) => {
    ctx.log('Auto-reload plugin loaded')
  },
}
```

---

## Advanced: Plugin that Modifies Commands

```typescript
export default {
  manifest: {
    name: 'command-shortcuts',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    // Register custom command
    ctx.registerCommand({
      name: 'mycmd',
      description: 'My custom command',
      run: async (args, ctx) => {
        // Do something
        return [{ type: 'text', text: `Ran with: ${args}` }]
      },
    })

    ctx.log('Command shortcuts loaded')
  },

  onUnload: async (ctx) => {
    ctx.log('Command shortcuts unloaded')
  },
}
```

---

## Advanced: Plugin with AI Integration

```typescript
export default {
  manifest: {
    name: 'summarizer',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'summarize',
      description: 'Summarize text or file',
      args: '[text|file]',
      run: async (args, ctx) => {
        let text = args

        // Check if argument is a file path
        if (args && await ctx.readFile(args).catch(() => null)) {
          text = await ctx.readFile(args)
        }

        if (!text) {
          return [{ type: 'text', text: 'Usage: /summarize <text or file>' }]
        }

        // Use AI to summarize
        const result = await ctx.sendMessage(`Summarize this:\n\n${text.slice(0, 4000)}`)
        return result
      },
    },
  ],
}
```

---

## Advanced: Plugin that Listens to All Commands

```typescript
export default {
  manifest: {
    name: 'command-logger',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    ctx.onEvent('command:before', (data) => {
      ctx.log(`Executing: /${data.command} ${data.args}`, 'info')
    })

    ctx.onEvent('command:after', (data) => {
      ctx.log(`Completed: /${data.command}`, 'info')
    })

    ctx.onEvent('command:error', (data) => {
      ctx.log(`Error in /${data.command}: ${data.error}`, 'error')
    })
  },
}
```

---

## Advanced: Plugin with Configuration UI

While ai-cli doesn't have a built-in config UI, you can create interactive config setup:

```typescript
{
  name: 'setup-wizard',
  description: 'Interactive setup wizard',
  run: async (args, ctx) => {
    const steps = [
      'Enter your API key:',
      'Enter your default city:',
      'Choose units (metric/imperial):',
    ]

    let config = {}
    for (const step of steps) {
      // In a real TUI plugin, you'd use ink components
      // For now, just log
      ctx.log(step)
    }

    return [{ type: 'text', text: 'Setup complete!' }]
  },
}
```

---

## Advanced: Plugin that Extends Existing Commands

```typescript
export default {
  manifest: {
    name: 'git-enhancer',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    // Listen to git commands and add extra info
    ctx.onEvent('command:after', async (data) => {
      if (data.command === 'git' && data.args?.startsWith('commit')) {
        ctx.log('Consider adding a JIRA ticket ID in commit message', 'info')
      }
    })
  },
}
```

---

## Advanced: Multi-file Plugin

For complex plugins, split into multiple files:

```
my-plugin/
├── manifest.json
├── index.ts
├── commands/
│   ├── cmd1.ts
│   └── cmd2.ts
├── utils/
│   └── api.ts
└── README.md
```

`index.ts`:
```typescript
import { manifest } from './manifest.json'
import { cmd1 } from './commands/cmd1'
import { cmd2 } from './commands/cmd2'

export const manifest = manifest

export default {
  manifest,
  commands: [cmd1, cmd2],
  onLoad: async (ctx) => {
    ctx.log('Complex plugin loaded')
  },
}
```

Compile with:
```bash
bun build index.ts --outdir .
```

---

## Advanced: Plugin Dependencies

Declare dependencies in manifest:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "chalk": "^5.3.0"
  }
}
```

Install dependencies in plugin directory:
```bash
cd ~/.config/ai-cli/plugins/my-plugin
bun add axios chalk
```

---

## Advanced: Hot Reloading

Plugins are automatically reloaded when files change (if file watching is enabled):

```typescript
// No special code needed - the loader watches plugin files
// When you edit and save index.ts, the plugin will be reloaded
```

---

## Advanced: Plugin that Provides Theme

Plugins can install custom themes:

```typescript
export default {
  manifest: {
    name: 'theme-solarized',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    const theme = {
      name: 'solarized',
      colors: {
        background: '#002b36',
        foreground: '#839496',
        primary: '#268bd2',
        // ... more colors
      },
    }

    // Write theme to themes directory
    const themePath = `${process.env.HOME}/.config/ai-cli/themes/solarized.json`
    await ctx.writeFile(themePath, JSON.stringify(theme, null, 2))

    ctx.log('Solarized theme installed. Use: /theme solarized')
  },
}
```

---

## Advanced: Plugin that Modifies Config

```typescript
export default {
  manifest: {
    name: 'config-preset',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'preset-dev',
      description: 'Apply development preset',
      run: async (args, ctx) => {
        await ctx.setConfig('settings.maxTokens', 2048)
        await ctx.setConfig('settings.temperature', 0.3)
        await ctx.setConfig('activeProvider', 'ollama')

        return [{ type: 'text', text: 'Development preset applied!' }]
      },
    },
  ],
}
```

---

## Advanced: Plugin with Background Tasks

```typescript
export default {
  manifest: {
    name: 'background-sync',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    // Start background task
    const interval = setInterval(async () => {
      try {
        const data = await fetchData()
        await ctx.setConfig('lastSync', Date.now())
        ctx.log('Background sync completed')
      } catch (error) {
        ctx.log(`Background sync failed: ${error}`, 'error')
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    ctx.log('Background sync started (every 5 minutes)')
  },

  onUnload: async (ctx) => {
    // Clean up
    clearInterval(interval)
    ctx.log('Background sync stopped')
  },
}
```

---

## Advanced: Plugin that Intercepts Messages

```typescript
export default {
  manifest: {
    name: 'message-filter',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    ctx.onEvent('message:before', async (data) => {
      // Add prefix to all messages
      if (data.text) {
        data.text = '[Custom] ' + data.text
      }
    })

    ctx.log('Message filter active')
  },
}
```

---

## Advanced: Plugin that Adds Custom Message Parts

```typescript
{
  name: 'rich-output',
  description: 'Add rich formatting to AI responses',
  run: async (args, ctx) => {
    const result = await ctx.sendMessage('Explain quantum computing')

    // Transform result
    return result.map(part => {
      if (part.type === 'text') {
        return {
          type: 'text',
          text: part.text + '\n\n---\n*Generated by ai-cli*',
        }
      }
      return part
    })
  },
}
```

---

## Advanced: Plugin that Works with Sessions

```typescript
export default {
  manifest: {
    name: 'session-exporter',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'export-session',
      description: 'Export session to markdown',
      run: async (args, ctx) => {
        const sessions = await ctx.listFiles(`${process.env.HOME}/.config/ai-cli/sessions`)
        // Export logic...
        return [{ type: 'text', text: 'Session exported' }]
      },
    },
  ],
}
```

---

## Advanced: Plugin that Integrates with External APIs

```typescript
import https from 'https'

export default {
  manifest: {
    name: 'jira',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'jira',
      description: 'Jira operations',
      args: '[list|info] [issue-key]',
      run: async (args, ctx) => {
        const [cmd, issueKey] = args.split(/\s+/)
        const token = ctx.getConfig('jiraToken')

        if (!token) {
          return [{ type: 'text', text: 'Set Jira token: /export plugins.jira.token "AT..."' }]
        }

        if (cmd === 'list') {
          // Fetch issues
          const response = await fetch('https://your-domain.atlassian.net/rest/api/3/search', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await response.json()
          return [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        }

        return [{ type: 'text', text: 'Usage: /jira list' }]
      },
    },
  ],
}
```

---

## Advanced: Plugin with Caching

```typescript
const cache = new Map<string, { data: any; expires: number }>()

export default {
  manifest: {
    name: 'cached-api',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    // Load cache from disk
    const cached = await ctx.readFile(`${process.env.HOME}/.config/ai-cli/plugins-cache.json`).catch(() => '{}')
    const cacheData = JSON.parse(cached)

    for (const [key, value] of Object.entries(cacheData)) {
      if (value.expires > Date.now()) {
        cache.set(key, value)
      }
    }
  },

  onUnload: async (ctx) => {
    // Save cache to disk
    const cacheData: Record<string, any> = {}
    for (const [key, value] of cache.entries()) {
      cacheData[key] = value
    }
    await ctx.writeFile(
      `${process.env.HOME}/.config/ai-cli/plugins-cache.json`,
      JSON.stringify(cacheData, null, 2)
    )
  },
}
```

---

## Advanced: Plugin that Provides Multiple Commands

```typescript
const commands = [
  {
    name: 'weather',
    description: 'Get weather',
    run: async (args, ctx) => {
      // Implementation
      return [{ type: 'text', text: 'Weather: 72°F, Sunny' }]
    },
  },
  {
    name: 'forecast',
    description: 'Get 5-day forecast',
    run: async (args, ctx) => {
      // Implementation
      return [{ type: 'text', text: 'Forecast: ...' }]
    },
  },
  {
    name: 'alerts',
    description: 'Show weather alerts',
    run: async (args, ctx) => {
      // Implementation
      return [{ type: 'text', text: 'No alerts' }]
    },
  },
]

export default {
  manifest: {
    name: 'weather-plus',
    version: '1.0.0',
  },
  commands,
}
```

---

## Advanced: Plugin with TypeScript Types

For better developer experience, define types:

```typescript
interface WeatherConfig {
  apiKey: string
  units: 'metric' | 'imperial'
  defaultCity: string
}

export default {
  manifest: {
    name: 'typed-weather',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    const config: WeatherConfig = {
      apiKey: ctx.getConfig('apiKey') || '',
      units: (ctx.getConfig('units') as 'metric' | 'imperial') || 'metric',
      defaultCity: ctx.getConfig('defaultCity') || 'London',
    }

    ctx.log(`Loaded with config: ${JSON.stringify(config, null, 2)}`)
  },
}
```

---

## Advanced: Plugin that Uses External Libraries

```typescript
// Install dependency: bun add axios

import axios from 'axios'

export default {
  manifest: {
    name: 'api-client',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'api',
      description: 'Make API request',
      args: '<url>',
      run: async (args, ctx) => {
        try {
          const response = await axios.get(args)
          return [{
            type: 'code',
            language: 'json',
            code: JSON.stringify(response.data, null, 2)
          }]
        } catch (error: any) {
          return [{ type: 'text', text: `Error: ${error.message}` }]
        }
      },
    },
  ],
}
```

---

## Advanced: Plugin that Modifies Input

```typescript
export default {
  manifest: {
    name: 'input-enhancer',
    version: '1.0.0',
  },

  onLoad: async (ctx) => {
    ctx.onEvent('message:before', (data) => {
      // Auto-capitalize first letter
      if (data.text) {
        data.text = data.text.charAt(0).toUpperCase() + data.text.slice(1)
      }
    })
  },
}
```

---

## Advanced: Plugin that Adds Custom Themes

```typescript
const customTheme = {
  name: 'my-theme',
  colors: {
    background: '#1a1a1a',
    foreground: '#e0e0e0',
    primary: '#00ff00',
    secondary: '#0088ff',
    accent: '#ff00ff',
    error: '#ff4444',
    warning: '#ffaa00',
    success: '#44ff44',
    info: '#4444ff',
    muted: '#888888',
    border: '#333333',
    header: '#222222',
    highlight: '#2a2a2a',
    selection: '#004400',
  },
}

export default {
  manifest: {
    name: 'theme-installer',
    version: '1.0.0',
  },

  commands: [
    {
      name: 'install-theme',
      description: 'Install custom theme',
      run: async (args, ctx) => {
        const themeDir = `${process.env.HOME}/.config/ai-cli/themes`
        await ctx.writeFile(`${themeDir}/my-theme.json`, JSON.stringify(customTheme, null, 2))
        return [{ type: 'text', text: 'Theme installed! Use: /theme my-theme' }]
      },
    },
  ],
}
```

---

## Getting Help

- **Plugin API:** See `src/plugins/types.ts` in ai-cli source
- **Examples:** https://github.com/minimino1/ai-cli-plugins
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)
