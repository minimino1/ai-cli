# ai-cli

[![Bun](https://img.shields.io/badge/Bun-typed?logo=bun&logoColor=white&color=FBF0FF)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/minimino1/ai-cli?color=blue)](LICENSE)

AI-powered CLI tool for code assistance with an interactive TUI interface. Chat with multiple AI providers, review and fix code, execute commands, and manage files—all from your terminal.

## Features

- **Interactive TUI**: Modern terminal UI built with Ink (React for CLIs)
- **Multi-Provider AI Chat**: Support for NVIDIA, OpenAI, Anthropic, and Ollama
- **Syntax Highlighting**: Beautiful code formatting with language detection
- **Quick Actions**: Review, explain, and fix code with single commands
- **File Explorer**: Browse and select files interactively
- **Command Palette**: Autocomplete slash commands with Tab
- **Session Management**: Auto-save and restore chat sessions
- **Git Integration**: Execute common git operations without leaving the tool
- **Shell Execution**: Run shell commands and code files directly
- **Full-Screen Editor**: Edit files in a dedicated editor mode
- **Diff Viewer**: View code changes with side-by-side diffs
- **Configurable**: JSON-based configuration at `~/.config/ai-cli/config.json`

## Installation

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- Terminal with true color support (iTerm2, Kitty, Alacritty, etc.)

### From Source

```bash
# Clone the repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Build the binary
bun run build

# Run the application
./ai-cli
```

### Using Bun (Development)

```bash
bun run dev
```

## Quick Start

1. **Configure your AI provider** (see Configuration section below)
2. **Launch the application**:
   ```bash
   ./ai-cli
   ```
3. **Start chatting**: Type your message and press Enter
4. **Use slash commands**: Type `/` to see available commands
5. **Navigate**: Use `Ctrl+B` to toggle sidebar, `Tab` for autocomplete

## Screenshot

```
┌─────────────────────────────────────────────────────────────┐
│  ai-cli                                                    │
├──────────────┬─────────────────────────────────────────────┤
│ /help        │ You: How do I read a file in Python?      │
│ /file        │                                              │
│ /ls          │ AI: To read a file in Python, use the     │
│ /review      │ built-in `open()` function...             │
│ /explain     │                                              │
│ /fix         │ [Code block with syntax highlighting]     │
│ /edit        │                                              │
│ /provider    │                                              │
│ /git         │                                              │
│ /sh          │                                              │
│ /run         │                                              │
│ /browse      │                                              │
│ /sessions    │                                              │
│              │                                              │
│              │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

## Slash Commands

All commands start with `/`. Press `/` in the input field to see autocomplete suggestions.

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `h`, `?` | Show available commands |
| `/file` | `cat` | Display file content with syntax highlighting |
| `/ls` | — | List files in current or specified directory |
| `/review` | `rv` | Review code for issues, bugs, and best practices |
| `/explain` | `e` | Explain how code works |
| `/fix` | `f` | Fix issues in code |
| `/edit` | `e` | Open file in full-screen editor |
| `/open` | `view` | View file content (read-only) |
| `/browse` | `b`, `files` | Open interactive file explorer |
| `/provider` | `model` | Switch AI provider |
| `/git` | `g` | Execute git commands (status, diff, log, add, commit, branch) |
| `/sh` | `!`, `shell` | Execute shell command |
| `/run` | `r` | Execute a code file (python, node, go, etc.) |
| `/exec` | `x` | Execute code snippet (experimental) |
| `/cd` | `chdir` | Change working directory |
| `/pwd` | — | Print current working directory |
| `/env` | — | Show environment variables |
| `/export` | `set` | Set environment variable |
| `/alias` | — | Create command alias |
| `/history` | — | Show command history |
| `/clear` | `cls` | Clear chat history |
| `/sessions` | `ls-sessions`, `session-list` | List all saved sessions |
| `/save` | `save-session` | Save current chat session |
| `/load` | `restore` | Load a saved session by ID |
| `/delete` | `rm-session`, `del-session` | Delete a saved session |

### Command Examples

**Review a file:**
```
/review src/app.tsx
```

**Explain code:**
```
/explain src/commands.ts
```

**Fix issues:**
```
/fix src/utils/validation.ts
```

**Execute shell command:**
```
/sh ls -la
```

**Run a Python script:**
```
/run script.py
```

**Execute code snippet:**
```
/exec python print("Hello, World!")
```

**View file:**
```
/open package.json
```

**Browse files:**
```
/browse src/
```

**Git operations:**
```
/git status
/git diff HEAD
/git commit -m "feat: add new feature"
/git add src/
/git log --oneline -10
/git branch
```

**Change directory:**
```
/cd /home/user/projects
```

**Set environment variable:**
```
/export API_KEY=your-key-here
```

**Save session:**
```
/save "Working on feature X"
```

**Load session:**
```
/load session-id-123
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Ctrl+C` | Exit application |
| `Ctrl+B` | Toggle sidebar |
| `Escape` | Clear input / Close file explorer |
| `Tab` | Autocomplete commands |

## Configuration

ai-cli uses a JSON configuration file at `~/.config/ai-cli/config.json`.

### Config File Location

- **Linux/macOS**: `~/.config/ai-cli/config.json`
- **Windows**: `%APPDATA%\ai-cli\config.json`

### Basic Configuration

```json
{
  "default_provider": "nvidia",
  "default_model": "gemma3n-e4b-it-q4",
  "providers": {
    "nvidia": {
      "api_key": "your-nvidia-api-key"
    }
  }
}
```

### Provider Configuration

ai-cli supports multiple AI providers:

#### NVIDIA (NIM)

```json
{
  "providers": {
    "nvidia": {
      "api_key": "your-api-key",
      "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
      "model": "gemma3n-e4b-it-q4"
    }
  }
}
```

**Get API key**: [NVIDIA API Catalog](https://catalog.ngc.nvidia.com/)

#### OpenAI

```json
{
  "providers": {
    "openai": {
      "api_key": "your-openai-api-key",
      "model": "gpt-4"
    }
  }
}
```

**Get API key**: [OpenAI Platform](https://platform.openai.com/api-keys)

#### Anthropic

```json
{
  "providers": {
    "anthropic": {
      "api_key": "your-anthropic-api-key",
      "model": "claude-3-opus"
    }
  }
}
```

**Get API key**: [Anthropic Console](https://console.anthropic.com/)

#### Ollama (Local)

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

**Setup**: Install [Ollama](https://ollama.ai/) and run `ollama pull llama2` (or your preferred model).

### Environment Variables

You can also set API keys via environment variables:

| Variable | Provider | Description |
|----------|----------|-------------|
| `NVIDIA_API_KEY` | NVIDIA | NVIDIA API key |
| `OPENAI_API_KEY` | OpenAI | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic | Anthropic API key |

Environment variables override config file settings.

### Switching Providers

Use the `/provider` command to switch between configured providers:

```
/provider openai
```

Or specify a model:

```
/provider anthropic claude-3-sonnet
```

## Building from Source

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- TypeScript 5+

### Build Steps

```bash
# Clone repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Development mode (hot reload)
bun run dev

# Build for production
bun run build

# The compiled binary will be at: ./ai-cli
```

### Output Binaries

- `ai-cli` - Main CLI binary (recommended)
- `ai` - Alternative binary name

Both are identical; choose based on preference.

## Project Structure

```
ai-cli/
├── src/
│   ├── app.tsx          # Main TUI application
│   ├── commands.ts      # Command definitions and parser
│   ├── index.tsx        # Entry point
│   ├── types.ts         # TypeScript types and interfaces
│   ├── providers/       # AI, Git, Shell, Execute providers
│   ├── components/      # UI components (editor, file-explorer, etc.)
│   ├── history.ts       # Session history management
│   └── theme.ts         # UI theme definitions
├── cmd/                 # Go command integration (experimental)
├── package.json
├── tsconfig.json
├── README.md
└── bun.lock
```

## Architecture

- **UI Framework**: Ink (React components for CLIs)
- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Language**: TypeScript 5+
- **Build**: Bun's native compiler (`--compile` flag)
- **AI Integration**: OpenAI-compatible API client
- **Session Persistence**: JSON files in `~/.local/share/ai-cli/sessions/`

## Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ai-cli.git`
3. Create a branch: `git checkout -b feature/my-feature`
4. Install dependencies: `bun install`
5. Make your changes
6. Test: `bun run dev`
7. Commit: `git commit -m "feat: add new feature"`
8. Push: `git push origin feature/my-feature`
9. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow existing code formatting (Bun's default formatter)
- Add JSDoc comments for public functions
- Keep components small and focused

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting changes (no code change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Reporting Issues

When reporting issues, please include:

1. **Environment**: OS, terminal emulator, Bun version
2. **Steps to reproduce**: Clear, minimal steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Config**: Relevant parts of your config.json (redact API keys)

## License

MIT

## Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- [React](https://react.dev/) - UI library
- All AI providers for their excellent APIs
