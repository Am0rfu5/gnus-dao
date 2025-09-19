#!/usr/bin/env node

/**
 * Test Sharding Distributor for GNUS-DAO
 * Intelligently distributes tests across multiple CI runners for optimal performance
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TestShardDistributor {
  constructor(totalShards, shardIndex) {
    this.totalShards = parseInt(totalShards);
    this.shardIndex = parseInt(shardIndex);
    this.testFiles = [];
    this.testGroups = {
      unit: [],
      integration: [],
      e2e: [],
      security: [],
      deployment: [],
    };
  }

  findTestFiles() {
    const testDir = path.join(process.cwd(), "test");

    function findFiles(dir) {
      const files = [];

      if (!fs.existsSync(dir)) {
        return files;
      }

      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...findFiles(fullPath));
        } else if (item.endsWith(".test.ts") || item.endsWith(".spec.ts")) {
          files.push(fullPath);
        }
      });

      return files;
    }

    this.testFiles = findFiles(testDir);
    console.log(`Found ${this.testFiles.length} test files`);
  }

  analyzeTestFiles() {
    this.testFiles.forEach((file) => {
      const content = fs.readFileSync(file, "utf8");
      const relativePath = path.relative(process.cwd(), file);

      // Categorize tests based on file path and content
      let category = "unit"; // default

      if (
        relativePath.includes("/integration/") ||
        content.includes("describe.*integration")
      ) {
        category = "integration";
      } else if (
        relativePath.includes("/e2e/") ||
        content.includes("end-to-end") ||
        content.includes("e2e")
      ) {
        category = "e2e";
      } else if (
        relativePath.includes("/security/") ||
        content.includes("security") ||
        content.includes("audit")
      ) {
        category = "security";
      } else if (
        relativePath.includes("/deployment/") ||
        content.includes("deploy")
      ) {
        category = "deployment";
      }

      this.testGroups[category].push({
        file: relativePath,
        size: content.length,
        testCount: (content.match(/it\(|describe\(/g) || []).length,
        category,
      });
    });

    // Log distribution
    Object.entries(this.testGroups).forEach(([category, tests]) => {
      console.log(`${category}: ${tests.length} files`);
    });
  }

  distributeTests() {
    const distribution = {
      tests: [],
      groups: {},
      metadata: {
        shard: this.shardIndex,
        totalShards: this.totalShards,
        totalTests: this.testFiles.length,
      },
    };

    // Distribute each test group across shards
    Object.entries(this.testGroups).forEach(([category, tests]) => {
      if (tests.length === 0) return;

      const shardSize = Math.ceil(tests.length / this.totalShards);
      const startIndex = this.shardIndex * shardSize;
      const endIndex = Math.min(startIndex + shardSize, tests.length);

      const shardTests = tests.slice(startIndex, endIndex);

      distribution.groups[category] = shardTests;
      distribution.tests.push(...shardTests.map((t) => t.file));
    });

    // Sort tests for consistent execution order
    distribution.tests.sort();

    distribution.metadata.testCount = distribution.tests.length;
    distribution.metadata.categories = Object.fromEntries(
      Object.entries(distribution.groups).map(([cat, tests]) => [
        cat,
        tests.length,
      ]),
    );

    return distribution;
  }

  balanceLoad(distribution) {
    // Analyze test execution times and rebalance if needed
    // This is a simplified version - in practice, you'd use historical data

    const avgTestTime = 2; // seconds per test (estimate)
    const estimatedTime = distribution.metadata.testCount * avgTestTime;

    distribution.metadata.estimatedDuration = estimatedTime;
    distribution.metadata.loadBalance = this.calculateLoadBalance(distribution);

    return distribution;
  }

  calculateLoadBalance(distribution) {
    // Calculate how evenly distributed the tests are
    const shardSizes = new Array(this.totalShards).fill(0);
    shardSizes[this.shardIndex] = distribution.tests.length;

    // Estimate other shard sizes (simplified)
    const totalTests = this.testFiles.length;
    const avgShardSize = Math.floor(totalTests / this.totalShards);

    for (let i = 0; i < this.totalShards; i++) {
      if (i !== this.shardIndex) {
        shardSizes[i] = avgShardSize;
      }
    }

    const maxSize = Math.max(...shardSizes);
    const minSize = Math.min(...shardSizes);
    const balance = maxSize === 0 ? 1 : minSize / maxSize;

    return {
      score: balance,
      maxShard: maxSize,
      minShard: minSize,
      variance: this.calculateVariance(shardSizes),
    };
  }

  calculateVariance(sizes) {
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance =
      sizes.reduce((acc, size) => acc + Math.pow(size - mean, 2), 0) /
      sizes.length;
    return Math.sqrt(variance);
  }

  generateExecutionPlan(distribution) {
    // Generate optimal execution order based on test dependencies and types
    const executionPlan = {
      ...distribution,
      execution: {
        order: this.optimizeExecutionOrder(distribution),
        parallelGroups: this.identifyParallelGroups(distribution),
        estimatedTime: distribution.metadata.estimatedDuration,
      },
    };

    return executionPlan;
  }

  optimizeExecutionOrder(distribution) {
    // Order tests for optimal execution (fast tests first, dependencies considered)
    const ordered = [];

    // Fast unit tests first
    ordered.push(
      ...distribution.groups.unit.map((t) => ({ ...t, priority: 1 })),
    );

    // Integration tests next
    ordered.push(
      ...distribution.groups.integration.map((t) => ({ ...t, priority: 2 })),
    );

    // Security tests (important but potentially slow)
    ordered.push(
      ...distribution.groups.security.map((t) => ({ ...t, priority: 3 })),
    );

    // E2E tests last (slowest)
    ordered.push(
      ...distribution.groups.e2e.map((t) => ({ ...t, priority: 4 })),
    );

    // Deployment tests
    ordered.push(
      ...distribution.groups.deployment.map((t) => ({ ...t, priority: 5 })),
    );

    // Sort by priority, then by estimated execution time
    ordered.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.size || 0) - (b.size || 0); // Smaller files first
    });

    return ordered.map((item) => item.file);
  }

  identifyParallelGroups(distribution) {
    // Group tests that can run in parallel
    const groups = {
      fast: [],
      medium: [],
      slow: [],
    };

    Object.values(distribution.groups)
      .flat()
      .forEach((test) => {
        const size = test.size || 0;
        if (size < 1000) {
          groups.fast.push(test.file);
        } else if (size < 5000) {
          groups.medium.push(test.file);
        } else {
          groups.slow.push(test.file);
        }
      });

    return groups;
  }

  saveDistribution(distribution) {
    const outputDir = path.join(process.cwd(), ".test-shards");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `shard-${this.shardIndex}-of-${this.totalShards}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(distribution, null, 2));
    console.log(`Saved test distribution to ${filepath}`);
  }

  run() {
    console.log(
      `🧩 Distributing tests across ${this.totalShards} shards (shard ${this.shardIndex})`,
    );

    this.findTestFiles();
    this.analyzeTestFiles();

    let distribution = this.distributeTests();
    distribution = this.balanceLoad(distribution);
    distribution = this.generateExecutionPlan(distribution);

    this.saveDistribution(distribution);

    // Output for CI consumption
    console.log(
      "::set-output name=distribution::" + JSON.stringify(distribution),
    );

    return distribution;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: node test-sharding.js <total-shards> <shard-index>");
    console.error("Example: node test-sharding.js 4 0");
    process.exit(1);
  }

  const [totalShards, shardIndex] = args;

  if (isNaN(totalShards) || isNaN(shardIndex) || shardIndex >= totalShards) {
    console.error(
      "Invalid arguments: total-shards must be a number, shard-index must be < total-shards",
    );
    process.exit(1);
  }

  const distributor = new TestShardDistributor(totalShards, shardIndex);
  distributor.run();
}

module.exports = TestShardDistributor;
