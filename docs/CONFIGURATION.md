# Configuration Guide

ai-cli is configured through a JSON configuration file and environment variables. This guide covers all configuration options.

## Config File Location

**Default locations (checked in order):**
1. `~/.config/ai-cli/config.json` (Linux/macOS/Termux)
2. `$AI_CLI_HOME/config.json` (custom location)
3. `./ai-cli-config.json` (local directory)

**Example paths:**
```bash
# Linux/macOS
~/.config/ai-cli/config.json

# Termux (Android)
/data/data/com.termux/files/home/.config/ai-cli/config.json

# Custom location
export AI_CLI_HOME="/path/to/config"
# Then config is at: /path/to/config/config.json
```

## Minimal Config

At minimum, you need to configure an AI provider:

```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "meta/llama-3.3-70b-instruct",
      "apiKey": "nv-..."
    }
  ],
  "activeProvider": "nvidia"
}
```

## Complete Config Schema

```json
{
  "providers": [
    {
      "id": "string",
      "name": "string",
      "apiUrl": "string",
      "model": "string",
      "apiKey": "string (optional)"
    }
  ],
  "activeProvider": "string",
  "theme": "string (optional, default: 'dark')",
  "plugins": {
    "enabled": ["string"],
    "directory": "string (optional)",
    "autoLoad": "boolean (optional, default: true)"
  },
  "settings": {
    "maxTokens": "number (optional, default: 4096)",
    "temperature": "number (optional, default: 0.7)",
    "topP": "number (optional, default: 0.9)",
    "stream": "boolean (optional, default: false)",
    "timeout": "number (optional, default: 30000)",
    "retries": "number (optional, default: 3)",
    "historySize": "number (optional, default: 1000)",
    "autoSaveInterval": "number (optional, default: 60)",
    "editor": "string (optional, default: 'nano')",
    "pager": "string (optional, default: 'less')",
    "confirmDestructive": "boolean (optional, default: true)",
    "showIcons": "boolean (optional, default: true)",
    "showHidden": "boolean (optional, default: false)",
    "maxDepth": "number (optional, default: 10)",
    "ignorePatterns": ["string"]
  }
}
```

---

## Provider Configuration

### NVIDIA

NVIDIA's NIM API provides access to Llama, Nemotron, and other models.

**Required fields:**
- `id` - Provider identifier (use `nvidia`)
- `name` - Display name (e.g., `NVIDIA`)
- `apiUrl` - API endpoint (default: `https://integrate.api.nvidia.com/v1/chat/completions`)
- `model` - Model ID (e.g., `meta/llama-3.3-70b-instruct`, `gemma3n-e4b-it-q4`)
- `apiKey` - NVIDIA API key (optional but recommended)

**Example:**
```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "meta/llama-3.3-70b-instruct",
      "apiKey": "nv-xxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "activeProvider": "nvidia"
}
```

**Get API key:**
1. Visit https://build.nvidia.com
2. Sign in / create account
3. Navigate to your desired model
4. Click "Generate API Key"
5. Add to config

**Popular models:**
- `meta/llama-3.3-70b-instruct` - Llama 3.3 70B
- `meta/llama-3.1-8b-instruct` - Llama 3.1 8B
- `mistralai/mixtral-8x7b-instruct-v0.1` - Mixtral 8x7B
- `google/gemma-2-27b-it` - Gemma 2 27B
- `gemma3n-e4b-it-q4` - Gemma 3N (lightweight)

---

### OpenAI

OpenAI's GPT-4o, GPT-4o-mini, o1-preview, and other models.

**Required fields:**
- `id` - `openai`
- `name` - `OpenAI`
- `apiUrl` - `https://api.openai.com/v1/chat/completions` (default)
- `model` - Model ID (e.g., `gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o1-mini`)
- `apiKey` - OpenAI API key

**Example:**
```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "apiUrl": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-4o",
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "activeProvider": "openai"
}
```

**Get API key:**
1. Visit https://platform.openai.com
2. API Keys → Create new secret key
3. Copy and add to config

**Popular models:**
- `gpt-4o` - Latest flagship (fast, capable, cheaper)
- `gpt-4o-mini` - Lightweight, fast, inexpensive
- `o1-preview` - Advanced reasoning (slower, more expensive)
- `o1-mini` - Compact reasoning model
- `gpt-4-turbo` - Previous generation

---

### Anthropic

Anthropic's Claude models: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku.

**Required fields:**
- `id` - `anthropic`
- `name` - `Anthropic`
- `apiUrl` - `https://api.anthropic.com/v1/messages` (default)
- `model` - Model ID (e.g., `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`)
- `apiKey` - Anthropic API key

**Example:**
```json
{
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic",
      "apiUrl": "https://api.anthropic.com/v1/messages",
      "model": "claude-sonnet-4-20250514",
      "apiKey": "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "activeProvider": "anthropic"
}
```

**Get API key:**
1. Visit https://console.anthropic.com
2. API Keys → Create Key
3. Copy and add to config

**Popular models:**
- `claude-sonnet-4-20250514` - Claude Sonnet 4 (latest)
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet (v2)
- `claude-3-5-sonnet-20240620` - Claude 3.5 Sonnet (v1)
- `claude-3-opus-20240229` - Claude 3 Opus (most capable)
- `claude-3-haiku-20240307` - Claude 3 Haiku (fastest)

---

### Ollama

Local models via Ollama (no API key required). Runs entirely on your machine.

**Required fields:**
- `id` - `ollama`
- `name` - `Ollama`
- `apiUrl` - `http://localhost:11434/api/chat` (default)
- `model` - Model name (e.g., `llama3.2`, `codellama`, `mistral`, `phi3`)

**Example:**
```json
{
  "providers": [
    {
      "id": "ollama",
      "name": "Ollama",
      "apiUrl": "http://localhost:11434/api/chat",
      "model": "llama3.2"
    }
  ],
  "activeProvider": "ollama"
}
```

**Setup:**
1. Install Ollama from https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve` (runs automatically on startup)
4. Configure ai-cli with provider above

**Popular models:**
- `llama3.2` - Latest Llama (3B and 1B variants)
- `llama3.1` - Previous Llama (8B, 70B, 405B)
- `codellama` - Code-specialized Llama
- `mistral` - Mistral AI's 7B model
- `mixtral` - Mixtral 8x7B MoE
- `phi3` - Microsoft's Phi-3 (3.8B)
- `gemma2` - Google's Gemma 2 (2B, 9B, 27B)
- `qwen2` - Alibaba's Qwen 2 (0.5B to 72B)

**Note:** Ollama models are automatically pulled when first used if available.

---

## Multiple Providers

You can configure multiple providers and switch between them:

```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "meta/llama-3.3-70b-instruct",
      "apiKey": "nv-..."
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "apiUrl": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-4o",
      "apiKey": "sk-..."
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "apiUrl": "https://api.anthropic.com/v1/messages",
      "model": "claude-sonnet-4-20250514",
      "apiKey": "sk-ant-..."
    },
    {
      "id": "ollama",
      "name": "Ollama (Local)",
      "apiUrl": "http://localhost:11434/api/chat",
      "model": "llama3.2"
    }
  ],
  "activeProvider": "nvidia"
}
```

Switch providers in ai-cli:
```
/provider openai
/provider ollama
```

---

## Theme Configuration

Set the default theme:

```json
{
  "theme": "dark"
}
```

**Available themes:**
- `dark` - Dark with orange accents (default)
- `light` - Light with blue accents
- `midnight` - Deep blue/purple night theme
- `ocean` - Teal/cyan ocean colors
- `forest` - Green nature theme
- `sunset` - Orange/purple sunset
- `neon` - Bright cyberpunk neon

Change theme in ai-cli: `/theme ocean`

---

## Plugin Configuration

Configure plugin system:

```json
{
  "plugins": {
    "enabled": ["weather", "jira"],
    "directory": "~/.config/ai-cli/plugins",
    "autoLoad": true
  }
}
```

**Fields:**
- `enabled` - List of plugin names to auto-enable on startup
- `directory` - Plugin installation directory (default: `~/.config/ai-cli/plugins`)
- `autoLoad` - Automatically load plugins on startup (default: `true`)

**Note:** Plugins are also managed via `/plugin` commands.

---

## Settings

Fine-tune ai-cli behavior:

```json
{
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

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxTokens` | number | 4096 | Maximum tokens in AI response |
| `temperature` | number | 0.7 | AI creativity (0-1). Lower = more focused, higher = more creative |
| `topP` | number | 0.9 | Nucleus sampling (0-1). Controls diversity |
| `stream` | boolean | false | Stream AI responses in real-time |
| `timeout` | number | 30000 | Request timeout in milliseconds |
| `retries` | number | 3 | Number of retries for failed requests |
| `historySize` | number | 1000 | Maximum command history entries |
| `autoSaveInterval` | number | 60 | Auto-save interval for sessions (seconds) |
| `editor` | string | `nano` | External editor command for `/edit` |
| `pager` | string | `less` | Pager for long output |
| `confirmDestructive` | boolean | true | Ask for confirmation before destructive operations |
| `showIcons` | boolean | true | Show file type icons in listings |
| `showHidden` | boolean | false | Show hidden files (starting with `.`) |
| `maxDepth` | number | 10 | Maximum depth for `/tree` command |
| `ignorePatterns` | string[] | `["node_modules", ".git", "dist", "build"]` | Glob patterns to ignore in file operations |

---

## Environment Variables

### AI_CLI_HOME
Override config directory.

```bash
export AI_CLI_HOME="/path/to/config"
```
Config file will be at `$AI_CLI_HOME/config.json`.

---

### AI_CLI_THEME
Set default theme (overrides config file).

```bash
export AI_CLI_THEME="neon"
```

---

### AI_CLI_PROVIDER
Set default provider (overrides config file).

```bash
export AI_CLI_PROVIDER="openai"
```

---

### EDITOR
External editor for `/edit` command.

```bash
export EDITOR="vim"
export EDITOR="code --wait"
export EDITOR="nano"
```

---

### NO_COLOR
Disable colored output.

```bash
export NO_COLOR=1
```

---

### TERM
Terminal type (auto-detected). Usually not needed to set manually.

---

## Provider-Specific Configuration

### Custom API Endpoints

For self-hosted or compatible APIs, customize `apiUrl`:

```json
{
  "providers": [
    {
      "id": "custom",
      "name": "My Custom Provider",
      "apiUrl": "http://localhost:8000/v1/chat/completions",
      "model": "my-model",
      "apiKey": "optional-key"
    }
  ],
  "activeProvider": "custom"
}
```

Ensure the provider implements OpenAI-compatible chat completions API.

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
  "activeProvider": "ollama"
}
```

---

## Troubleshooting

### Config not loading
- Check file permissions: `chmod 600 ~/.config/ai-cli/config.json`
- Validate JSON: `jq . ~/.config/ai-cli/config.json` or use any JSON validator
- Check `AI_CLI_HOME` environment variable
- Ensure directory exists: `~/.config/ai-cli/`

### Provider errors
- Verify API key is correct (no extra spaces)
- Check network connectivity
- Ensure model ID is valid for the provider
- Check rate limits on provider dashboard
- For Ollama: ensure service is running (`ollama serve`)

### Theme not applying
- Theme name must be valid (dark, light, midnight, ocean, forest, sunset, neon)
- Restart ai-cli after changing config
- Check for typos in theme name

### Plugins not loading
- Plugin directory exists and is readable
- `manifest.json` is valid JSON
- Plugin is enabled in config or via `/plugin enable`
- Check plugin logs: `~/.config/ai-cli/logs/plugins/`

### Sessions not saving
- Sessions directory exists: `~/.config/ai-cli/sessions/`
- Directory is writable
- Disk space available

---

## Default Configuration

If no config exists, ai-cli uses these defaults:

```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "gemma3n-e4b-it-q4"
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "apiUrl": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-4o"
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "apiUrl": "https://api.anthropic.com/v1/messages",
      "model": "claude-sonnet-4-20250514"
    },
    {
      "id": "ollama",
      "name": "Ollama",
      "apiUrl": "http://localhost:11434/api/chat",
      "model": "llama3.2"
    }
  ],
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
- Provider config structure changed from nested object to array
- Plugin system rewritten
- Session storage moved to `~/.config/ai-cli/sessions/`

**Migration:**
```bash
# Backup old config
mv ~/.ai-cli.json ~/.ai-cli.json.backup

# Start ai-cli to generate new config
./ai-cli

# Manually migrate settings from old config
# Copy provider API keys, theme, etc. to new config format
```

---

## Advanced Configuration

### Custom Providers

Add self-hosted or compatible providers:

```json
{
  "providers": [
    {
      "id": "local-llm",
      "name": "Local LLM",
      "apiUrl": "http://localhost:5000/v1/chat/completions",
      "model": "my-model-v1",
      "apiKey": ""
    }
  ]
}
```

The API must implement OpenAI's chat completions endpoint format.

---

### Environment Variable Override

You can override any config field with environment variables:

```bash
export AI_CLI_PROVIDER="openai"
export AI_CLI_THEME="neon"
```

These take precedence over config file.

---

### Per-Project Config

Place `ai-cli-config.json` in project directory for project-specific settings:

```json
{
  "activeProvider": "ollama",
  "theme": "dark",
  "settings": {
    "maxTokens": 2048
  }
}
```

ai-cli will automatically use this when running in that directory.

---

## Configuration Validation

Validate your config:

```bash
# Check JSON syntax
jq . ~/.config/ai-cli/config.json

# Test with ai-cli (it will report errors)
./ai-cli --validate-config
```

---

## Getting Help

- **Config reference:** This document
- **Command help:** `/help` in ai-cli
- **Command docs:** `docs/COMMANDS.md`
- **Plugin docs:** `docs/PLUGINS.md`
- **Theme docs:** `docs/THEMES.md`
- **Issues:** https://github.com/minimino1/ai-cli/issues
- **Discord:** [Join our Discord](https://discord.gg/ai-cli)

---

## Quick Start Template

Copy this minimal config to get started:

```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "meta/llama-3.3-70b-instruct",
      "apiKey": "YOUR_NVIDIA_API_KEY"
    }
  ],
  "activeProvider": "nvidia",
  "theme": "dark"
}
```

Or use Ollama (no API key):

```json
{
  "providers": [
    {
      "id": "ollama",
      "name": "Ollama",
      "apiUrl": "http://localhost:11434/api/chat",
      "model": "llama3.2"
    }
  ],
  "activeProvider": "ollama",
  "theme": "dark"
}
```

Then run: `ollama pull llama3.2`
