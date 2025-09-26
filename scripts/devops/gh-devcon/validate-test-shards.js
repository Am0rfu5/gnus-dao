// scripts/devops/gh-devcon/validate-test-shards.js
const fs = require("fs");

class TestShardValidator {
  constructor() {
    this.matrix = null;
    this.analysis = null;
  }

  async validateShards() {
    console.log("🔍 Validating test shard distribution...");

    // Load matrix and analysis
    try {
      const matrixData = fs.readFileSync("test-shards-matrix.json", "utf8");
      this.matrix = JSON.parse(matrixData);
    } catch (error) {
      console.log("No matrix file found, generating from script...");
      const { execSync } = require("child_process");
      const matrixOutput = execSync(
        "node scripts/generate-test-shards.js --format=github-matrix",
        { encoding: "utf8" },
      );
      this.matrix = JSON.parse(matrixOutput);
    }

    try {
      const analysisData = fs.readFileSync("test-analysis.json", "utf8");
      this.analysis = JSON.parse(analysisData);
    } catch (error) {
      console.error("❌ Test analysis file not found");
      return false;
    }

    // Validate matrix structure
    if (!this.validateMatrixStructure()) {
      return false;
    }

    // Validate load balancing
    if (!this.validateLoadBalancing()) {
      return false;
    }

    // Validate test coverage
    if (!this.validateTestCoverage()) {
      return false;
    }

    // Generate validation report
    this.generateValidationReport();

    console.log("✅ Test shard validation completed successfully");
    return true;
  }

  validateMatrixStructure() {
    console.log("Checking matrix structure...");

    if (
      !this.matrix ||
      !this.matrix.include ||
      !Array.isArray(this.matrix.include)
    ) {
      console.error("❌ Invalid matrix structure");
      return false;
    }

    const requiredFields = [
      "test-category",
      "shard",
      "shard-total",
      "test-files",
      "estimated-time",
      "blockchain",
    ];

    for (const item of this.matrix.include) {
      for (const field of requiredFields) {
        if (!(field in item)) {
          console.error(`❌ Missing required field '${field}' in matrix item`);
          return false;
        }
      }

      if (item.shard < 1 || item.shard > item["shard-total"]) {
        console.error(
          `❌ Invalid shard number ${item.shard}/${item["shard-total"]}`,
        );
        return false;
      }
    }

    console.log(
      `✅ Matrix structure valid with ${this.matrix.include.length} shards`,
    );
    return true;
  }

  validateLoadBalancing() {
    console.log("Checking load balancing...");

    const categoryStats = {};

    // Group by category
    this.matrix.include.forEach((item) => {
      const category = item["test-category"];
      if (!categoryStats[category]) {
        categoryStats[category] = {
          shards: [],
          totalTime: 0,
          maxTime: 0,
          minTime: Infinity,
        };
      }

      categoryStats[category].shards.push(item);
      categoryStats[category].totalTime += item["estimated-time"];
      categoryStats[category].maxTime = Math.max(
        categoryStats[category].maxTime,
        item["estimated-time"],
      );
      categoryStats[category].minTime = Math.min(
        categoryStats[category].minTime,
        item["estimated-time"],
      );
    });

    // Check balancing
    let balanced = true;
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const avgTime = stats.totalTime / stats.shards.length;
      const variance = stats.maxTime - stats.minTime;
      const variancePercent = (variance / avgTime) * 100;

      console.log(
        `  ${category}: ${stats.shards.length} shards, avg ${avgTime.toFixed(1)}s, variance ${variancePercent.toFixed(1)}%`,
      );

      if (variancePercent > 50) {
        // More than 50% variance indicates poor balancing
        console.warn(
          `⚠️  High variance in ${category} shards (${variancePercent.toFixed(1)}%)`,
        );
        balanced = false;
      }
    });

    if (balanced) {
      console.log("✅ Load balancing acceptable");
    }

    return balanced;
  }

  validateTestCoverage() {
    console.log("Checking test coverage...");

    // Get all test files from analysis
    const allTestFiles = new Set();
    if (this.analysis && this.analysis.categories) {
      Object.values(this.analysis.categories).forEach((cat) => {
        // This is approximate since we don't have the file list
      });
    }

    // Get all test files from matrix
    const matrixTestFiles = new Set();
    this.matrix.include.forEach((item) => {
      if (item["test-files"]) {
        item["test-files"].split(",").forEach((file) => {
          matrixTestFiles.add(file.trim());
        });
      }
    });

    console.log(`✅ Matrix covers ${matrixTestFiles.size} test files`);

    // Basic validation - ensure we have test files
    if (matrixTestFiles.size === 0) {
      console.error("❌ No test files found in matrix");
      return false;
    }

    return true;
  }

  generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      validation_passed: true,
      matrix_stats: {
        total_shards: this.matrix.include.length,
        categories: {},
      },
      recommendations: [],
    };

    // Calculate category stats
    this.matrix.include.forEach((item) => {
      const category = item["test-category"];
      if (!report.matrix_stats.categories[category]) {
        report.matrix_stats.categories[category] = {
          shards: 0,
          total_time: 0,
        };
      }
      report.matrix_stats.categories[category].shards++;
      report.matrix_stats.categories[category].total_time +=
        item["estimated-time"];
    });

    // Add recommendations
    const totalTime = Object.values(report.matrix_stats.categories).reduce(
      (sum, cat) => sum + cat.total_time,
      0,
    );
    if (totalTime > 300) {
      // More than 5 minutes
      report.recommendations.push(
        "Consider increasing parallelization to reduce total execution time",
      );
    }

    // Save report
    fs.writeFileSync(
      "test-shards-validation.json",
      JSON.stringify(report, null, 2),
    );
    console.log("📊 Validation report saved to test-shards-validation.json");
  }
}

// CLI usage
if (require.main === module) {
  const validator = new TestShardValidator();
  validator
    .validateShards()
    .then((success) => {
      if (!success) {
        console.error("❌ Test shard validation failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Validation error:", error);
      process.exit(1);
    });
}

module.exports = TestShardValidator;
