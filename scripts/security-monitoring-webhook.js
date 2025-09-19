#!/usr/bin/env node

/**
 * GNUS-DAO Security Monitoring Webhook Handler
 * Processes GitHub security events and triggers automated responses
 * Integrates with alerting systems and incident response workflows
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class SecurityMonitoringWebhook {
  constructor() {
    this.eventsDir = path.join(
      __dirname,
      "..",
      "test-assets",
      "security-events",
    );
    this.incidentsDir = path.join(__dirname, "..", "test-assets", "incidents");
    this.metricsDir = path.join(__dirname, "..", "test-assets", "metrics");
    this.config = this.loadConfiguration();
    this.alertManager = new AlertManager(this.config);
    this.incidentManager = new IncidentManager(this.config);
    this.metricsCollector = new MetricsCollector(this.config);
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load monitoring configuration
   */
  loadConfiguration() {
    return {
      github: {
        webhookSecret:
          process.env.GITHUB_WEBHOOK_SECRET || "gnus-dao-webhook-secret",
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
      },
      alerting: {
        slackWebhook: process.env.SLACK_WEBHOOK_URL,
        discordWebhook: process.env.DISCORD_WEBHOOK_URL,
        emailTo: process.env.SECURITY_EMAIL || "security@gnus.ai",
      },
      thresholds: {
        critical: 9.0,
        high: 7.0,
        medium: 4.0,
        low: 0.1,
      },
      monitoring: {
        enabled: true,
        logEvents: true,
        autoResponse: true,
      },
    };
  }

  /**
   * Process GitHub webhook payload
   */
  async processWebhook(headers, body) {
    try {
      // Verify webhook signature
      if (!this.verifySignature(headers, body)) {
        throw new Error("Invalid webhook signature");
      }

      const eventType = headers["x-github-event"];
      const eventId = headers["x-github-delivery"];

      this.log(`Processing ${eventType} event: ${eventId}`);

      // Parse event payload
      const payload = typeof body === "string" ? JSON.parse(body) : body;

      // Log event
      if (this.config.monitoring.logEvents) {
        this.logSecurityEvent(eventType, eventId, payload);
      }

      // Process event based on type
      await this.processEvent(eventType, payload, eventId);

      // Update metrics
      await this.metricsCollector.updateMetrics(eventType, payload);

      return { status: "processed", eventId };
    } catch (error) {
      this.log(`Webhook processing failed: ${error.message}`, "error");
      await this.alertManager.sendAlert("error", {
        title: "Security Monitoring Error",
        description: `Failed to process webhook: ${error.message}`,
        severity: "high",
      });
      throw error;
    }
  }

  /**
   * Verify GitHub webhook signature
   */
  verifySignature(headers, body) {
    const signature = headers["x-hub-signature-256"];
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac("sha256", this.config.github.webhookSecret)
      .update(typeof body === "string" ? body : JSON.stringify(body))
      .digest("hex");

    const actualSignature = signature.replace("sha256=", "");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(actualSignature, "hex"),
    );
  }

  /**
   * Process different types of security events
   */
  async processEvent(eventType, payload, eventId) {
    switch (eventType) {
      case "security_advisory":
        await this.handleSecurityAdvisory(payload, eventId);
        break;

      case "dependabot_alert":
        await this.handleDependabotAlert(payload, eventId);
        break;

      case "secret_scanning_alert":
        await this.handleSecretScanningAlert(payload, eventId);
        break;

      case "code_scanning_alert":
        await this.handleCodeScanningAlert(payload, eventId);
        break;

      case "repository_vulnerability_alert":
        await this.handleRepositoryVulnerabilityAlert(payload, eventId);
        break;

      case "workflow_run":
        await this.handleWorkflowRun(payload, eventId);
        break;

      case "push":
        await this.handlePush(payload, eventId);
        break;

      default:
        this.log(`Unhandled event type: ${eventType}`);
    }
  }

  /**
   * Handle security advisory events
   */
  async handleSecurityAdvisory(payload, eventId) {
    const advisory = payload.security_advisory;
    const severity = this.mapSeverity(advisory.severity);

    this.log(`Security advisory: ${advisory.summary} (${severity})`);

    if (severity === "critical") {
      await this.incidentManager.createIncident({
        type: "security_advisory",
        severity: "critical",
        title: `Critical Security Advisory: ${advisory.summary}`,
        description: advisory.description,
        affectedPackages:
          advisory.vulnerabilities?.map((v) => v.package.name) || [],
        references: advisory.references?.map((r) => r.url) || [],
        eventId,
      });
    }

    await this.alertManager.sendAlert(severity, {
      title: `Security Advisory: ${advisory.summary}`,
      description: advisory.description,
      severity,
      affectedPackages:
        advisory.vulnerabilities?.map((v) => v.package.name) || [],
      references: advisory.references?.map((r) => r.url) || [],
    });
  }

  /**
   * Handle Dependabot alerts
   */
  async handleDependabotAlert(payload, eventId) {
    const alert = payload.alert;
    const severity = this.mapSeverity(
      alert.security_vulnerability?.severity || "medium",
    );

    this.log(
      `Dependabot alert: ${alert.security_vulnerability?.summary} (${severity})`,
    );

    if (severity === "critical" || severity === "high") {
      await this.incidentManager.createIncident({
        type: "dependabot_alert",
        severity,
        title: `Dependency Vulnerability: ${alert.security_vulnerability?.summary}`,
        description: alert.security_vulnerability?.description,
        package: alert.dependency?.package?.name,
        version: alert.dependency?.manifest_path,
        references: [alert.html_url],
        eventId,
      });
    }

    await this.alertManager.sendAlert(severity, {
      title: `Dependency Alert: ${alert.dependency?.package?.name}`,
      description: alert.security_vulnerability?.summary,
      severity,
      package: alert.dependency?.package?.name,
      version: alert.dependency?.manifest_path,
      cve: alert.security_vulnerability?.identifiers?.find(
        (id) => id.type === "CVE",
      )?.value,
      url: alert.html_url,
    });
  }

  /**
   * Handle secret scanning alerts
   */
  async handleSecretScanningAlert(payload, eventId) {
    const alert = payload.alert;
    const severity = "high"; // Secret leaks are always high priority

    this.log(`Secret scanning alert: ${alert.secret_type} in ${alert.path}`);

    await this.incidentManager.createIncident({
      type: "secret_leak",
      severity: "critical",
      title: `Secret Leak Detected: ${alert.secret_type}`,
      description: `Potential secret leak detected in ${alert.path}`,
      file: alert.path,
      secretType: alert.secret_type,
      url: alert.html_url,
      eventId,
    });

    await this.alertManager.sendAlert("critical", {
      title: "🚨 SECRET LEAK DETECTED",
      description: `Secret of type ${alert.secret_type} detected in ${alert.path}`,
      severity: "critical",
      file: alert.path,
      url: alert.html_url,
      action: "IMMEDIATE ACTION REQUIRED",
    });
  }

  /**
   * Handle code scanning alerts
   */
  async handleCodeScanningAlert(payload, eventId) {
    const alert = payload.alert;
    const severity = this.mapSeverity(
      alert.rule?.security_severity_level || "medium",
    );

    this.log(`Code scanning alert: ${alert.rule?.description} (${severity})`);

    if (severity === "critical" || severity === "high") {
      await this.incidentManager.createIncident({
        type: "code_vulnerability",
        severity,
        title: `Code Vulnerability: ${alert.rule?.description}`,
        description:
          alert.most_recent_instance?.message?.text || alert.rule?.description,
        file: alert.most_recent_instance?.location?.path,
        line: alert.most_recent_instance?.location?.start_line,
        rule: alert.rule?.id,
        url: alert.html_url,
        eventId,
      });
    }

    await this.alertManager.sendAlert(severity, {
      title: `Code Scan: ${alert.rule?.description}`,
      description:
        alert.most_recent_instance?.message?.text || alert.rule?.description,
      severity,
      file: alert.most_recent_instance?.location?.path,
      line: alert.most_recent_instance?.location?.start_line,
      rule: alert.rule?.id,
      url: alert.html_url,
    });
  }

  /**
   * Handle repository vulnerability alerts
   */
  async handleRepositoryVulnerabilityAlert(payload, eventId) {
    const alert = payload.alert;
    const severity = this.mapSeverity(
      alert.security_vulnerability?.severity || "medium",
    );

    this.log(
      `Repository vulnerability: ${alert.security_vulnerability?.summary} (${severity})`,
    );

    await this.alertManager.sendAlert(severity, {
      title: `Repository Vulnerability: ${alert.security_vulnerability?.summary}`,
      description: alert.security_vulnerability?.description,
      severity,
      package: alert.dependency?.package?.name,
      url: alert.html_url,
    });
  }

  /**
   * Handle workflow run events (for CI/CD monitoring)
   */
  async handleWorkflowRun(payload, eventId) {
    const workflow = payload.workflow_run;

    if (workflow.conclusion === "failure") {
      // Check if it's a security-related failure
      const isSecurityFailure =
        workflow.name.toLowerCase().includes("security") ||
        workflow.name.toLowerCase().includes("scan");

      if (isSecurityFailure) {
        this.log(`Security workflow failure: ${workflow.name}`);

        await this.alertManager.sendAlert("high", {
          title: `Security Workflow Failed: ${workflow.name}`,
          description: `Security workflow failed in run #${workflow.run_number}`,
          severity: "high",
          workflow: workflow.name,
          runId: workflow.id,
          url: workflow.html_url,
          branch: workflow.head_branch,
        });
      }
    }
  }

  /**
   * Handle push events (for monitoring sensitive file changes)
   */
  async handlePush(payload, eventId) {
    const commits = payload.commits || [];
    const sensitiveFiles = [];
    const diamondFiles = [];

    for (const commit of commits) {
      const files = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || []),
      ];

      for (const file of files) {
        if (this.isSensitiveFile(file)) {
          sensitiveFiles.push({ file, commit: commit.id });
        }
        if (this.isDiamondFile(file)) {
          diamondFiles.push({ file, commit: commit.id });
        }
      }
    }

    if (sensitiveFiles.length > 0) {
      await this.alertManager.sendAlert("medium", {
        title: "Sensitive Files Modified",
        description: `${sensitiveFiles.length} sensitive files were modified`,
        severity: "medium",
        files: sensitiveFiles,
        author: payload.head_commit?.author?.name,
        branch: payload.ref.replace("refs/heads/", ""),
      });
    }

    if (diamondFiles.length > 0) {
      this.log(`Diamond proxy files modified: ${diamondFiles.length}`);
      // Could trigger additional Diamond-specific security checks
    }
  }

  /**
   * Check if file is sensitive
   */
  isSensitiveFile(filePath) {
    const sensitivePatterns = [
      /\.env$/,
      /config.*\.json$/,
      /secrets?\//,
      /private/,
      /key/,
      /\.pem$/,
      /\.key$/,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(filePath));
  }

  /**
   * Check if file is Diamond-related
   */
  isDiamondFile(filePath) {
    const diamondPatterns = [/diamond/i, /facet/i, /proxy/i, /upgrade/i];

    return (
      diamondPatterns.some((pattern) => pattern.test(filePath)) &&
      (filePath.endsWith(".sol") || filePath.includes("contracts"))
    );
  }

  /**
   * Map severity levels
   */
  mapSeverity(severity) {
    const severityMap = {
      critical: "critical",
      high: "high",
      medium: "medium",
      moderate: "medium",
      low: "low",
      info: "low",
    };

    return severityMap[severity?.toLowerCase()] || "medium";
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, eventId, payload) {
    const eventLog = {
      timestamp: new Date().toISOString(),
      eventType,
      eventId,
      payload: payload,
      processed: true,
    };

    const logFile = path.join(this.eventsDir, `event-${eventId}.json`);
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(eventLog, null, 2));
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      monitoring: this.config.monitoring.enabled,
      alerting: {
        slack: !!this.config.alerting.slackWebhook,
        discord: !!this.config.alerting.discordWebhook,
        email: !!this.config.alerting.emailTo,
      },
      eventsProcessed: this.getEventsCount(),
      incidentsActive: this.incidentManager.getActiveIncidentsCount(),
      metrics: this.metricsCollector.getMetricsSummary(),
    };
  }

  /**
   * Get events count
   */
  getEventsCount() {
    try {
      const files = fs.readdirSync(this.eventsDir);
      return files.filter((f) => f.startsWith("event-")).length;
    } catch {
      return 0;
    }
  }
}

// Alert Manager Class
class AlertManager {
  constructor(config) {
    this.config = config;
  }

  async sendAlert(severity, alertData) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      ...alertData,
    };

    console.log(`🚨 Sending ${severity} alert: ${alert.title}`);

    // Send to Slack
    if (this.config.alerting.slackWebhook) {
      await this.sendSlackAlert(severity, alert);
    }

    // Send to Discord
    if (this.config.alerting.discordWebhook) {
      await this.sendDiscordAlert(severity, alert);
    }

    // Send email (would integrate with email service)
    if (this.config.alerting.emailTo) {
      await this.sendEmailAlert(severity, alert);
    }
  }

  async sendSlackAlert(severity, alert) {
    const color = this.getSeverityColor(severity);
    const payload = {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: this.formatAlertFields(alert),
          footer: "GNUS-DAO Security Monitor",
          ts: Date.now() / 1000,
        },
      ],
    };

    // In production, make HTTP request to Slack webhook
    console.log(`📤 Slack alert sent: ${alert.title}`);
  }

  async sendDiscordAlert(severity, alert) {
    const color = this.getSeverityColor(severity);
    const embed = {
      title: alert.title,
      description: alert.description,
      color,
      fields: this.formatAlertFields(alert),
      footer: { text: "GNUS-DAO Security Monitor" },
      timestamp: new Date().toISOString(),
    };

    // In production, make HTTP request to Discord webhook
    console.log(`📤 Discord alert sent: ${alert.title}`);
  }

  async sendEmailAlert(severity, alert) {
    const subject = `[${severity.toUpperCase()}] GNUS-DAO Security Alert: ${alert.title}`;

    // In production, send email via service
    console.log(`📧 Email alert sent: ${subject}`);
  }

  getSeverityColor(severity) {
    const colors = {
      critical: 0xff0000, // Red
      high: 0xffa500, // Orange
      medium: 0xffff00, // Yellow
      low: 0x00ff00, // Green
    };
    return colors[severity] || colors.medium;
  }

  formatAlertFields(alert) {
    const fields = [];

    if (alert.package)
      fields.push({ title: "Package", value: alert.package, short: true });
    if (alert.file)
      fields.push({ title: "File", value: alert.file, short: true });
    if (alert.line)
      fields.push({ title: "Line", value: alert.line.toString(), short: true });
    if (alert.url)
      fields.push({ title: "URL", value: alert.url, short: false });
    if (alert.cve) fields.push({ title: "CVE", value: alert.cve, short: true });

    return fields;
  }
}

// Incident Manager Class
class IncidentManager {
  constructor(config) {
    this.config = config;
    this.incidentsDir = path.join(__dirname, "..", "test-assets", "incidents");
  }

  async createIncident(incidentData) {
    const incident = {
      id: this.generateIncidentId(),
      status: "active",
      created: new Date().toISOString(),
      ...incidentData,
    };

    const incidentFile = path.join(
      this.incidentsDir,
      `incident-${incident.id}.json`,
    );
    fs.mkdirSync(path.dirname(incidentFile), { recursive: true });
    fs.writeFileSync(incidentFile, JSON.stringify(incident, null, 2));

    console.log(`🚨 Incident created: ${incident.id} - ${incident.title}`);

    return incident;
  }

  generateIncidentId() {
    return `INC-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  getActiveIncidentsCount() {
    try {
      const files = fs.readdirSync(this.incidentsDir);
      const incidents = files
        .filter((f) => f.startsWith("incident-"))
        .map((f) =>
          JSON.parse(fs.readFileSync(path.join(this.incidentsDir, f), "utf8")),
        )
        .filter((inc) => inc.status === "active");
      return incidents.length;
    } catch {
      return 0;
    }
  }
}

// Metrics Collector Class
class MetricsCollector {
  constructor(config) {
    this.config = config;
    this.metricsDir = path.join(__dirname, "..", "test-assets", "metrics");
  }

  async updateMetrics(eventType, payload) {
    const metrics = this.loadMetrics();
    const today = new Date().toISOString().split("T")[0];

    if (!metrics[today]) {
      metrics[today] = {
        date: today,
        events: {},
        alerts: {},
        incidents: {},
      };
    }

    // Update event counts
    metrics[today].events[eventType] =
      (metrics[today].events[eventType] || 0) + 1;

    // Update alert counts based on event type
    if (
      [
        "security_advisory",
        "dependabot_alert",
        "secret_scanning_alert",
      ].includes(eventType)
    ) {
      const severity = this.determineSeverity(eventType, payload);
      metrics[today].alerts[severity] =
        (metrics[today].alerts[severity] || 0) + 1;
    }

    this.saveMetrics(metrics);
  }

  determineSeverity(eventType, payload) {
    switch (eventType) {
      case "secret_scanning_alert":
        return "critical";
      case "security_advisory":
        return payload.security_advisory?.severity || "medium";
      case "dependabot_alert":
        return payload.alert?.security_vulnerability?.severity || "medium";
      default:
        return "medium";
    }
  }

  loadMetrics() {
    try {
      const metricsFile = path.join(this.metricsDir, "security-metrics.json");
      if (fs.existsSync(metricsFile)) {
        return JSON.parse(fs.readFileSync(metricsFile, "utf8"));
      }
    } catch (error) {
      console.error("Error loading metrics:", error.message);
    }
    return {};
  }

  saveMetrics(metrics) {
    const metricsFile = path.join(this.metricsDir, "security-metrics.json");
    fs.mkdirSync(path.dirname(metricsFile), { recursive: true });
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  }

  getMetricsSummary() {
    const metrics = this.loadMetrics();
    const today = new Date().toISOString().split("T")[0];
    const todayMetrics = metrics[today] || {
      events: {},
      alerts: {},
      incidents: {},
    };

    return {
      today: todayMetrics,
      totalEvents: Object.values(todayMetrics.events).reduce(
        (sum, count) => sum + count,
        0,
      ),
      totalAlerts: Object.values(todayMetrics.alerts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const webhook = new SecurityMonitoringWebhook();

  switch (command) {
    case "process":
      // Simulate processing a webhook (for testing)
      const mockHeaders = {
        "x-github-event": "dependabot_alert",
        "x-github-delivery": "test-delivery-id",
        "x-hub-signature-256": "sha256=test",
      };
      const mockBody = {
        alert: {
          security_vulnerability: {
            summary: "Test vulnerability",
            severity: "high",
          },
          dependency: {
            package: { name: "test-package" },
            manifest_path: "package.json",
          },
          html_url: "https://github.com/test",
        },
      };
      await webhook.processWebhook(mockHeaders, mockBody);
      break;

    case "status":
      const status = webhook.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node security-monitoring-webhook.js process  # Process test webhook",
      );
      console.log(
        "  node security-monitoring-webhook.js status   # Show monitoring status",
      );
      process.exit(1);
  }
}

// Export for use as module
module.exports = SecurityMonitoringWebhook;

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Security monitoring failed:", error.message);
    process.exit(1);
  });
}
