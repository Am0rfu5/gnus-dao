# GNUS-DAO DevContainer Complete Setup Guide

## Overview

This comprehensive guide provides detailed instructions for setting up and configuring the GNUS-DAO DevContainer development environment. Whether you're a new team member or migrating from native development, this guide covers all aspects of the DevContainer setup.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Development Tools Setup](#development-tools-setup)
- [Security Integration](#security-integration)
- [Testing and Validation](#testing-and-validation)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Prerequisites

### System Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 4 cores | 8+ cores | Intel/AMD x64 or Apple Silicon |
| **RAM** | 8GB | 16GB+ | Docker Desktop needs 4GB minimum |
| **Storage** | 20GB free | 50GB+ free | For Docker images and caches |
| **OS** | Windows 10/11, macOS 10.15+, Ubuntu 18.04+ | Latest versions | Full Docker support required |

### Software Prerequisites

#### Docker Desktop
```bash
# Install Docker Desktop
# Windows/macOS: Download from https://docker.com/products/docker-desktop
# Linux: Use system package manager or Docker's convenience script

# Verify installation
docker --version        # Docker version 24.x.x
docker compose version  # Docker Compose version 2.x.x
```

#### Visual Studio Code
```bash
# Install VS Code
# Download from https://code.visualstudio.com/

# Install required extensions
code --install-extension ms-vscode-remote.remote-containers
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension ms-vscode.vscode-json
code --install-extension eamodio.gitlens
```

#### Git
```bash
# Verify Git installation
git --version  # git version 2.30+

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Set up SSH keys for GitHub
ssh-keygen -t ed25519 -C "your.email@company.com"
# Add public key to GitHub: https://github.com/settings/keys
```

### Network Requirements

- **Internet Connection**: Stable broadband (10Mbps+ recommended)
- **GitHub Access**: HTTPS or SSH access to GitHub repositories
- **Docker Hub Access**: For pulling base images (authenticated preferred)
- **NPM/Yarn Registry Access**: For package installation

## Initial Setup

### Step 1: Clone Repository

```bash
# Clone the GNUS-DAO repository
git clone https://github.com/GeniusVentures/gnus-dao.git
cd gnus-dao

# Or with SSH (recommended)
git clone git@github.com:GeniusVentures/gnus-dao.git
cd gnus-dao
```

### Step 2: Open in DevContainer

1. **Launch VS Code** in the project directory:
   ```bash
   code .
   ```

2. **Open Command Palette**:
   - Windows/Linux: `Ctrl+Shift+P`
   - macOS: `Cmd+Shift+P`

3. **Select DevContainer**:
   - Type: "Dev Containers: Reopen in Container"
   - Select the option when it appears
   - Wait for container build (5-10 minutes first time)

4. **Verify Container**:
   ```bash
   # Check if you're in the container
   echo $REMOTE_CONTAINERS  # Should output 'true'

   # Verify environment
   node --version   # v20.x.x
   yarn --version   # 1.22.x+
   ```

### Step 3: Initial Dependencies Installation

```bash
# Install project dependencies
yarn install

# This will:
# - Install Node.js dependencies
# - Set up Hardhat
# - Configure development tools
# - Initialize security scanning tools
```

## Environment Configuration

### Development Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Essential Variables**:
```bash
# Development Configuration
NODE_ENV=development
HARDHAT_NETWORK=localhost

# Security Scanning
SNYK_TOKEN=your_snyk_token_here
SEMGREP_APP_TOKEN=your_semgrep_token_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here

# Database (if applicable)
DATABASE_URL=postgresql://localhost:5432/gnus_dao_dev
```

### VS Code Settings

The DevContainer includes optimized VS Code settings. You can customize them by creating a `.vscode/settings.json` file:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "hardhat.telemetry": false,
  "solidity.compileUsingRemoteVersion": "v0.8.19"
}
```

## Development Tools Setup

### Hardhat Configuration

The DevContainer comes pre-configured with Hardhat. Verify the setup:

```bash
# Check Hardhat configuration
npx hardhat compile --help

# Test basic functionality
npx hardhat compile
```

### Security Tools Integration

```bash
# Verify security tools
snyk --version      # Snyk CLI version
semgrep --version   # Semgrep version
slither --version   # Slither version

# Run initial security check
yarn security-check:quick
```

### Testing Framework

```bash
# Run test suite
yarn test

# Run with coverage
yarn test:coverage

# Run specific test file
yarn test --grep "GNUSDAOToken"
```

## Security Integration

### Automated Security Scanning

The DevContainer includes comprehensive security scanning:

```bash
# Quick security check (runs automatically on commits)
yarn security-check:quick

# Full security audit
yarn security-check:full

# Dependency vulnerability scan
yarn audit
```

### Code Quality Tools

```bash
# Lint code
yarn lint

# Fix linting issues automatically
yarn lint:fix

# Type checking
yarn typecheck
```

## Testing and Validation

### Development Workflow Validation

```bash
# Complete development workflow test
yarn ci:local

# This runs:
# - Code compilation
# - Unit tests
# - Integration tests
# - Security scanning
# - Code quality checks
```

### Performance Validation

```bash
# Test build performance
time yarn compile

# Test test execution time
time yarn test:quick

# Check container resource usage
docker stats
```

### Environment Parity Check

```bash
# Verify environment matches CI/CD
yarn test:environment-parity

# Check tool versions match production
node scripts/devops/gh-devcon/validate-tool-versions.ts
```

## Troubleshooting

### Common Issues and Solutions

#### Container Won't Start
```bash
# Check Docker Desktop is running
docker info

# Restart Docker service
sudo systemctl restart docker  # Linux
# Or restart Docker Desktop application

# Clear Docker cache if needed
docker system prune -a
```

#### Permission Errors
```bash
# Fix file ownership
sudo chown -R $USER:$USER .

# Fix npm cache permissions
sudo chown -R $USER:$USER ~/.npm
```

#### Slow Performance
```bash
# Increase Docker memory allocation
# Docker Desktop > Settings > Resources > Memory: 6GB+

# Optimize VS Code settings
# Add to .vscode/settings.json:
{
  "typescript.disableAutomaticTypeAcquisition": false,
  "files.exclude": {
    "**/node_modules": true
  }
}
```

#### Build Failures
```bash
# Clear caches
yarn clean
rm -rf node_modules
yarn install

# Check disk space
df -h

# Verify network connectivity
curl -I https://registry.yarnpkg.com
```

### Getting Help

1. **Self-Service**: Check [Troubleshooting Guide](../troubleshooting/common-issues.md)
2. **Documentation**: Search [Knowledge Base](../support/knowledge-base.md)
3. **Automated Help**: Run `npx ts-node scripts/devops/gh-devcon/diagnose-devcontainer-issues.ts`
4. **Community**: Post in #devcontainer-support Slack channel
5. **Issues**: Create [GitHub Issue](../../.github/ISSUE_TEMPLATE/devcontainer-issue.yml)

## Advanced Configuration

### Custom Container Configuration

Edit `.devcontainer/devcontainer.json` for advanced customization:

```json
{
  "name": "GNUS-DAO DevContainer",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "NODE_VERSION": "20",
      "YARN_VERSION": "1.22.19"
    }
  },
  "settings": {
    "terminal.integrated.shell.linux": "/bin/bash"
  },
  "extensions": [
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode"
  ],
  "forwardPorts": [8545, 3000],
  "postCreateCommand": "yarn install"
}
```

### Performance Optimization

```bash
# Enable Docker BuildKit
export DOCKER_BUILDKIT=1

# Use multi-stage builds for smaller images
# Edit Dockerfile for optimization

# Configure resource limits
# Docker Desktop > Settings > Resources
```

### Security Hardening

```bash
# Enable security scanning on commits
# Edit .husky/pre-commit

# Configure secrets detection
# Edit .git-secrets-patterns

# Set up automated security monitoring
# Configure scripts/devops/gh-devcon/performance-monitor.ts
```

## Next Steps

After completing this setup:

1. **Read the Quick Start Guide** for immediate productivity
2. **Explore Advanced Configuration** for customization options
3. **Join the Team Migration** if transitioning from native development
4. **Complete Training Exercises** to master DevContainer workflows
5. **Monitor Performance** using built-in monitoring tools

## Support and Resources

- **Quick Start**: [30-Minute Setup](../quick-start/README.md)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-issues.md)
- **Migration Guide**: [From Native Development](../migration/from-native-development.md)
- **Training**: [Interactive Exercises](../../training/exercises/)
- **Support**: #devcontainer-support Slack channel

---

**Last Updated**: September 27, 2025
**Version**: 1.0.0
**Estimated Setup Time**: 2 hours