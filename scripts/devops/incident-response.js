#!/usr/bin/env node

/**
 * GNUS-DAO Automated Incident Response System
 * Handles incident creation, escalation, and automated response workflows
 * Integrates with security monitoring and alerting systems
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class IncidentResponseSystem {
  constructor() {
    this.incidentsDir = path.join(__dirname, "..", "test-assets", "incidents");
    this.playbooksDir = path.join(
      __dirname,
      "..",
      "docs",
      "incident-playbooks",
    );
    this.config = this.loadConfiguration();
    this.incidentCounter = this.getNextIncidentId();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load incident response configuration
   */
  loadConfiguration() {
    return {
      escalation: {
        critical: {
          immediate: true,
          managers: ["security-lead@gnus.ai", "cto@gnus.ai"],
          channels: ["slack-security", "email-managers"],
          timeout: 300000, // 5 minutes
        },
        high: {
          immediate: false,
          managers: ["security-lead@gnus.ai"],
          channels: ["slack-security"],
          timeout: 1800000, // 30 minutes
        },
        medium: {
          immediate: false,
          managers: [],
          channels: ["slack-security"],
          timeout: 3600000, // 1 hour
        },
        low: {
          immediate: false,
          managers: [],
          channels: [],
          timeout: 86400000, // 24 hours
        },
      },
      autoResponse: {
        enabled: true,
        rules: [
          {
            trigger: "diamond-upgrade-failed",
            actions: ["pause-deployments", "notify-team", "rollback"],
          },
          {
            trigger: "security-scan-failed",
            actions: ["block-merge", "notify-security", "create-ticket"],
          },
          {
            trigger: "dependency-vulnerability",
            actions: ["update-dependency", "security-review", "notify-team"],
          },
        ],
      },
      playbooks: {
        "diamond-security-breach": "diamond-security-response.md",
        "contract-exploit": "contract-exploit-response.md",
        "dependency-compromise": "dependency-compromise-response.md",
        "access-breach": "access-breach-response.md",
      },
    };
  }

  /**
   * Create a new incident
   */
  async createIncident(incidentData) {
    this.log("🚨 Creating new security incident");

    const incident = {
      id: this.generateIncidentId(),
      title: incidentData.title,
      description: incidentData.description,
      severity: incidentData.severity || "medium",
      status: "active",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source: incidentData.source || "monitoring",
      category: incidentData.category || "general",
      affected: incidentData.affected || [],
      evidence: incidentData.evidence || [],
      assigned: null,
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: "incident-created",
          details:
            "Security incident automatically created by monitoring system",
          actor: "system",
        },
      ],
      tags: incidentData.tags || [],
      priority: this.calculatePriority(incidentData),
      playbook: this.selectPlaybook(incidentData),
    };

    // Save incident
    await this.saveIncident(incident);

    // Execute automated responses
    await this.executeAutoResponse(incident);

    // Handle escalation
    await this.handleEscalation(incident);

    // Notify relevant parties
    await this.notifyIncidentCreated(incident);

    this.log(`✅ Incident created: ${incident.id} - ${incident.title}`);
    return incident;
  }

  /**
   * Update incident status
   */
  async updateIncident(incidentId, updates) {
    const incident = await this.loadIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Update incident
    Object.assign(incident, updates, {
      updated: new Date().toISOString(),
    });

    // Add timeline entry
    incident.timeline.push({
      timestamp: new Date().toISOString(),
      action: "status-updated",
      details: `Status changed to ${updates.status}`,
      actor: updates.actor || "system",
    });

    // Save updated incident
    await this.saveIncident(incident);

    // Handle status-specific actions
    await this.handleStatusChange(incident, updates.status);

    this.log(`📝 Incident updated: ${incidentId} - ${updates.status}`);
    return incident;
  }

  /**
   * Execute automated response for incident
   */
  async executeAutoResponse(incident) {
    if (!this.config.autoResponse.enabled) {
      return;
    }

    this.log(`🤖 Executing automated response for incident ${incident.id}`);

    const matchingRules = this.config.autoResponse.rules.filter((rule) =>
      this.matchesTrigger(incident, rule.trigger),
    );

    for (const rule of matchingRules) {
      await this.executeActions(incident, rule.actions);
    }
  }

  /**
   * Check if incident matches trigger
   */
  matchesTrigger(incident, trigger) {
    const triggerMap = {
      "diamond-upgrade-failed": () =>
        incident.category === "diamond" &&
        incident.title.includes("upgrade") &&
        incident.title.includes("failed"),
      "security-scan-failed": () =>
        incident.category === "security" &&
        incident.title.includes("scan") &&
        incident.title.includes("failed"),
      "dependency-vulnerability": () =>
        incident.category === "dependency" &&
        incident.tags.includes("vulnerability"),
      "contract-exploit": () =>
        incident.category === "contract" && incident.tags.includes("exploit"),
    };

    return triggerMap[trigger] ? triggerMap[trigger]() : false;
  }

  /**
   * Execute automated actions
   */
  async executeActions(incident, actions) {
    for (const action of actions) {
      await this.executeAction(incident, action);
    }
  }

  /**
   * Execute single action
   */
  async executeAction(incident, action) {
    this.log(`⚡ Executing action: ${action} for incident ${incident.id}`);

    const actionMap = {
      "pause-deployments": async () => {
        // Implementation would pause CI/CD deployments
        this.log("⏸️ Deployments paused");
      },
      "block-merge": async () => {
        // Implementation would block PR merges
        this.log("🚫 PR merges blocked");
      },
      "notify-team": async () => {
        await this.notifyTeam(incident);
      },
      "notify-security": async () => {
        await this.notifySecurityTeam(incident);
      },
      "create-ticket": async () => {
        await this.createSupportTicket(incident);
      },
      rollback: async () => {
        await this.rollbackChanges(incident);
      },
      "update-dependency": async () => {
        await this.updateDependency(incident);
      },
      "security-review": async () => {
        await this.requestSecurityReview(incident);
      },
    };

    if (actionMap[action]) {
      try {
        await actionMap[action]();
        incident.timeline.push({
          timestamp: new Date().toISOString(),
          action: "auto-action-executed",
          details: `Automated action executed: ${action}`,
          actor: "system",
        });
      } catch (error) {
        this.log(`Error executing action ${action}: ${error.message}`, "error");
      }
    }
  }

  /**
   * Handle incident escalation
   */
  async handleEscalation(incident) {
    const escalationConfig = this.config.escalation[incident.severity];
    if (!escalationConfig) {
      return;
    }

    this.log(
      `📈 Handling escalation for incident ${incident.id} (severity: ${incident.severity})`,
    );

    // Immediate escalation for critical incidents
    if (escalationConfig.immediate) {
      await this.escalateImmediately(incident, escalationConfig);
    }

    // Set escalation timeout
    setTimeout(async () => {
      const currentIncident = await this.loadIncident(incident.id);
      if (currentIncident && currentIncident.status === "active") {
        await this.escalateTimeout(incident, escalationConfig);
      }
    }, escalationConfig.timeout);
  }

  /**
   * Immediate escalation
   */
  async escalateImmediately(incident, config) {
    this.log(`🚨 Immediate escalation for incident ${incident.id}`);

    // Notify managers
    for (const manager of config.managers) {
      await this.sendEscalationEmail(incident, manager);
    }

    // Notify channels
    for (const channel of config.channels) {
      await this.sendChannelNotification(incident, channel);
    }

    incident.timeline.push({
      timestamp: new Date().toISOString(),
      action: "immediate-escalation",
      details: `Immediate escalation triggered for ${incident.severity} severity incident`,
      actor: "system",
    });
  }

  /**
   * Timeout escalation
   */
  async escalateTimeout(incident, config) {
    this.log(`⏰ Timeout escalation for incident ${incident.id}`);

    // Escalate to next level
    const nextLevel = this.getNextEscalationLevel(incident.severity);

    incident.timeline.push({
      timestamp: new Date().toISOString(),
      action: "timeout-escalation",
      details: `Timeout escalation triggered, escalating to ${nextLevel}`,
      actor: "system",
    });

    // Update incident severity and re-escalate
    await this.updateIncident(incident.id, {
      severity: nextLevel,
      actor: "system",
    });
  }

  /**
   * Get next escalation level
   */
  getNextEscalationLevel(currentLevel) {
    const levels = ["low", "medium", "high", "critical"];
    const currentIndex = levels.indexOf(currentLevel);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  /**
   * Handle status change actions
   */
  async handleStatusChange(incident, newStatus) {
    switch (newStatus) {
      case "resolved":
        await this.handleResolution(incident);
        break;
      case "closed":
        await this.handleClosure(incident);
        break;
      case "investigating":
        await this.handleInvestigation(incident);
        break;
    }
  }

  /**
   * Handle incident resolution
   */
  async handleResolution(incident) {
    this.log(`✅ Incident resolved: ${incident.id}`);

    // Send resolution notifications
    await this.notifyResolution(incident);

    // Generate post-mortem if critical/high
    if (["critical", "high"].includes(incident.severity)) {
      await this.generatePostMortem(incident);
    }

    // Update metrics
    await this.updateMetrics(incident);
  }

  /**
   * Handle incident closure
   */
  async handleClosure(incident) {
    this.log(`🔒 Incident closed: ${incident.id}`);

    // Archive incident data
    await this.archiveIncident(incident);

    // Clean up temporary measures
    await this.cleanupTemporaryMeasures(incident);
  }

  /**
   * Handle investigation start
   */
  async handleInvestigation(incident) {
    this.log(`🔍 Investigation started for incident: ${incident.id}`);

    // Assign investigator if not assigned
    if (!incident.assigned) {
      const investigator = await this.assignInvestigator(incident);
      if (investigator) {
        await this.updateIncident(incident.id, {
          assigned: investigator,
          actor: "system",
        });
      }
    }

    // Load and provide playbook
    if (incident.playbook) {
      await this.providePlaybook(incident);
    }
  }

  /**
   * Generate incident ID
   */
  generateIncidentId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `INC-${timestamp}-${random}`;
  }

  /**
   * Get next incident ID counter
   */
  getNextIncidentId() {
    try {
      const counterFile = path.join(this.incidentsDir, "counter.txt");
      if (fs.existsSync(counterFile)) {
        const counter = parseInt(fs.readFileSync(counterFile, "utf8"));
        fs.writeFileSync(counterFile, (counter + 1).toString());
        return counter + 1;
      }
    } catch {
      // Create counter file
    }

    fs.mkdirSync(this.incidentsDir, { recursive: true });
    fs.writeFileSync(path.join(this.incidentsDir, "counter.txt"), "1");
    return 1;
  }

  /**
   * Calculate incident priority
   */
  calculatePriority(incidentData) {
    const severityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
    const categoryWeights = {
      diamond: 3,
      contract: 3,
      security: 3,
      dependency: 2,
      access: 2,
      general: 1,
    };

    const severityWeight = severityWeights[incidentData.severity] || 2;
    const categoryWeight = categoryWeights[incidentData.category] || 1;

    return severityWeight * categoryWeight;
  }

  /**
   * Select appropriate playbook
   */
  selectPlaybook(incidentData) {
    const playbookMap = {
      "diamond-security-breach": () =>
        incidentData.category === "diamond" &&
        incidentData.tags.includes("breach"),
      "contract-exploit": () =>
        incidentData.category === "contract" &&
        incidentData.tags.includes("exploit"),
      "dependency-compromise": () =>
        incidentData.category === "dependency" &&
        incidentData.tags.includes("compromise"),
      "access-breach": () =>
        incidentData.category === "access" &&
        incidentData.tags.includes("breach"),
    };

    for (const [playbook, condition] of Object.entries(playbookMap)) {
      if (condition()) {
        return this.config.playbooks[playbook];
      }
    }

    return null;
  }

  /**
   * Save incident to file
   */
  async saveIncident(incident) {
    const fileName = `incident-${incident.id}.json`;
    const filePath = path.join(this.incidentsDir, fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(incident, null, 2));
  }

  /**
   * Load incident from file
   */
  async loadIncident(incidentId) {
    const fileName = `incident-${incidentId}.json`;
    const filePath = path.join(this.incidentsDir, fileName);

    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      }
    } catch (error) {
      this.log(
        `Error loading incident ${incidentId}: ${error.message}`,
        "error",
      );
    }

    return null;
  }

  /**
   * Get all active incidents
   */
  async getActiveIncidents() {
    const incidents = [];
    try {
      const files = fs.readdirSync(this.incidentsDir);
      for (const file of files) {
        if (file.startsWith("incident-") && file.endsWith(".json")) {
          const incident = JSON.parse(
            fs.readFileSync(path.join(this.incidentsDir, file), "utf8"),
          );
          if (incident.status === "active") {
            incidents.push(incident);
          }
        }
      }
    } catch (error) {
      this.log(`Error loading active incidents: ${error.message}`, "error");
    }

    return incidents;
  }

  /**
   * Notification methods (implementations would integrate with actual services)
   */
  async notifyIncidentCreated(incident) {
    this.log(`📢 Notifying incident creation: ${incident.id}`);
    // Implementation would send notifications via Slack, email, etc.
  }

  async notifyTeam(incident) {
    this.log(`👥 Notifying team about incident: ${incident.id}`);
  }

  async notifySecurityTeam(incident) {
    this.log(`🛡️ Notifying security team about incident: ${incident.id}`);
  }

  async notifyResolution(incident) {
    this.log(`✅ Notifying resolution of incident: ${incident.id}`);
  }

  async sendEscalationEmail(incident, recipient) {
    this.log(
      `📧 Sending escalation email to ${recipient} for incident: ${incident.id}`,
    );
  }

  async sendChannelNotification(incident, channel) {
    this.log(
      `💬 Sending notification to ${channel} for incident: ${incident.id}`,
    );
  }

  async createSupportTicket(incident) {
    this.log(`🎫 Creating support ticket for incident: ${incident.id}`);
  }

  async rollbackChanges(incident) {
    this.log(`🔄 Rolling back changes for incident: ${incident.id}`);
  }

  async updateDependency(incident) {
    this.log(`📦 Updating dependency for incident: ${incident.id}`);
  }

  async requestSecurityReview(incident) {
    this.log(`🔍 Requesting security review for incident: ${incident.id}`);
  }

  async assignInvestigator(incident) {
    // Implementation would assign based on rotation, availability, etc.
    return "security-investigator@gnus.ai";
  }

  async providePlaybook(incident) {
    this.log(
      `📋 Providing playbook ${incident.playbook} for incident: ${incident.id}`,
    );
  }

  async generatePostMortem(incident) {
    this.log(`📝 Generating post-mortem for incident: ${incident.id}`);
  }

  async updateMetrics(incident) {
    this.log(`📊 Updating metrics for incident: ${incident.id}`);
  }

  async archiveIncident(incident) {
    this.log(`📦 Archiving incident: ${incident.id}`);
  }

  async cleanupTemporaryMeasures(incident) {
    this.log(`🧹 Cleaning up temporary measures for incident: ${incident.id}`);
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      activeIncidents: this.getActiveIncidents().length,
      totalIncidents: this.getTotalIncidents(),
      escalationConfig: this.config.escalation,
      autoResponseEnabled: this.config.autoResponse.enabled,
    };
  }

  /**
   * Get total incidents count
   */
  getTotalIncidents() {
    try {
      const files = fs.readdirSync(this.incidentsDir);
      return files.filter((f) => f.startsWith("incident-")).length;
    } catch {
      return 0;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const incidentSystem = new IncidentResponseSystem();

  switch (command) {
    case "create":
      const incidentData = {
        title: args[1] || "Security Incident",
        description: args[2] || "Incident created via CLI",
        severity: args[3] || "medium",
        category: args[4] || "general",
      };
      const incident = await incidentSystem.createIncident(incidentData);
      console.log(`Created incident: ${incident.id}`);
      process.exit(0);
      break;

    case "update":
      const incidentId = args[1];
      const updateStatus = args[2];
      await incidentSystem.updateIncident(incidentId, { status: updateStatus });
      console.log(`Updated incident: ${incidentId}`);
      process.exit(0);
      break;

    case "list":
      const activeIncidents = await incidentSystem.getActiveIncidents();
      console.log("Active Incidents:");
      activeIncidents.forEach((inc) => {
        console.log(`- ${inc.id}: ${inc.title} (${inc.severity})`);
      });
      process.exit(0);
      break;

    case "status":
      const systemStatus = incidentSystem.getStatus();
      console.log(JSON.stringify(systemStatus, null, 2));
      process.exit(0);
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node incident-response.js create [title] [description] [severity] [category]",
      );
      console.log("  node incident-response.js update <incident-id> <status>");
      console.log("  node incident-response.js list");
      console.log("  node incident-response.js status");
      process.exit(1);
  }
}

// Export for use as module
module.exports = IncidentResponseSystem;

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Incident response system failed:", error.message);
    process.exit(1);
  });
}
