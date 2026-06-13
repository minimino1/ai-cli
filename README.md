<div align="center">

# 🛠️ ai-cli

**AI-powered CLI tool with beautiful TUI**

[![Bun](https://img.shields.io/badge/Bun-1.0+-ff5804?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

</div>

---

## ✨ Features

| Category | Features |
|----------|----------|
| 🤖 **AI Providers** | NVIDIA, OpenAI, Anthropic, Ollama |
| 💬 **50+ Commands** | Review, Explain, Fix, Git, Shell, Network, System, Dev Tools |
| 🎨 **Theme System** | 7 built-in themes (dark, light, midnight, ocean, forest, sunset, neon) |
| 🔌 **Plugin System** | Load custom plugins from ~/.config/ai-cli/plugins/ |
| 📁 **File Explorer** | Interactive file browser with search and preview |
| ✏️ **Full-Screen Editor** | Edit files directly in the TUI |
| 📊 **Session History** | Auto-save and restore chat sessions |
| 🌐 **Network Tools** | HTTP client, DNS lookup, ping, port scanner, SSL checker |
| 🔧 **Dev Tools** | JSON formatter, Base64, Hash, UUID, Regex, Unit converter |
| 💻 **System Monitor** | CPU, RAM, disk, processes, real-time monitoring |
| 🌴 **Termux Support** | Full Android/Termux integration |

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Build
bun build src/index.tsx --compile --outfile ai-cli

# Run
./ai-cli
```

### First Run

```bash
# Start with default NVIDIA provider
./ai-cli

# Or configure a provider first
export OPENAI_API_KEY="your-key-here"
```

## 📖 Commands

### AI Commands
| Command | Description |
|---------|-------------|
| `/review [file]` | Review code for bugs and best practices |
| `/explain [file]` | Explain how code works |
| `/fix [file]` | Fix issues in code |

### File Commands
| Command | Description |
|---------|-------------|
| `/file <path>` | Show file with syntax highlighting |
| `/edit <file>` | Open file in full-screen editor |
| `/browse [path]` | Interactive file explorer |
| `/tree [path]` | Directory tree view |
| `/diff <f1> <f2>` | Compare two files |

### Git Commands
| Command | Description |
|---------|-------------|
| `/git status` | Show working tree status |
| `/git diff` | Show changes |
| `/git log` | Show commit history |
| `/git commit -m "msg"` | Commit changes |
| `/git stash` | Stash changes |
| `/git blame <file>` | Line-by-line blame |
| `/git stats` | Repository statistics |

### Network Commands
| Command | Description |
|---------|-------------|
| `/http GET <url>` | HTTP request |
| `/dns <domain>` | DNS lookup |
| `/ping <host>` | Ping host |
| `/ports <host>` | Scan ports |
| `/ssl <host>` | SSL certificate info |

### Dev Tools
| Command | Description |
|---------|-------------|
| `/json format <str>` | Format JSON |
| `/json validate <str>` | Validate JSON |
| `/base64 encode <str>` | Base64 encode |
| `/hash <algo> <str>` | Generate hash |
| `/uuid` | Generate UUID |
| `/regex test <pat> <str>` | Test regex |
| `/convert <val> <from> <to>` | Unit conversion |

### System Commands
| Command | Description |
|---------|-------------|
| `/sysinfo` | Full system information |
| `/top [n]` | Top N processes |
| `/df` | Disk usage |
| `/free` | Memory usage |
| `/monitor` | Real-time monitoring |

### Session Commands
| Command | Description |
|---------|-------------|
| `/sessions` | List saved sessions |
| `/save [title]` | Save current session |
| `/load <id>` | Load a session |
| `/delete <id>` | Delete a session |

### Settings
| Command | Description |
|---------|-------------|
| `/provider [name]` | Switch AI provider |
| `/theme [name]` | Switch theme |
| `/themes` | List available themes |
| `/plugins` | List plugins |
| `/plugin install <url>` | Install plugin |
| `/alias name=cmd` | Create command alias |
| `/help` | Show all commands |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+C` | Exit |
| `Escape` | Clear input / Close modal |
| `Tab` | Autocomplete |

## 🎨 Themes

7 built-in themes:

| Theme | Colors |
|-------|--------|
| `dark` | Dark background, orange accents (default) |
| `light` | Light background, blue accents |
| `midnight` | GitHub dark, blue accents |
| `ocean` | Deep blue, teal accents |
| `forest` | Dark green, lime accents |
| `sunset` | Warm red, orange accents |
| `neon` | Black background, neon colors |

```bash
/theme midnight    # Switch theme
/themes           # List all themes
/theme preview ocean  # Preview a theme
```

## 🔌 Plugins

```bash
/plugin install https://github.com/user/my-plugin  # Install from URL
/plugin install ./my-plugin                          # Install from path
/plugins                                             # List installed
/plugin enable my-plugin                            # Enable
/plugin disable my-plugin                           # Disable
```

### Creating Plugins

Create `~/.config/ai-cli/plugins/my-plugin.ts`:

```typescript
import type { PluginContext } from 'ai-cli/plugins/api'

export const manifest = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
}

export async function onLoad(ctx: PluginContext) {
  ctx.registerCommand({
    name: 'hello',
    description: 'Say hello',
    run: async () => [{ type: 'text', text: 'Hello from my plugin!' }],
  })
  ctx.log('Plugin loaded!')
}
```

## ⚙️ Configuration

Config file: `~/.config/ai-cli/config.json`

```json
{
  "providers": [
    {
      "id": "nvidia",
      "name": "NVIDIA",
      "apiUrl": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "gemma3n-e4b-it-q4"
    }
  ],
  "activeProvider": "nvidia",
  "theme": "dark"
}
```

## 📱 Termux Setup

```bash
# Install Termux from F-Droid
# Then run:
/termux setup

# Or manually:
pkg install nodejs bun git
```

## 🛠️ Development

```bash
bun install              # Install dependencies
bun run dev              # Development mode
bun test                 # Run tests
bun build src/index.tsx --compile --outfile ai-cli  # Build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ using TypeScript + Ink + Bun
</div>
