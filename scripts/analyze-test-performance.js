// scripts/analyze-test-performance.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class TestPerformanceAnalyzer {
  constructor() {
    this.testResults = {};
    this.performanceHistory = {};
    this.loadHistoricalData();
  }

  loadHistoricalData() {
    try {
      const data = fs.readFileSync("test-performance-history.json", "utf8");
      this.performanceHistory = JSON.parse(data);
    } catch (error) {
      console.warn("No historical performance data found, starting fresh");
      this.performanceHistory = {};
    }
  }

  async analyzeTestSuite() {
    console.log("🔍 Analyzing test suite performance...");

    // Discover test files
    const testFiles = this.discoverTestFiles("test/");
    console.log(`Found ${testFiles.length} test files`);

    // Run performance analysis
    for (const testFile of testFiles) {
      try {
        const performance = await this.analyzeTestFile(testFile);
        this.testResults[testFile] = performance;
        console.log(`✅ Analyzed ${testFile}: ${performance.estimatedTime}s`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${testFile}:`, error.message);
        this.testResults[testFile] = {
          estimatedTime: 30,
          error: error.message,
        };
      }
    }

    // Generate analysis report
    this.generateAnalysisReport();

    // Update historical data
    this.updateHistoricalData();

    return this.testResults;
  }

  async analyzeTestFile(testFile) {
    const startTime = Date.now();

    // Read file content for static analysis
    const content = fs.readFileSync(testFile, "utf8");
    const stats = fs.statSync(testFile);

    // Static analysis
    const testCount = (content.match(/it\(/g) || []).length;
    const suiteCount = (content.match(/describe\(/g) || []).length;
    const fileSize = stats.size;

    // Estimate execution time based on complexity
    let estimatedTime = 10; // base time
    estimatedTime += Math.floor(fileSize / 1000) * 2; // 2s per KB
    estimatedTime += testCount * 5; // 5s per test
    estimatedTime += suiteCount * 3; // 3s per suite

    // Category-specific multipliers
    if (testFile.includes("/integration/")) estimatedTime *= 2;
    if (testFile.includes("/security/")) estimatedTime *= 1.5;
    if (testFile.includes("/multichain/")) estimatedTime *= 3;

    // Try to run a quick test to get actual timing (if possible)
    try {
      const testStart = Date.now();
      // This is a placeholder - in real implementation, you'd run the test
      // execSync(`yarn test --testPathPattern="${testFile}" --testTimeout=5000`, { timeout: 10000 });
      const testEnd = Date.now();
      const actualTime = (testEnd - testStart) / 1000;

      if (actualTime > 5) {
        // Only use if meaningful
        estimatedTime = actualTime;
      }
    } catch (error) {
      // Test run failed, stick with estimate
    }

    const endTime = Date.now();
    const analysisTime = (endTime - startTime) / 1000;

    return {
      estimatedTime: Math.max(estimatedTime, 5), // minimum 5 seconds
      testCount,
      suiteCount,
      fileSize,
      analysisTime,
      category: this.getTestCategory(testFile),
    };
  }

  getTestCategory(testFile) {
    if (testFile.includes("/unit/")) return "unit";
    if (testFile.includes("/integration/")) return "integration";
    if (testFile.includes("/security/")) return "security";
    if (testFile.includes("/multichain/")) return "multichain";
    return "other";
  }

  discoverTestFiles(directory) {
    const files = [];

    function walkDirectory(dir) {
      try {
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
      } catch (error) {
        console.warn(`Could not read directory ${dir}:`, error.message);
      }
    }

    walkDirectory(directory);
    return files;
  }

  generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: Object.keys(this.testResults).length,
      categories: {},
      totalEstimatedTime: 0,
      recommendations: [],
    };

    // Analyze by category
    Object.entries(this.testResults).forEach(([file, data]) => {
      const category = data.category;
      if (!report.categories[category]) {
        report.categories[category] = {
          files: 0,
          totalTime: 0,
          totalTests: 0,
        };
      }

      report.categories[category].files++;
      report.categories[category].totalTime += data.estimatedTime;
      report.categories[category].totalTests += data.testCount;
      report.totalEstimatedTime += data.estimatedTime;
    });

    // Generate recommendations
    const totalTime = report.totalEstimatedTime;
    if (totalTime > 300) {
      // More than 5 minutes
      const recommendedShards = Math.max(2, Math.ceil(totalTime / 150)); // Target 2.5 min per shard
      report.recommendations.push(
        `Consider using ${recommendedShards} parallel shards to reduce execution time`,
      );
    }

    // Save report
    fs.writeFileSync("test-analysis.json", JSON.stringify(report, null, 2));
    console.log("📊 Test analysis report saved to test-analysis.json");

    // Print summary
    console.log("\n📈 Test Suite Analysis Summary:");
    console.log(`Total files: ${report.totalFiles}`);
    console.log(
      `Total estimated time: ${report.totalEstimatedTime}s (${(report.totalEstimatedTime / 60).toFixed(1)}min)`,
    );

    Object.entries(report.categories).forEach(([category, data]) => {
      console.log(
        `  ${category}: ${data.files} files, ${data.totalTests} tests, ${(data.totalTime / 60).toFixed(1)}min`,
      );
    });

    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      report.recommendations.forEach((rec) => console.log(`  - ${rec}`));
    }
  }

  updateHistoricalData() {
    // Update historical performance data
    const now = new Date().toISOString();
    Object.entries(this.testResults).forEach(([file, data]) => {
      if (!this.performanceHistory[file]) {
        this.performanceHistory[file] = [];
      }

      this.performanceHistory[file].push({
        timestamp: now,
        estimatedTime: data.estimatedTime,
        testCount: data.testCount,
        category: data.category,
      });

      // Keep only last 10 runs
      if (this.performanceHistory[file].length > 10) {
        this.performanceHistory[file] =
          this.performanceHistory[file].slice(-10);
      }
    });

    fs.writeFileSync(
      "test-performance-history.json",
      JSON.stringify(this.performanceHistory, null, 2),
    );
    console.log("📚 Updated historical performance data");
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new TestPerformanceAnalyzer();
  analyzer
    .analyzeTestSuite()
    .then(() => {
      console.log("✅ Test performance analysis completed");
    })
    .catch((error) => {
      console.error("❌ Test performance analysis failed:", error);
      process.exit(1);
    });
}

module.exports = TestPerformanceAnalyzer;
