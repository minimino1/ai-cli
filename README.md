# ai-cli 🤖

AI-powered CLI for code assistance - fix, explain, review, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)
[![Platforms](https://img.shields.io/badge/Platforms-Termux%20%7C%20Debian%20%7C%20WSL-blue.svg)]()

## Features

- 🔧 **Fix** - Fix code errors and bugs
- 📖 **Explain** - Understand code with detailed explanations
- 💬 **Commit** - Generate meaningful commit messages
- 🔍 **Review** - Code review with security/performance analysis
- 🧪 **Test** - Generate comprehensive tests
- 🐚 **Shell** - Generate shell scripts
- 🗄️ **SQL** - Generate SQL queries from natural language
- ⚠️ **Error** - Translate error messages
- 📚 **Docs** - Generate documentation
- ♻️ **Refactor** - Improve code quality

## Supported AI Providers

| Provider | Models | Free Tier |
|----------|--------|-----------|
| **Ollama** | Llama 3.2, CodeLlama, etc. | ✅ Local |
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 | ❌ |
| **Anthropic** | Claude 3.5 Sonnet | ❌ |
| **NVIDIA NIM** | Nemotron, Llama | ✅ |

## Installation

### From Source (Recommended)

```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build
git clone https://github.com/yourusername/ai-cli.git
cd ai-cli
cargo build --release

# Install
cargo install --path .
```

### From Debian Package

```bash
# Download and install
wget https://github.com/yourusername/ai-cli/releases/latest/download/ai-cli.deb
sudo dpkg -i ai-cli.deb
```

### For Termux

```bash
# Install dependencies
pkg install rust binutils

# Clone and build
git clone https://github.com/yourusername/ai-cli.git
cd ai-cli
cargo build --release

# Move to PATH
cp target/release/ai $PREFIX/bin/
```

## Quick Start

### 1. Configure

```bash
# Initialize config
ai config init

# Set your preferred provider
ai config set default_provider ollama

# For cloud providers, add API key
ai config apikey openai --key YOUR_API_KEY
```

### 2. Start Using

```bash
# Fix a file
ai fix src/main.rs

# Explain code
ai explain src/utils.rs

# Generate commit message
git add .
ai commit

# Review code
ai review src/

# Generate tests
ai test src/lib.rs
```

## Commands

### `ai fix` - Fix Code Errors

```bash
# Fix a specific file
ai fix src/main.rs

# Fix with error context
ai fix "TypeError: cannot read property 'map'"

# Fix staged changes
git add .
ai fix
```

### `ai explain` - Explain Code

```bash
# Explain a file
ai explain src/main.rs

# Explain specific lines
ai explain src/main.rs --lines 10-20

# Explain with examples
ai explain src/utils.rs --examples
```

### `ai commit` - Generate Commit Messages

```bash
# Generate from staged changes
ai commit

# Specify type
ai commit --type feat

# With scope
ai commit --scope auth

# Auto-commit
ai commit --auto
```

### `ai review` - Code Review

```bash
# Review staged changes
ai review

# Security-focused review
ai review --scope security

# Performance review
ai review --scope performance

# Review specific file
ai review src/main.rs
```

### `ai test` - Generate Tests

```bash
# Generate unit tests
ai test src/lib.rs

# Generate integration tests
ai test src/api.rs --type integration

# Include edge cases
ai test src/utils.rs --edge-cases
```

### `ai shell` - Generate Shell Scripts

```bash
# Generate bash script
ai shell "backup my home directory"

# Generate zsh script
ai shell "monitor disk usage" --shell zsh

# Generate and make executable
ai shell "organize downloads" --executable
```

### `ai sql` - Generate SQL Queries

```bash
# Generate from description
ai sql "find all users who signed up last week"

# With schema
ai sql "average order value by country" --schema schema.sql

# Specific database
ai sql "active users" --database postgres
```

### `ai error` - Translate Errors

```bash
# Explain an error
ai error "TypeError: undefined is not a function"

# With language context
ai error "Segfault at 0x0" --language c

# With fix suggestions
ai error "Cannot find module" --fix
```

### `ai docs` - Generate Documentation

```bash
# Generate README
ai docs --type readme

# Generate API docs
ai docs src/api.rs --type api

# Generate inline docs
ai docs src/lib.rs --type inline
```

### `ai refactor` - Refactor Code

```bash
# General refactoring
ai refactor src/main.rs

# Performance focus
ai refactor src/main.rs --type performance

# Readability focus
ai refactor src/main.rs --type readability

# Apply changes
ai refactor src/main.rs --apply
```

## Configuration

Config file location: `~/.config/ai-cli/config.toml`

```toml
default_provider = "ollama"
default_model = "llama3.2"

[providers.openai]
api_key = "sk-..."
model = "gpt-4o"

[providers.anthropic]
api_key = "sk-ant-..."
model = "claude-3-5-sonnet"

[providers.ollama]
base_url = "http://localhost:11434"
model = "llama3.2"

[providers.nvidia]
api_key = "nvapi-..."
model = "nvidia/llama-3.1-nemotron-70b-instruct"

[settings]
auto_apply = false
verbose = false
color = true
git_context = true
```

## Custom Templates

```bash
# List templates
ai template list

# Create template
ai template create my-fix --content "Custom fix prompt..."

# Create from file
ai template create my-review --file review-prompt.txt

# Show template
ai template show fix

# Edit template
ai template edit fix
```

## Environment Variables

```bash
# Set API keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export NVIDIA_API_KEY="nvapi-..."

# Ollama host
export OLLAMA_HOST="http://localhost:11434"
```

## Platforms

- ✅ **Termux** (Android)
- ✅ **Debian/Ubuntu**
- ✅ **Windows (WSL)**
- ✅ **macOS** (not officially supported but should work)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [clap](https://github.com/clap-rs/clap) - CLI argument parser
- [reqwest](https://github.com/seanmonstar/reqwest) - HTTP client
- [tokio](https://github.com/tokio-rs/tokio) - Async runtime
- [git2](https://github.com/rust-lang/git2-rs) - Git bindings
