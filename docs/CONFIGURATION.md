# Configuration Guide

This guide covers all configuration options for ai-cli, including provider setup, theme customization, and environment variables.

## Table of Contents

- [Configuration File](#configuration-file)
- [Provider Configuration](#provider-configuration)
  - [NVIDIA](#nvidia)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [Ollama](#ollama)
- [Environment Variables](#environment-variables)
- [Theme Customization](#theme-customization)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)

---

## Configuration File

ai-cli uses a JSON configuration file located at:

**Linux/macOS:** `~/.config/ai-cli/config.json`

**Windows:** `%APPDATA%\ai-cli\config.json`

If the file doesn't exist, ai-cli will use default settings. You can create it manually or use the `/export` command to set values.

### Basic Structure

```json
{
  "default_provider": "nvidia",
  "default_model": "gemma3n-e4b-it-q4",
  "providers": {
    "nvidia": {
      "api_key": "your-api-key",
      "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "gemma3n-e4b-it-q4"
    }
  }
}
```

### Configuration Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `default_provider` | string | No | Provider ID to use on startup (default: `nvidia`) |
| `default_model` | string | No | Default model for the provider (provider-specific) |
| `providers` | object | No | Provider configurations (see below) |
| `theme` | object | No | UI theme customization |
| `session_auto_save_interval` | number | No | Auto-save interval in seconds (default: 60) |
| `max_history` | number | No | Maximum chat messages to keep in context (default: 100) |
| `editor` | object | No | Editor configuration |
| `shell` | object | No | Shell configuration |

---

## Provider Configuration

ai-cli supports multiple AI providers through a unified interface. Each provider requires specific configuration.

### Provider IDs

| ID | Name | Description |
|----|------|-------------|
| `nvidia` | NVIDIA NIM | NVIDIA's Inference Microservices |
| `openai` | OpenAI | OpenAI GPT models |
| `anthropic` | Anthropic | Anthropic Claude models |
| `ollama` | Ollama | Local LLM server |

### Common Provider Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | string | Conditional | API key (not required for Ollama) |
| `base_url` | string | No | API endpoint URL (defaults to provider's standard URL) |
| `model` | string | No | Default model for this provider |
| `timeout` | number | No | Request timeout in milliseconds (default: 60000) |
| `max_tokens` | number | No | Maximum tokens in response (default: 4096) |
| `temperature` | number | No | Sampling temperature 0-2 (default: 0.7) |

---

### NVIDIA

NVIDIA's NIM (NVIDIA Inference Microservices) provides access to various models through the NVIDIA API Catalog.

**Default Configuration:**
```json
{
  "providers": {
    "nvidia": {
      "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "gemma3n-e4b-it-q4"
    }
  }
}
```

**Required:**
- `api_key` - Get from [NVIDIA API Catalog](https://catalog.ngc.nvidia.com/)

**Optional Fields:**
- `base_url` - Usually not needed unless using a custom endpoint
- `model` - Override default model (see available models below)

**Available Models:**
- `gemma3n-e4b-it-q4` (default) - Google Gemma 3N 4B Instruct
- `meta/llama3-70b-instruct` - Meta Llama 3 70B Instruct
- `mistralai/mixtral-8x7b-instruct-v0.1` - Mixtral 8x7B Instruct
- `microsoft/phi-3-mini-4k-instruct` - Phi-3 Mini 4K Instruct
- See [NVIDIA API Catalog](https://catalog.ngc.nvidia.com/) for full list

**Example:**
```json
{
  "providers": {
    "nvidia": {
      "api_key": "nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "model": "meta/llama3-70b-instruct",
      "max_tokens": 8192,
      "temperature": 0.8
    }
  }
}
```

---

### OpenAI

OpenAI provides GPT models through their API.

**Default Configuration:**
```json
{
  "providers": {
    "openai": {
      "base_url": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-4"
    }
  }
}
```

**Required:**
- `api_key` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)

**Optional Fields:**
- `base_url` - Use for Azure OpenAI or custom proxies
- `model` - Any GPT model (gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.)

**Available Models:**
- `gpt-4` (default) - GPT-4
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4o` - GPT-4o (recommended)
- `gpt-3.5-turbo` - GPT-3.5 Turbo (faster, cheaper)
- `o1-preview` / `o1-mini` - OpenAI o1 reasoning models

**Example:**
```json
{
  "providers": {
    "openai": {
      "api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "model": "gpt-4o",
      "max_tokens": 16384,
      "temperature": 0.7
    }
  }
}
```

**Azure OpenAI:**
```json
{
  "providers": {
    "openai": {
      "api_key": "your-azure-api-key",
      "base_url": "https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview",
      "model": "gpt-4"
    }
  }
}
```

---

### Anthropic

Anthropic provides Claude models with strong safety and reasoning capabilities.

**Default Configuration:**
```json
{
  "providers": {
    "anthropic": {
      "base_url": "https://api.anthropic.com/v1/messages",
      "model": "claude-3-opus"
    }
  }
}
```

**Required:**
- `api_key` - Get from [Anthropic Console](https://console.anthropic.com/)

**Optional Fields:**
- `base_url` - Usually not needed
- `model` - Any Claude model

**Available Models:**
- `claude-3-opus` (default) - Claude 3 Opus (most capable)
- `claude-3-sonnet` - Claude 3 Sonnet (balanced)
- `claude-3-haiku` - Claude 3 Haiku (fastest)
- `claude-3-5-sonnet` - Claude 3.5 Sonnet (latest)
- `claude-2.1` - Claude 2.1 (legacy)

**Example:**
```json
{
  "providers": {
    "anthropic": {
      "api_key": "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "model": "claude-3-5-sonnet-20241022",
      "max_tokens": 8192,
      "temperature": 0.7
    }
  }
}
```

---

### Ollama

Ollama runs LLMs locally, providing privacy and no API costs.

**Default Configuration:**
```json
{
  "providers": {
    "ollama": {
      "base_url": "http://localhost:11434/api/chat",
      "model": "llama2"
    }
  }
}
```

**Required:**
- None (runs locally)

**Optional Fields:**
- `base_url` - Change if Ollama runs on different port/host
- `model` - Any model pulled with `ollama pull`

**Setup:**
1. Install [Ollama](https://ollama.ai/) for your platform
2. Start Ollama service: `ollama serve`
3. Pull a model: `ollama pull llama2` (or `llama3`, `mistral`, `codellama`, etc.)
4. Configure ai-cli to use the model

**Available Models:**
- `llama2` (default) - Meta's Llama 2
- `llama3` - Meta's Llama 3
- `mistral` - Mistral AI's Mistral
- `codellama` - Meta's Code Llama
- `neural-chat` - Neural Chat
- See [Ollama Library](https://ollama.ai/library) for full list

**Example:**
```json
{
  "providers": {
    "ollama": {
      "base_url": "http://localhost:11434/api/chat",
      "model": "codellama:7b",
      "max_tokens": 4096,
      "temperature": 0.7
    }
  }
}
```

---

## Environment Variables

Environment variables override config file settings and are useful for temporary configuration or keeping secrets out of files.

### Provider API Keys

| Variable | Provider | Description |
|----------|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA | NVIDIA API key |
| `OPENAI_API_KEY` | OpenAI | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic | Anthropic API key |

**Example:**
```bash
export OPENAI_API_KEY="sk-xxxxxxxx"
./ai-cli
```

### Debug Mode

| Variable | Description |
|----------|-------------|
| `AI_CLI_DEBUG` | Enable debug logging (set to `1` or `true`) |

**Example:**
```bash
export AI_CLI_DEBUG=1
./ai-cli
```

### Session Directory

| Variable | Description | Default |
|----------|-------------|---------|
| `XDG_DATA_HOME` | Base directory for session storage | `~/.local/share` |

Session files are stored at `$XDG_DATA_HOME/ai-cli/sessions/`.

**Example:**
```bash
export XDG_DATA_HOME="/mnt/storage/data"
./ai-cli
```

---

## Theme Customization

ai-cli uses Ink's styling system with a theme object that controls colors and appearance.

### Theme Schema

```json
{
  "theme": {
    "primary": "#60a5fa",
    "secondary": "#a78bfa",
    "success": "#34d399",
    "warning": "#fbbf24",
    "error": "#f87171",
    "background": "#111827",
    "foreground": "#f9fafb",
    "sidebar": "#1f2937",
    "border": "#374151",
    "codeBackground": "#1e293b",
    "input": "#374151",
    "inputFocused": "#4b5563"
  }
}
```

### Color Format

Colors can be specified as:
- Hex: `#60a5fa`
- RGB: `rgb(96, 165, 250)`
- Named: `blue`, `red`, `green` (limited set)

### Theme Fields

| Field | Description | Default |
|-------|-------------|---------|
| `primary` | Primary accent color (buttons, highlights) | `#60a5fa` (blue) |
| `secondary` | Secondary accent color | `#a78bfa` (purple) |
| `success` | Success messages and indicators | `#34d399` (green) |
| `warning` | Warning messages | `#fbbf24` (yellow) |
| `error` | Error messages | `#f87171` (red) |
| `background` | Main background | `#111827` (dark gray) |
| `foreground` | Main text color | `#f9fafb` (light gray) |
| `sidebar` | Sidebar background | `#1f2937` (gray) |
| `border` | Borders and dividers | `#374151` (medium gray) |
| `codeBackground` | Code block background | `#1e293b` (dark blue-gray) |
| `input` | Input field background | `#374151` |
| `inputFocused` | Input field when focused | `#4b5563` |

### Example Theme

**Nord Theme:**
```json
{
  "theme": {
    "primary": "#81a1c1",
    "secondary": "#b48ead",
    "success": "#a3be8c",
    "warning": "#ebcb8b",
    "error": "#bf616a",
    "background": "#2e3440",
    "foreground": "#d8dee9",
    "sidebar": "#3b4252",
    "border": "#4c566a",
    "codeBackground": "#3b4252",
    "input": "#434c5e",
    "inputFocused": "#4c566a"
  }
}
```

**Solarized Light:**
```json
{
  "theme": {
    "primary": "#268bd2",
    "secondary": "#6c71c4",
    "success": "#859900",
    "warning": "#b58900",
    "error": "#dc322f",
    "background": "#fdf6e3",
    "foreground": "#657b83",
    "sidebar": "#eee8d5",
    "border": "#93a1a1",
    "codeBackground": "#eee8d5",
    "input": "#eee8d5",
    "inputFocused": "#fdf6e3"
  }
}
```

---

## Configuration Examples

### Minimal Configuration

Only set your preferred provider and API key:

```json
{
  "default_provider": "openai",
  "providers": {
    "openai": {
      "api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  }
}
```

### Multiple Providers

Configure multiple providers and switch between them:

```json
{
  "default_provider": "nvidia",
  "providers": {
    "nvidia": {
      "api_key": "nvapi-xxxxxxxx",
      "model": "meta/llama3-70b-instruct"
    },
    "openai": {
      "api_key": "sk-xxxxxxxx",
      "model": "gpt-4o"
    },
    "anthropic": {
      "api_key": "sk-ant-xxxxxxxx",
      "model": "claude-3-5-sonnet-20241022"
    },
    "ollama": {
      "base_url": "http://localhost:11434/api/chat",
      "model": "codellama:7b"
    }
  }
}
```

### Production Configuration

Optimized for heavy usage:

```json
{
  "default_provider": "openai",
  "default_model": "gpt-4o",
  "session_auto_save_interval": 300,
  "max_history": 200,
  "providers": {
    "openai": {
      "api_key": "sk-xxxxxxxx",
      "model": "gpt-4o",
      "max_tokens": 16384,
      "temperature": 0.7,
      "timeout": 120000
    }
  },
  "editor": {
    "tab_size": 2,
    "insert_spaces": true,
    "line_wrapping": false
  },
  "shell": {
    "default_shell": "bash",
    "confirm_dangerous_commands": true
  }
}
```

### Custom Theme

Dark theme with purple accents:

```json
{
  "default_provider": "nvidia",
  "providers": {
    "nvidia": {
      "api_key": "nvapi-xxxxxxxx"
    }
  },
  "theme": {
    "primary": "#c084fc",
    "secondary": "#f0abfc",
    "success": "#4ade80",
    "warning": "#fbbf24",
    "error": "#f87171",
    "background": "#0f172a",
    "foreground": "#f1f5f9",
    "sidebar": "#1e293b",
    "border": "#334155",
    "codeBackground": "#1e293b",
    "input": "#334155",
    "inputFocused": "#475569"
  }
}
```

---

## Troubleshooting

### Config File Not Loading

**Check:** Config file exists at correct location
```bash
ls ~/.config/ai-cli/config.json
```

**Fix:** Create the file if missing:
```bash
mkdir -p ~/.config/ai-cli
cat > ~/.config/ai-cli/config.json << 'EOF'
{
  "default_provider": "nvidia",
  "providers": {
    "nvidia": {
      "api_key": "your-api-key"
    }
  }
}
EOF
```

### Provider Not Working

**Check:** API key is set correctly
```bash
/env | grep -i api_key
```

**Fix:** Set via config or environment variable:
```bash
export OPENAI_API_KEY="sk-xxxxx"
# or edit ~/.config/ai-cli/config.json
```

### Theme Not Applying

**Check:** JSON syntax is valid
```bash
cat ~/.config/ai-cli/config.json | python3 -m json.tool
```

**Fix:** Ensure all color values are valid hex/rgb/named colors. Invalid colors fall back to defaults.

### Ollama Connection Failed

**Check:** Ollama is running
```bash
curl http://localhost:11434/api/tags
```

**Fix:** Start Ollama:
```bash
ollama serve
# In another terminal:
ollama pull llama2
```

### Config Changes Not Taking Effect

**Check:** ai-cli was restarted after config change

**Fix:** Exit and restart ai-cli. Config is loaded only at startup.

---

## Advanced Configuration

### Editor Settings

```json
{
  "editor": {
    "tab_size": 2,
    "insert_spaces": true,
    "line_wrapping": false,
    "line_numbers": true,
    "auto_indent": true,
    "trim_trailing_whitespace": true
  }
}
```

### Shell Settings

```json
{
  "shell": {
    "default_shell": "bash",
    "confirm_dangerous_commands": true,
    "dangerous_patterns": [
      "rm -rf /",
      "dd if=",
      "mkfs"
    ],
    "timeout": 30000
  }
}
```

### Session Settings

```json
{
  "session_auto_save_interval": 60,
  "max_history": 100,
  "session_dir": "~/.local/share/ai-cli/sessions"
}
```

---

## Migrating from Older Versions

If you're upgrading from an earlier version of ai-cli:

1. **Backup your config:**
   ```bash
   cp ~/.config/ai-cli/config.json ~/.config/ai-cli/config.json.backup
   ```

2. **Check for new fields:** Compare your config with the examples above.

3. **Update provider URLs if needed:** Older versions may use different base URLs.

4. **Test configuration:**
   ```bash
   ./ai-cli --test-config
   ```
   (If `--test-config` flag is available)

---

## Getting Help

If you encounter configuration issues:

1. Check this guide and the [README.md](../README.md)
2. Review [COMMANDS.md](COMMANDS.md) for command-specific config
3. Open an issue on GitHub: https://github.com/minimino1/ai-cli/issues

Include your config file (with API keys redacted) and error messages.
