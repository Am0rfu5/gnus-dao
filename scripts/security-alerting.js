#!/usr/bin/env node

/**
 * GNUS-DAO Security Alerting Integration
 * Manages security alerts across multiple channels (Slack, Discord, Email)
 * Provides configurable alerting rules and escalation procedures
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class SecurityAlerting {
  constructor() {
    this.config = this.loadConfiguration();
    this.alertsDir = path.join(__dirname, "..", "test-assets", "alerts");
    this.templatesDir = path.join(__dirname, "..", "templates", "alerts");
    this.escalationRules = this.loadEscalationRules();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load alerting configuration
   */
  loadConfiguration() {
    return {
      channels: {
        slack: {
          enabled: !!process.env.SLACK_WEBHOOK_URL,
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || "#security-alerts",
          username: "GNUS-DAO Security Monitor",
          icon: ":shield:",
        },
        discord: {
          enabled: !!process.env.DISCORD_WEBHOOK_URL,
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          username: "GNUS-DAO Security Monitor",
          avatarUrl: "https://example.com/avatar.png",
        },
        email: {
          enabled: !!process.env.SECURITY_EMAIL,
          to: process.env.SECURITY_EMAIL,
          from: process.env.EMAIL_FROM || "security@gnus-dao.local",
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        },
      },
      rules: {
        critical: {
          channels: ["slack", "discord", "email"],
          retryAttempts: 3,
          retryDelay: 30000, // 30 seconds
          escalation: true,
        },
        high: {
          channels: ["slack", "discord"],
          retryAttempts: 2,
          retryDelay: 15000, // 15 seconds
          escalation: true,
        },
        medium: {
          channels: ["slack"],
          retryAttempts: 1,
          retryDelay: 5000, // 5 seconds
          escalation: false,
        },
        low: {
          channels: ["slack"],
          retryAttempts: 1,
          retryDelay: 5000,
          escalation: false,
        },
      },
      templates: {
        critical: "critical-alert.json",
        high: "high-alert.json",
        medium: "medium-alert.json",
        low: "low-alert.json",
      },
    };
  }

  /**
   * Load escalation rules
   */
  loadEscalationRules() {
    return {
      critical: {
        immediate: true,
        managers: ["security-lead@gnus.ai", "devops-lead@gnus.ai"],
        phone: true,
        incident: true,
      },
      high: {
        immediate: false,
        delay: 300000, // 5 minutes
        managers: ["security-lead@gnus.ai"],
        phone: false,
        incident: true,
      },
      medium: {
        immediate: false,
        delay: 3600000, // 1 hour
        managers: [],
        phone: false,
        incident: false,
      },
      low: {
        immediate: false,
        delay: 86400000, // 24 hours
        managers: [],
        phone: false,
        incident: false,
      },
    };
  }

  /**
   * Send security alert
   */
  async sendAlert(severity, alertData, options = {}) {
    const alertId = this.generateAlertId();
    const alert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      severity,
      ...alertData,
      status: "sending",
      attempts: 0,
      channels: [],
    };

    this.log(`🚨 Sending ${severity} alert: ${alert.title || alertData.title}`);

    // Get alerting rules for this severity
    const rules = this.config.rules[severity];
    if (!rules) {
      this.log(`No rules defined for severity: ${severity}`, "warn");
      return;
    }

    // Send to configured channels
    for (const channel of rules.channels) {
      try {
        await this.sendToChannel(channel, severity, alert, rules);
        alert.channels.push({
          channel,
          status: "sent",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.log(`Failed to send to ${channel}: ${error.message}`, "error");
        alert.channels.push({
          channel,
          status: "failed",
          error: error.message,
        });
      }
    }

    // Handle escalation
    if (rules.escalation && this.escalationRules[severity]) {
      await this.handleEscalation(severity, alert);
    }

    // Log alert
    this.logAlert(alert);

    return alert;
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, severity, alert, rules) {
    const channelConfig = this.config.channels[channel];
    if (!channelConfig || !channelConfig.enabled) {
      throw new Error(`Channel ${channel} not configured or disabled`);
    }

    let attempts = 0;
    let lastError;

    while (attempts < rules.retryAttempts) {
      try {
        switch (channel) {
          case "slack":
            await this.sendSlackAlert(channelConfig, severity, alert);
            break;
          case "discord":
            await this.sendDiscordAlert(channelConfig, severity, alert);
            break;
          case "email":
            await this.sendEmailAlert(channelConfig, severity, alert);
            break;
          default:
            throw new Error(`Unknown channel: ${channel}`);
        }
        return; // Success
      } catch (error) {
        attempts++;
        lastError = error;
        if (attempts < rules.retryAttempts) {
          this.log(
            `Retry ${attempts}/${rules.retryAttempts} for ${channel} in ${rules.retryDelay}ms`,
          );
          await this.delay(rules.retryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(config, severity, alert) {
    const template = this.loadAlertTemplate(severity);
    const color = this.getSeverityColor(severity);

    const payload = {
      channel: config.channel,
      username: config.username,
      icon_emoji: config.icon,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: this.formatAlertFields(alert),
          footer: "GNUS-DAO Security Monitor",
          ts: Date.now() / 1000,
          ...template,
        },
      ],
    };

    // In production, make HTTP POST to config.webhookUrl
    console.log(`📤 Slack alert sent to ${config.channel}: ${alert.title}`);
    console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
  }

  /**
   * Send Discord alert
   */
  async sendDiscordAlert(config, severity, alert) {
    const template = this.loadAlertTemplate(severity);
    const color = this.getSeverityColor(severity);

    const embed = {
      title: alert.title,
      description: alert.description,
      color,
      fields: this.formatAlertFields(alert),
      footer: { text: "GNUS-DAO Security Monitor" },
      timestamp: alert.timestamp,
      ...template,
    };

    const payload = {
      username: config.username,
      avatar_url: config.avatarUrl,
      embeds: [embed],
    };

    // In production, make HTTP POST to config.webhookUrl
    console.log(`📤 Discord alert sent: ${alert.title}`);
    console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(config, severity, alert) {
    const subject = `[${severity.toUpperCase()}] GNUS-DAO Security Alert: ${alert.title}`;
    const template = this.loadAlertTemplate(severity);

    const htmlBody = this.generateEmailHtml(severity, alert, template);
    const textBody = this.generateEmailText(severity, alert);

    // In production, use nodemailer or similar
    console.log(`📧 Email alert sent to ${config.to}: ${subject}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   HTML Body: ${htmlBody.substring(0, 200)}...`);
  }

  /**
   * Handle alert escalation
   */
  async handleEscalation(severity, alert) {
    const escalation = this.escalationRules[severity];

    if (escalation.immediate) {
      this.log(`🚨 Immediate escalation for ${severity} alert: ${alert.title}`);
      // In production, trigger immediate escalation (phone calls, etc.)
    } else if (escalation.delay) {
      setTimeout(() => {
        this.log(`⏰ Delayed escalation for ${severity} alert: ${alert.title}`);
        // Send escalation notifications
      }, escalation.delay);
    }

    if (escalation.incident) {
      await this.createIncidentFromAlert(alert);
    }
  }

  /**
   * Create incident from alert
   */
  async createIncidentFromAlert(alert) {
    // This would integrate with the incident management system
    console.log(`🚨 Creating incident from alert: ${alert.id}`);
  }

  /**
   * Load alert template
   */
  loadAlertTemplate(severity) {
    try {
      const templateFile = path.join(
        this.templatesDir,
        this.config.templates[severity],
      );
      if (fs.existsSync(templateFile)) {
        return JSON.parse(fs.readFileSync(templateFile, "utf8"));
      }
    } catch (error) {
      this.log(
        `Error loading template for ${severity}: ${error.message}`,
        "warn",
      );
    }
    return {};
  }

  /**
   * Generate email HTML body
   */
  generateEmailHtml(severity, alert, template) {
    const color = this.getSeverityHexColor(severity);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .alert { border-left: 5px solid ${color}; padding: 10px; margin: 10px 0; }
                .severity { color: ${color}; font-weight: bold; text-transform: uppercase; }
                .field { margin: 5px 0; }
                .field-label { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="alert">
                <h2 class="severity">${severity} Security Alert</h2>
                <h3>${alert.title}</h3>
                <p>${alert.description}</p>
                <div class="fields">
                    ${this.formatAlertFields(alert)
                      .map(
                        (field) =>
                          `<div class="field"><span class="field-label">${field.title}:</span> ${field.value}</div>`,
                      )
                      .join("")}
                </div>
                <p><small>Alert ID: ${alert.id} | Timestamp: ${alert.timestamp}</small></p>
            </div>
        </body>
        </html>
        `;
  }

  /**
   * Generate email text body
   */
  generateEmailText(severity, alert) {
    return `
[${severity.toUpperCase()}] GNUS-DAO Security Alert

${alert.title}
${alert.description}

${this.formatAlertFields(alert)
  .map((field) => `${field.title}: ${field.value}`)
  .join("\n")}

Alert ID: ${alert.id}
Timestamp: ${alert.timestamp}
        `.trim();
  }

  /**
   * Format alert fields for notifications
   */
  formatAlertFields(alert) {
    const fields = [];

    if (alert.package)
      fields.push({ title: "Package", value: alert.package, short: true });
    if (alert.version)
      fields.push({ title: "Version", value: alert.version, short: true });
    if (alert.file)
      fields.push({ title: "File", value: alert.file, short: true });
    if (alert.line)
      fields.push({ title: "Line", value: alert.line.toString(), short: true });
    if (alert.cve) fields.push({ title: "CVE", value: alert.cve, short: true });
    if (alert.url)
      fields.push({ title: "URL", value: alert.url, short: false });
    if (alert.action)
      fields.push({
        title: "Action Required",
        value: alert.action,
        short: false,
      });

    return fields;
  }

  /**
   * Get severity color for notifications
   */
  getSeverityColor(severity) {
    const colors = {
      critical: "danger", // Red
      high: "warning", // Orange
      medium: "good", // Yellow
      low: "good", // Green
    };
    return colors[severity] || colors.medium;
  }

  /**
   * Get severity hex color for email
   */
  getSeverityHexColor(severity) {
    const colors = {
      critical: "#FF0000", // Red
      high: "#FFA500", // Orange
      medium: "#FFFF00", // Yellow
      low: "#00FF00", // Green
    };
    return colors[severity] || colors.medium;
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `ALERT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }

  /**
   * Log alert
   */
  logAlert(alert) {
    const logFile = path.join(this.alertsDir, `alert-${alert.id}.json`);
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(alert, null, 2));
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get alerting status
   */
  getStatus() {
    return {
      channels: {
        slack: this.config.channels.slack.enabled,
        discord: this.config.channels.discord.enabled,
        email: this.config.channels.email.enabled,
      },
      rules: this.config.rules,
      escalation: this.escalationRules,
      alertsSent: this.getAlertsCount(),
    };
  }

  /**
   * Get alerts count
   */
  getAlertsCount() {
    try {
      const files = fs.readdirSync(this.alertsDir);
      return files.filter((f) => f.startsWith("alert-")).length;
    } catch {
      return 0;
    }
  }

  /**
   * Test alerting configuration
   */
  async testAlerting() {
    this.log("🧪 Testing alerting configuration");

    const testAlert = {
      title: "Test Security Alert",
      description: "This is a test alert to verify alerting configuration",
      severity: "low",
      test: true,
    };

    await this.sendAlert("low", testAlert);
    this.log("✅ Alerting test completed");
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const alerting = new SecurityAlerting();

  switch (command) {
    case "test":
      await alerting.testAlerting();
      break;

    case "send":
      const severity = args[1] || "medium";
      const title = args[2] || "Manual Test Alert";
      const description = args[3] || "This is a manual test alert";
      await alerting.sendAlert(severity, { title, description });
      break;

    case "status":
      const status = alerting.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node security-alerting.js test                    # Test alerting configuration",
      );
      console.log(
        "  node security-alerting.js send [severity] [title] [desc]  # Send test alert",
      );
      console.log(
        "  node security-alerting.js status                  # Show alerting status",
      );
      process.exit(1);
  }
}

// Export for use as module
module.exports = SecurityAlerting;

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Security alerting failed:", error.message);
    process.exit(1);
  });
}
