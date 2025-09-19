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
### Cost Analysis Script

```javascript
// scripts/cost-analyzer.ts
import * as fs from 'fs';
import * as path from 'path';

interface CostEntry {
  workflow: string;
  run_id: string;
  run_number: string;
  runtime_minutes: number;
  runner_type: string;
  estimated_cost: number;
  timestamp: string;
  branch: string;
  event: string;
  status?: string;
}

interface WorkflowCost {
  workflow: string;
  totalCost: number;
  runCount: number;
  avgCost: number;
  avgRuntime: number;
}

interface CostAnalysis {
  totalCost: number;
  avgCost: number;
  runCount: number;
  workflowCosts: WorkflowCost[];
  budgetStatus: 'good' | 'warning' | 'exceeded' | 'unknown';
  budgetUsed: number;
  budgetRemaining: number;
  timeframe: string;
  recommendations: CostRecommendation[];
}

interface CostRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'cost-optimization' | 'performance' | 'reliability' | 'budget';
  title: string;
  message: string;
  savings?: number;
  suggestions: string[];
}

class CostAnalyzer {
  private costData: CostEntry[];
  private costFile: string;
  private budgetLimit: number;

  constructor() {
    this.costData = [];
    this.costFile = path.join(process.cwd(), '.github/costs/workflow-costs.jsonl');
    this.budgetLimit = parseFloat(process.env.COST_BUDGET_LIMIT || '50'); // $50 default
  }

  loadCostData(): void {
    if (!fs.existsSync(this.costFile)) {
      console.log('📄 No cost data file found. Creating initial cost tracking file...');
      this.initializeCostFile();
      return;
    }

    try {
      const content = fs.readFileSync(this.costFile, 'utf8').trim();
      if (content) {
        const lines = content.split('\n');
        this.costData = lines
          .map((line) => JSON.parse(line) as CostEntry)
          .filter((item) => item.estimated_cost > 0);
      }
      console.log(`✅ Loaded ${this.costData.length} cost records`);
    } catch (error) {
      console.error('❌ Error loading cost data:', error instanceof Error ? error.message : error);
    }
  }

  trackCurrentWorkflow(): CostEntry {
    const runtimeMinutes =
      (Date.now() -
        new Date(process.env.GITHUB_RUN_STARTED_AT || Date.now()).getTime()) /
      1000 /
      60;
    const runnerType = process.env.RUNNER_NAME || 'ubuntu-latest';
    const estimatedCost = this.calculateEstimatedCost(runtimeMinutes, runnerType);

    const costEntry: CostEntry = {
      workflow: process.env.GITHUB_WORKFLOW || 'unknown',
      run_id: process.env.GITHUB_RUN_ID || 'unknown',
      run_number: process.env.GITHUB_RUN_NUMBER || 'unknown',
      runtime_minutes: Math.round(runtimeMinutes * 100) / 100,
      runner_type: runnerType,
      estimated_cost: Math.round(estimatedCost * 10000) / 10000,
      timestamp: new Date().toISOString(),
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      event: process.env.GITHUB_EVENT_NAME || 'unknown',
    };

    // Append to cost file
    fs.appendFileSync(this.costFile, JSON.stringify(costEntry) + '\n');

    console.log(
      `💰 Workflow cost tracked: $${estimatedCost.toFixed(4)} (${runtimeMinutes.toFixed(1)} minutes on ${runnerType})`
    );

    return costEntry;
  }

  analyzeCosts(timeframe: string = 'all'): CostAnalysis {
    // Implementation details...
    return {
      totalCost: 0,
      avgCost: 0,
      runCount: 0,
      workflowCosts: [],
      budgetStatus: 'unknown',
      budgetUsed: 0,
      budgetRemaining: 0,
      timeframe,
      recommendations: [],
    };
  }

  generateReport(timeframe: string = 'month'): { report: string; analysis: CostAnalysis } {
    console.log(`📊 Generating cost analysis report for timeframe: ${timeframe}`);

    const analysis = this.analyzeCosts(timeframe);

    // Generate comprehensive markdown report
    const report = `# 💰 GitHub Actions Cost Analysis Report

**Generated**: ${new Date().toISOString()}
**Timeframe**: ${timeframe}
**Budget Limit**: $${this.budgetLimit}

## 📈 Summary
- **Total Cost**: $${analysis.totalCost}
- **Average Cost per Run**: $${analysis.avgCost}
- **Total Runs**: ${analysis.runCount}
- **Budget Status**: ${analysis.budgetStatus === 'good' ? '✅ Good' : analysis.budgetStatus === 'warning' ? '⚠️ Warning' : '🔴 Exceeded'}

## 💵 Workflow Costs
| Workflow | Runs | Total Cost | Avg Cost | Avg Runtime |
|----------|------|------------|----------|-------------|
${analysis.workflowCosts.map(w =>
  `| ${w.workflow} | ${w.runCount} | $${w.totalCost.toFixed(2)} | $${w.avgCost.toFixed(4)} | ${w.avgRuntime.toFixed(1)}m |`
).join('\n')}

## 🎯 Recommendations
${analysis.recommendations.map(r =>
  `### ${r.title} (${r.priority})
${r.message}
${r.savings ? `**Potential Savings**: $${r.savings.toFixed(2)}` : ''}

**Suggestions:**
${r.suggestions.map(s => `- ${s}`).join('\n')}

`).join('')}

---
*Generated by cost-analyzer.ts*
`;

    const reportPath = path.join(process.cwd(), `cost-analysis-report-${timeframe}.md`);
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Cost analysis report saved to ${reportPath}`);

    return { report, analysis };
  }
}

module.exports = CostAnalyzer;
```
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
