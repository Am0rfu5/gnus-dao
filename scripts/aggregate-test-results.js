// scripts/aggregate-test-results.js
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

class TestResultsAggregator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      total_tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: 0,
      total_time: 0,
      categories: {
        unit: { total: 0, passed: 0, failed: 0, time: 0 },
        integration: { total: 0, passed: 0, failed: 0, time: 0 },
        deployment: { total: 0, passed: 0, failed: 0, time: 0 },
        multichain: { total: 0, passed: 0, failed: 0, time: 0 },
      },
      networks: {
        ethereum: { total: 0, passed: 0, failed: 0, time: 0 },
        polygon: { total: 0, passed: 0, failed: 0, time: 0 },
        arbitrum: { total: 0, passed: 0, failed: 0, time: 0 },
        optimism: { total: 0, passed: 0, failed: 0, time: 0 },
      },
      shards: [],
      errors: [],
    };
  }

  async aggregate(inputDir, outputFile) {
    console.log(`🔄 Aggregating test results from ${inputDir}...`);

    // Find all test result files
    const resultFiles = await glob("**/test-results-*.json", {
      cwd: inputDir,
      absolute: true,
    });

    console.log(`Found ${resultFiles.length} test result files`);

    // Process each result file
    for (const file of resultFiles) {
      try {
        await this.processResultFile(file);
      } catch (error) {
        console.warn(`Failed to process ${file}:`, error.message);
        this.results.errors.push({
          file: path.basename(file),
          error: error.message,
        });
      }
    }

    // Aggregate coverage data
    await this.aggregateCoverage(inputDir);

    // Calculate final metrics
    this.calculateMetrics();

    // Save aggregated results
    fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));
    console.log(`✅ Aggregated results saved to ${outputFile}`);

    return this.results;
  }

  async processResultFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const filename = path.basename(filePath);

    // Determine test category and network from filename
    const category = this.determineCategory(filename);
    const network = this.determineNetwork(filename);
    const shard = this.determineShard(filename);

    // Aggregate test counts
    const tests = data.numTotalTests || data.tests || 0;
    const passed = data.numPassedTests || data.passed || 0;
    const failed = data.numFailedTests || data.failed || 0;
    const skipped = data.numPendingTests || data.pending || 0;
    const time = data.duration || data.time || 0;

    // Update global totals
    this.results.total_tests += tests;
    this.results.passed += passed;
    this.results.failed += failed;
    this.results.skipped += skipped;
    this.results.total_time += time;

    // Update category totals
    if (this.results.categories[category]) {
      this.results.categories[category].total += tests;
      this.results.categories[category].passed += passed;
      this.results.categories[category].failed += failed;
      this.results.categories[category].time += time;
    }

    // Update network totals (for multi-chain tests)
    if (network && this.results.networks[network]) {
      this.results.networks[network].total += tests;
      this.results.networks[network].passed += passed;
      this.results.networks[network].failed += failed;
      this.results.networks[network].time += time;
    }

    // Track shard information
    if (shard) {
      this.results.shards.push({
        shard,
        category,
        network,
        tests,
        passed,
        failed,
        time,
      });
    }
  }

  determineCategory(filename) {
    if (filename.includes("unit")) return "unit";
    if (filename.includes("integration")) return "integration";
    if (filename.includes("deployment") || filename.includes("other"))
      return "deployment";
    if (filename.includes("multichain")) return "multichain";
    return "other";
  }

  determineNetwork(filename) {
    const networks = ["ethereum", "polygon", "arbitrum", "optimism"];
    return networks.find((network) => filename.includes(network));
  }

  determineShard(filename) {
    const shardMatch = filename.match(/shard-(\d+)/);
    return shardMatch ? parseInt(shardMatch[1]) : null;
  }

  async aggregateCoverage(inputDir) {
    // Find all coverage files
    const coverageFiles = await glob("**/lcov.info", {
      cwd: inputDir,
      absolute: true,
    });

    if (coverageFiles.length === 0) {
      console.warn("No coverage files found");
      return;
    }

    // For simplicity, use the first coverage file
    // In production, you'd want to merge all coverage reports
    const coverageData = fs.readFileSync(coverageFiles[0], "utf8");

    // Parse LCOV format to extract coverage percentage
    const lines = coverageData.split("\n");
    let totalLines = 0;
    let coveredLines = 0;

    for (const line of lines) {
      if (line.startsWith("LF:")) {
        totalLines += parseInt(line.split(":")[1]);
      } else if (line.startsWith("LH:")) {
        coveredLines += parseInt(line.split(":")[1]);
      }
    }

    this.results.coverage =
      totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;

    console.log(
      `Coverage: ${this.results.coverage}% (${coveredLines}/${totalLines} lines)`,
    );
  }

  calculateMetrics() {
    // Calculate success rate
    const totalExecuted = this.results.passed + this.results.failed;
    this.results.success_rate =
      totalExecuted > 0
        ? Math.round((this.results.passed / totalExecuted) * 100)
        : 0;

    // Calculate average time per test
    this.results.avg_time_per_test =
      this.results.total_tests > 0
        ? Math.round(
            (this.results.total_time / this.results.total_tests) * 100,
          ) / 100
        : 0;

    // Calculate category success rates
    Object.keys(this.results.categories).forEach((category) => {
      const cat = this.results.categories[category];
      const catExecuted = cat.passed + cat.failed;
      cat.success_rate =
        catExecuted > 0 ? Math.round((cat.passed / catExecuted) * 100) : 0;
    });

    // Calculate network success rates
    Object.keys(this.results.networks).forEach((network) => {
      const net = this.results.networks[network];
      const netExecuted = net.passed + net.failed;
      net.success_rate =
        netExecuted > 0 ? Math.round((net.passed / netExecuted) * 100) : 0;
    });
  }

  generateReport(outputDir) {
    const report = {
      summary: {
        total_tests: this.results.total_tests,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        success_rate: this.results.success_rate,
        coverage: this.results.coverage,
        total_time: this.results.total_time,
        avg_time_per_test: this.results.avg_time_per_test,
      },
      categories: this.results.categories,
      networks: this.results.networks,
      performance: {
        slowest_shard: this.findSlowestShard(),
        fastest_shard: this.findFastestShard(),
        most_failing_category: this.findMostFailingCategory(),
      },
      recommendations: this.generateRecommendations(),
    };

    const reportPath = path.join(outputDir, "test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Test report generated: ${reportPath}`);
    return report;
  }

  findSlowestShard() {
    return this.results.shards.reduce(
      (slowest, shard) => (shard.time > (slowest?.time || 0) ? shard : slowest),
      null,
    );
  }

  findFastestShard() {
    return this.results.shards.reduce(
      (fastest, shard) =>
        shard.time < (fastest?.time || Infinity) ? shard : fastest,
      null,
    );
  }

  findMostFailingCategory() {
    return Object.entries(this.results.categories).reduce(
      (worst, [category, stats]) => {
        const failRate = stats.total > 0 ? stats.failed / stats.total : 0;
        const worstFailRate = worst.total > 0 ? worst.failed / worst.total : 0;
        return failRate > worstFailRate ? { category, ...stats } : worst;
      },
      { category: "none", total: 0, failed: 0 },
    );
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.success_rate < 90) {
      recommendations.push(
        "Overall test success rate is below 90%. Review failing tests.",
      );
    }

    if (this.results.coverage < 80) {
      recommendations.push("Test coverage is below 80%. Add more test cases.");
    }

    const slowestShard = this.findSlowestShard();
    if (slowestShard && slowestShard.time > 300000) {
      // 5 minutes
      recommendations.push(
        `Shard ${slowestShard.shard} is taking too long (${slowestShard.time}ms). Consider splitting it.`,
      );
    }

    const mostFailing = this.findMostFailingCategory();
    if (mostFailing.failed > mostFailing.total * 0.1) {
      recommendations.push(
        `Category '${mostFailing.category}' has high failure rate. Focus debugging efforts there.`,
      );
    }

    return recommendations;
  }
}

// CLI usage
if (require.main === module) {
  const inputDir =
    process.argv.find((arg) => arg.startsWith("--input="))?.split("=")[1] ||
    "test-results";
  const outputFile =
    process.argv.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "aggregated-results.json";

  const aggregator = new TestResultsAggregator();

  aggregator
    .aggregate(inputDir, outputFile)
    .then((results) => {
      console.log("Aggregation complete:", {
        total_tests: results.total_tests,
        passed: results.passed,
        failed: results.failed,
        coverage: results.coverage,
        total_time: results.total_time,
      });

      // Generate detailed report
      const outputDir = path.dirname(outputFile);
      aggregator.generateReport(outputDir);

      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Aggregation failed:", error);
      process.exit(1);
    });
}

module.exports = TestResultsAggregator;
