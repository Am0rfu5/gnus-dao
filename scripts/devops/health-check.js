const fs = require("fs");
const { execSync } = require("child_process");

class HealthChecker {
  constructor() {
    this.results = {
      ci: { status: "unknown", details: "" },
      security: { status: "unknown", details: "" },
      dependencies: { status: "unknown", details: "" },
      performance: { status: "unknown", details: "" },
    };
  }

  async runChecks() {
    console.log("🏥 Running comprehensive health checks...");

    await this.checkCI();
    await this.checkSecurity();
    await this.checkDependencies();
    await this.checkPerformance();

    this.saveReport();
    return this.results;
  }

  async checkCI() {
    try {
      // Check if CI workflows exist and are valid
      const workflowsDir = ".github/workflows";
      if (!fs.existsSync(workflowsDir)) {
        throw new Error("No workflows directory found");
      }

      const workflows = fs
        .readdirSync(workflowsDir)
        .filter((f) => f.endsWith(".yml"));
      if (workflows.length === 0) {
        throw new Error("No workflow files found");
      }

      // Validate workflow syntax (basic check)
      let validWorkflows = 0;
      workflows.forEach((workflow) => {
        try {
          const content = fs.readFileSync(
            `${workflowsDir}/${workflow}`,
            "utf8",
          );
          if (content.includes("name:") && content.includes("on:")) {
            validWorkflows++;
          }
        } catch (error) {
          console.warn(`Invalid workflow: ${workflow}`);
        }
      });

      this.results.ci = {
        status: validWorkflows === workflows.length ? "healthy" : "warning",
        details: `${validWorkflows}/${workflows.length} workflows valid`,
      };
    } catch (error) {
      this.results.ci = {
        status: "error",
        details: error.message,
      };
    }
  }

  async checkSecurity() {
    try {
      // Run basic security checks
      const auditResult = execSync("yarn audit --audit-level moderate --json", {
        encoding: "utf8",
      });
      const auditData = JSON.parse(auditResult);

      const vulnerabilities = auditData.metadata.vulnerabilities || {};

      const totalVulns = Object.values(vulnerabilities).reduce(
        (sum, count) => sum + count,
        0,
      );

      this.results.security = {
        status:
          totalVulns === 0 ? "healthy" : totalVulns < 5 ? "warning" : "error",
        details: `${totalVulns} vulnerabilities found`,
      };
    } catch (error) {
      this.results.security = {
        status: "error",
        details: "Security check failed: " + error.message,
      };
    }
  }

  async checkDependencies() {
    try {
      // Check for outdated dependencies
      const outdatedResult = execSync("yarn outdated --json", {
        encoding: "utf8",
      });
      const outdatedData = JSON.parse(outdatedResult);

      const outdatedCount = outdatedData.data
        ? outdatedData.data.body.length
        : 0;

      this.results.dependencies = {
        status:
          outdatedCount === 0
            ? "healthy"
            : outdatedCount < 10
              ? "warning"
              : "error",
        details: `${outdatedCount} packages outdated`,
      };
    } catch (error) {
      this.results.dependencies = {
        status: "warning",
        details: "Could not check dependencies: " + error.message,
      };
    }
  }

  async checkPerformance() {
    try {
      // Check recent CI performance
      if (fs.existsSync("ci-performance-dashboard.json")) {
        const perfData = JSON.parse(
          fs.readFileSync("ci-performance-dashboard.json", "utf8"),
        );
        const alerts = perfData.dashboard.alerts || [];

        this.results.performance = {
          status:
            alerts.length === 0
              ? "healthy"
              : alerts.length < 3
                ? "warning"
                : "error",
          details: `${alerts.length} performance alerts`,
        };
      } else {
        this.results.performance = {
          status: "warning",
          details: "No performance data available",
        };
      }
    } catch (error) {
      this.results.performance = {
        status: "error",
        details: "Performance check failed: " + error.message,
      };
    }
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      overall: this.getOverallStatus(),
    };

    fs.writeFileSync("health-report.json", JSON.stringify(report, null, 2));
    console.log("📄 Health report saved to health-report.json");
  }

  getOverallStatus() {
    const statuses = Object.values(this.results).map((r) => r.status);
    const priorities = { error: 3, warning: 2, healthy: 1, unknown: 0 };

    const worstStatus = statuses.reduce((worst, current) => {
      return priorities[current] > priorities[worst] ? current : worst;
    }, "healthy");

    return {
      status: worstStatus,
      summary: `${statuses.filter((s) => s === "healthy").length}/${statuses.length} checks healthy`,
    };
  }
}

module.exports = HealthChecker;
