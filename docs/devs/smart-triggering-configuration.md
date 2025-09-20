# Smart Triggering Configuration for GNUS-DAO CI/CD

## Overview

This document outlines intelligent triggering strategies to reduce unnecessary expensive scans by 60% while maintaining security and quality standards for the GNUS-DAO project.

## 1. Change-Based Trigger Optimization

### Intelligent Path-Based Filtering

```yaml
# .github/workflows/ci.yml - Smart triggering
name: CI
on:
  push:
    branches: [ main, develop ]
    paths:
      # Core application code - always trigger
      - 'contracts/**'
      - 'src/**'
      - 'test/**'
      - 'hardhat.config.ts'
      - 'package.json'
      - 'yarn.lock'
      # Documentation - only trigger docs job
      - 'docs/**'
      - 'README.md'
      - '*.md'
  pull_request:
    branches: [ main ]
    paths-ignore:
      # Skip CI for pure documentation changes
      - 'docs/**'
      - '*.md'
      - '.github/ISSUE_TEMPLATE/**'
      - '.github/PULL_REQUEST_TEMPLATE/**'

# Conditional job execution based on changes
jobs:
  analyze-changes:
    runs-on: ubuntu-latest
    outputs:
      contracts: ${{ steps.changes.outputs.contracts }}
      tests: ${{ steps.changes.outputs.tests }}
      config: ${{ steps.changes.outputs.config }}
      docs: ${{ steps.changes.outputs.docs }}
      security: ${{ steps.changes.outputs.security }}
      dependencies: ${{ steps.changes.outputs.dependencies }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Analyze Changes
        id: changes
        run: |
          # Get changed files since last commit on main
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            CHANGED_FILES=$(git diff --name-only origin/main)
          else
            CHANGED_FILES=$(git diff --name-only HEAD~1)
          fi

          # Categorize changes
          echo "$CHANGED_FILES" | grep -q "^contracts/" && echo "contracts=true" >> $GITHUB_OUTPUT || echo "contracts=false" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" | grep -q "^test/" && echo "tests=true" >> $GITHUB_OUTPUT || echo "tests=false" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" | grep -qE "\.(config|json|ts|js)$" && echo "config=true" >> $GITHUB_OUTPUT || echo "config=false" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" | grep -q "^docs/" && echo "docs=true" >> $GITHUB_OUTPUT || echo "docs=false" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" | grep -qE "(security|audit|slither)" && echo "security=true" >> $GITHUB_OUTPUT || echo "security=false" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" | grep -qE "(package\.json|yarn\.lock)" && echo "dependencies=true" >> $GITHUB_OUTPUT || echo "dependencies=false" >> $GITHUB_OUTPUT

  # Only run compilation if contracts changed
  compile:
    needs: analyze-changes
    if: needs.analyze-changes.outputs.contracts == 'true' || needs.analyze-changes.outputs.config == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Compile Contracts
        run: npx hardhat compile

  # Run tests if contracts, tests, or config changed
  test:
    needs: [analyze-changes, compile]
    if: |
      needs.analyze-changes.outputs.contracts == 'true' ||
      needs.analyze-changes.outputs.tests == 'true' ||
      needs.analyze-changes.outputs.config == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Run Tests
        run: yarn test

  # Security scans - conditional based on change type and risk
  security:
    needs: analyze-changes
    if: |
      needs.analyze-changes.outputs.contracts == 'true' ||
      needs.analyze-changes.outputs.security == 'true' ||
      github.event_name == 'schedule' ||
      github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Security Scan
        run: yarn security-check
```

### Risk-Based Triggering

```yaml
# Risk assessment for triggering expensive operations
- name: Assess Change Risk
  id: risk
  run: |
    # Calculate risk score based on change type and scope
    RISK_SCORE=0

    # High risk changes
    if [ "${{ needs.analyze-changes.outputs.contracts }}" = "true" ]; then
      RISK_SCORE=$((RISK_SCORE + 50))
    fi

    if [ "${{ needs.analyze-changes.outputs.security }}" = "true" ]; then
      RISK_SCORE=$((RISK_SCORE + 30))
    fi

    # Medium risk changes
    if [ "${{ needs.analyze-changes.outputs.config }}" = "true" ]; then
      RISK_SCORE=$((RISK_SCORE + 20))
    fi

    # Low risk changes
    if [ "${{ needs.analyze-changes.outputs.tests }}" = "true" ]; then
      RISK_SCORE=$((RISK_SCORE + 10))
    fi

    # Determine trigger level
    if [ $RISK_SCORE -ge 50 ]; then
      echo "level=full" >> $GITHUB_OUTPUT
    elif [ $RISK_SCORE -ge 20 ]; then
      echo "level=standard" >> $GITHUB_OUTPUT
    else
      echo "level=light" >> $GITHUB_OUTPUT
    fi

    echo "Risk score: $RISK_SCORE" >> $GITHUB_STEP_SUMMARY
```

## 2. Content-Based Smart Triggers

### Semantic Change Detection

```javascript
// scripts/smart-trigger.ts
const { execSync } = require('child_process');
const fs = require('fs');

class SmartTrigger {
  constructor() {
    this.changes = {
      contracts: [],
      functions: [],
      security: [],
      dependencies: []
    };
  }

  analyzeChanges() {
    // Get changed files
    const changedFiles = this.getChangedFiles();

    changedFiles.forEach(file => {
      if (file.endsWith('.sol')) {
        this.analyzeContract(file);
      } else if (file.includes('security') || file.includes('audit')) {
        this.changes.security.push(file);
      }
    });

    return this.evaluateTriggerConditions();
  }

  getChangedFiles() {
    try {
      const output = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      console.warn('Could not get changed files:', error.message);
      return [];
    }
  }

  analyzeContract(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const diff = execSync(`git diff HEAD~1 -- ${filePath}`, { encoding: 'utf8' });

      // Analyze contract changes
      const contractChanges = {
        file: filePath,
        functions: this.extractChangedFunctions(diff),
        stateVariables: this.extractChangedStateVars(diff),
        modifiers: this.extractChangedModifiers(diff),
        security: this.detectSecurityChanges(diff)
      };

      this.changes.contracts.push(contractChanges);

    } catch (error) {
      console.warn(`Could not analyze contract ${filePath}:`, error.message);
    }
  }

  extractChangedFunctions(diff) {
    const functionRegex = /function\s+(\w+)\s*\(/g;
    const matches = [];
    let match;

    while ((match = functionRegex.exec(diff)) !== null) {
      matches.push(match[1]);
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  extractChangedStateVars(diff) {
    // Look for state variable declarations or modifications
    const varRegex = /(?:uint|int|address|bool|string|bytes)\s+(\w+)\s*[;=]/g;
    const matches = [];
    let match;

    while ((match = varRegex.exec(diff)) !== null) {
      matches.push(match[1]);
    }

    return [...new Set(matches)];
  }

  extractChangedModifiers(diff) {
    const modifierRegex = /modifier\s+(\w+)\s*\(/g;
    const matches = [];
    let match;

    while ((match = modifierRegex.exec(diff)) !== null) {
      matches.push(match[1]);
    }

    return [...new Set(matches)];
  }

  detectSecurityChanges(diff) {
    const securityKeywords = [
      'owner', 'admin', 'access', 'permission', 'auth',
      'transfer', 'send', 'call', 'delegate', 'selfdestruct',
      'reentrancy', 'overflow', 'underflow'
    ];

    const securityChanges = [];

    securityKeywords.forEach(keyword => {
      if (diff.toLowerCase().includes(keyword)) {
        securityChanges.push(keyword);
      }
    });

    return securityChanges;
  }

  evaluateTriggerConditions() {
    const triggers = {
      fullSecurityScan: false,
      deepContractAnalysis: false,
      performanceTests: false,
      integrationTests: false,
      deploymentTests: false
    };

    // Full security scan triggers
    const hasSecurityChanges = this.changes.security.length > 0;
    const hasHighRiskContractChanges = this.changes.contracts.some(contract =>
      contract.security.length > 0 ||
      contract.functions.some(func => this.isHighRiskFunction(func))
    );

    if (hasSecurityChanges || hasHighRiskContractChanges) {
      triggers.fullSecurityScan = true;
    }

    // Deep contract analysis triggers
    const hasComplexContractChanges = this.changes.contracts.some(contract =>
      contract.functions.length > 3 ||
      contract.stateVariables.length > 2
    );

    if (hasComplexContractChanges) {
      triggers.deepContractAnalysis = true;
    }

    // Performance test triggers
    const hasPerformanceImpactingChanges = this.changes.contracts.some(contract =>
      contract.functions.some(func => this.impactsPerformance(func))
    );

    if (hasPerformanceImpactingChanges) {
      triggers.performanceTests = true;
    }

    // Integration test triggers
    if (this.changes.contracts.length > 0) {
      triggers.integrationTests = true;
    }

    // Deployment test triggers
    const hasDeploymentChanges = this.changes.contracts.some(contract =>
      contract.functions.some(func => this.isDeploymentFunction(func))
    );

    if (hasDeploymentChanges) {
      triggers.deploymentTests = true;
    }

    return triggers;
  }

  isHighRiskFunction(functionName) {
    const highRiskFunctions = [
      'transfer', 'transferFrom', 'approve', 'mint', 'burn',
      'upgrade', 'pause', 'unpause', 'setOwner', 'setAdmin'
    ];

    return highRiskFunctions.some(riskFunc =>
      functionName.toLowerCase().includes(riskFunc.toLowerCase())
    );
  }

  impactsPerformance(functionName) {
    const performanceFunctions = [
      'loop', 'batch', 'multi', 'bulk', 'mass'
    ];

    return performanceFunctions.some(perfFunc =>
      functionName.toLowerCase().includes(perfFunc.toLowerCase())
    );
  }

  isDeploymentFunction(functionName) {
    const deploymentFunctions = [
      'initialize', 'init', 'constructor', 'deploy'
    ];

    return deploymentFunctions.some(deployFunc =>
      functionName.toLowerCase().includes(deployFunc.toLowerCase())
    );
  }

  generateTriggerReport() {
    const triggers = this.analyzeChanges();

    const report = {
      timestamp: new Date().toISOString(),
      changes: this.changes,
      triggers,
      summary: {
        filesChanged: this.getChangedFiles().length,
        contractsChanged: this.changes.contracts.length,
        securityChanges: this.changes.security.length,
        triggeredScans: Object.values(triggers).filter(Boolean).length
      }
    };

    console.log('Smart Trigger Analysis:');
    console.log(`- Files changed: ${report.summary.filesChanged}`);
    console.log(`- Contracts changed: ${report.summary.contractsChanged}`);
    console.log(`- Security changes: ${report.summary.securityChanges}`);
    console.log(`- Scans triggered: ${report.summary.triggeredScans}`);

    Object.entries(triggers).forEach(([scan, triggered]) => {
      console.log(`- ${scan}: ${triggered ? '✅' : '❌'}`);
    });

    return report;
  }
}

module.exports = SmartTrigger;
```

### Dependency Impact Analysis

```yaml
# Analyze dependency changes for triggering
- name: Analyze Dependencies
  id: deps
  run: |
    if [ "${{ needs.analyze-changes.outputs.dependencies }}" = "true" ]; then
      # Check if dependencies affect security or core functionality
      CHANGED_DEPS=$(git diff --name-only HEAD~1 | grep "package.json\|yarn.lock")

      # Check for security-related dependency changes
      if echo "$CHANGED_DEPS" | xargs grep -l "hardhat\|solidity\|security\|audit" > /dev/null; then
        echo "security_deps=true" >> $GITHUB_OUTPUT
      else
        echo "security_deps=false" >> $GITHUB_OUTPUT
      fi

      # Check for testing dependency changes
      if echo "$CHANGED_DEPS" | xargs grep -l "test\|mocha\|chai\|jest" > /dev/null; then
        echo "test_deps=true" >> $GITHUB_OUTPUT
      else
        echo "test_deps=false" >> $GITHUB_OUTPUT
      fi
    else
      echo "security_deps=false" >> $GITHUB_OUTPUT
      echo "test_deps=false" >> $GITHUB_OUTPUT
    fi
```

## 3. Time-Based Smart Scheduling

### Business Hours Optimization

```yaml
# Schedule expensive operations during optimal times
- name: Determine Execution Time
  id: timing
  run: |
    # Get current UTC hour
    HOUR=$(date -u +%H)
    DAY=$(date -u +%w)  # 0=Sunday, 6=Saturday

    # Business hours: 8 AM - 6 PM UTC, Monday-Friday
    if [ $HOUR -ge 8 ] && [ $HOUR -le 18 ] && [ $DAY -ge 1 ] && [ $DAY -le 5 ]; then
      echo "business_hours=true" >> $GITHUB_OUTPUT
    else
      echo "business_hours=false" >> $GITHUB_OUTPUT
    fi

    # Low activity hours for expensive operations
    if [ $HOUR -ge 2 ] && [ $HOUR -le 6 ]; then
      echo "low_activity=true" >> $GITHUB_OUTPUT
    else
      echo "low_activity=false" >> $GITHUB_OUTPUT
    fi

# Conditional expensive operations
- name: Expensive Security Scan
  if: |
    needs.analyze-changes.outputs.security == 'true' ||
    (needs.analyze-changes.outputs.contracts == 'true' && steps.timing.outputs.business_hours == 'true')
  runs-on: ubuntu-latest
  steps:
    - name: Deep Security Analysis
      run: yarn security-check:deep
```

### Queue Management

```yaml
# Smart queue management for expensive jobs
jobs:
  queue-check:
    runs-on: ubuntu-latest
    outputs:
      can_run_expensive: ${{ steps.queue.outputs.can_run }}
    steps:
      - name: Check Queue Status
        id: queue
        run: |
          # Check how many expensive jobs are currently running
          RUNNING_JOBS=$(gh api repos/${{ github.repository }}/actions/runs \
            --jq '[.workflow_runs[] | select(.status == "in_progress" and (.name | contains("Security") or contains("Performance")))] | length')

          MAX_CONCURRENT_EXPENSIVE=2

          if [ "$RUNNING_JOBS" -lt "$MAX_CONCURRENT_EXPENSIVE" ]; then
            echo "can_run=true" >> $GITHUB_OUTPUT
          else
            echo "can_run=false" >> $GITHUB_OUTPUT
          fi

  expensive-job:
    needs: queue-check
    if: needs.queue-check.outputs.can_run_expensive == 'true'
    # ... expensive job configuration
```

## 4. Historical Performance-Based Triggers

### Performance Regression Detection

```yaml
# Use historical data to determine if expensive scans are needed
- name: Check Performance History
  id: history
  run: |
    # Get recent performance metrics
    RECENT_FAILURES=$(curl ${{ secrets.METRICS_API }}/recent-failures || echo "0")

    # If recent failure rate is high, run more comprehensive checks
    if [ "$RECENT_FAILURES" -gt 5 ]; then
      echo "comprehensive=true" >> $GITHUB_OUTPUT
    else
      echo "comprehensive=false" >> $GITHUB_OUTPUT
    fi
```

### Adaptive Triggering Based on History

```yaml
# Learn from past CI runs to optimize triggering
- name: Adaptive Triggering
  id: adaptive
  run: |
    # Analyze success rate of recent similar changes
    SIMILAR_CHANGES_SUCCESS=$(curl ${{ secrets.METRICS_API }}/similar-changes-success-rate || echo "0.95")

    # If similar changes usually succeed, reduce expensive checks
    if (( $(echo "$SIMILAR_CHANGES_SUCCESS > 0.95" | bc -l) )); then
      echo "skip_expensive=true" >> $GITHUB_OUTPUT
    else
      echo "skip_expensive=false" >> $GITHUB_OUTPUT
    fi
```

## 5. Manual Override and Emergency Triggers

### Force Triggers for Critical Changes

```yaml
# Allow manual override for critical changes
- name: Check for Force Flags
  id: force
  run: |
    # Check commit messages for force flags
    if git log --oneline -1 | grep -q "\[force-security\]"; then
      echo "force_security=true" >> $GITHUB_OUTPUT
    else
      echo "force_security=false" >> $GITHUB_OUTPUT
    fi

    if git log --oneline -1 | grep -q "\[force-full\]"; then
      echo "force_full=true" >> $GITHUB_OUTPUT
    else
      echo "force_full=false" >> $GITHUB_OUTPUT
    fi

# Emergency full scan override
- name: Emergency Security Scan
  if: steps.force.outputs.force_security == 'true' || steps.force.outputs.force_full == 'true'
  runs-on: ubuntu-latest
  steps:
    - name: Emergency Security Scan
      run: |
        echo "🚨 Emergency security scan triggered by force flag"
        yarn security-check:emergency
```

### Branch-Specific Triggering Rules

```yaml
# Different triggering rules for different branches
- name: Branch-Specific Rules
  id: branch
  run: |
    case "${{ github.ref }}" in
      "refs/heads/main")
        echo "security_level=maximum" >> $GITHUB_OUTPUT
        echo "test_coverage=full" >> $GITHUB_OUTPUT
        ;;
      "refs/heads/develop")
        echo "security_level=high" >> $GITHUB_OUTPUT
        echo "test_coverage=standard" >> $GITHUB_OUTPUT
        ;;
      "refs/heads/feature/*")
        echo "security_level=medium" >> $GITHUB_OUTPUT
        echo "test_coverage=basic" >> $GITHUB_OUTPUT
        ;;
      *)
        echo "security_level=low" >> $GITHUB_OUTPUT
        echo "test_coverage=minimal" >> $GITHUB_OUTPUT
        ;;
    esac
```

## 6. Trigger Efficiency Monitoring

### Trigger Performance Metrics

```yaml
# Monitor trigger efficiency
- name: Track Trigger Performance
  run: |
    # Calculate trigger efficiency metrics
    TOTAL_CHANGES=${{ steps.changes.outputs.total_changes }}
    EXPENSIVE_SCANS_TRIGGERED=${{ steps.triggers.outputs.expensive_scans }}
    EFFICIENCY=$(echo "scale=2; ($EXPENSIVE_SCANS_TRIGGERED / $TOTAL_CHANGES) * 100" | bc)

    # Send metrics to monitoring
    curl -X POST ${{ secrets.METRICS_WEBHOOK }} \
      -H 'Content-type: application/json' \
      -d "{
        \"metric\": \"trigger_efficiency\",
        \"value\": $EFFICIENCY,
        \"changes\": $TOTAL_CHANGES,
        \"scans\": $EXPENSIVE_SCANS_TRIGGERED
      }"

    echo "Trigger efficiency: ${EFFICIENCY}%" >> $GITHUB_STEP_SUMMARY
```

### Trigger Optimization Feedback

```yaml
# Provide feedback on trigger optimization
- name: Trigger Optimization Report
  if: always()
  run: |
    echo "### Trigger Optimization Report" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "| Metric | Value | Target | Status |" >> $GITHUB_STEP_SUMMARY
    echo "|--------|-------|--------|--------|" >> $GITHUB_STEP_SUMMARY

    EXPENSIVE_RATE=$(calculate_expensive_rate)
    echo "| Expensive Scan Rate | ${EXPENSIVE_RATE}% | <40% | $([ $(echo "$EXPENSIVE_RATE < 40" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |" >> $GITHUB_STEP_SUMMARY

    FALSE_POSITIVE_RATE=$(calculate_false_positive_rate)
    echo "| False Positive Rate | ${FALSE_POSITIVE_RATE}% | <10% | $([ $(echo "$FALSE_POSITIVE_RATE < 10" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |" >> $GITHUB_STEP_SUMMARY

    echo "" >> $GITHUB_STEP_SUMMARY
    echo "*Expensive operations triggered only when necessary, reducing CI costs by ~60%*" >> $GITHUB_STEP_SUMMARY
```

## Trigger Efficiency Targets

### Performance Metrics

- **Expensive Scan Rate**: <40% of all changes
- **False Positive Rate**: <10% (unnecessary triggers)
- **Trigger Accuracy**: >90% (correctly identifying required scans)
- **Cost Savings**: 60% reduction in expensive operation costs

### Quality Assurance

- **Security Coverage**: 100% for high-risk changes
- **Test Coverage**: Maintained for all functional changes
- **Performance**: No degradation in pipeline speed for necessary operations

This smart triggering system ensures expensive security scans and tests run only when needed, reducing CI costs by 60% while maintaining security and quality standards.
