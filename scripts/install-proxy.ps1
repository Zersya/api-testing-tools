#!/usr/bin/env powershell
#requires -Version 3.0

<#
.SYNOPSIS
    Mock API Local Proxy - Windows Installer
    
.DESCRIPTION
    Installs the Mock API Local Proxy for Windows users.
    Supports PowerShell 3.0 and later.
    
.EXAMPLE
    # Run directly from web:
    iwr -useb https://api-mock.transtrack.id/install-proxy.ps1 | iex
    
    # Or download and run:
    .\install-proxy.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# Configuration
$script:PROXY_VERSION = "1.0.0"
$script:INSTALL_DIR = "$env:USERPROFILE\.mock-api-proxy"
$script:PROXY_URL = "https://api-mock.transtrack.id/proxy-scripts/mock-api-proxy.js"

# Colors for PowerShell
function Write-Success($Message) {
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error($Message) {
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info($Message) {
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Warn($Message) {
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Mock API Local Proxy - Windows Installer                    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Finish {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  Installation Complete!                                    ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check Node.js installation
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Success "Node.js found: $nodeVersion"
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Install Node.js on Windows
function Install-NodeJS {
    Write-Warn "Node.js not found. Installing..."
    Write-Info "Downloading Node.js installer..."
    
    $nodeInstaller = "$env:TEMP\nodejs-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/latest/win-x64/node.msi"
    
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Info "Running Node.js installer..."
        
        if (Test-Administrator) {
            Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/quiet", "/norestart" -Wait
        }
        else {
            Write-Warn "Administrator rights needed for installation."
            Write-Info "Please download and install Node.js manually from:"
            Write-Info "https://nodejs.org/en/download/"
            Write-Info ""
            Write-Info "After installation, run this installer again."
            exit 1
        }
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Success "Node.js installed successfully!"
    }
    catch {
        Write-Error "Failed to install Node.js: $_"
        Write-Info "Please install manually from https://nodejs.org"
        exit 1
    }
    finally {
        if (Test-Path $nodeInstaller) {
            Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
        }
    }
}

# Create directories
function New-ProxyDirectories {
    Write-Info "Creating directories..."
    
    if (!(Test-Path $script:INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $script:INSTALL_DIR -Force | Out-Null
    }
    
    Write-Success "Directories created"
}

# Download proxy script
function Get-ProxyScript {
    Write-Info "Downloading proxy script..."
    
    $proxyPath = Join-Path $script:INSTALL_DIR "proxy.js"
    
    try {
        Invoke-WebRequest -Uri $script:PROXY_URL -OutFile $proxyPath -UseBasicParsing
        Write-Success "Proxy script downloaded"
    }
    catch {
        Write-Error "Failed to download proxy script: $_"
        exit 1
    }
}

# Create command wrapper (CMD)
function New-CmdWrapper {
    Write-Info "Creating command wrapper..."
    
    $cmdWrapper = @"
@echo off
node "$env:USERPROFILE\.mock-api-proxy\proxy.js" %*
"@
    
    $cmdPath = "$env:USERPROFILE\.local\bin\mock-api-proxy.cmd"
    
    # Ensure bin directory exists
    $binDir = "$env:USERPROFILE\.local\bin"
    if (!(Test-Path $binDir)) {
        New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    }
    
    Set-Content -Path $cmdPath -Value $cmdWrapper
    Write-Success "CMD wrapper created"
}

# Create PowerShell wrapper
function New-PowerShellWrapper {
    Write-Info "Creating PowerShell wrapper..."
    
    $psWrapper = @"
# Mock API Local Proxy - PowerShell wrapper
& node "$env:USERPROFILE\.mock-api-proxy\proxy.js" `@args
"@
    
    $psPath = "$env:USERPROFILE\.local\bin\mock-api-proxy.ps1"
    Set-Content -Path $psPath -Value $psWrapper
    Write-Success "PowerShell wrapper created"
}

# Create uninstaller
function New-Uninstaller {
    Write-Info "Creating uninstaller..."
    
    $uninstallScript = @"
@echo off
echo Uninstalling Mock API Local Proxy...

if exist "$env:USERPROFILE\.mock-api-proxy" (
    rmdir /s /q "$env:USERPROFILE\.mock-api-proxy"
    echo [OK] Removed proxy directory
)

if exist "$env:USERPROFILE\.local\bin\mock-api-proxy.cmd" (
    del "$env:USERPROFILE\.local\bin\mock-api-proxy.cmd"
    echo [OK] Removed command
)

if exist "$env:USERPROFILE\.local\bin\mock-api-proxy.ps1" (
    del "$env:USERPROFILE\.local\bin\mock-api-proxy.ps1"
    echo [OK] Removed PowerShell wrapper
)

if exist "$env:USERPROFILE\.local\bin\mock-api-proxy-uninstall.cmd" (
    del "$env:USERPROFILE\.local\bin\mock-api-proxy-uninstall.cmd"
)

echo.
echo Uninstallation complete!
echo.
echo You may want to remove %USERPROFILE%\.local\bin from your PATH.
pause
"@
    
    $uninstallPath = "$env:USERPROFILE\.local\bin\mock-api-proxy-uninstall.cmd"
    Set-Content -Path $uninstallPath -Value $uninstallScript
    Write-Success "Uninstaller created"
}

# Add to PATH
function Add-ToPath {
    Write-Info "Adding to PATH..."
    
    $binDir = "$env:USERPROFILE\.local\bin"
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$binDir*") {
        $newPath = "$currentPath;$binDir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        
        # Also update current session
        $env:Path = "$env:Path;$binDir"
        
        Write-Success "Added to PATH"
        Write-Warn "Please restart PowerShell or Command Prompt for changes to take effect"
    }
    else {
        Write-Info "Already in PATH"
    }
}

# Create config file
function New-ConfigFile {
    Write-Info "Creating default configuration..."
    
    $config = @{
        version = $script:PROXY_VERSION
        defaultPort = 8765
        defaultTargetPort = 8080
        defaultTargetHost = "localhost"
        autoCheckUpdates = $true
        installedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json
    
    $configPath = Join-Path $script:INSTALL_DIR "config.json"
    Set-Content -Path $configPath -Value $config
    Write-Success "Configuration created"
}

# Print finish message
function Write-Instructions {
    Write-Finish
    
    Write-Success "Mock API Local Proxy v$($script:PROXY_VERSION) installed"
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  mock-api-proxy                    Start with defaults"
    Write-Host "  mock-api-proxy --target 3000      Proxy to port 3000"
    Write-Host "  mock-api-proxy --help             Show all options"
    Write-Host ""
    Write-Host "Quick Start:" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  1. Start your local API server (e.g., on localhost:8080)"
    Write-Host "  2. Run: mock-api-proxy"
    Write-Host "  3. Use the displayed URL in https://api-mock.transtrack.id"
    Write-Host ""
    Write-Host "Management:" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  mock-api-proxy --list             Show running instances"
    Write-Host "  mock-api-proxy --update           Check for updates"
    Write-Host "  mock-api-proxy-uninstall          Remove from system"
    Write-Host ""
    Write-Host "Documentation:" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  https://api-mock.transtrack.id/docs/proxy"
    Write-Host ""
}

# Main installation function
function Install-Proxy {
    Write-Header
    
    # Check Node.js
    if (!(Test-NodeJS)) {
        Install-NodeJS
        
        # Re-check after installation
        if (!(Test-NodeJS)) {
            Write-Error "Node.js installation verification failed"
            exit 1
        }
    }
    
    # Create directories
    New-ProxyDirectories
    
    # Download proxy
    Get-ProxyScript
    
    # Create wrappers
    New-CmdWrapper
    New-PowerShellWrapper
    
    # Create uninstaller
    New-Uninstaller
    
    # Add to PATH
    Add-ToPath
    
    # Create config
    New-ConfigFile
    
    # Print instructions
    Write-Instructions
}

# Run installation
try {
    Install-Proxy
}
catch {
    Write-Error "Installation failed: $_"
    exit 1
}
