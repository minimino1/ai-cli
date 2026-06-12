# Configuration Guide

ai-cli is highly configurable through a JSON configuration file and environment variables.

## Config File Location

**Default locations (checked in order):**
1. `~/.config/ai-cli/config.json` (Linux/macOS)
2. `$AI_CLI_HOME/config.json` (custom location)
3. `./ai-cli-config.json` (local directory)

**Example:**
```bash
# Linux/macOS
~/.config/ai-cli/config.json

# Windows
%APPDATA%/ai-cli/config.json

# Custom location
export AI_CLI_HOME="/path/to/config"
```

## Config Schema

```json
{
  "providers": {
    "nvidia": {
      "apiKey": "nv-...",
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "model": "meta/llama-3.3-70b-instruct"
    },
    "openai": {
      "apiKey": "sk-...",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o"
    },
    "anthropic": {
      "apiKey": "sk-ant-...",
      "baseUrl": "https://api.anthropic.com/v1",
      "model": "claude-sonnet-4-20250514"
    },
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.2"
    }
  },
  "activeProvider": "nvidia",
  "theme": "dark",
  "plugins": {
    "enabled": [],
    "directory": "~/.config/ai-cli/plugins",
    "autoLoad": true
  },
  "settings": {
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "stream": false,
    "timeout": 30000,
    "retries": 3,
    "historySize": 1000,
    "autoSaveInterval": 60,
    "editor": "nano",
    "pager": "less",
    "confirmDestructive": true,
    "showIcons": true,
    "showHidden": false,
    "maxDepth": 10,
    "ignorePatterns": ["node_modules", ".git", "dist", "build"]
  }
}
```

## Provider Configuration

### NVIDIA

NVIDIA's NIM API provides access to Llama, Nemotron, and other models.

**Required fields:**
- `apiKey` - NVIDIA API key from https://build.nvidia.com
- `baseUrl` - API endpoint (default: `https://integrate.api.nvidia.com/v1`)
- `model` - Model ID (e.g., `meta/llama-3.3-70b-instruct`)

**Example:**
```json
{
  "providers": {
    "nvidia": {
      "apiKey": "nv-xxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "model": "meta/llama-3.3-70b-instruct"
    }
  },
  "activeProvider": "nvidia"
}
```

**Get API key:**
1. Visit https://build.nvidia.com
2. Sign in / create account
3. Generate API key
4. Add to config

---

### OpenAI

OpenAI's GPT-4, GPT-4o, GPT-4o-mini, and o1 models.

**Required fields:**
- `apiKey` - OpenAI API key
- `baseUrl` - API endpoint (default: `https://api.openai.com/v1`)
- `model` - Model ID (e.g., `gpt-4o`, `gpt-4o-mini`, `o1-preview`)

**Example:**
```json
{
  "providers": {
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o"
    }
  },
  "activeProvider": "openai"
}
```

**Get API key:**
1. Visit https://platform.openai.com
2. API Keys → Create new secret key
3. Add to config

---

### Anthropic

Anthropic's Claude models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku).

**Required fields:**
- `apiKey` - Anthropic API key
- `baseUrl` - API endpoint (default: `https://api.anthropic.com/v1`)
- `model` - Model ID (e.g., `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`)

**Example:**
```json
{
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "https://api.anthropic.com/v1",
      "model": "claude-sonnet-4-20250514"
    }
  },
  "activeProvider": "anthropic"
}
```

**Get API key:**
1. Visit https://console.anthropic.com
2. API Keys → Create Key
3. Add to config

---

### Ollama

Local models via Ollama (no API key required).

**Required fields:**
- `baseUrl` - Ollama server URL (default: `http://localhost:11434`)
- `model` - Model name (e.g., `llama3.2`, `codellama`, `mistral`)

**Example:**
```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.2"
    }
  },
  "activeProvider": "ollama"
}
```

**Setup:**
1. Install Ollama from https://ollama.ai
2. Pull model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve`
4. Configure ai-cli

---

## Theme Configuration

### Built-in Themes

ai-cli includes 7 built-in themes:

| Theme | Description |
|-------|-------------|
| `dark` | Dark background with blue accents (default) |
| `light` | Light background with dark text |
| `midnight` | Deep blue/black with purple accents |
| `ocean` | Teal/cyan ocean colors |
| `forest` | Green nature theme |
| `sunset` | Orange/purple sunset gradient |
| `neon` | Bright neon on black |

**Set theme:**
```bash
/theme dark
```

**Persist in config:**
```json
{
  "theme": "ocean"
}
```

---

### Custom Themes

Create custom themes in `~/.config/ai-cli/themes/`:

**Theme structure:**
```json
{
  "name": "my-theme",
  "colors": {
    "background": "#1a1a1a",
    "foreground": "#e0e0e0",
    "primary": "#00ff00",
    "secondary": "#0088ff",
    "accent": "#ff00ff",
    "error": "#ff4444",
    "warning": "#ffaa00",
    "success": "#44ff44",
    "info": "#4444ff"
  }
}
```

**Theme locations:**
1. `~/.config/ai-cli/themes/{name}.json`
2. `/usr/share/ai-cli/themes/{name}.json`
3. `./themes/{name}.json` (local)

**Load custom theme:**
```
/theme my-theme
```

---

## Plugin Configuration

### Plugin Directory

Default: `~/.config/ai-cli/plugins/`

**Change in config:**
```json
{
  "plugins": {
    "directory": "~/.config/ai-cli/plugins",
    "enabled": [],
    "autoLoad": true
  }
}
```

### Enabling/Disabling Plugins

**Enable plugin:**
```
/plugin enable plugin-name
```

**Disable plugin:**
```
/plugin disable plugin-name
```

**List enabled:**
```
/plugins
```

### Plugin Manifest

Each plugin must have `manifest.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "license": "MIT",
  "main": "index.js",
  "ai-cli": {
    "minVersion": "1.0.0"
  }
}
```

### Plugin API

Plugins can:
- Register custom commands
- Listen to events (message sent, session saved, etc.)
- Access config and state
- Send messages to AI

See `docs/PLUGINS.md` for full plugin development guide.

---

## Environment Variables

### AI_CLI_HOME
Override config directory.

```bash
export AI_CLI_HOME="/path/to/config"
```

### AI_CLI_THEME
Set default theme (overrides config).

```bash
export AI_CLI_THEME="neon"
```

### AI_CLI_PROVIDER
Set default provider (overrides config).

```bash
export AI_CLI_PROVIDER="openai"
```

### EDITOR
External editor for `/edit` command.

```bash
export EDITOR="vim"
export EDITOR="code --wait"
```

### NO_COLOR
Disable colored output.

```bash
export NO_COLOR=1
```

### TERM
Terminal type (auto-detected).

---

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxTokens` | number | 4096 | Maximum tokens in AI response |
| `temperature` | number | 0.7 | AI creativity (0-1) |
| `topP` | number | 0.9 | Nucleus sampling parameter |
| `stream` | boolean | false | Stream AI responses |
| `timeout` | number | 30000 | Request timeout (ms) |
| `retries` | number | 3 | Failed request retries |
| `historySize` | number | 1000 | Max commands in history |
| `autoSaveInterval` | number | 60 | Auto-save interval (seconds) |
| `editor` | string | "nano" | External editor command |
| `pager` | string | "less" | Pager for long output |
| `confirmDestructive` | boolean | true | Confirm before destructive ops |
| `showIcons` | boolean | true | Show file type icons |
| `showHidden` | boolean | false | Show hidden files |
| `maxDepth` | number | 10 | Max depth for /tree |
| `ignorePatterns` | string[] | [...] | Glob patterns to ignore |

---

## Advanced Configuration

### Custom Commands

Add custom commands via plugins or by editing `commands.ts`:

```typescript
{
  name: "mycmd",
  description: "My custom command",
  aliases: ["mc"],
  args: "[input]",
  run: async (args, ctx) => {
    // Command logic
    return [{ type: "text", text: `Ran with ${args.join(" ")}` }];
  }
}
```

### Custom Providers

Implement `AIProvider` interface:

```typescript
interface AIProvider {
  id: string;
  name: string;
  send(messages: Message[], provider?: string): Promise<string>;
}
```

Register in `providers/ai.ts` and add to config.

### Custom Themes

Create theme JSON file:

```json
{
  "name": "my-theme",
  "colors": {
    "background": "#0d1117",
    "foreground": "#c9d1d9",
    "primary": "#58a6ff",
    "secondary": "#8b949e",
    "accent": "#f78166",
    "error": "#f85149",
    "warning": "#d29922",
    "success": "#3fb950",
    "info": "#58a6ff"
  }
}
```

Place in `~/.config/ai-cli/themes/` and load with `/theme my-theme`.

---

## Troubleshooting

### Config not loading
- Check file permissions: `chmod 600 ~/.config/ai-cli/config.json`
- Validate JSON: `jq . ~/.config/ai-cli/config.json`
- Check `AI_CLI_HOME` env var

### Provider errors
- Verify API key is correct
- Check network connectivity
- Ensure model ID is valid for provider
- Check rate limits

### Theme not applying
- Theme name must match file name (without .json)
- Check theme file is valid JSON
- Restart ai-cli after adding new theme files

### Plugins not loading
- Plugin directory exists and is readable
- `manifest.json` is valid
- Plugin is enabled in config or via `/plugin enable`
- Check plugin logs: `~/.config/ai-cli/plugins/.logs/`

### Session not saving
- Sessions directory exists: `~/.config/ai-cli/sessions/`
- Directory is writable
- Disk space available

---

## Default Config

If no config exists, ai-cli uses these defaults:

```json
{
  "providers": {
    "nvidia": {
      "baseUrl": "https://integrate.api.nvidia.com/v1",
      "model": "meta/llama-3.3-70b-instruct"
    }
  },
  "activeProvider": "nvidia",
  "theme": "dark",
  "plugins": {
    "enabled": [],
    "directory": "~/.config/ai-cli/plugins",
    "autoLoad": true
  },
  "settings": {
    "maxTokens": 4096,
    "temperature": 0.7,
    "topP": 0.9,
    "stream": false,
    "timeout": 30000,
    "retries": 3,
    "historySize": 1000,
    "autoSaveInterval": 60,
    "editor": "nano",
    "pager": "less",
    "confirmDestructive": true,
    "showIcons": true,
    "showHidden": false,
    "maxDepth": 10,
    "ignorePatterns": ["node_modules", ".git", "dist", "build", "coverage", ".next", ".nuxt"]
  }
}
```

---

## Migrating from Older Versions

### v0.x → v1.0
- Config moved from `~/.ai-cli.json` to `~/.config/ai-cli/config.json`
- Provider config structure changed
- Plugin system rewritten
- Session storage moved to `~/.config/ai-cli/sessions/`

**Migration:**
```bash
# Backup old config
mv ~/.ai-cli.json ~/.ai-cli.json.backup

# Start ai-cli to generate new config
ai-cli

# Manually migrate settings from old config
```

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables or config with restricted permissions
2. **Set config permissions** - `chmod 600 ~/.config/ai-cli/config.json`
3. **Use separate keys** - Different keys for development/production
4. **Rotate keys regularly** - Especially for shared accounts
5. **Review plugin sources** - Only install plugins from trusted sources
6. **Enable 2FA** - For provider accounts (OpenAI, Anthropic, NVIDIA)
7. **Monitor usage** - Check provider dashboards for unexpected usage

---

## Performance Tuning

### Reduce latency
```json
{
  "settings": {
    "maxTokens": 1024,
    "stream": true,
    "timeout": 15000
  }
}
```

### Improve quality
```json
{
  "settings": {
    "temperature": 0.3,
    "topP": 0.95,
    "maxTokens": 8192
  }
}
```

### Reduce costs
```json
{
  "settings": {
    "maxTokens": 2048,
    "temperature": 0.5
  },
  "activeProvider": "ollama"  // Use local model
}
```

---

## Getting Help

- **Commands:** `/help` or see `docs/COMMANDS.md`
- **Plugins:** `docs/PLUGINS.md`
- **Themes:** `docs/THEMES.md`
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)
