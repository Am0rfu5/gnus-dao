# GNUS-DAO DevContainer Quick Start (30 Minutes)

## 🎯 What You'll Achieve
- ✅ DevContainer development environment running
- ✅ First successful build and test execution
- ✅ Security scanning functional
- ✅ Ready for productive development

## ⏱️ Time Investment
- **Setup**: 15 minutes
- **Validation**: 10 minutes
- **First workflow**: 5 minutes

## 📋 Prerequisites Checklist
- [ ] Docker Desktop installed and running
- [ ] VS Code with DevContainer extension
- [ ] Git configured with SSH keys
- [ ] GNUS-DAO repository cloned

## 🚀 Step-by-Step Setup

### Step 1: Open in DevContainer (5 minutes)
1. Open VS Code in GNUS-DAO project directory
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
3. Type "Dev Containers: Reopen in Container"
4. Wait for container build (first time: 3-5 minutes)

**✅ Validation**: Terminal prompt shows `vscode@...` and `node --version` returns v20.x

### Step 2: Verify Development Environment (5 minutes)
```bash
# Test core functionality
yarn --version          # Should show 1.22.x+
node --version          # Should show v20.x
npx hardhat --version   # Should show Hardhat version

# Verify security tools
snyk --version          # Should show Snyk CLI version
semgrep --version       # Should show Semgrep version
```

**✅ Validation**: All commands return version numbers without errors

### Step 3: Run First Build and Test (5 minutes)
```bash
# Install dependencies (uses cache after first time)
yarn install

# Compile contracts
yarn compile

# Run sample tests
yarn test:quick
```

**✅ Validation**: Tests pass and build completes without errors

### Step 4: Verify Security Integration (3 minutes)
```bash
# Run security check
yarn security-check:quick

# Should complete without critical issues
```

**✅ Validation**: Security scan completes with status report

### Step 5: Test GitHub Integration (2 minutes)
```bash
# Simulate CI workflow locally
yarn ci:local

# Verify all checks pass
```

**✅ Validation**: All local CI checks pass successfully

## 🎉 Success! You're Ready to Develop

### What's Working Now:
- ✅ Full development environment in DevContainer
- ✅ All build and test tools functional
- ✅ Security scanning integrated
- ✅ GitHub CI/CD compatibility verified

### Next Steps:
1. **[Advanced Configuration](../setup/complete-setup-guide.md)** - Customize your environment
2. **[Workflow Optimization](../advanced/workflow-optimization.md)** - Improve performance
3. **[Troubleshooting Guide](../troubleshooting/common-issues.md)** - When things go wrong

## 🆘 Quick Help

### Common Issues:
| Issue | Quick Fix |
|-------|-----------|
| Container won't start | Restart Docker Desktop |
| Permission errors | Check file ownership: `sudo chown -R $USER .` |
| Slow performance | Increase Docker memory to 6GB+ |
| Tests failing | Run `yarn clean && yarn install` |

### Get Help:
- 📚 [Troubleshooting Guide](../troubleshooting/common-issues.md)
- 💬 Ask in #devcontainer-support Slack channel
- 🎫 [Create issue](../../.github/ISSUE_TEMPLATE/devcontainer-issue.yml) for bugs

**Estimated total time: 30 minutes** ⏱️