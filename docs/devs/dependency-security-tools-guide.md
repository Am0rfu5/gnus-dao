# Dependency Security Tools Usage Guide

## Overview

This guide covers the usage of dependency security tools integrated into GNUS-DAO's development workflow. These tools help identify vulnerabilities in third-party dependencies and ensure supply chain security.

## 🔍 Yarn Audit

### Purpose
Yarn Audit scans the dependency tree for known security vulnerabilities using the npm security database.

### Basic Usage

```bash
# Run audit on current dependencies
yarn audit

# Fix automatically fixable vulnerabilities
yarn audit fix

# Generate JSON report
yarn audit --json
```

### Common Issues & Solutions

#### Issue: High-severity vulnerabilities found
```bash
# Check specific package
yarn audit --package <package-name>

# Update vulnerable package
yarn upgrade <package-name>@latest

# If update not possible, check alternatives
yarn add <alternative-package>
```

#### Issue: Audit fails in CI/CD
```bash
# Check audit level threshold
yarn audit --level moderate

# Exclude dev dependencies if needed
yarn audit --groups dependencies
```

### Configuration

```json
// package.json
{
  "scripts": {
    "audit:check": "yarn audit --level high",
    "audit:fix": "yarn audit fix --force"
  }
}
```

## 🛡️ Snyk

### Purpose
Snyk provides comprehensive vulnerability scanning for dependencies, containers, and code.

### Installation & Setup

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate (one-time setup)
snyk auth

# Test authentication
snyk whoami
```

### Basic Usage

```bash
# Scan dependencies
snyk test

# Scan specific package
snyk test <package-name>

# Monitor for new vulnerabilities
snyk monitor

# Generate HTML report
snyk test --json | snyk-to-html > report.html
```

### Advanced Usage

```bash
# Scan with severity threshold
snyk test --severity-threshold=high

# Exclude dev dependencies
snyk test --dev

# Scan specific file
snyk test --file=package.json

# Check for license issues
snyk test --licenses
```

### CI/CD Integration

```yaml
# .github/workflows/security.yml
- name: Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

### Common Issues & Solutions

#### Issue: False positives
```bash
# Ignore specific vulnerability
snyk ignore --id=<vulnerability-id> --reason="False positive"

# Create .snyk policy file
# .snyk
ignore:
  '<package>':
    - '<vulnerability-id>':
        reason: 'False positive'
        expires: '2024-12-31'
```

#### Issue: Authentication failures
```bash
# Re-authenticate
snyk auth

# Check token validity
snyk whoami
```

## 🔒 Socket.dev

### Purpose
Socket.dev focuses on supply chain attacks and malicious package detection.

### Installation & Setup

```bash
# Install Socket CLI
npm install -g @socketsecurity/cli

# Authenticate
socket auth

# Verify setup
socket --version
```

### Basic Usage

```bash
# Scan project
socket scan

# Scan with specific config
socket scan --config socket.config.json

# Check specific package
socket view <package-name>
```

### Configuration

```json
// socket.config.json
{
  "project": "gnus-dao",
  "directories": ["."],
  "files": ["package.json", "yarn.lock"],
  "alerts": {
    "minSeverity": "medium",
    "includeDev": false
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/security.yml
- name: Socket Security Scan
  uses: socketsecurity/socket-action@main
  with:
    api-token: ${{ secrets.SOCKET_TOKEN }}
```

### Common Issues & Solutions

#### Issue: Package flagged as suspicious
```bash
# Get detailed report
socket view <package-name> --full

# Check if it's a false positive
# Review package source and maintainer reputation
```

#### Issue: Scan timeouts
```bash
# Run with timeout
socket scan --timeout=300

# Scan specific directories
socket scan --directories src/
```

## 📊 OSV-Scanner

### Purpose
OSV-Scanner uses the Open Source Vulnerabilities database for comprehensive scanning.

### Installation & Setup

```bash
# Download latest release
curl -L https://github.com/google/osv-scanner/releases/latest/download/osv-scanner-linux-amd64 -o osv-scanner
chmod +x osv-scanner

# Or install via Go
go install github.com/google/osv-scanner/cmd/osv-scanner@latest
```

### Basic Usage

```bash
# Scan current directory
./osv-scanner -r .

# Scan specific lockfile
./osv-scanner --lockfile=yarn.lock

# Generate JSON output
./osv-scanner -r . --format=json
```

### Advanced Usage

```bash
# Scan with specific format
./osv-scanner -r . --format=table

# Include development dependencies
./osv-scanner -r . --include-dev

# Scan specific directories
./osv-scanner -r ./src --skip-git
```

### CI/CD Integration

```yaml
# .github/workflows/security.yml
- name: OSV Scanner
  run: |
    curl -L https://github.com/google/osv-scanner/releases/latest/download/osv-scanner-linux-amd64 -o osv-scanner
    chmod +x osv-scanner
    ./osv-scanner -r . --format=json > osv-report.json
```

### Common Issues & Solutions

#### Issue: No vulnerabilities found but expected
```bash
# Check if lockfile is up to date
yarn install

# Run with verbose output
./osv-scanner -r . --verbose
```

#### Issue: False positives in reports
```bash
# Filter by severity
./osv-scanner -r . --format=json | jq '.results[] | select(.severity == "HIGH")'
```

## 🔧 Integration Scripts

### Combined Security Check Script

```bash
#!/bin/bash
# scripts/security-check.sh

echo "🔍 Running comprehensive dependency security scan..."

# Yarn Audit
echo "📦 Running Yarn Audit..."
yarn audit --level high
if [ $? -ne 0 ]; then
    echo "❌ Yarn Audit failed"
    exit 1
fi

# Snyk (if available)
if command -v snyk &> /dev/null; then
    echo "🛡️ Running Snyk scan..."
    snyk test --severity-threshold=high
    if [ $? -ne 0 ]; then
        echo "❌ Snyk scan failed"
        exit 1
    fi
fi

# OSV-Scanner
echo "📊 Running OSV-Scanner..."
./osv-scanner -r . --format=json > osv-report.json
if [ $? -ne 0 ]; then
    echo "❌ OSV-Scanner failed"
    exit 1
fi

echo "✅ All dependency security checks passed!"
```

### Automated Fix Script

```bash
#!/bin/bash
# scripts/security-fix.sh

echo "🔧 Attempting to fix dependency vulnerabilities..."

# Try yarn audit fix first
echo "📦 Running yarn audit fix..."
yarn audit fix

# Check if fixes worked
yarn audit --level high
if [ $? -eq 0 ]; then
    echo "✅ Vulnerabilities fixed automatically"
    exit 0
fi

echo "⚠️ Manual intervention required for remaining vulnerabilities"
echo "Please review the audit output above and update dependencies manually"
exit 1
```

## 📋 Best Practices

### 1. Regular Scanning
- Run security scans before each release
- Include scans in CI/CD pipeline
- Monitor for new vulnerabilities weekly

### 2. Dependency Management
- Keep dependencies updated
- Use specific versions (avoid ^ and ~)
- Regularly audit and remove unused packages

### 3. Response Procedures
- Critical vulnerabilities: Fix immediately
- High vulnerabilities: Fix within 1 week
- Medium/Low: Plan fixes in next sprint

### 4. Documentation
- Document security decisions for each dependency
- Maintain list of approved packages
- Track vulnerability remediation progress

## 🚨 Alert Configuration

### Email Notifications
Configure alerts for:
- New high-severity vulnerabilities
- Dependency updates available
- License compliance issues

### Slack Integration
```yaml
# Example Slack notification
- name: Notify Security Team
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: "Dependency security scan failed"
```

## 📚 Additional Resources

- [Yarn Audit Documentation](https://yarnpkg.com/features/security)
- [Snyk CLI Documentation](https://docs.snyk.io/snyk-cli)
- [Socket.dev Documentation](https://docs.socket.dev)
- [OSV-Scanner GitHub](https://github.com/google/osv-scanner)
- [npm Security Advisories](https://www.npmjs.com/advisories)