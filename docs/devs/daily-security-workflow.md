# Daily Security Workflow Guide

## Overview

This guide outlines the security practices integrated into your daily development workflow for GNUS-DAO. Security is not an afterthought—it's built into every step of the development process.

## 🏁 Start of Day - Environment Check

### 1. Security Environment Verification (2 minutes)

**Daily Ritual**: Run this check every morning before starting work.

```bash
# Quick security status check
cd gnus-dao
yarn security-check

# Verify your environment is ready
git status
yarn --version && node --version
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

### 2. Repository Status Check (1 minute)

```bash
# Check for security updates or alerts
git fetch origin
git status

# Review any security notifications
# Check GitHub Security tab for new alerts
```

### 3. Update Dependencies (if needed)

```bash
# Only update dependencies when Dependabot creates PRs
# Never update manually without security review
yarn install --frozen-lockfile
```

## 💻 Development Workflow

### Pre-Development Setup

#### Branch Creation with Security Context

```bash
# Create feature branch with descriptive name
git checkout -b feature/add-user-authentication

# Verify branch protection rules are in place
git branch -r | grep -E "(main|develop)"
```

#### Environment Variables Check

```bash
# Ensure .env.local exists and is properly configured
ls -la .env.local

# Never commit sensitive environment variables
git check-ignore .env.local
```

### Code Development with Security

#### Security-First Coding Practices

##### 1. Input Validation

```typescript
// ✅ Good: Always validate inputs
function transferTokens(to: string, amount: bigint) {
    if (!to || to === ethers.ZeroAddress) {
        throw new Error("Invalid recipient address");
    }
    if (amount <= 0n) {
        throw new Error("Invalid transfer amount");
    }
    // ... rest of function
}
```

##### 2. Access Control

```typescript
// ✅ Good: Check permissions before actions
modifier onlyAuthorized(bytes4 selector) {
    if (!LibAccessControl.hasRole(msg.sender, selector)) {
        revert UnauthorizedAccess();
    }
    _;
}
```

##### 3. State Changes

```typescript
// ✅ Good: State changes before external calls
function updateBalance(address user, uint256 newBalance) external {
    // State change first
    balances[user] = newBalance;

    // External call last (check-effects-interactions pattern)
    emit BalanceUpdated(user, newBalance);
}
```

#### Diamond Proxy Security Patterns

**Facet Development:**

```solidity
// ✅ Good: Proper facet implementation
contract GNUSDAOAccessControlFacet is IGNUSDAOAccessControlFacet {
    // Use diamond storage pattern
    function s() internal pure returns (GNUSDAODiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function grantRole(bytes32 role, address account) external {
        // Proper access control
        require(s().admin == msg.sender, "Unauthorized");

        s().roles[role].members[account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
}
```

**Selector Collision Prevention:**

```typescript
// ✅ Good: Check for selector conflicts
const selectors = await diamondLoupeFacet.facets();
const newSelectors = getSelectors(newFacet);

// Check for conflicts
for (const selector of newSelectors) {
    const existing = selectors.find(f => f.functionSelectors.includes(selector));
    if (existing) {
        throw new Error(`Selector collision: ${selector}`);
    }
}
```

### Testing with Security Focus

#### Run Tests Frequently

```bash
# Run all tests
yarn test

# Run security-specific tests
yarn test --grep "security"

# Run Diamond proxy tests
yarn test:diamond

# Run upgrade safety tests
yarn test:upgrade
```

#### Security Test Categories

**Unit Tests:**

```typescript
describe("Security: Access Control", () => {
    it("should prevent unauthorized access", async () => {
        await expect(
            accessControl.connect(unauthorizedUser).grantRole(ADMIN_ROLE, user.address)
        ).to.be.revertedWith("UnauthorizedAccess");
    });

    it("should validate input parameters", async () => {
        await expect(
            token.transfer(ethers.ZeroAddress, 100)
        ).to.be.revertedWith("Invalid recipient");
    });
});
```

**Integration Tests:**

```typescript
describe("Security: Diamond Proxy Integration", () => {
    it("should maintain state consistency across facets", async () => {
        // Test facet interactions
        await governanceFacet.propose(proposalData);
        await accessControlFacet.grantRole(VOTER_ROLE, voter.address);
        await governanceFacet.vote(proposalId, true);

        const proposal = await governanceFacet.getProposal(proposalId);
        expect(proposal.votes).to.equal(1);
    });
});
```

### Pre-Commit Security Validation

#### Automatic Checks (via Husky)

The following run automatically on `git commit`:

1. **ESLint Security Rules** - Catches common vulnerabilities
2. **Semgrep Security Scan** - Detects injection and crypto issues
3. **Git Secrets** - Prevents credential leaks
4. **TypeScript Compilation** - Ensures type safety

#### Manual Pre-Commit Verification

```bash
# Run security checks manually before committing
yarn lint:security
yarn semgrep:scan
yarn git-secrets

# Verify no sensitive data is being committed
git diff --cached | grep -i "password\|secret\|key\|token"
```

## 🔄 Pull Request Workflow

### Creating Security-Conscious PRs

#### PR Title and Description

```
feat: add multi-signature wallet support

## Security Considerations
- ✅ Input validation for all wallet addresses
- ✅ Access control checks for wallet operations
- ✅ Reentrancy protection on state changes
- ✅ Event emission for all state modifications

## Testing
- ✅ Unit tests for access control
- ✅ Integration tests for wallet operations
- ✅ Security tests for edge cases
- ✅ Diamond proxy upgrade compatibility
```

#### Security Checklist for PRs

- [ ] **Input Validation**: All user inputs validated
- [ ] **Access Control**: Proper authorization checks
- [ ] **State Changes**: Check-effects-interactions pattern
- [ ] **External Calls**: Safe external contract interactions
- [ ] **Events**: All state changes emit events
- [ ] **Tests**: Security test coverage > 90%
- [ ] **Diamond Compatibility**: No selector collisions
- [ ] **Documentation**: Security implications documented

### Code Review Security Focus

#### Reviewer Security Checklist

- [ ] **Authorization**: All functions have proper access control
- [ ] **Input Validation**: Parameters validated appropriately
- [ ] **State Management**: Safe state change patterns
- [ ] **External Dependencies**: Safe external contract calls
- [ ] **Error Handling**: Proper error messages (no sensitive data leaks)
- [ ] **Gas Optimization**: No DoS vulnerabilities
- [ ] **Upgrade Safety**: Compatible with Diamond proxy upgrades

#### Security Review Questions

- Can an attacker bypass access controls?
- Are all inputs properly validated?
- Could reentrancy attacks succeed?
- Are external calls safe?
- Does the code handle edge cases?
- Are there any information leaks?
- Is the Diamond proxy integration secure?

## 🚨 Security Incident Response

### During Development

#### If You Find a Security Issue

1. **Stop Development**: Don't continue working on the affected code
2. **Document the Issue**: Note what you found and how
3. **Contact Security Team**: [security-lead@gnus.ai](mailto:security-lead@gnus.ai)
4. **Follow Response Procedures**: Use appropriate incident playbook

#### Common Development Security Issues

**Dependency Vulnerability:**

```bash
# Check specific package
yarn audit --audit-level moderate package-name

# Update if security patch available
yarn upgrade package-name
```

**Code Security Issue:**

```typescript
// ❌ Bad: SQL injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good: Parameterized query
const query = `SELECT * FROM users WHERE id = ?`;
const result = await db.query(query, [userId]);
```

**Secret Leakage:**

```bash
# Check for secrets in code
grep -r "password\|secret\|key\|token" --exclude-dir=node_modules .

# Use environment variables instead
const apiKey = process.env.API_KEY;
```

### Emergency Procedures

#### Critical Security Bypass (Rare)

- **Only for production outages**
- **Requires security lead approval**
- **Must be documented and reviewed within 24 hours**

```bash
# Emergency commit bypass (only with approval)
git commit --no-verify -m "EMERGENCY: Critical fix approved by security-lead@gnus.ai"
```

## 📊 End of Day - Security Review

### Daily Security Summary (5 minutes)

#### Code Quality Check

```bash
# Final security verification
yarn security-check

# Check test coverage
yarn test:coverage

# Verify no security debt accumulation
yarn audit --audit-level moderate
```

#### Documentation Updates

- Update security documentation if new patterns discovered
- Document any security decisions made during development
- Review and update threat models if needed

#### Repository Hygiene

```bash
# Clean up temporary branches
git branch -d feature/completed-work

# Ensure no sensitive files committed
git log --name-only | grep -E "\.(key|pem|env|secret)$"
```

## 🛡️ Security Best Practices Reference

### Code Security
- **Validate all inputs** - Never trust user data
- **Check authorization** - Every function needs access control
- **Safe state changes** - Use check-effects-interactions pattern
- **Emit events** - All state changes should be logged
- **Handle errors safely** - Don't leak sensitive information

### Diamond Proxy Security
- **Selector collision detection** - Always check for conflicts
- **Facet isolation** - Keep facet responsibilities separate
- **Upgrade safety** - Test upgrades thoroughly
- **Storage patterns** - Use proper diamond storage

### Testing Security
- **Unit test security logic** - Test access controls and validations
- **Integration test interactions** - Test cross-facet communication
- **Fuzz testing** - Test edge cases and unexpected inputs
- **Upgrade testing** - Verify upgrade compatibility

### Development Security
- **Regular security checks** - Run security tools frequently
- **Code review focus** - Security is everyone's responsibility
- **Documentation** - Keep security docs current
- **Training** - Stay updated on security best practices

## 📞 Getting Help

### Security Resources
- **Security Documentation**: `docs/devs/security-documentation-index.md`
- **Incident Playbooks**: `docs/incident-playbooks/`
- **Security Team**: security-lead@gnus.ai
- **Emergency**: +1-555-SECURITY

### Quick Commands Reference
```bash
# Security check
yarn security-check

# Security tests
yarn test --grep "security"

# Diamond tests
yarn test:diamond

# Dependency audit
yarn audit

# Code security scan
yarn lint:security
```

---

**Remember**: Security is everyone's responsibility. When in doubt, ask the security team. Better to be safe than sorry.

**Last Updated**: September 18, 2025
**Guide Version**: 1.0.0
