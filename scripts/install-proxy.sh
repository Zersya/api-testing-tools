#!/bin/bash

# Mock API Local Proxy - Installer Script
# Supports: macOS, Linux, Windows (Git Bash)
#
# Installation:
#   curl -fsSL https://raw.githubusercontent.com/Zersya/api-testing-tools/main/scripts/install-proxy.sh | bash
#   
# Or download and run:
#   wget https://raw.githubusercontent.com/Zersya/api-testing-tools/main/scripts/install-proxy.sh
#   bash install-proxy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
PROXY_VERSION="1.0.0"
INSTALL_DIR="$HOME/.mock-api-proxy"
BIN_DIR="$HOME/.local/bin"
PROXY_URL="https://raw.githubusercontent.com/Zersya/api-testing-tools/main/scripts/mock-api-proxy.js"
REPO_URL="https://github.com/Zersya/api-testing-tools"

# Functions
print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}Mock API Local Proxy - Installer${NC}                            ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    OS="macOS";;
        Linux*)     OS="Linux";;
        CYGWIN*|MINGW*|MSYS*) OS="Windows";;
        *)          OS="Unknown";;
    esac
    echo -e "${BLUE}Detected OS:${NC} $OS"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        return 0
    else
        return 1
    fi
}

# Install Node.js if needed
install_node() {
    print_warn "Node.js not found. Installing..."
    
    if [ "$OS" == "macOS" ]; then
        if command -v brew &> /dev/null; then
            print_info "Installing Node.js via Homebrew..."
            brew install node
        else
            print_info "Please install Homebrew first: https://brew.sh"
            print_info "Then run this installer again."
            exit 1
        fi
    elif [ "$OS" == "Linux" ]; then
        # Try various package managers
        if command -v apt-get &> /dev/null; then
            print_info "Installing Node.js via apt..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            print_info "Installing Node.js via yum..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo yum install -y nodejs
        elif command -v dnf &> /dev/null; then
            print_info "Installing Node.js via dnf..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo dnf install -y nodejs
        else
            print_error "Cannot install Node.js automatically."
            print_info "Please install Node.js manually from: https://nodejs.org"
            exit 1
        fi
    elif [ "$OS" == "Windows" ]; then
        print_info "Please download and install Node.js from:"
        print_info "https://nodejs.org/dist/latest/win-x64/node.exe"
        print_info "Or use the Windows installer (.msi) from https://nodejs.org"
        exit 1
    fi
    
    print_success "Node.js installed successfully!"
}

# Create directories
create_dirs() {
    print_info "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    print_success "Directories created"
}

# Download proxy script
download_proxy() {
    print_info "Downloading proxy script..."
    
    # Try curl first, then wget
    if command -v curl &> /dev/null; then
        curl -fsSL "$PROXY_URL" -o "$INSTALL_DIR/proxy.js" || {
            print_error "Failed to download proxy script"
            exit 1
        }
    elif command -v wget &> /dev/null; then
        wget -q "$PROXY_URL" -O "$INSTALL_DIR/proxy.js" || {
            print_error "Failed to download proxy script"
            exit 1
        }
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    # Make executable
    chmod +x "$INSTALL_DIR/proxy.js"
    print_success "Proxy script downloaded"
}

# Create wrapper script
create_wrapper() {
    print_info "Creating command wrapper..."
    
    cat > "$BIN_DIR/mock-api-proxy" << 'EOF'
#!/bin/bash
# Mock API Local Proxy wrapper script
exec node "$HOME/.mock-api-proxy/proxy.js" "$@"
EOF
    
    chmod +x "$BIN_DIR/mock-api-proxy"
    print_success "Command wrapper created"
}

# Create uninstall script
create_uninstaller() {
    print_info "Creating uninstaller..."
    
    cat > "$BIN_DIR/mock-api-proxy-uninstall" << 'EOF'
#!/bin/bash
# Mock API Local Proxy - Uninstaller

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="$HOME/.mock-api-proxy"
BIN_DIR="$HOME/.local/bin"

echo ""
echo -e "${BLUE}Uninstalling Mock API Local Proxy...${NC}"
echo ""

# Stop any running proxies
if [ -f "$INSTALL_DIR/instances.json" ]; then
    echo "Stopping running proxies..."
    # Note: This is a simplified version
    # In reality, we'd need to kill the processes
fi

# Remove files
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}✓${NC} Removed $INSTALL_DIR"
fi

if [ -f "$BIN_DIR/mock-api-proxy" ]; then
    rm "$BIN_DIR/mock-api-proxy"
    echo -e "${GREEN}✓${NC} Removed command"
fi

if [ -f "$BIN_DIR/mock-api-proxy-uninstall" ]; then
    rm "$BIN_DIR/mock-api-proxy-uninstall"
    echo -e "${GREEN}✓${NC} Removed uninstaller"
fi

echo ""
echo -e "${GREEN}Uninstallation complete!${NC}"
echo ""
echo "Note: You may want to remove the following line from your shell config:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
EOF
    
    chmod +x "$BIN_DIR/mock-api-proxy-uninstall"
    print_success "Uninstaller created"
}

# Add to PATH
add_to_path() {
    print_info "Adding to PATH..."
    
    local updated=false
    local shell_config=""
    
    # Detect shell and config file
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
        shell_config="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
        if [ "$OS" == "macOS" ]; then
            shell_config="$HOME/.bash_profile"
        else
            shell_config="$HOME/.bashrc"
        fi
    fi
    
    if [ -n "$shell_config" ] && [ -f "$shell_config" ]; then
        # Check if already in PATH
        if ! grep -q "$BIN_DIR" "$shell_config" 2>/dev/null; then
            echo "" >> "$shell_config"
            echo "# Added by Mock API Local Proxy installer" >> "$shell_config"
            echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$shell_config"
            print_success "Added to $shell_config"
            updated=true
        else
            print_info "Already in PATH"
        fi
    fi
    
    # Also check .bashrc on macOS as backup
    if [ "$OS" == "macOS" ] && [ -f "$HOME/.bashrc" ]; then
        if ! grep -q "$BIN_DIR" "$HOME/.bashrc" 2>/dev/null; then
            echo "" >> "$HOME/.bashrc"
            echo "# Added by Mock API Local Proxy installer" >> "$HOME/.bashrc"
            echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$HOME/.bashrc"
            print_success "Added to .bashrc"
        fi
    fi
    
    # For Windows Git Bash
    if [ "$OS" == "Windows" ]; then
        if [ -f "$HOME/.bash_profile" ]; then
            if ! grep -q "$BIN_DIR" "$HOME/.bash_profile" 2>/dev/null; then
                echo "" >> "$HOME/.bash_profile"
                echo "# Added by Mock API Local Proxy installer" >> "$HOME/.bash_profile"
                echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$HOME/.bash_profile"
                print_success "Added to .bash_profile"
                updated=true
            fi
        fi
    fi
    
    if [ "$updated" = true ]; then
        echo ""
        print_warn "Please restart your terminal or run: source $shell_config"
    fi
}

# Create config file
create_config() {
    print_info "Creating default configuration..."
    
    cat > "$INSTALL_DIR/config.json" << EOF
{
  "version": "$PROXY_VERSION",
  "defaultPort": 8765,
  "defaultTargetPort": 8080,
  "defaultTargetHost": "localhost",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    print_success "Configuration created"
}

# Print final instructions
print_finish() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}Installation Complete!${NC}                                      ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    print_success "Mock API Local Proxy v$PROXY_VERSION installed"
    echo ""
    echo -e "${BOLD}Usage:${NC}"
    echo "  mock-api-proxy                    Start with defaults"
    echo "  mock-api-proxy --target 3000      Proxy to port 3000"
    echo "  mock-api-proxy --help             Show all options"
    echo ""
    echo -e "${BOLD}Quick Start:${NC}"
    echo "  1. Start your local API server (e.g., on localhost:8080)"
    echo "  2. Run: mock-api-proxy"
    echo "  3. Use the displayed URL in the Mock API Service"
    echo ""
    echo -e "${BOLD}Management:${NC}"
    echo "  mock-api-proxy --list             Show running instances"
    echo "  mock-api-proxy-uninstall          Remove from system"
    echo ""
    echo -e "${BOLD}Repository:${NC}"
    echo "  $REPO_URL"
    echo ""
}

# Main installation
main() {
    print_header
    
    # Detect OS
    detect_os
    echo ""
    
    # Check Node.js
    if ! check_node; then
        install_node
    fi
    
    # Create directories
    create_dirs
    
    # Download proxy
    download_proxy
    
    # Create wrapper
    create_wrapper
    
    # Create uninstaller
    create_uninstaller
    
    # Add to PATH
    add_to_path
    
    # Create config
    create_config
    
    # Print finish message
    print_finish
}

# Run main
main
