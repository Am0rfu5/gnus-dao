# Security Tools Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when using GNUS-DAO's security tools. Each section covers troubleshooting for specific tools, with step-by-step solutions and preventive measures.

## 🔍 Yarn Audit Issues

### Issue: False Positive Vulnerabilities

**Symptoms:**
- Yarn audit reports vulnerabilities in dependencies you know are safe
- Audit fails but manual inspection shows no real risk

**Solutions:**

1. **Check for Development Dependencies:**

   ```bash
   # Audit only production dependencies
   yarn audit --groups dependencies

   # Or exclude dev dependencies
   yarn audit --audit-level moderate
   ```

2. **Update Vulnerable Packages:**

   ```bash
   # Try automatic fix
   yarn audit fix

   # Update specific package
   yarn upgrade vulnerable-package@latest

   # Force update if needed
   yarn upgrade vulnerable-package@latest --latest
   ```

3. **Add Audit Exceptions:**

   ```javascript
   // package.json
   {
     "audit": {
       "audit-level": "moderate",
       "ignore": [
         "CVE-2021-23456" // Document why this is ignored
       ]
     }
   }
   ```

### Issue: Audit Timeout or Performance Issues

**Symptoms:**
- `yarn audit` takes too long to complete
- Command hangs or times out

**Solutions:**

1. **Use Cached Audit:**

   ```bash
   # Use cached results when possible
   yarn audit --cache
   ```

2. **Limit Audit Scope:**

   ```bash
   # Audit specific packages
   yarn audit --package specific-package

   # Audit only high-severity issues
   yarn audit --audit-level high
   ```

3. **Parallel Processing:**

   ```bash
   # Run audit in background
   yarn audit &
   ```

### Issue: Lockfile Conflicts

**Symptoms:**
- `yarn install --frozen-lockfile` fails
- Lockfile out of sync with package.json

**Solutions:**

1. **Regenerate Lockfile:**

   ```bash
   # Remove and regenerate lockfile
   rm yarn.lock
   yarn install
   ```

2. **Resolve Conflicts:**

   ```bash
   # Check for conflicts
   yarn install --check-files

   # Update lockfile
   yarn install --update-checksums
   ```

## 🛡️ Snyk Issues

### Issue: Authentication Failures

**Symptoms:**
- `snyk test` fails with authentication error
- Unable to access Snyk API

**Solutions:**

1. **Re-authenticate:**

   ```bash
   # Login again
   snyk auth

   # Check authentication status
   snyk whoami
   ```

2. **Use API Token:**

   ```bash
   # Set token directly
   export SNYK_TOKEN=your-api-token

   # Or use .snyk file
   echo 'api: your-api-token' > .snyk
   ```

3. **Check Token Permissions:**

   ```bash
   # Verify token has correct permissions
   snyk auth --check
   ```

### Issue: False Positives in Reports

**Symptoms:**
- Snyk reports vulnerabilities that don't apply to your usage
- High false positive rate

**Solutions:**

1. **Create Snyk Policy:**

   ```yaml
   # .snyk
   ignore:
     'package-name':
       'CVE-XXXX-XXXX':
         reason: 'False positive - vulnerability does not affect our usage'
         expires: '2024-12-31'
   ```

2. **Use Severity Thresholds:**

   ```bash
   # Only report high-severity issues
   snyk test --severity-threshold=high
   ```

3. **Exclude Development Dependencies:**

   ```bash
   # Skip dev dependencies
   snyk test --dev=false
   ```

### Issue: Performance Issues

**Symptoms:**
- Snyk scans take too long
- High resource usage

**Solutions:**

1. **Use Incremental Scans:**

   ```bash
   # Scan only changed files
   snyk test --all-projects=false
   ```

2. **Limit Scan Scope:**

   ```bash
   # Scan specific directories
   snyk test --file=package.json --package-manager=yarn
   ```

3. **Use Snyk CLI Options:**

   ```bash
   # Use faster scanning
   snyk test --experimental
   ```

## 🔒 Socket.dev Issues

### Issue: Supply Chain Warnings

**Symptoms:**
- Socket.dev flags legitimate packages as suspicious
- False positives in supply chain analysis

**Solutions:**

1. **Review Package Legitimacy:**

   ```bash
   # Get detailed package info
   socket view suspicious-package

   # Check package metadata
   socket search suspicious-package
   ```

2. **Add Trusted Packages:**

   ```json
   // socket.config.json
   {
     "trustedPackages": [
       "trusted-package-name"
     ]
   }
   ```

3. **Configure Alert Levels:**

   ```json
   // socket.config.json
   {
     "alerts": {
       "minSeverity": "high"
     }
   }
   ```

### Issue: Authentication Problems

**Symptoms:**
- Socket.dev commands fail with auth errors
- Unable to access Socket API

**Solutions:**

1. **Re-authenticate:**

   ```bash
   # Login again
   socket auth

   # Check auth status
   socket whoami
   ```

2. **Use API Key:**

   ```bash
   # Set API key
   export SOCKET_SECURITY_API_KEY=your-api-key
   ```

3. **Check Network Connectivity:**

   ```bash
   # Test API connectivity
   curl -H "Authorization: Bearer $SOCKET_SECURITY_API_KEY" \
        https://api.socket.dev/v0/health
   ```

### Issue: Scan Failures

**Symptoms:**
- Socket scan exits with error
- Unable to analyze dependencies

**Solutions:**

1. **Check Dependencies:**

   ```bash
   # Ensure all dependencies are installed
   yarn install --frozen-lockfile
   ```

2. **Validate Configuration:**

   ```bash
   # Check socket config
   cat socket.config.json
   ```

3. **Run with Debug Mode:**

   ```bash
   # Enable debug output
   socket scan --debug
   ```

## 📊 OSV-Scanner Issues

### Issue: No Vulnerabilities Found (When Expected)

**Symptoms:**
- OSV-Scanner reports no issues but other tools find vulnerabilities
- Missing expected security findings

**Solutions:**

1. **Check Database Freshness:**

   ```bash
   # Update OSV database
   osv-scanner --update
   ```

2. **Use Correct Lockfile:**

   ```bash
   # Ensure using correct lockfile
   osv-scanner -L yarn.lock
   ```

3. **Check File Paths:**

   ```bash
   # Scan specific directories
   osv-scanner -r ./src
   ```

### Issue: Performance Problems

**Symptoms:**
- OSV-Scanner is slow on large codebases
- High memory usage

**Solutions:**

1. **Limit Scan Scope:**

   ```bash
   # Scan specific directories
   osv-scanner -r ./contracts ./src
   ```

2. **Use Parallel Processing:**

   ```bash
   # Enable parallel scanning
   osv-scanner --parallel=4
   ```

3. **Exclude Unnecessary Files:**

   ```bash
   # Skip test files
   osv-scanner --skip-git
   ```

### Issue: Database Connection Issues

**Symptoms:**
- Unable to download vulnerability database
- Network connectivity problems

**Solutions:**

1. **Check Network:**

   ```bash
   # Test connectivity
   curl -I https://osv.dev/
   ```

2. **Use Local Database:**

   ```bash
   # Download and use local DB
   osv-scanner --offline
   ```

3. **Proxy Configuration:**

   ```bash
   # Set proxy if needed
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

## 🔍 ESLint Security Issues

### Issue: False Positive Security Warnings

**Symptoms:**
- ESLint flags safe code as security violations
- Too many security warnings

**Solutions:**

1. **Configure ESLint Rules:**

   ```json
   // .eslintrc.json
   {
     "rules": {
       "security/detect-object-injection": "warn",
       "security/detect-eval-with-expression": "off"
     }
   }
   ```

2. **Use ESLint Disable Comments:**

   ```typescript
   // eslint-disable-next-line security/detect-object-injection
   const obj = {};
   obj[userInput] = value; // Safe in this context
   ```

3. **Custom Security Rules:**

   ```json
   // .eslintrc.json
   {
     "rules": {
       "security/detect-possible-timing-attacks": ["error", { "allow": ["crypto.timingSafeEqual"] }]
     }
   }
   ```

### Issue: Missing Security Rules

**Symptoms:**
- ESLint doesn't catch obvious security issues
- Security rules not working

**Solutions:**

1. **Check Plugin Installation:**

   ```bash
   # Verify plugin is installed
   yarn list eslint-plugin-security
   ```

2. **Update Configuration:**

   ```json
   // .eslintrc.json
   {
     "extends": [
       "plugin:security/recommended"
     ],
     "plugins": ["security"]
   }
   ```

3. **Run ESLint Manually:**

   ```bash
   # Test specific file
   yarn eslint src/file.ts --format=verbose
   ```

### Issue: Performance Issues

**Symptoms:**
- ESLint is slow on large files
- High CPU usage during linting

**Solutions:**

1. **Use Incremental Linting:**

   ```bash
   # Lint only changed files
   yarn lint-staged
   ```

2. **Configure Caching:**

   ```json
   // .eslintrc.json
   {
     "cache": true,
     "cacheLocation": ".eslintcache"
   }
   ```

3. **Limit Rule Scope:**

   ```json
   // .eslintrc.json
   {
     "overrides": [
       {
         "files": ["*.ts"],
         "rules": {
           "security/detect-object-injection": "warn"
         }
       }
     ]
   }
   ```

## 🔎 Semgrep Issues

### Issue: High False Positive Rate

**Symptoms:**
- Semgrep reports many false positives
- Too many irrelevant findings

**Solutions:**

1. **Tune Rules:**

   ```yaml
   # semgrep-rules/custom.yml
   rules:
     - id: custom-rule
       pattern: |
         eval($X)
       severity: ERROR
       languages: [javascript, typescript]
   ```

2. **Use Suppression Comments:**

   ```typescript
   // semgrep-disable-next-line: custom-rule
   eval(code); // Safe in this context
   ```

3. **Filter by Severity:**

   ```bash
   # Only show high-severity issues
   semgrep --severity ERROR
   ```

### Issue: Missing Expected Findings

**Symptoms:**
- Semgrep doesn't catch known security issues
- Rules not triggering

**Solutions:**

1. **Check Rule Syntax:**

   ```bash
   # Test rule syntax
   semgrep --validate --config semgrep-rules/
   ```

2. **Debug Rules:**

   ```bash
   # Enable debug output
   semgrep --debug
   ```

3. **Update Rules:**

   ```bash
   # Use latest rules
   semgrep --config r/security
   ```

### Issue: Performance Problems

**Symptoms:**
- Semgrep scans are slow
- High resource usage

**Solutions:**

1. **Limit Scan Scope:**

   ```bash
   # Scan specific files
   semgrep --include "*.ts" --exclude "test/"
   ```

2. **Use Baseline Scanning:**

   ```bash
   # Skip known issues
   semgrep --baseline-commit main
   ```

3. **Parallel Processing:**

   ```bash
   # Use multiple cores
   semgrep --jobs 4
   ```

## 🔐 Git-Secrets Issues

### Issue: False Positives

**Symptoms:**
- Git-secrets flags legitimate strings as secrets
- Too many false alarms

**Solutions:**

1. **Add Allowed Patterns:**

   ```bash
   # Allow specific patterns
   git secrets --add --allowed 'test_api_key'
   ```

2. **Create .gitallowed File:**

   ```bash
   # Add to .gitallowed
   echo 'harmless_string' >> .gitallowed
   ```

3. **Use Regex Patterns:**

   ```bash
   # More specific patterns
   git secrets --add 'api_key_[a-zA-Z0-9]{32}'
   ```

### Issue: Missing Secrets

**Symptoms:**
- Git-secrets doesn't catch obvious secrets
- Known leaks not detected

**Solutions:**

1. **Update Patterns:**

   ```bash
   # Add custom patterns
   git secrets --add 'private_key'
   git secrets --add 'BEGIN PRIVATE KEY'
   ```

2. **Register Additional Patterns:**

   ```bash
   # Use AWS patterns
   git secrets --register-aws
   ```

3. **Check Configuration:**

   ```bash
   # Verify patterns
   cat .git/allowed
   ```

### Issue: Hook Not Running

**Symptoms:**
- Pre-commit hook doesn't execute
- Secrets committed despite hook

**Solutions:**

1. **Check Hook Permissions:**

   ```bash
   # Make hook executable
   chmod +x .git/hooks/pre-commit
   ```

2. **Reinstall Hook:**

   ```bash
   # Reinstall git-secrets hook
   git secrets --install -f
   ```

3. **Verify Hook Content:**

   ```bash
   # Check hook exists
   cat .git/hooks/pre-commit
   ```

## 🔧 Slither Issues

### Issue: Analysis Timeout

**Symptoms:**
- Slither takes too long to analyze
- Command hangs or times out

**Solutions:**

1. **Limit Analysis Scope:**

   ```bash
   # Analyze specific contracts
   slither contracts/GNUSDAO.sol
   ```

2. **Use Detectors Selectively:**

   ```bash
   # Run only specific detectors
   slither contracts/ --detect reentrancy
   ```

3. **Exclude Dependencies:**

   ```bash
   # Skip external contracts
   slither contracts/ --exclude-dependencies
   ```

### Issue: False Positives

**Symptoms:**
- Slither reports issues that aren't real problems
- High false positive rate

**Solutions:**

1. **Configure Detectors:**

   ```json
   // slither.config.json
   {
     "exclude_detectors": [
       "pragma",
       "solc-version"
     ]
   }
   ```

2. **Use Suppression Comments:**

   ```solidity
   // slither-disable-next-line unused-return
   (bool success,) = addr.call(data);
   ```

3. **Filter Results:**

   ```bash
   # Filter by severity
   slither contracts/ --filter-paths "test/"
   ```

### Issue: Missing Issues

**Symptoms:**
- Slither doesn't catch known vulnerabilities
- Analysis seems incomplete

**Solutions:**

1. **Update Slither:**

   ```bash
   # Use latest version
   pip install --upgrade slither-analyzer
   ```

2. **Check Configuration:**

   ```bash
   # Verify config
   cat slither.config.json
   ```

3. **Run with Debug:**

   ```bash
   # Enable debug output
   slither contracts/ --debug
   ```

## 🔧 Husky Pre-commit Issues

### Issue: Hooks Not Running

**Symptoms:**
- Pre-commit hooks don't execute
- Security checks bypassed

**Solutions:**

1. **Check Hook Installation:**

   ```bash
   # Verify husky is set up
   cat .husky/pre-commit
   ```

2. **Make Hooks Executable:**

   ```bash
   # Fix permissions
   chmod +x .husky/pre-commit
   ```

3. **Reinstall Husky:**

   ```bash
   # Reinitialize husky
   yarn husky install
   ```

### Issue: Hook Performance Issues

**Symptoms:**
- Pre-commit hooks are too slow
- Developer productivity impacted

**Solutions:**

1. **Use lint-staged:**

   ```json
   // package.json
   {
     "lint-staged": {
       "*.ts": "eslint --cache",
       "*.sol": "slither"
     }
   }
   ```

2. **Parallel Execution:**

   ```json
   // .huskyrc.json
   {
     "hooks": {
       "pre-commit": "lint-staged && yarn test:quick"
     }
   }
   ```

3. **Caching:**

   ```bash
   # Enable tool caching
   export ESLINT_CACHE=true
   ```

### Issue: Emergency Bypass Not Working

**Symptoms:**
- Unable to bypass hooks in emergencies
- `--no-verify` not working

**Solutions:**

1. **Check Git Configuration:**

   ```bash
   # Verify bypass works
   git commit --no-verify -m "emergency fix"
   ```

2. **Update Hook Logic:**

   ```bash
   # Add emergency bypass to hook
   #!/bin/bash
   if [[ "$GIT_AUTHOR_NAME" == "emergency" ]]; then
     exit 0
   fi
   ```

## 🚨 CI/CD Pipeline Issues

### Issue: Security Checks Failing in CI

**Symptoms:**
- Pipeline fails on security checks
- Local passes but CI fails

**Solutions:**

1. **Check Environment Differences:**

   ```yaml
   # Ensure CI has same setup
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: '18'
       cache: 'yarn'
   ```

2. **Use Frozen Lockfile:**

   ```yaml
   - name: Install dependencies
     run: yarn install --frozen-lockfile
   ```

3. **Debug CI Issues:**

   ```yaml
   - name: Debug security check
     run: |
       yarn security-check || (echo "Security check failed" && exit 1)
   ```

### Issue: Tool Version Mismatches

**Symptoms:**
- Different results between local and CI
- Version conflicts

**Solutions:**

1. **Pin Tool Versions:**

   ```yaml
   # Use specific versions
   - name: Install tools
     run: |
       npm install -g snyk@1.1234.0
       pip install slither-analyzer==0.9.5
   ```

2. **Use Docker Images:**

   ```yaml
   - name: Run security scan
     uses: docker://trailofbits/slither-action:v0.1.0
   ```

3. **Version Checking:**

   ```yaml
   - name: Check versions
     run: |
       node --version
       yarn --version
       python --version
   ```

## 📋 General Troubleshooting Steps

### 1. Check Tool Versions

   ```bash
   # Verify all tools are up to date
   yarn --version
   node --version
   snyk --version
   semgrep --version
   slither --version
   ```

### 2. Clear Caches

   ```bash
   # Clear all tool caches
   rm -rf node_modules/.cache
   rm -rf .eslintcache
   yarn cache clean
   ```

### 3. Reinstall Tools

   ```bash
   # Reinstall all security tools
   yarn install
   pip install --upgrade slither-analyzer semgrep
   npm install -g snyk @socketsecurity/cli
   ```

### 4. Check Configurations

   ```bash
   # Validate all config files
   cat .eslintrc.json
   cat slither.config.json
   cat .snyk
   ```

### 5. Run Individual Tests

   ```bash
   # Test each tool separately
   yarn audit
   snyk test
   semgrep --config=auto
   slither contracts/
   ```

## 🚨 Getting Help

### Documentation Resources

- [Yarn Audit Docs](https://yarnpkg.com/features/security)
- [Snyk CLI Docs](https://docs.snyk.io/snyk-cli)
- [Socket.dev Docs](https://docs.socket.dev)
- [ESLint Security Plugin](https://github.com/nodesecurity/eslint-plugin-security)
- [Semgrep Docs](https://semgrep.dev/docs)
- [Slither Docs](https://github.com/crytic/slither)

### Community Support

- **GitHub Issues**: Report bugs in respective tool repositories
- **Security Team**: `security@gnus.ai` for GNUS-DAO specific issues
- **DevOps Team**: `devops@gnus.ai` for CI/CD pipeline issues

### Emergency Procedures

1. Document the issue with screenshots/logs
2. Try workarounds from this guide
3. Contact security team if issue persists
4. Use emergency bypass only as last resort

---

**Remember**: Most security tool issues have documented solutions. Check this guide first, then consult official documentation, and finally reach out to the security team.