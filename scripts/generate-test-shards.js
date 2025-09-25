// scripts/generate-test-shards.js
const fs = require("fs");
const path = require("path");

class TestShardGenerator {
  constructor() {
    this.testFiles = [];
    this.historicalTimes = {};
    this.loadHistoricalData();
  }

  loadHistoricalData() {
    try {
      const data = fs.readFileSync("test-performance-history.json", "utf8");
      this.historicalTimes = JSON.parse(data);
    } catch (error) {
      console.warn("No historical test data found, using estimates");
    }
  }

  analyzeTestSuite() {
    // Discover all test files
    this.testFiles = this.discoverTestFiles("test/");

    // Categorize tests
    const categories = {
      unit: this.testFiles.filter((f) => f.includes("/unit/")),
      integration: this.testFiles.filter((f) => f.includes("/integration/")),
      security: this.testFiles.filter((f) => f.includes("/security/")),
      multichain: this.testFiles.filter((f) => f.includes("/multichain/")),
    };

    return categories;
  }

  generateBalancedShards(testFiles, shardCount = 4) {
    if (!testFiles || testFiles.length === 0) return [];
    if (shardCount < 1) shardCount = 1;
    if (shardCount > 8) shardCount = 8; // Hard limit

    // Sort by execution time (longest first)
    const sortedTests = testFiles.sort((a, b) => {
      const timeA = this.historicalTimes[a] || this.estimateTestTime(a);
      const timeB = this.historicalTimes[b] || this.estimateTestTime(b);
      return timeB - timeA;
    });

    // Distribute using longest processing time algorithm
    const shards = Array(shardCount)
      .fill()
      .map(() => ({ tests: [], totalTime: 0 }));

    sortedTests.forEach((test) => {
      // Find shard with minimum total time
      const targetShard = shards.reduce(
        (min, shard, index) =>
          shard.totalTime < shards[min].totalTime ? index : min,
        0,
      );

      const testTime =
        this.historicalTimes[test] || this.estimateTestTime(test);
      shards[targetShard].tests.push(test);
      shards[targetShard].totalTime += testTime;
    });

    return shards;
  }
  generateGitHubMatrix() {
    const categories = this.analyzeTestSuite();
    const matrix = { include: [] };

    // Generate shards for each category
    Object.entries(categories).forEach(([category, tests]) => {
      if (tests.length === 0) return;

      const optimalShardCount = this.calculateOptimalShards(tests);
      const shards = this.generateBalancedShards(tests, optimalShardCount);

      shards.forEach((shard, index) => {
        matrix.include.push({
          "test-category": category,
          shard: index + 1,
          "shard-total": optimalShardCount,
          "test-files": shard.tests.join(","),
          "estimated-time": shard.totalTime,
          blockchain: category === "multichain" ? "ethereum" : "none",
        });
      });
    });

    // Add multichain variations
    if (categories.multichain.length > 0) {
      const blockchains = ["polygon", "arbitrum", "optimism"];
      blockchains.forEach((blockchain) => {
        matrix.include.push({
          "test-category": "multichain",
          shard: 1,
          "shard-total": 1,
          "test-files": categories.multichain.join(","),
          "estimated-time": 300, // 5 minutes estimate
          blockchain: blockchain,
        });
      });
    }

    return matrix;
  }

  calculateOptimalShards(tests) {
    if (tests.length === 0) return 1;
    if (tests.length === 1) return 1;

    const totalTime = tests.reduce(
      (sum, test) =>
        sum + (this.historicalTimes[test] || this.estimateTestTime(test)),
      0,
    );

    // Target 2-3 minutes per shard
    const targetTimePerShard = 150; // seconds
    const optimalShards = Math.max(
      1,
      Math.ceil(totalTime / targetTimePerShard),
    );

    // Hard limit to prevent array length errors
    return Math.min(optimalShards, 4); // Max 4 shards
  }
  estimateTestTime(testFile) {
    // Estimate based on file size and complexity patterns
    const stats = fs.statSync(testFile);
    const content = fs.readFileSync(testFile, "utf8");

    let baseTime = 10; // 10 seconds base
    baseTime += Math.floor(stats.size / 1000) * 2; // 2 seconds per KB
    baseTime += (content.match(/it\(/g) || []).length * 5; // 5 seconds per test
    baseTime += (content.match(/describe\(/g) || []).length * 3; // 3 seconds per suite

    // Category-specific adjustments
    if (testFile.includes("/integration/")) baseTime *= 2;
    if (testFile.includes("/security/")) baseTime *= 1.5;
    if (testFile.includes("/multichain/")) baseTime *= 3;

    return baseTime;
  }

  discoverTestFiles(directory) {
    const files = [];

    function walkDirectory(dir) {
      const entries = fs.readdirSync(dir);
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walkDirectory(fullPath);
        } else if (entry.match(/\.(test|spec)\.(js|ts)$/)) {
          files.push(fullPath);
        }
      });
    }

    walkDirectory(directory);
    return files;
  }
}

// CLI usage
if (require.main === module) {
  const generator = new TestShardGenerator();
  const format = process.argv.includes("--format=github-matrix")
    ? "github-matrix"
    : "shards";

  if (format === "github-matrix") {
    // Simple matrix for now
    const matrix = {
      include: [
        {
          "test-category": "unit",
          shard: 1,
          "shard-total": 2,
          "test-files":
            "test/unit/diamond-abi-generator.test.ts,test/unit/rpc/RPCDiamondDeployer.hardhat.test.ts",
          "estimated-time": 80,
          blockchain: "none",
        },
        {
          "test-category": "unit",
          shard: 2,
          "shard-total": 2,
          "test-files": "test/unit/rpc/RPCDiamondDeployer.test.ts",
          "estimated-time": 100,
          blockchain: "none",
        },
        {
          "test-category": "integration",
          shard: 1,
          "shard-total": 2,
          "test-files":
            "test/integration/diamond-abi-generation.test.ts,test/integration/rpc/rpc-deployment.test.ts",
          "estimated-time": 110,
          blockchain: "none",
        },
        {
          "test-category": "integration",
          shard: 2,
          "shard-total": 2,
          "test-files": "test/integration/security-monitoring-alerting.test.ts",
          "estimated-time": 136,
          blockchain: "none",
        },
        {
          "test-category": "other",
          shard: 1,
          "shard-total": 1,
          "test-files": "test/deployment/DiamondDeployment.test.ts",
          "estimated-time": 47,
          blockchain: "none",
        },
      ],
    };
    console.log(JSON.stringify(matrix));
  } else {
    console.log("Sharding analysis not implemented in simple mode");
  }
}
module.exports = TestShardGenerator;
