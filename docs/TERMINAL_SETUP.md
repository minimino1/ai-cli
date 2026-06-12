# Terminal Setup Guide

This guide covers setting up ai-cli on different platforms, including Termux (Android), Debian/Ubuntu Linux, and macOS. It also covers PATH configuration and shell integration tips.

## Table of Contents

- [Termux (Android)](#termux-android)
- [Debian/Ubuntu Linux](#debianubuntu-linux)
- [macOS](#macos)
- [PATH Configuration](#path-configuration)
- [Shell Integration](#shell-integration)
- [Terminal Emulator Recommendations](#terminal-emulator-recommendations)
- [Troubleshooting](#troubleshooting)

---

## Termux (Android)

Termux is a terminal emulator and Linux environment for Android. ai-cli works great on Termux with proper setup.

### Prerequisites

1. **Install Termux** from F-Droid (recommended) or Google Play Store
   - F-Droid version is more up-to-date: https://f-droid.org/en/packages/com.termux/

2. **Update packages:**
   ```bash
   pkg update && pkg upgrade
   ```

3. **Install required dependencies:**
   ```bash
   pkg install git curl unzip
   ```

### Install Bun

Bun is the recommended runtime for ai-cli.

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or manually:
# curl -fsSL https://bun.sh/install | bash

# Restart Termux or source your shell config:
source ~/.bashrc
# or
source ~/.zshrc
```

**Verify installation:**
```bash
bun --version
# Should output something like: bun-v1.1.0
```

### Clone and Build ai-cli

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Build the binary
bun run build

# Run ai-cli
./ai-cli
```

### Optional: Install to System Location

To make `ai-cli` available from anywhere:

```bash
# Copy binary to ~/bin (or /data/data/com.termux/files/usr/bin)
mkdir -p ~/bin
cp ai-cli ~/bin/

# Add ~/bin to PATH in ~/.bashrc or ~/.zshrc:
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Now you can run from anywhere:
ai-cli
```

### Termux-Specific Tips

- **Storage access:** To access files outside Termux's private directory:
  ```bash
  termux-setup-storage
  ```
  This creates `~/storage/shared` for accessing photos, downloads, etc.

- **Persistent storage:** Termux's home directory is preserved across app restarts.

- **Performance:** Use `bun run build --compile` for a native binary that starts faster.

- **API keys:** Store in `~/.config/ai-cli/config.json` as described in CONFIGURATION.md.

---

## Debian/Ubuntu Linux

ai-cli works on any modern Linux distribution. Here's setup for Debian-based systems.

### Prerequisites

1. **Update system:**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **Install required tools:**
   ```bash
   sudo apt install -y git curl unzip build-essential
   ```

### Install Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or use the official install script:
# curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH (the installer should do this automatically)
# If not, add to ~/.bashrc or ~/.zshrc:
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Verify:**
```bash
bun --version
```

### Install ai-cli

```bash
# Clone repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Build
bun run build

# Run
./ai-cli
```

### System-Wide Installation (Optional)

```bash
# Create system directory (requires sudo)
sudo mkdir -p /usr/local/bin

# Copy binary
sudo cp ai-cli /usr/local/bin/

# Set permissions
sudo chmod +x /usr/local/bin/ai-cli

# Now ai-cli is available everywhere
ai-cli --help
```

### Using apt (Alternative)

If you prefer package management, you can create a simple .deb package:

```bash
# Install fpm (if you want to package)
sudo apt install -y ruby ruby-dev rubygems build-essential
sudo gem install --no-document fpm

# Package ai-cli
fpm -s dir -t deb -n ai-cli -v 1.0.0 ai-cli=/usr/local/bin/

# Install
sudo dpkg -i ai-cli_1.0.0_amd64.deb
```

---

## macOS

macOS setup is straightforward with Homebrew or manual installation.

### Prerequisites

1. **Install Xcode Command Line Tools** (if not already installed):
   ```bash
   xcode-select --install
   ```

2. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

### Install Bun

```bash
# Using Homebrew:
brew install bun

# Or using the install script:
curl -fsSL https://bun.sh/install | bash
```

**Verify:**
```bash
bun --version
```

### Install ai-cli

```bash
# Clone repository
git clone https://github.com/minimino1/ai-cli.git
cd ai-cli

# Install dependencies
bun install

# Build
bun run build

# Run
./ai-cli
```

### Homebrew Cask (Future)

Once ai-cli is published to Homebrew, you can install with:

```bash
brew install ai-cli
```

### macOS-Specific Tips

- **iTerm2:** Recommended for best color support and features
- **Brew services:** If using Ollama, install with `brew install ollama` and start with `brew services start ollama`
- **Security:** macOS may warn about unsigned binaries. Allow in System Preferences > Security & Privacy if needed.

---

## PATH Configuration

Proper PATH configuration ensures ai-cli and its dependencies are found.

### Check Current PATH

```bash
echo $PATH
```

### Add Directories to PATH

#### Bash (Linux/macOS)

Edit `~/.bashrc` or `~/.bash_profile`:

```bash
# Add Bun to PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Add ai-cli binary directory
export PATH="$HOME/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
```

Then:
```bash
source ~/.bashrc
```

#### Zsh (macOS/Linux)

Edit `~/.zshrc`:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/bin:$PATH"
```

Then:
```bash
source ~/.zshrc
```

#### Fish Shell

Edit `~/.config/fish/config.fish`:

```fish
set -gx BUN_INSTALL $HOME/.bun
set -gx PATH $BUN_INSTALL/bin $PATH
set -gx PATH $HOME/bin $PATH
```

#### Windows (PowerShell)

Edit `$PROFILE`:

```powershell
$env:BUN_INSTALL = "$HOME\.bun"
$env:Path = "$env:BUN_INSTALL\bin;$env:Path"
$env:Path = "$HOME\bin;$env:Path"
```

### Verify PATH

```bash
which bun
which ai-cli
```

Both should return full paths.

---

## Shell Integration

ai-cli works as a standalone application, but you can integrate it with your shell for a better experience.

### Shell Aliases

Add to your shell config (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Short alias
alias ai='ai-cli'

# Quick review of current directory
alias aireview='ai-cli -c "/review $(pwd)"'

# Quick file browse
alias aibrowse='ai-cli -c "/browse $(pwd)"'
```

### Shell Functions

More complex integrations:

```bash
# Function to review last git diff
function aireview-diff() {
  git diff HEAD | ai-cli -c "/review -"
}

# Function to explain a command's output
function aiexplain() {
  "$@" 2>&1 | ai-cli -c "/explain -"
}

# Function to fix code in current directory
function aifix() {
  find . -name "*.ts" -o -name "*.js" -o -name "*.py" | head -20 | xargs ai-cli -c "/fix"
}
```

### Prompt Integration

Add ai-cli status to your prompt (Zsh example):

```bash
# In ~/.zshrc
function ai_cli_prompt() {
  if [ -f "ai-cli-session.json" ]; then
    echo "%F{blue}[ai]%f "
  fi
}
PROMPT='$(ai_cli_prompt)'$PROMPT
```

### Auto-start on Directory Change (Optional)

Automatically start ai-cli when entering certain directories:

```bash
# In ~/.bashrc or ~/.zshrc
function cd() {
  builtin cd "$@" || return
  if [ -f ".ai-cli-auto" ]; then
    ai-cli &
  fi
}
```

---

## Terminal Emulator Recommendations

ai-cli uses Ink and requires a terminal with true color support (24-bit color).

### Recommended Terminals

| Platform | Terminal | Notes |
|----------|----------|-------|
| Linux | Kitty | Excellent performance, GPU-accelerated |
| Linux | Alacritty | Fast, cross-platform |
| Linux | WezTerm | Modern, feature-rich |
| Linux | GNOME Terminal | Good, built-in |
| macOS | iTerm2 | Feature-rich, excellent color support |
| macOS | Terminal.app | Built-in, works fine |
| Android | Termux | Full Linux environment |
| Windows | Windows Terminal | Modern, good color support |
| Windows | WSL + any Linux terminal | Best experience |

### Minimum Requirements

- **Color:** 24-bit true color (RGB)
- **Unicode:** Full Unicode support (including box-drawing characters)
- **Font:** Monospace font with good character coverage
- **Size:** Minimum 80x24 recommended

### Enable True Color

Most modern terminals enable true color automatically. If colors look wrong:

**Kitty/Alacritty/WezTerm:** Already enabled.

**iTerm2:**
1. Preferences > Profiles > Colors
2. Set "Minimum contrast" to normal
3. Ensure "Allow 24-bit color" is checked

**GNOME Terminal:**
```bash
# Add to ~/.bashrc
export COLORTERM=truecolor
```

**macOS Terminal:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export COLORTERM=truecolor
```

---

## Troubleshooting

### "bun: command not found"

**Cause:** Bun not in PATH

**Fix:** Add to shell config:
```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
source ~/.bashrc  # or ~/.zshrc
```

### "Permission denied" when running ai-cli

**Cause:** Binary not executable

**Fix:**
```bash
chmod +x ai-cli
```

### Colors not displaying correctly

**Cause:** Terminal doesn't support true color

**Fix:** Use a terminal that supports 24-bit color (see recommendations above). Test with:
```bash
curl -s https://raw.githubusercontent.com/termstandard/colors/master/24-bit-color.sh | bash
```

### "Cannot find module 'ink'"

**Cause:** Dependencies not installed

**Fix:**
```bash
cd ~/ai-cli
bun install
```

### Slow startup

**Cause:** Running from source (bun run dev) is slower than compiled binary

**Fix:** Use compiled binary:
```bash
bun run build
./ai-cli
```

### API errors

**Cause:** API key not set or invalid

**Fix:** Check config:
```bash
cat ~/.config/ai-cli/config.json
```

Ensure API key is correct and provider is online.

### Termux: "Operation not permitted"

**Cause:** Termux sandbox restrictions

**Fix:** Use `termux-setup-storage` to grant storage permissions, or keep files within Termux's home directory.

### Ollama connection refused

**Cause:** Ollama not running

**Fix:**
```bash
# Start Ollama
ollama serve

# In another terminal, test:
curl http://localhost:11434/api/tags
```

### PATH issues after installing Bun

**Cause:** Shell not reloaded after Bun installation

**Fix:**
```bash
# Either restart terminal, or:
source ~/.bashrc  # or ~/.zshrc, ~/.config/fish/config.fish, etc.
```

### "Command not found" after copying ai-cli to bin

**Cause:** ~/bin not in PATH

**Fix:** Add to shell config:
```bash
export PATH="$HOME/bin:$PATH"
```

---

## Testing Your Setup

After installation, verify everything works:

```bash
# 1. Check Bun
bun --version

# 2. Check ai-cli
./ai-cli --version  # or ai-cli --version if installed

# 3. Test config
cat ~/.config/ai-cli/config.json | python3 -m json.tool

# 4. Run ai-cli
./ai-cli

# 5. Test a simple command
# In ai-cli, type: /help
# Should show command list

# 6. Test provider
# Type: /provider
# Should show current provider and available options

# 7. Test file operations
# Type: /ls
# Should list files
```

If all tests pass, you're ready to use ai-cli!

---

## Next Steps

- Read [COMMANDS.md](COMMANDS.md) for complete command reference
- Read [CONFIGURATION.md](CONFIGURATION.md) to configure providers and themes
- Check [README.md](../README.md) for general usage information

---

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/minimino1/ai-cli/issues)
2. Open a new issue with:
   - Platform and version
   - Terminal emulator
   - Error messages
   - Steps to reproduce
3. Join the discussion (if there's a Discord/community link)
