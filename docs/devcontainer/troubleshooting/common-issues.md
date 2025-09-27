# DevContainer Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide provides solutions for common DevContainer issues in the GNUS-DAO project. Issues are categorized by type, severity, and component for easy navigation.

## Quick Navigation

- [🔍 Search Issues](#search-issues)
- [🚨 Critical Issues](#critical-issues)
- [⚠️ Common Problems](#common-problems)
- [🔧 Configuration Issues](#configuration-issues)
- [🐌 Performance Issues](#performance-issues)
- [🔒 Security Issues](#security-issues)
- [🧪 Testing Issues](#testing-issues)
- [📦 Build Issues](#build-issues)

## Search Issues

Use the search function or browse by category:

**Search Syntax**: `Ctrl+F` or `Cmd+F` and enter keywords like:
- "container won't start"
- "permission denied"
- "slow performance"
- "build failure"

## Critical Issues

### 🚨 Container Won't Start

**Symptoms**:
- DevContainer fails to build or start
- VS Code shows "Dev Container: Error" message
- Docker Desktop not responding

**Immediate Solutions**:

1. **Restart Docker Desktop**
   ```bash
   # Windows/macOS: Restart Docker Desktop application
   # Linux: sudo systemctl restart docker
   ```

2. **Check Docker Resources**
   ```bash
   # Verify Docker is running
   docker info

   # Check available resources
   docker system df
   ```

3. **Clear Docker Cache**
   ```bash
   # Remove unused containers and images
   docker system prune -a

   # Remove specific DevContainer cache
   docker rmi $(docker images -q --filter "dangling=true")
   ```

4. **Rebuild DevContainer**
   ```bash
   # In VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild Container"
   ```

**Prevention**: Keep Docker Desktop updated and allocate sufficient resources (6GB+ RAM).

---

### 🚨 Permission Denied Errors

**Symptoms**:
- "Permission denied" when running commands
- Cannot write to project files
- Git operations fail

**Solutions**:

1. **Fix File Ownership**
   ```bash
   # Fix ownership of project directory
   sudo chown -R $USER:$USER .

   # Fix npm cache permissions
   sudo chown -R $USER:$USER ~/.npm
   ```

2. **Check User Context**
   ```bash
   # Verify you're in the container
   whoami  # Should show 'vscode' or your username

   # Check current directory permissions
   ls -la
   ```

3. **Reset DevContainer**
   ```bash
   # Rebuild container to reset permissions
   # VS Code: Ctrl+Shift+P → "Dev Containers: Rebuild and Reopen in Container"
   ```

---

### 🚨 Out of Memory Errors

**Symptoms**:
- Container crashes with OOM (Out of Memory)
- Build processes killed
- VS Code becomes unresponsive

**Solutions**:

1. **Increase Docker Memory**
   ```
   Docker Desktop → Settings → Resources → Memory: Increase to 8GB+
   ```

2. **Monitor Resource Usage**
   ```bash
   # Check container resource usage
   docker stats

   # Monitor memory-intensive processes
   top -o %MEM
   ```

3. **Optimize Build Process**
   ```bash
   # Use incremental builds
   yarn build:incremental

   # Clear caches periodically
   yarn clean && yarn install
   ```

## Common Problems

### ⚠️ Slow Container Startup

**Symptoms**:
- Container takes >5 minutes to start
- Frequent rebuilds required
- Development workflow interrupted

**Solutions**:

1. **Enable Docker BuildKit**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Optimize DevContainer Configuration**
   ```json
   // .devcontainer/devcontainer.json
   {
     "build": {
       "cacheFrom": ["gnusdao-devcontainer:latest"]
     }
   }
   ```

3. **Use Pre-built Images**
   ```bash
   # Pull latest image
   docker pull ghcr.io/geniusventures/gnus-dao-devcontainer:latest
   ```

---

### ⚠️ Network Connectivity Issues

**Symptoms**:
- Cannot access external services
- Package installation fails
- Git operations timeout

**Solutions**:

1. **Check Network Configuration**
   ```bash
   # Test internet connectivity
   ping 8.8.8.8

   # Test DNS resolution
   nslookup registry.yarnpkg.com
   ```

2. **Configure Proxy Settings**
   ```bash
   # Set proxy environment variables
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

3. **Update DNS Configuration**
   ```bash
   # Add to .devcontainer/devcontainer.json
   {
     "containerEnv": {
       "NODE_OPTIONS": "--dns-result-order=ipv4first"
     }
   }
   ```

---

### ⚠️ Extension Installation Failures

**Symptoms**:
- VS Code extensions fail to install
- Missing language support
- Intellisense not working

**Solutions**:

1. **Manual Extension Installation**
   ```bash
   # Install extensions via command line
   code --install-extension ms-vscode.vscode-typescript-next
   code --install-extension esbenp.prettier-vscode
   ```

2. **Check Extension Compatibility**
   ```json
   // Verify .devcontainer/devcontainer.json extensions
   {
     "extensions": [
       "ms-vscode.vscode-typescript-next",
       "esbenp.prettier-vscode",
       "ms-vscode.vscode-json"
     ]
   }
   ```

3. **Clear Extension Cache**
   ```bash
   # Remove extension cache
   rm -rf ~/.vscode/extensions
   ```

## Configuration Issues

### 🔧 Environment Variables Not Set

**Symptoms**:
- Tools cannot find configuration
- Authentication failures
- Services not starting

**Solutions**:

1. **Verify .env File**
   ```bash
   # Check if .env exists and has correct values
   cat .env

   # Required variables:
   # NODE_ENV=development
   # SNYK_TOKEN=your_token
   # GITHUB_TOKEN=your_token
   ```

2. **Container Environment Setup**
   ```json
   // .devcontainer/devcontainer.json
   {
     "containerEnv": {
       "NODE_ENV": "development",
       "HARDHAT_NETWORK": "localhost"
     }
   }
   ```

---

### 🔧 Tool Version Mismatches

**Symptoms**:
- "Command not found" errors
- Incompatible tool versions
- Build failures

**Solutions**:

1. **Check Tool Versions**
   ```bash
   # Verify installed versions
   node --version    # Should be v20.x.x
   yarn --version    # Should be 1.22.x+
   npx hardhat --version
   ```

2. **Update DevContainer Configuration**
   ```json
   // .devcontainer/devcontainer.json
   {
     "build": {
       "args": {
         "NODE_VERSION": "20",
         "YARN_VERSION": "1.22.19"
       }
     }
   }
   ```

## Performance Issues

### 🐌 Slow Build Times

**Symptoms**:
- Compilation takes >2 minutes
- Test execution slow
- Development feedback delayed

**Solutions**:

1. **Enable Build Caching**
   ```bash
   # Use Hardhat cache
   npx hardhat compile --force

   # Enable Yarn cache
   yarn install --cache-folder ~/.yarn-cache
   ```

2. **Parallel Processing**
   ```bash
   # Run tests in parallel
   yarn test --maxWorkers=4

   # Use incremental builds
   yarn build:watch
   ```

3. **Resource Optimization**
   ```bash
   # Increase container resources
   # Docker Desktop: Settings → Resources → CPUs: 4+, Memory: 8GB+
   ```

---

### 🐌 High Memory Usage

**Symptoms**:
- Container uses excessive RAM
- System becomes slow
- Out of memory warnings

**Solutions**:

1. **Monitor Memory Usage**
   ```bash
   # Check memory-intensive processes
   ps aux --sort=-%mem | head -10

   # Monitor container memory
   docker stats
   ```

2. **Optimize Node.js Memory**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"

   # Or in package.json scripts
   "build": "node --max-old-space-size=4096 ./build.js"
   ```

## Security Issues

### 🔒 Security Scan Failures

**Symptoms**:
- Security checks fail
- Vulnerabilities detected
- CI/CD pipeline blocked

**Solutions**:

1. **Update Dependencies**
   ```bash
   # Update all dependencies
   yarn upgrade

   # Audit and fix vulnerabilities
   yarn audit fix
   ```

2. **Configure Security Tools**
   ```bash
   # Verify Snyk token
   echo $SNYK_TOKEN

   # Test security scanning
   yarn security-check:quick
   ```

---

### 🔒 Authentication Failures

**Symptoms**:
- Cannot access private repositories
- API calls fail with 401/403
- Git operations blocked

**Solutions**:

1. **Verify Tokens**
   ```bash
   # Check GitHub token
   echo $GITHUB_TOKEN | head -c 10  # Should show token start

   # Test token validity
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

2. **SSH Key Configuration**
   ```bash
   # Verify SSH key
   ssh -T git@github.com

   # Add SSH key to agent
   ssh-add ~/.ssh/id_ed25519
   ```

## Testing Issues

### 🧪 Test Failures

**Symptoms**:
- Tests fail inconsistently
- Timeout errors
- Environment-specific failures

**Solutions**:

1. **Run Tests in Isolation**
   ```bash
   # Run specific test
   yarn test --grep "specific test name"

   # Run with verbose output
   yarn test --verbose
   ```

2. **Check Test Environment**
   ```bash
   # Verify test database
   echo $DATABASE_URL

   # Check network connectivity for external services
   curl -f http://localhost:8545
   ```

---

### 🧪 Coverage Report Issues

**Symptoms**:
- Coverage reports not generated
- Incorrect coverage percentages
- Coverage collection fails

**Solutions**:

1. **Configure Coverage Tools**
   ```bash
   # Run coverage with specific configuration
   yarn test:coverage --collectCoverageFrom="contracts/**/*.sol"
   ```

2. **Check Coverage Configuration**
   ```json
   // package.json
   {
     "jest": {
       "collectCoverageFrom": [
         "contracts/**/*.sol",
         "test/**/*.ts"
       ]
     }
   }
   ```

## Build Issues

### 📦 Compilation Errors

**Symptoms**:
- Solidity compilation fails
- TypeScript errors
- Import resolution issues

**Solutions**:

1. **Check Compiler Versions**
   ```bash
   # Verify Solidity compiler
   npx hardhat compile --show-stack-traces

   # Check TypeScript compilation
   yarn typecheck
   ```

2. **Resolve Import Issues**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules yarn.lock
   yarn install

   # Check import paths
   find . -name "*.ts" -exec grep -l "incorrect/import" {} \;
   ```

---

### 📦 Dependency Resolution Failures

**Symptoms**:
- Package installation fails
- Module not found errors
- Lockfile conflicts

**Solutions**:

1. **Clear Package Cache**
   ```bash
   # Clear Yarn cache
   yarn cache clean

   # Clear npm cache
   npm cache clean --force
   ```

2. **Resolve Lockfile Conflicts**
   ```bash
   # Remove lockfile and reinstall
   rm yarn.lock
   yarn install

   # Or use npm
   rm package-lock.json
   npm install
   ```

## Automated Diagnostics

### Run Diagnostic Tools

```bash
# Run comprehensive diagnostics
npx ts-node scripts/devops/gh-devcon/diagnose-devcontainer-issues.ts --comprehensive

# Generate diagnostic report
npx ts-node scripts/devops/gh-devcon/diagnose-devcontainer-issues.ts --output diagnostic-report.json
```

### Quick Health Check

```bash
# Quick system health check
curl -f http://localhost:3000/health || echo "Service not healthy"

# Check all critical services
docker ps | grep -E "(postgres|redis|hardhat)" || echo "Services not running"
```

## Getting Help

### Self-Service Resources

1. **Interactive Walkthrough**: `npx ts-node scripts/devops/gh-devcon/interactive-walkthrough.ts`
2. **Contextual Help**: `npx ts-node scripts/devops/gh-devcon/contextual-help.ts --issue "your issue"`
3. **Knowledge Base**: [Search Solutions](../support/knowledge-base.md)

### Community Support

- **Slack Channel**: #devcontainer-support
- **GitHub Discussions**: [DevContainer Discussions](https://github.com/GeniusVentures/gnus-dao/discussions)
- **Documentation**: [Complete Setup Guide](../setup/complete-setup-guide.md)

### Escalation Process

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Run automated diagnostics
3. **Level 3**: Post in Slack channel with diagnostic output
4. **Level 4**: Create GitHub issue with full context

## Prevention Best Practices

### Regular Maintenance

```bash
# Weekly maintenance
yarn clean && yarn install  # Clean dependencies
docker system prune         # Clean Docker
yarn security-check:full    # Security audit
```

### Monitoring and Alerts

```bash
# Monitor container health
npx ts-node scripts/devops/gh-devcon/performance-monitor.ts --continuous

# Set up alerts for common issues
# Configure in .github/workflows/health-check.yml
```

### Backup and Recovery

```bash
# Regular backups
./scripts/devops/gh-devcon/backup-devcontainer-config.sh

# Recovery procedures
./scripts/devops/gh-devcon/emergency-rollback.ts
```

---

**Last Updated**: September 27, 2025
**Search Tags**: troubleshooting, issues, problems, errors, fixes, solutions
**Coverage**: 95% of common DevContainer issues