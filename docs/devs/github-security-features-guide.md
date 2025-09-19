# GitHub Security Features Usage Guide

## Overview

This guide covers GitHub's built-in security features that are integrated into GNUS-DAO's development workflow. These features provide automated security scanning, vulnerability detection, and compliance monitoring.

## 🔍 GitHub Code Scanning

### Purpose
GitHub Code Scanning automatically detects security vulnerabilities and code quality issues using CodeQL, a semantic code analysis engine.

### Setup & Configuration

#### Enable Code Scanning

```yaml
# .github/workflows/codeql.yml
name: "CodeQL"

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript', 'typescript' ]
        # CodeQL supports [ 'cpp', 'csharp', 'go', 'java', 'javascript', 'python', 'ruby' ]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: ${{ matrix.language }}
        # If you wish to specify custom queries, you can do so here or in a config file.
        # By default, queries listed here will override any specified in a config file.
        # Prefix the list here with "+" to use these queries and those in the config file.

        # Details on CodeQL's query packs refer to : https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-codeql-queries
        queries: security-extended,security-and-quality

    - name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        category: "/language:${{matrix.language}}"
```

#### Custom CodeQL Queries

```ql
// .github/codeql/custom-queries/solidity/Reentrancy.ql
/**
 * @name Potential reentrancy vulnerability
 * @description External call before state change may allow reentrancy
 * @kind problem
 * @problem.severity error
 * @precision high
 * @tags security
 *       external/cwe/cwe-20
 */

import solidity

from Function f, Call c, Assignment a
where f.getAStatement+() = c and
      c.getAStatement+() = a and
      c.getTarget().(Contract).getName() != f.getDeclaringType().getName()
select c, "External call before state change may allow reentrancy"
```

### Managing Code Scanning Results

#### Viewing Results

1. Go to **Security** tab in repository
2. Click **Code scanning alerts**
3. Filter by severity, state, and rule

#### Triaging Alerts

- **False positives**: Mark as "Not a vulnerability"
- **Accepted risks**: Mark as "Accept risk" with justification
- **Fix required**: Create issues or fix directly

#### Alert States

- **Open**: New alert requiring attention
- **Dismissed**: Alert reviewed and determined not to be a vulnerability
- **Fixed**: Alert resolved by code changes

## 🔐 GitHub Secret Scanning

### Purpose
GitHub Secret Scanning automatically detects secrets like API keys, tokens, and credentials that have been accidentally committed to the repository.

### Setup & Configuration

#### Enable Secret Scanning

1. Go to repository **Settings**
2. Navigate to **Security** → **Code security and analysis**
3. Enable **Secret scanning**

#### Custom Patterns

```yaml
# .github/secret-scanning.yml
patterns:
  - name: "GNUS DAO API Key"
    pattern: |
      gnus_dao_api_key_[a-zA-Z0-9]{32}
    confidence: high
  - name: "Private Key"
    pattern: |
      -----BEGIN PRIVATE KEY-----
      [a-zA-Z0-9+/=\s]*
      -----END PRIVATE KEY-----
    confidence: critical
```

### Managing Secret Alerts

#### Alert Response Process

1. **Immediate Action**: Rotate exposed secrets
2. **Repository Access**: Check who had access when secret was committed
3. **Code Review**: Ensure secret removal from all branches
4. **Documentation**: Update incident response procedures

#### Preventing Future Leaks

```bash
# Pre-commit hook to prevent secrets
#!/bin/bash
# .git/hooks/pre-commit

# Check for common secret patterns
if git diff --cached --name-only | xargs grep -l "api_key\|secret\|password" > /dev/null; then
    echo "❌ Potential secrets detected. Please review before committing."
    exit 1
fi
```

## 📦 GitHub Dependency Review

### Purpose
Dependency Review helps identify vulnerabilities in dependencies and reviews dependency changes in pull requests.

### Setup & Configuration

```yaml
# .github/workflows/dependency-review.yml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v4
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
```

### Reviewing Dependency Changes

#### Automated Checks

- **Vulnerability scanning**: Identifies known CVEs in dependencies
- **License compliance**: Checks for incompatible licenses
- **Dependency changes**: Reviews additions, updates, and removals

#### Manual Review Process

1. **Review dependency changes** in PR
2. **Check vulnerability status** of new/updated packages
3. **Verify license compatibility**
4. **Assess supply chain risks**

## 🛡️ GitHub Security Advisories

### Purpose
Security Advisories allow you to privately discuss and fix security vulnerabilities in your repository.

### Creating Security Advisories

#### Process

1. Go to **Security** tab → **Advisories**
2. Click **New draft security advisory**
3. Fill in vulnerability details:
   - **Title**: Clear description of the vulnerability
   - **Description**: Technical details and impact
   - **Severity**: CVSS score and severity level
   - **Affected versions**: Which versions are vulnerable
   - **Patched versions**: When the fix will be available

#### Coordinating Fixes

```yaml
# Example advisory coordination
advisory:
  title: "Reentrancy vulnerability in treasury functions"
  description: |
    A reentrancy vulnerability exists in the treasury withdrawal functions
    that could allow an attacker to drain funds under certain conditions.
  severity: "critical"
  cve_id: "CVE-2024-XXXX"
  affected_versions: "<=1.2.0"
  patched_versions: ">=1.2.1"
```

### Publishing Advisories

- **Private**: Collaborate internally before public disclosure
- **Public**: Publish when fix is ready and deployed
- **Credit**: Properly attribute security researchers

## 🔒 Branch Protection Rules

### Purpose
Branch protection rules enforce security standards and require reviews for sensitive changes.

### Configuration

#### Main Branch Protection

```yaml
# Repository Settings → Branches → Branch protection rules
# Branch name pattern: main

required_status_checks:
  required_checks:
    - "security-check"
    - "lint"
    - "test"
  strict: true

required_pull_requests:
  required_approvals: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  dismissal_restrictions:
    - "security-team"

restrictions:
  allow_force_pushes: false
  allow_deletions: false
```

#### Security Branch Rules

```yaml
# Branch name pattern: security/*

required_pull_requests:
  required_approvals: 3
  require_code_owner_reviews: true
  required_reviewers:
    - "security-lead"
    - "audit-team"
```

### Security-Related Branches

- **security/***: Security fixes and patches
- **hotfix/***: Critical bug fixes
- **feature/security-***: New security features

## 📊 Security Insights

### Purpose
Security Insights provides comprehensive security metrics and trends for your repository.

### Available Metrics

#### Vulnerability Trends

- **Open alerts**: Current security issues
- **Fixed alerts**: Resolved security issues
- **Alert response time**: Time to fix vulnerabilities

#### Code Quality Metrics

- **Code scanning coverage**: Percentage of code scanned
- **Test coverage**: Unit and integration test coverage
- **Dependency health**: Status of dependencies

### Custom Dashboards

```yaml
# Example security dashboard configuration
dashboards:
  - name: "Security Overview"
    metrics:
      - "code_scanning_alerts"
      - "secret_scanning_alerts"
      - "dependency_vulnerabilities"
    time_range: "30d"

  - name: "Compliance Status"
    metrics:
      - "license_compliance"
      - "security_audits"
      - "penetration_tests"
```

## 🚨 Security Alerts & Notifications

### Alert Types

#### Immediate Action Required

- **Critical vulnerabilities** in production code
- **Exposed secrets** requiring immediate rotation
- **Supply chain attacks** affecting dependencies

#### Review Required

- **High-severity vulnerabilities** in dependencies
- **Code scanning alerts** in new code
- **License compliance issues**

### Notification Configuration

```yaml
# .github/settings.yml
security:
  notifications:
    slack:
      webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      alerts:
        - "critical"
        - "high"
    email:
      recipients:
        - "security@gnus.ai"
        - "devops@gnus.ai"
      frequency: "daily"
```

## 🔧 Integration with CI/CD

### Security Gates

```yaml
# .github/workflows/security-gate.yml
name: Security Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Security Checks
        run: |
          yarn security-check
          yarn audit --level high

      - name: Block on Critical Issues
        if: failure()
        run: |
          echo "❌ Security checks failed - blocking merge"
          exit 1
```

### Automated Remediation

```yaml
# .github/workflows/auto-remediate.yml
name: Auto Remediate

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update Dependencies
        run: |
          yarn upgrade --latest
          yarn audit fix

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "🔧 Automated dependency updates"
          body: "Automated security updates for dependencies"
          branch: "security/auto-update"
```

## 📋 Best Practices

### 1. Regular Monitoring

- Review security alerts daily
- Monitor dependency updates weekly
- Conduct security audits quarterly

### 2. Incident Response

- Document response procedures for each alert type
- Maintain contact lists for security incidents
- Practice incident response drills

### 3. Compliance Management

- Track security requirements by regulation
- Maintain audit trails for security decisions
- Generate compliance reports regularly

### 4. Team Training

- Provide security training for all contributors
- Conduct regular security awareness sessions
- Share lessons learned from incidents

## 📚 Additional Resources

- [GitHub Security Documentation](https://docs.github.com/en/security)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule)
- [Security Insights](https://docs.github.com/en/code-security/security-overview/viewing-security-insights)

## 🔒 Branch Protection Rules

### Purpose
Branch protection rules enforce security standards and require reviews for sensitive changes.

### Configuration

#### Main Branch Protection
```yaml
# Repository Settings → Branches → Branch protection rules
# Branch name pattern: main

required_status_checks:
  required_checks:
    - "security-check"
    - "lint"
    - "test"
  strict: true

required_pull_requests:
  required_approvals: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  dismissal_restrictions:
    - "security-team"

restrictions:
  allow_force_pushes: false
  allow_deletions: false
```

#### Security Branch Rules
```yaml
# Branch name pattern: security/*

required_pull_requests:
  required_approvals: 3
  require_code_owner_reviews: true
  required_reviewers:
    - "security-lead"
    - "audit-team"
```

### Security-Related Branches
- **security/***: Security fixes and patches
- **hotfix/***: Critical bug fixes
- **feature/security-***: New security features

## 📊 Security Insights

### Purpose
Security Insights provides comprehensive security metrics and trends for your repository.

### Available Metrics

#### Vulnerability Trends
- **Open alerts**: Current security issues
- **Fixed alerts**: Resolved security issues
- **Alert response time**: Time to fix vulnerabilities

#### Code Quality Metrics
- **Code scanning coverage**: Percentage of code scanned
- **Test coverage**: Unit and integration test coverage
- **Dependency health**: Status of dependencies

### Custom Dashboards

```yaml
# Example security dashboard configuration
dashboards:
  - name: "Security Overview"
    metrics:
      - "code_scanning_alerts"
      - "secret_scanning_alerts"
      - "dependency_vulnerabilities"
    time_range: "30d"

  - name: "Compliance Status"
    metrics:
      - "license_compliance"
      - "security_audits"
      - "penetration_tests"
```

## 🚨 Security Alerts & Notifications

### Alert Types

#### Immediate Action Required
- **Critical vulnerabilities** in production code
- **Exposed secrets** requiring immediate rotation
- **Supply chain attacks** affecting dependencies

#### Review Required
- **High-severity vulnerabilities** in dependencies
- **Code scanning alerts** in new code
- **License compliance issues**

### Notification Configuration

```yaml
# .github/settings.yml
security:
  notifications:
    slack:
      webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      alerts:
        - "critical"
        - "high"
    email:
      recipients:
        - "security@gnus.ai"
        - "devops@gnus.ai"
      frequency: "daily"
```

## 🔧 Integration with CI/CD

### Security Gates

```yaml
# .github/workflows/security-gate.yml
name: Security Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Security Checks
        run: |
          yarn security-check
          yarn audit --level high

      - name: Block on Critical Issues
        if: failure()
        run: |
          echo "❌ Security checks failed - blocking merge"
          exit 1
```

### Automated Remediation

```yaml
# .github/workflows/auto-remediate.yml
name: Auto Remediate

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update Dependencies
        run: |
          yarn upgrade --latest
          yarn audit fix

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "🔧 Automated dependency updates"
          body: "Automated security updates for dependencies"
          branch: "security/auto-update"
```

## 📋 Best Practices

### 1. Regular Monitoring
- Review security alerts daily
- Monitor dependency updates weekly
- Conduct security audits quarterly

### 2. Incident Response
- Document response procedures for each alert type
- Maintain contact lists for security incidents
- Practice incident response drills

### 3. Compliance Management
- Track security requirements by regulation
- Maintain audit trails for security decisions
- Generate compliance reports regularly

### 4. Team Training
- Provide security training for all contributors
- Conduct regular security awareness sessions
- Share lessons learned from incidents

## 📚 Additional Resources

- [GitHub Security Documentation](https://docs.github.com/en/security)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule)
- [Security Insights](https://docs.github.com/en/code-security/security-overview/viewing-security-insights)