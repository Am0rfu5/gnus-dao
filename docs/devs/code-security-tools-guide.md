# Code Security Tools Usage Guide

## Overview

This guide covers static analysis and code security tools integrated into GNUS-DAO's development workflow. These tools help identify security vulnerabilities, code quality issues, and potential security anti-patterns in the codebase.

## 🔍 ESLint Security Rules

### Purpose
ESLint with security rules analyzes JavaScript/TypeScript code for security vulnerabilities and unsafe patterns.

### Configuration

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["security", "@typescript-eslint"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-unsafe-regex": "error"
  }
}
```

### Basic Usage

```bash
# Run ESLint on all files
yarn lint

# Run on specific files
yarn lint src/specific-file.ts

# Fix auto-fixable issues
yarn lint:fix

# Generate report
yarn lint --format=json > eslint-report.json
```

### Common Security Issues & Fixes

#### Issue: Object Injection

```typescript
// ❌ Vulnerable
const userInput = req.query.key;
const obj = {};
obj[userInput] = 'value'; // Object injection vulnerability

// ✅ Secure
const allowedKeys = ['name', 'email', 'age'];
if (allowedKeys.includes(userInput)) {
  obj[userInput] = 'value';
}
```

#### Issue: Eval Usage

```typescript
// ❌ Vulnerable
const code = req.body.code;
eval(code); // Code injection vulnerability

// ✅ Secure
// Avoid eval entirely, or use safe alternatives
const result = safeEval(code, { timeout: 1000 });
```

#### Issue: Timing Attacks

```typescript
// ❌ Vulnerable
if (password === userInput) { // Timing attack possible

// ✅ Secure
if (crypto.timingSafeEqual(password, userInput)) {
```

### CI/CD Integration

```yaml
# .github/workflows/lint.yml
- name: Run ESLint
  run: yarn lint
- name: Upload ESLint Results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: eslint-report.sarif
```

## 🔎 Semgrep

### Purpose
Semgrep performs semantic code analysis to find security vulnerabilities, bugs, and code quality issues using pattern matching.

### Installation & Setup

```bash
# Install Semgrep CLI
pip install semgrep

# Or use Docker
docker pull returntocorp/semgrep

# Authenticate for team features
semgrep login
```

### Basic Usage

```bash
# Scan current directory
semgrep --config=auto

# Scan with specific rules
semgrep --config=r/security

# Scan TypeScript files only
semgrep --lang=typescript --config=r/security

# Generate JSON output
semgrep --config=auto --json > semgrep-report.json
```

### Custom Rules for Smart Contracts

```yaml
# semgrep-rules/smart-contract-security.yml
rules:
  - id: reentrancy-check
    pattern: |
      function $FUNC(...) {
        ...
        (bool success,) = $ADDR.call{value: $AMOUNT}($DATA);
        ...
        $STATE = $NEWVALUE;
      }
    message: "Potential reentrancy vulnerability: state change after external call"
    severity: ERROR

  - id: unchecked-return
    pattern: |
      (bool success,) = $ADDR.call{value: $AMOUNT}($DATA);
      // No check of success
    message: "Unchecked return value from external call"
    severity: WARNING
```

### Advanced Usage

```bash
# Scan with custom rules
semgrep --config=semgrep-rules/

# Exclude files
semgrep --exclude="test/" --config=auto

# Scan specific files
semgrep --include="contracts/**/*.sol" --config=r/security

# Baseline scan
semgrep --baseline-commit=main --config=auto
```

### CI/CD Integration

```yaml
# .github/workflows/semgrep.yml
- name: Semgrep Scan
  uses: returntocorp/semgrep-action@v1
  with:
    config: r/security
    generateSarif: "1"
- name: Upload Semgrep Results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: semgrep.sarif
```

### Common Issues & Solutions

#### Issue: False positives

```bash
# Add inline suppressions
// semgrep-disable-next-line: reentrancy-check
(bool success,) = addr.call{value: amount}(data);

# Or use config to ignore
# semgrepignore
contracts/test/**
```

#### Issue: Performance issues

```bash
# Limit scan scope
semgrep --include="src/" --exclude="node_modules/" --config=auto

# Use baseline scanning
semgrep --baseline-commit=main --config=auto
```

## 🔐 Git-Secrets

### Purpose
Git-Secrets scans git repositories for accidentally committed secrets, API keys, and sensitive information.

### Installation & Setup

```bash
# Install git-secrets
# macOS
brew install git-secrets

# Ubuntu/Debian
sudo apt-get install git-secrets

# Or from source
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
make install
```

### Basic Usage

```bash
# Initialize in repository
git secrets --install

# Scan current directory
git secrets --scan

# Scan specific files
git secrets --scan /path/to/file

# Scan git history
git secrets --scan-history
```

### Configuration

```bash
# Add custom patterns
git secrets --add 'private_key'
git secrets --add 'api_key_[a-zA-Z0-9]{32}'

# Add allowed patterns (false positives)
git secrets --add --allowed 'test_api_key'

# Register AWS patterns
git secrets --register-aws
```

### Pre-commit Hook Setup

```bash
# Install pre-commit hook
git secrets --install -f

# Verify hook is installed
cat .git/hooks/pre-commit
```

### CI/CD Integration

```yaml
# .github/workflows/secrets.yml
- name: Check for Secrets
  run: |
    git secrets --install
    git secrets --scan
- name: Scan Git History
  run: |
    git secrets --scan-history
```

### Common Issues & Solutions

#### Issue: False positives

```bash
# Add allowed pattern
git secrets --add --allowed 'harmless_string'

# Or add to .gitallowed
echo 'harmless_string' >> .gitallowed
```

#### Issue: Hook not running

```bash
# Check hook permissions
ls -la .git/hooks/pre-commit

# Reinstall hook
git secrets --install -f
```

## 🔧 Slither (Solidity Security)

### Purpose
Slither is a static analysis framework for Solidity smart contracts.

### Installation & Setup

```bash
# Install via pip
pip install slither-analyzer

# Or use Docker
docker pull trailofbits/slither
```

### Basic Usage

```bash
# Analyze single contract
slither contracts/GNUSDAO.sol

# Analyze all contracts
slither contracts/

# Generate different outputs
slither contracts/ --json > slither-report.json
slither contracts/ --sarif > slither-report.sarif
```

### Advanced Usage

```bash
# Check specific detectors
slither contracts/ --detect reentrancy

# Exclude detectors
slither contracts/ --exclude-dependencies

# Custom configuration
slither contracts/ --config-file slither.config.json
```

### Configuration

```json
// slither.config.json
{
  "detectors_to_run": [
    "reentrancy",
    "suicidal",
    "uninitialized-state",
    "arbitrary-send"
  ],
  "exclude_detectors": [
    "pragma"
  ],
  "filter_paths": [
    "test/",
    "node_modules/"
  ]
}
```

### CI/CD Integration

```yaml
# .github/workflows/slither.yml
- name: Run Slither
  uses: crytic/slither-action@v0.2.0
  with:
    target: contracts/
    sarif: results.sarif
- name: Upload Slither Results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: results.sarif
```

## 🔧 Integration Scripts

### Combined Code Security Check

```bash
#!/bin/bash
# scripts/code-security-check.sh

echo "🔍 Running comprehensive code security analysis..."

# ESLint
echo "📝 Running ESLint..."
yarn lint
if [ $? -ne 0 ]; then
    echo "❌ ESLint failed"
    exit 1
fi

# Semgrep
echo "🔎 Running Semgrep..."
semgrep --config=auto --json > semgrep-report.json
if [ $? -ne 0 ]; then
    echo "❌ Semgrep failed"
    exit 1
fi

# Git-Secrets
echo "🔐 Running Git-Secrets..."
git secrets --scan
if [ $? -ne 0 ]; then
    echo "❌ Git-Secrets scan failed"
    exit 1
fi

# Slither (if Solidity files exist)
if [ -d "contracts" ]; then
    echo "🔧 Running Slither..."
    slither contracts/ --json > slither-report.json
    if [ $? -ne 0 ]; then
        echo "❌ Slither failed"
        exit 1
    fi
fi

echo "✅ All code security checks passed!"
```

### Pre-commit Hook Script

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔐 Running pre-commit security checks..."

# Git secrets
git secrets --pre-commit

# ESLint (quick check)
yarn lint --quiet

# Semgrep (fast check)
semgrep --config=r/security --quiet

echo "✅ Pre-commit checks passed!"
```

## 📋 Best Practices

### 1. Regular Scanning

- Run security scans on every commit
- Include scans in CI/CD pipeline
- Review scan results regularly

### 2. Rule Customization

- Customize rules for your codebase
- Balance security with practicality
- Document rule exceptions

### 3. False Positive Management

- Maintain allowlists for known false positives
- Review and update patterns regularly
- Document security decisions

### 4. Performance Optimization

- Use incremental scanning where possible
- Cache scan results
- Parallelize scans in CI/CD

## 🚨 Alert Configuration

### Severity Levels

- **Critical**: Block commits, immediate notification
- **High**: Notify team lead, fix within 1 day
- **Medium**: Notify team, fix within 1 week
- **Low**: Track in backlog, fix when convenient

### Notification Channels

- **Slack**: Real-time alerts for critical issues
- **Email**: Daily digest of security findings
- **GitHub**: PR comments and status checks

## 📚 Additional Resources

- [ESLint Security Plugin](https://github.com/nodesecurity/eslint-plugin-security)
- [Semgrep Documentation](https://semgrep.dev/docs/)
- [Git-Secrets GitHub](https://github.com/awslabs/git-secrets)
- [Slither Documentation](https://github.com/crytic/slither)
- [OWASP Security Tools](https://owasp.org/www-community/Source_Code_Analysis_Tools)
