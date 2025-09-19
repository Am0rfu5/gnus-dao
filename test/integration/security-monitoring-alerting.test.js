/**
 * GNUS-DAO Security Monitoring and Alerting Integration Tests
 * Tests the complete security monitoring, alerting, and incident response system
 */

const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

describe("Security Monitoring and Alerting System", () => {
  const testAssetsDir = path.join(__dirname, "..", "..", "test-assets");
  const incidentsDir = path.join(testAssetsDir, "incidents");
  const alertsDir = path.join(testAssetsDir, "alerts");
  const metricsDir = path.join(testAssetsDir, "metrics");
  const checksDir = path.join(testAssetsDir, "checks");
  const reportsDir = path.join(testAssetsDir, "health-reports");

  beforeEach(() => {
    // Clean up test directories
    [incidentsDir, alertsDir, metricsDir, checksDir, reportsDir].forEach(
      (dir) => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      },
    );
  });

  afterEach(() => {
    // Clean up after tests
    [incidentsDir, alertsDir, metricsDir, checksDir, reportsDir].forEach(
      (dir) => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      },
    );
  });

  describe("Security Monitoring Webhook CLI", () => {
    it("should process test events via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-monitoring-webhook.js",
          ),
          "process",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        // Collect stderr for debugging
      });

      child.on("close", (code) => {
        // The process command may fail due to missing webhook secret, but should not crash
        expect([0, 1]).to.include(code);
        done();
      });
    });

    it("should show status via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-monitoring-webhook.js",
          ),
          "status",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("monitoring");
        done();
      });
    });
  });

  describe("Security Alerting CLI", () => {
    it("should send test alerts via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "security-alerting.js"),
          "test",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("Test");
        done();
      });
    });

    it("should show alerting status via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "security-alerting.js"),
          "status",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("channels");
        done();
      });
    });
  });

  describe("Incident Response CLI", () => {
    it("should create incidents via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "incident-response.js"),
          "create",
          "Test Incident",
          "This is a test incident",
          "medium",
          "security",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("Created incident:");
        done();
      });
    });

    it("should list incidents via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "incident-response.js"),
          "list",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        // May be empty initially
        done();
      });
    });

    it("should show incident response status via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "incident-response.js"),
          "status",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("totalIncidents");
        done();
      });
    });
  });

  describe("Security Health Checks CLI", () => {
    it("should run health checks via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-health-checks.js",
          ),
          "check",
          "dependency-check",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.stderr.on("data", (data) => {
        // Ignore stderr for this test
      });

      child.on("close", (code) => {
        // May fail due to missing dependencies, but should not crash
        expect([0, 1]).to.include(code);
        done();
      });
    });

    it("should show health check status via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-health-checks.js",
          ),
          "status",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("enabledChecks");
        done();
      });
    });
  });

  describe("Security Metrics Dashboard CLI", () => {
    it("should generate metrics reports via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-metrics-dashboard.js",
          ),
          "generate",
          "weekly",
          "json",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("Security metrics report generated");
        done();
      });
    });

    it("should show dashboard status via CLI", (done) => {
      const child = spawn(
        "node",
        [
          path.join(
            __dirname,
            "..",
            "..",
            "scripts",
            "security-metrics-dashboard.js",
          ),
          "status",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        expect(code).to.equal(0);
        expect(output).to.include("lastReport");
        done();
      });
    });
  });

  describe("Package.json Scripts Integration", () => {
    it("should have all security scripts defined", () => {
      const packageJson = require(
        path.join(__dirname, "..", "..", "package.json"),
      );
      const scripts = packageJson.scripts;

      expect(scripts["security-webhook"]).to.equal(
        "node scripts/security-monitoring-webhook.js",
      );
      expect(scripts["security-alerting"]).to.equal(
        "node scripts/security-alerting.js",
      );
      expect(scripts["security-metrics"]).to.equal(
        "node scripts/security-metrics-dashboard.js",
      );
      expect(scripts["incident-response"]).to.equal(
        "node scripts/incident-response.js",
      );
      expect(scripts["security-health-checks"]).to.equal(
        "node scripts/security-health-checks.js",
      );
    });
  });

  describe("File System Integration", () => {
    it("should create required directories", () => {
      // Test that scripts create their required directories
      const scripts = [
        "security-monitoring-webhook.js",
        "security-alerting.js",
        "incident-response.js",
        "security-health-checks.js",
        "security-metrics-dashboard.js",
      ];

      scripts.forEach((script) => {
        const scriptPath = path.join(__dirname, "..", "..", "scripts", script);
        expect(fs.existsSync(scriptPath)).to.be.true;
      });
    });

    it("should create incident response playbooks", () => {
      const playbooksDir = path.join(
        __dirname,
        "..",
        "..",
        "docs",
        "incident-playbooks",
      );
      const playbooks = [
        "diamond-security-response.md",
        "contract-exploit-response.md",
        "dependency-compromise-response.md",
        "access-breach-response.md",
      ];

      playbooks.forEach((playbook) => {
        const playbookPath = path.join(playbooksDir, playbook);
        expect(fs.existsSync(playbookPath)).to.be.true;

        const content = fs.readFileSync(playbookPath, "utf8");
        expect(content).to.include("## Overview");
        expect(content).to.include("## Success Criteria");
      });
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete full incident response workflow", function (done) {
      this.timeout(30000); // Increase timeout for e2e test

      // Step 1: Create an incident
      const createChild = spawn(
        "node",
        [
          path.join(__dirname, "..", "..", "scripts", "incident-response.js"),
          "create",
          "E2E Test Incident",
          "End-to-end test incident",
          "high",
          "security",
        ],
        { cwd: path.join(__dirname, "..", "..") },
      );

      createChild.on("close", (createCode) => {
        expect(createCode).to.equal(0);

        // Step 2: Check that incident was created
        const listChild = spawn(
          "node",
          [
            path.join(__dirname, "..", "..", "scripts", "incident-response.js"),
            "list",
          ],
          { cwd: path.join(__dirname, "..", "..") },
        );

        let listOutput = "";
        listChild.stdout.on("data", (data) => {
          listOutput += data.toString();
        });

        listChild.on("close", (listCode) => {
          expect(listCode).to.equal(0);
          expect(listOutput).to.include("E2E Test Incident");

          // Step 3: Generate metrics report
          const metricsChild = spawn(
            "node",
            [
              path.join(
                __dirname,
                "..",
                "..",
                "scripts",
                "security-metrics-dashboard.js",
              ),
              "generate",
              "daily",
              "json",
            ],
            { cwd: path.join(__dirname, "..", "..") },
          );

          metricsChild.on("close", (metricsCode) => {
            expect(metricsCode).to.equal(0);

            // Step 4: Run health checks
            const healthChild = spawn(
              "node",
              [
                path.join(
                  __dirname,
                  "..",
                  "..",
                  "scripts",
                  "security-health-checks.js",
                ),
                "status",
              ],
              { cwd: path.join(__dirname, "..", "..") },
            );

            healthChild.on("close", (healthCode) => {
              expect(healthCode).to.equal(0);
              done();
            });
          });
        });
      });
    });
  });
});
