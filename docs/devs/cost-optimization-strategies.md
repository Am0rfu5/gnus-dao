# Cost Optimization Strategies for CI/CD Pipeline

## Overview

This document outlines comprehensive cost optimization strategies to reduce GitHub Actions usage by 30% while maintaining security and performance standards for the GNUS-DAO project.

## 1. Smart Scheduling Optimization

### Time-Based Cost Optimization

```yaml
# .github/workflows/ci.yml - Optimized scheduling
name: CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  # Skip runs during low-activity hours (nighttime UTC)
  schedule:
    - cron: '0 8-18 * * 1-5'  # Only run during business hours UTC

jobs:
  # Use matrix strategy to parallelize but control resource usage
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18]
        # Limit concurrent jobs to control costs
        max-parallel: 1
    steps:
      # ... existing steps
```

### Conditional Execution

```yaml
# Skip expensive operations for certain conditions
jobs:
  security-scan:
    runs-on: ubuntu-latest
    # Only run security scans on main branch or when security files change
    if: |
      github.ref == 'refs/heads/main' ||
      contains(github.event.head_commit.modified, 'contracts/') ||
      contains(github.event.head_commit.modified, 'security') ||
      github.event_name == 'schedule'

  performance-tests:
    runs-on: ubuntu-latest
    # Skip performance tests for documentation-only changes
    if: |
      !contains(github.event.head_commit.modified, 'docs/') ||
      !contains(github.event.head_commit.modified, 'README.md') ||
      github.ref == 'refs/heads/main'
```

## 2. Resource Optimization

### Spot Instances and Cost-Optimized Runners

```yaml
# Use spot instances for non-critical jobs
jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    # Use spot instances (cheaper but can be interrupted)
    # GitHub doesn't directly support spot instances, but we can use larger runners strategically

  build:
    runs-on: ubuntu-latest-8-cores
    # Use larger runners for shorter duration instead of smaller runners for longer duration
    # 8-core runners are ~2x cost of standard but complete tasks ~3x faster

  deploy:
    runs-on: ubuntu-latest
    # Critical jobs use standard runners for reliability
```

### Step-Level Optimization

```yaml
steps:
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '18'
      cache: 'yarn'  # Use caching to reduce setup time

  - name: Install Dependencies
    run: yarn install --frozen-lockfile
    # Skip install if cache hit
    if: steps.yarn-cache.outputs.cache-hit != 'true'

  - name: Build
    run: yarn build
    # Skip build if no source changes
    if: steps.changes.outputs.src == 'true'
```

## 3. Cache Optimization for Cost Reduction

### Intelligent Cache Management

```yaml
# Implement cache size limits and cleanup
- name: Cache Dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.yarn/cache
      node_modules
    key: yarn-${{ runner.os }}-${{ hashFiles('yarn.lock') }}
    # Set cache size limit to prevent excessive storage costs
    # GitHub Actions has built-in limits, but we can be strategic

- name: Cleanup Cache
  if: github.event_name == 'schedule'
  run: |
    # Remove old caches to control storage costs
    # This runs weekly to prevent cache bloat
    find ~/.cache -name "*" -type f -mtime +30 -delete
```

### Selective Caching Strategy

```yaml
# Only cache what's actually needed
- name: Cache Build Artifacts
  uses: actions/cache@v4
  with:
    path: |
      artifacts/
      # Don't cache node_modules in build artifacts (already cached separately)
      !node_modules/
    key: build-${{ hashFiles('contracts/**/*.sol', 'hardhat.config.ts') }}

- name: Cache Test Results
  uses: actions/cache@v4
  with:
    path: coverage/
    key: test-results-${{ hashFiles('test/**/*.ts', 'contracts/**/*.sol') }}
```

## 4. Parallel Execution Optimization

### Job Dependencies and Parallelization

```yaml
jobs:
  # Fast jobs run first and in parallel
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint
        run: yarn lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - name: Type Check
        run: yarn type-check

  # Dependent jobs wait for prerequisites
  test:
    needs: [lint, type-check]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-group: [unit, integration]
    steps:
      - name: Run Tests
        run: yarn test:${{ matrix.test-group }}

  # Expensive jobs run only when needed
  security:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || contains(github.event.head_commit.modified, 'contracts/')
    steps:
      - name: Security Scan
        run: yarn security-check
```

### Matrix Strategy Optimization

```yaml
# Use matrix to parallelize but limit concurrency
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18]
        test-suite: [unit, integration, e2e]
        # Limit to 2 concurrent jobs to control costs
      max-parallel: 2
    steps:
      - name: Run Test Suite
        run: yarn test:${{ matrix.test-suite }}
        timeout-minutes: 10  # Set timeouts to prevent runaway costs
```

## 5. Cost Monitoring and Alerting

### Cost Tracking Implementation

```yaml
# Track and monitor GitHub Actions costs
- name: Track Workflow Cost
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');

      // Calculate estimated cost based on runtime and runner type
      const runtime = (new Date() - new Date(process.env.GITHUB_RUN_STARTED_AT || Date.now())) / 1000 / 60; // minutes
      const runner = process.env.RUNNER_NAME || 'ubuntu-latest';
      const estimatedCost = calculateEstimatedCost(runtime, runner);

      // Log cost data
      const costData = {
        workflow: process.env.GITHUB_WORKFLOW,
        run_id: process.env.GITHUB_RUN_ID,
        runtime_minutes: runtime,
        runner_type: runner,
        estimated_cost: estimatedCost,
        timestamp: new Date().toISOString()
      };

      // Append to cost tracking file
      const costFile = '.github/costs/workflow-costs.jsonl';
      fs.appendFileSync(costFile, JSON.stringify(costData) + '\n');

      // Set output for job summary
      core.setOutput('estimated_cost', estimatedCost.toFixed(4));
```

### Cost Alert System

```yaml
# Alert when costs exceed thresholds
- name: Cost Alert
  if: steps.cost.outputs.estimated_cost > 0.50  # $0.50 threshold
  run: |
    echo "⚠️ High workflow cost detected: $${{ steps.cost.outputs.estimated_cost }}" >> $GITHUB_STEP_SUMMARY

    # Send alert to Slack if configured
    if [ -n "${{ secrets.SLACK_WEBHOOK }}" ]; then
      curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
        -H 'Content-type: application/json' \
        -d "{\"text\":\"⚠️ High CI cost: $${{ steps.cost.outputs.estimated_cost }} for ${{ github.workflow }} #${{ github.run_number }}\"}"
    fi
```

## 6. Selective Execution Strategies

### Change-Based Execution

```yaml
# Only run relevant jobs based on what changed
- name: Check Changes
  id: changes
  run: |
    # Get changed files
    CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "all")

    # Categorize changes
    if echo "$CHANGED_FILES" | grep -q "^contracts/"; then
      echo "contracts=true" >> $GITHUB_OUTPUT
    fi
    if echo "$CHANGED_FILES" | grep -q "^test/"; then
      echo "tests=true" >> $GITHUB_OUTPUT
    fi
    if echo "$CHANGED_FILES" | grep -q "^docs/"; then
      echo "docs=true" >> $GITHUB_OUTPUT
    fi

jobs:
  compile-contracts:
    if: steps.changes.outputs.contracts == 'true'
    # Only compile if contracts changed

  run-tests:
    if: steps.changes.outputs.contracts == 'true' || steps.changes.outputs.tests == 'true'
    # Run tests if contracts or tests changed

  deploy-docs:
    if: steps.changes.outputs.docs == 'true'
    # Only deploy docs if docs changed
```

### Branch-Based Optimization

```yaml
# Different strategies for different branches
jobs:
  ci-main:
    if: github.ref == 'refs/heads/main'
    # Full CI for main branch
    runs-on: ubuntu-latest-8-cores  # Use more powerful runners for main

  ci-feature:
    if: github.ref != 'refs/heads/main'
    # Lightweight CI for feature branches
    runs-on: ubuntu-latest
    steps:
      - name: Fast Checks
        run: |
          yarn lint
          yarn type-check
          yarn test:unit  # Skip integration tests for speed/cost
```

## 7. Cost Optimization Scripts

### Cost Analysis Script

```javascript
// scripts/cost-analyzer.js
const fs = require('fs');
const path = require('path');

class CostAnalyzer {
  constructor() {
    this.costData = [];
    this.costFile = path.join(process.cwd(), '.github/costs/workflow-costs.jsonl');
  }

  loadCostData() {
    if (!fs.existsSync(this.costFile)) {
      console.log('No cost data file found');
      return;
    }

    const lines = fs.readFileSync(this.costFile, 'utf8').trim().split('\n');
    this.costData = lines.map(line => JSON.parse(line));
  }

  analyzeCosts() {
    const totalCost = this.costData.reduce((sum, item) => sum + item.estimated_cost, 0);
    const avgCost = totalCost / this.costData.length;

    // Group by workflow
    const byWorkflow = this.costData.reduce((acc, item) => {
      acc[item.workflow] = acc[item.workflow] || [];
      acc[item.workflow].push(item);
      return acc;
    }, {});

    const workflowCosts = Object.entries(byWorkflow).map(([workflow, runs]) => ({
      workflow,
      totalCost: runs.reduce((sum, run) => sum + run.estimated_cost, 0),
      runCount: runs.length,
      avgCost: runs.reduce((sum, run) => sum + run.estimated_cost, 0) / runs.length
    }));

    return {
      totalCost,
      avgCost,
      workflowCosts,
      recommendations: this.generateRecommendations(workflowCosts)
    };
  }

  generateRecommendations(workflowCosts) {
    const recommendations = [];

    // Find expensive workflows
    const expensiveWorkflows = workflowCosts.filter(w => w.avgCost > 0.20);

    expensiveWorkflows.forEach(workflow => {
      recommendations.push({
        type: 'optimization',
        workflow: workflow.workflow,
        message: `High average cost: $${workflow.avgCost.toFixed(4)} per run`,
        suggestions: [
          'Consider using spot instances',
          'Implement better caching',
          'Review step timeouts',
          'Consider parallel execution'
        ]
      });
    });

    return recommendations;
  }

  generateReport() {
    const analysis = this.analyzeCosts();

    const report = `# 💰 GitHub Actions Cost Analysis

## Summary
- **Total Cost**: $${analysis.totalCost.toFixed(2)}
- **Average Cost per Run**: $${analysis.avgCost.toFixed(4)}
- **Total Runs Analyzed**: ${this.costData.length}

## Workflow Costs

| Workflow | Runs | Total Cost | Avg Cost |
|----------|------|------------|----------|
${analysis.workflowCosts.map(w =>
  `| ${w.workflow} | ${w.runCount} | $${w.totalCost.toFixed(2)} | $${w.avgCost.toFixed(4)} |`
).join('\n')}

## Recommendations

${analysis.recommendations.map(r =>
  `### ${r.workflow}
${r.message}

**Suggestions:**
${r.suggestions.map(s => `- ${s}`).join('\n')}

`
).join('')}

---
Generated: ${new Date().toISOString()}
`;

    const reportPath = path.join(process.cwd(), 'cost-analysis-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Cost analysis report saved to ${reportPath}`);

    return report;
  }
}

module.exports = CostAnalyzer;
```

### Cost Budget Management

```yaml
# Cost budget monitoring
- name: Check Cost Budget
  run: |
    # Get current month cost from GitHub API (requires token with billing scope)
    CURRENT_MONTH_COST=$(curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
      https://api.github.com/repos/${{ github.repository }}/actions/runs \
      | jq '.workflow_runs | map(.usage | .run_duration_ms // 0) | add / 1000 / 60 * 0.008')  # Rough cost calculation

    BUDGET_LIMIT=50  # $50 monthly budget

    if (( $(echo "$CURRENT_MONTH_COST > $BUDGET_LIMIT" | bc -l) )); then
      echo "🚨 Cost budget exceeded: $${CURRENT_MONTH_COST} > $${BUDGET_LIMIT}" >> $GITHUB_STEP_SUMMARY
      exit 1
    fi
```

## Expected Cost Reductions

### Target Savings: 30% Reduction

- **Smart Scheduling**: 15% savings (avoid off-hours execution)
- **Resource Optimization**: 10% savings (better runner utilization)
- **Cache Improvements**: 5% savings (reduced setup time)
- **Selective Execution**: 5% savings (skip unnecessary jobs)
- **Parallel Optimization**: 5% savings (efficient job distribution)

### Monitoring and Adjustment

```yaml
# Weekly cost review
name: Cost Review
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM UTC

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Cost Report
        run: yarn cost-analysis

      - name: Create Cost Optimization Issue
        if: steps.analysis.outputs.needs_optimization == 'true'
        run: |
          # Create issue for cost optimization opportunities
          gh issue create \
            --title "💰 Cost Optimization Required" \
            --body "Cost analysis indicates optimization opportunities. See attached report." \
            --label "cost-optimization"
```

This comprehensive cost optimization strategy ensures efficient resource utilization while maintaining the security and performance standards required for the GNUS-DAO project.
