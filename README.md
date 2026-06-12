# ai-cli

AI-powered CLI tool for code assistance with interactive TUI.

## Features

- Interactive TUI with OpenCode-style design
- AI chat with multiple providers (NVIDIA, OpenAI, Anthropic, Ollama)
- Syntax highlighting
- Quick actions (fix, explain, commit, review, test)
- File explorer
- Command palette
- Session history

## Install

```bash
go install github.com/minimino1/ai-cli@latest
```

## Usage

```bash
# Start TUI
ai

# Or with specific provider
ai --provider openai
```

## Config

Config file: `~/.config/ai-cli/config.json`

```json
{
  "default_provider": "nvidia",
  "default_model": "gemma3n-e4b-it-q4",
  "providers": {
    "nvidia": {
      "api_key": "your-api-key"
    }
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| Esc | Quit |
| Tab | Switch panels |
| ? | Help |
| f | Fix code |
| e | Explain |
| c | Commit |
| r | Review |
| t | Test |

## License

MIT
