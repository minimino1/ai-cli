#!/bin/bash
set -e

# ai-cli installer
# Supports: Debian, Ubuntu, Termux, macOS

echo "🤖 ai-cli installer"
echo "=================="
echo ""

# Detect OS
detect_os() {
    if [[ -n "$TERMUX_VERSION" ]]; then
        echo "termux"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt &> /dev/null; then
            echo "debian"
        elif command -v dnf &> /dev/null; then
            echo "fedora"
        elif command -v pacman &> /dev/null; then
            echo "arch"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "Detected OS: $OS"
echo ""

# Check for Rust
check_rust() {
    if command -v rustc &> /dev/null; then
        echo "✓ Rust is installed ($(rustc --version))"
        return 0
    else
        echo "✗ Rust is not installed"
        return 1
    fi
}

# Install Rust
install_rust() {
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Source cargo env
    source "$HOME/.cargo/env"
    
    echo "✓ Rust installed successfully"
}

# Install dependencies based on OS
install_deps() {
    echo "Installing dependencies..."
    
    case $OS in
        termux)
            pkg update -y
            pkg install -y rust binutils make
            ;;
        debian|ubuntu)
            sudo apt update
            sudo apt install -y build-essential pkg-config libssl-dev
            ;;
        fedora)
            sudo dnf groupinstall -y "Development Tools"
            sudo dnf install -y openssl-devel
            ;;
        arch)
            sudo pacman -Sy
            sudo pacman -S --noconfirm base-devel openssl
            ;;
        macos)
            if command -v brew &> /dev/null; then
                brew install openssl
            else
                echo "Please install Homebrew first: https://brew.sh"
                exit 1
            fi
            ;;
        *)
            echo "Please install build dependencies manually"
            echo "  - Rust: https://rustup.rs"
            echo "  - OpenSSL development headers"
            echo "  - Build tools (gcc/clang)"
            ;;
    esac
    
    echo "✓ Dependencies installed"
}

# Build and install
build_and_install() {
    echo "Building ai-cli..."
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Build
    cargo build --release
    
    echo ""
    echo "Installing ai-cli..."
    
    case $OS in
        termux)
            cp target/release/ai "$PREFIX/bin/"
            ;;
        *)
            if command -v cargo &> /dev/null; then
                cargo install --path .
            else
                sudo cp target/release/ai /usr/local/bin/
            fi
            ;;
    esac
    
    echo "✓ ai-cli installed successfully"
}

# Post-install setup
post_install() {
    echo ""
    echo "Setting up..."
    
    # Create config directory
    mkdir -p ~/.config/ai-cli
    
    # Create default config if not exists
    if [[ ! -f ~/.config/ai-cli/config.toml ]]; then
        cat > ~/.config/ai-cli/config.toml << 'EOF'
default_provider = "ollama"
default_model = "llama3.2"

[providers.openai]
model = "gpt-4o"

[providers.anthropic]
model = "claude-3-5-sonnet"

[providers.ollama]
base_url = "http://localhost:11434"
model = "llama3.2"

[providers.nvidia]
model = "nvidia/llama-3.1-nemotron-70b-instruct"

[settings]
auto_apply = false
verbose = false
color = true
git_context = true
EOF
        echo "✓ Default config created at ~/.config/ai-cli/config.toml"
    fi
    
    # Create templates directory
    mkdir -p ~/.config/ai-cli/templates
    
    echo "✓ Setup complete"
}

# Print usage
print_usage() {
    echo ""
    echo "🎉 Installation complete!"
    echo ""
    echo "Quick start:"
    echo "  ai --help                    # Show help"
    echo "  ai config init               # Initialize config"
    echo "  ai config apikey ollama      # No API key needed for Ollama"
    echo "  ai explain src/main.rs       # Explain code"
    echo ""
    echo "For cloud providers:"
    echo "  ai config apikey openai --key YOUR_API_KEY"
    echo "  ai config apikey anthropic --key YOUR_API_KEY"
    echo "  ai config apikey nvidia --key YOUR_API_KEY"
    echo ""
    echo "Documentation: https://github.com/yourusername/ai-cli"
}

# Main
main() {
    echo ""
    
    # Check Rust
    if ! check_rust; then
        install_rust
    fi
    
    # Install dependencies
    install_deps
    
    # Build and install
    build_and_install
    
    # Post-install
    post_install
    
    # Print usage
    print_usage
}

main "$@"
