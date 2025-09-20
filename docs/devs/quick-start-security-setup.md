# Quick Start Security Setup Guide

## Overview

This guide will get you up and running with GNUS-DAO's comprehensive security CI/CD implementation in under 2 hours. Follow these steps to set up your development environment with all security tools and workflows.

## Prerequisites

- Node.js 18+ installed
- Yarn package manager
- Git configured
- Access to GNUS-DAO repository

## Step 1: Clone and Initial Setup (15 minutes)

### 1.1 Clone the Repository

```bash
git clone https://github.com/GeniusVentures/gnus-dao.git
cd gnus-dao
```

### 1.2 Install Dependencies with Security

```bash
# Install dependencies with frozen lockfile (security requirement)
yarn install --frozen-lockfile

# Verify installation
yarn --version
node --version
```

### 1.3 Run Initial Security Check

```bash
# Run comprehensive security check
yarn security-check
```

**Expected Output:**

```
**Expected Output:**

```text
✅ Running comprehensive security checks...
✅ Yarn audit: No vulnerabilities found
✅ Snyk test: No issues detected
✅ Socket.dev scan: Supply chain secure
✅ OSV-Scanner: No known vulnerabilities
✅ ESLint security: No security issues
✅ Semgrep scan: No security findings
✅ Git-secrets: No secrets detected
✅ All security checks passed!
```
```

## Step 2: Configure Development Environment (30 minutes)

### 2.1 Set Up Git Hooks

```bash
# Install Husky for pre-commit hooks
yarn husky install

# Verify hooks are active
ls -la .husky/
```

### 2.2 Configure IDE Security Extensions

#### VS Code Extensions (Recommended)

```bash
# Install these extensions:
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-vscode.vscode-json
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-typescript-next
```

#### ESLint Configuration

The project includes pre-configured ESLint rules. Your IDE should automatically detect and use `.eslintrc.json`.

### 2.3 Set Up Environment Variables

Create a `.env.local` file for local development:

```bash
# Copy template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Required Variables:**

```env
# GitHub Token for API access (create at https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_token_here

# Optional: Snyk API token for enhanced scanning
SNYK_TOKEN=your_snyk_token

# Optional: Slack webhook for local testing
SLACK_WEBHOOK_URL=https://hooks.slack.com/your/webhook
```

## Step 3: Run Local Security Tests (30 minutes)

### 3.1 Execute Full Test Suite

```bash
# Run all tests including security tests
yarn test

# Run only security-related tests
yarn test --grep "security"
```

### 3.2 Test Security Tools Individually

#### Dependency Scanning

```bash
# Yarn audit
yarn audit

# Snyk test
yarn snyk:test

# Socket.dev scan
yarn socket:scan

# OSV-Scanner
yarn osv:scan
```

#### Code Security

```bash
# ESLint security rules
yarn lint:security

# Semgrep security scan
yarn semgrep:scan

# Git secrets check
yarn git-secrets
```

### 3.3 Test Diamond Proxy Security

```bash
# Run Diamond-specific security tests
yarn test:diamond

# Test upgrade safety
yarn test:upgrade
```

## Step 4: Configure GitHub Security Features (20 minutes)

### 4.1 Enable Repository Security Features

Navigate to your repository settings and enable:

1. **Dependabot alerts** - `Settings > Security & analysis > Dependabot alerts`
2. **Dependabot security updates** - `Settings > Security & analysis > Dependabot security updates`
3. **Code scanning alerts** - `Settings > Security & analysis > Code scanning`
4. **Secret scanning alerts** - `Settings > Security & analysis > Secret scanning`

### 4.2 Configure Branch Protection

1. Go to `Settings > Branches`
2. Add rule for `main` and `develop` branches
3. Enable:
   - Require pull request reviews
   - Require status checks (include security scans)
   - Include administrators
   - Restrict pushes

### 4.3 Set Up Personal Access Token

Create a GitHub Personal Access Token with these scopes:

- `repo` (full repository access)
- `security_events` (read/write security events)
- `pull_requests` (read/write pull requests)

## Step 5: Test Security Workflow (15 minutes)

### 5.1 Test Pre-commit Hooks

```bash
# Make a test change
echo "# Test comment" >> README.md

# Try to commit (should trigger security checks)
git add README.md
git commit -m "test: security setup verification"

# Revert the test change
git reset HEAD~1
git checkout -- README.md
```

### 5.2 Test CI/CD Pipeline

```bash
# Push a test branch to trigger CI
git checkout -b test-security-setup
git commit --allow-empty -m "test: trigger CI pipeline"
git push origin test-security-setup

# Monitor GitHub Actions for security scan results
```

### 5.3 Verify Security Monitoring

```bash
# Test security monitoring scripts
yarn security-webhook --help
yarn security-alerting status
yarn health-check
```

## Step 6: Complete Onboarding Checklist (10 minutes)

Use the [Developer Onboarding Checklist](./developer-onboarding-checklist.md) to verify your setup:

- [ ] Repository cloned and dependencies installed
- [ ] Security checks pass locally
- [ ] Git hooks configured and working
- [ ] IDE security extensions installed
- [ ] Environment variables configured
- [ ] All tests passing
- [ ] GitHub security features enabled
- [ ] Branch protection configured
- [ ] Personal access token created
- [ ] Pre-commit hooks tested
- [ ] CI/CD pipeline verified
- [ ] Security monitoring tested

## Troubleshooting Common Issues

### Issue: `yarn security-check` fails

**Solution:** Check your Node.js version and ensure all dependencies are installed

```bash
node --version  # Should be 18+
yarn --version  # Should be 1.22+
rm -rf node_modules && yarn install --frozen-lockfile
```

### Issue: ESLint not working in IDE

**Solution:** Restart your IDE and ensure the ESLint extension is installed

```bash
# VS Code: Reload window (Ctrl/Cmd + Shift + P > "Developer: Reload Window")
```

### Issue: Git hooks not triggering

**Solution:** Reinstall Husky hooks

```bash
rm -rf .husky
yarn husky install
```

### Issue: GitHub Actions failing

**Solution:** Check repository secrets and ensure GITHUB_TOKEN has correct permissions

```bash
# Verify token in repository settings
```

## Getting Help

- **Documentation**: Check the [Security Documentation Index](../security-documentation-index.md)
- **Issues**: Report problems via GitHub Issues with the `security-setup` label
- **Security Team**: Contact [security-lead@gnus.ai](mailto:security-lead@gnus.ai) for urgent security concerns

## Time Estimate Verification

- ✅ Step 1: Clone & Setup (15 min) - Completed
- ✅ Step 2: Environment Config (30 min) - Completed
- ✅ Step 3: Security Tests (30 min) - Completed
- ✅ Step 4: GitHub Config (20 min) - Completed
- ✅ Step 5: Workflow Testing (15 min) - Completed
- ✅ Step 6: Checklist Verification (10 min) - Completed

**Total Time**: ~2 hours ✅

---

**Last Updated**: September 18, 2025
**Guide Version**: 1.0.0

## Next Steps

1. **Read the Daily Security Workflow Guide** - Learn how to integrate security into your daily development
2. **Review the PR Security Checklist** - Understand security requirements for code reviews
3. **Explore Tool-Specific Guides** - Deep dive into individual security tools
4. **Study Diamond Proxy Security** - Learn security patterns specific to ERC-2535

## Getting Help

- **Documentation**: Check the [Security Documentation Index](../security-documentation-index.md)
- **Issues**: Report problems via GitHub Issues with the `security-setup` label
- **Security Team**: Contact [security-lead@gnus.ai](mailto:security-lead@gnus.ai) for urgent security concerns

## Time Estimate Verification

- ✅ Step 1: Clone & Setup (15 min) - Completed
- ✅ Step 2: Environment Config (30 min) - Completed
- ✅ Step 3: Security Tests (30 min) - Completed
- ✅ Step 4: GitHub Config (20 min) - Completed
- ✅ Step 5: Workflow Testing (15 min) - Completed
- ✅ Step 6: Checklist Verification (10 min) - Completed

**Total Time**: ~2 hours ✅

---

**Last Updated**: September 18, 2025
**Guide Version**: 1.0.0
