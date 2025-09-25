// scripts/generate-test-report.js
const fs = require("fs");
const path = require("path");
const TestResultsAggregator = require("./aggregate-test-results");

class TestReportGenerator {
  constructor() {
    this.aggregator = new TestResultsAggregator();
  }

  async generate(inputDir, outputDir) {
    console.log(
      `📊 Generating test report from ${inputDir} to ${outputDir}...`,
    );

    // First aggregate the results
    const aggregatedFile = path.join(outputDir, "aggregated-results.json");
    const results = await this.aggregator.aggregate(inputDir, aggregatedFile);

    // Generate HTML report
    await this.generateHtmlReport(results, outputDir);

    // Generate markdown summary
    await this.generateMarkdownSummary(results, outputDir);

    // Generate performance charts data
    await this.generatePerformanceData(results, outputDir);

    console.log(`✅ Test report generated in ${outputDir}`);
  }

  async generateHtmlReport(results, outputDir) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GNUS-DAO Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .category, .network { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .progress-bar { background: #eee; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #28a745; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <h1>🧪 GNUS-DAO Parallel Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

    <div class="summary">
        <h2>📈 Summary</h2>
        <div class="metric">
            <div class="metric-value ${results.success_rate >= 90 ? "success" : results.success_rate >= 70 ? "warning" : "danger"}">${results.total_tests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value success">${results.passed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value ${results.failed > 0 ? "danger" : "success"}">${results.failed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value ${results.coverage >= 80 ? "success" : results.coverage >= 60 ? "warning" : "danger"}">${results.coverage}%</div>
            <div class="metric-label">Coverage</div>
        </div>
        <div class="metric">
            <div class="metric-value">${Math.round(results.total_time / 1000)}s</div>
            <div class="metric-label">Total Time</div>
        </div>
        <div class="metric">
            <div class="metric-value ${results.success_rate >= 90 ? "success" : results.success_rate >= 70 ? "warning" : "danger"}">${results.success_rate}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
    </div>

    <div class="progress-bar">
        <div class="progress-fill" style="width: ${results.success_rate}%"></div>
    </div>

    <h2>📂 Test Categories</h2>
    ${Object.entries(results.categories)
      .map(
        ([category, stats]) => `
        <div class="category">
            <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Tests</h3>
            <p>Tests: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Success: ${stats.success_rate}% | Time: ${Math.round(stats.time / 1000)}s</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.success_rate}%"></div>
            </div>
        </div>
    `,
      )
      .join("")}

    <h2>🌐 Multi-Chain Results</h2>
    ${Object.entries(results.networks)
      .map(
        ([network, stats]) => `
        <div class="network">
            <h3>${network.charAt(0).toUpperCase() + network.slice(1)}</h3>
            <p>Tests: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Success: ${stats.success_rate}% | Time: ${Math.round(stats.time / 1000)}s</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.success_rate}%"></div>
            </div>
        </div>
    `,
      )
      .join("")}

    <h2>🔍 Shard Performance</h2>
    <table>
        <thead>
            <tr>
                <th>Shard</th>
                <th>Category</th>
                <th>Network</th>
                <th>Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Time (s)</th>
                <th>Success Rate</th>
            </tr>
        </thead>
        <tbody>
            ${results.shards
              .map(
                (shard) => `
                <tr>
                    <td>${shard.shard}</td>
                    <td>${shard.category}</td>
                    <td>${shard.network || "N/A"}</td>
                    <td>${shard.tests}</td>
                    <td>${shard.passed}</td>
                    <td>${shard.failed}</td>
                    <td>${Math.round(shard.time / 1000)}</td>
                    <td>${shard.tests > 0 ? Math.round((shard.passed / shard.tests) * 100) : 0}%</td>
                </tr>
            `,
              )
              .join("")}
        </tbody>
    </table>

    ${
      results.errors.length > 0
        ? `
        <h2>⚠️ Errors</h2>
        <ul>
            ${results.errors.map((error) => `<li><strong>${error.file}:</strong> ${error.error}</li>`).join("")}
        </ul>
    `
        : ""
    }

    <h2>💡 Recommendations</h2>
    <ul>
        ${this.aggregator
          .generateRecommendations()
          .map((rec) => `<li>${rec}</li>`)
          .join("")}
    </ul>
</body>
</html>`;

    const htmlPath = path.join(outputDir, "test-report.html");
    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  async generateMarkdownSummary(results, outputDir) {
    const markdown = `# 🧪 GNUS-DAO Parallel Test Report

**Generated:** ${new Date().toLocaleString()}

## 📈 Summary

- **Total Tests:** ${results.total_tests}
- **Passed:** ${results.passed} ✅
- **Failed:** ${results.failed} ${results.failed > 0 ? "❌" : ""}
- **Skipped:** ${results.skipped}
- **Coverage:** ${results.coverage}%
- **Total Time:** ${Math.round(results.total_time / 1000)}s
- **Success Rate:** ${results.success_rate}%
- **Avg Time/Test:** ${results.avg_time_per_test}ms

## 📂 Test Categories

${Object.entries(results.categories)
  .map(
    ([category, stats]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}
- Tests: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Success Rate: ${stats.success_rate}%
- Time: ${Math.round(stats.time / 1000)}s
`,
  )
  .join("")}

## 🌐 Multi-Chain Results

${Object.entries(results.networks)
  .map(
    ([network, stats]) => `
### ${network.charAt(0).toUpperCase() + network.slice(1)}
- Tests: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Success Rate: ${stats.success_rate}%
- Time: ${Math.round(stats.time / 1000)}s
`,
  )
  .join("")}

## 💡 Recommendations

${this.aggregator
  .generateRecommendations()
  .map((rec) => `- ${rec}`)
  .join("\n")}

---
*Report generated by GNUS-DAO parallel testing pipeline*
`;

    const mdPath = path.join(outputDir, "test-report.md");
    fs.writeFileSync(mdPath, markdown);
    console.log(`📝 Markdown report generated: ${mdPath}`);
  }

  async generatePerformanceData(results, outputDir) {
    const performanceData = {
      timestamp: results.timestamp,
      summary: {
        total_tests: results.total_tests,
        success_rate: results.success_rate,
        coverage: results.coverage,
        total_time: results.total_time,
      },
      categories: results.categories,
      networks: results.networks,
      shards: results.shards.map((shard) => ({
        shard: shard.shard,
        category: shard.category,
        network: shard.network,
        tests: shard.tests,
        success_rate: shard.tests > 0 ? (shard.passed / shard.tests) * 100 : 0,
        time: shard.time,
      })),
    };

    const perfPath = path.join(outputDir, "performance-data.json");
    fs.writeFileSync(perfPath, JSON.stringify(performanceData, null, 2));
    console.log(`📊 Performance data generated: ${perfPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const inputDir =
    process.argv.find((arg) => arg.startsWith("--input="))?.split("=")[1] ||
    "test-results";
  const outputDir =
    process.argv.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "coverage";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generator = new TestReportGenerator();

  generator
    .generate(inputDir, outputDir)
    .then(() => {
      console.log("Report generation complete");
    })
    .catch((error) => {
      console.error("Report generation failed:", error);
      process.exit(1);
    });
}

module.exports = TestReportGenerator;
