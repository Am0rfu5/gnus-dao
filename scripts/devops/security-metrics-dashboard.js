#!/usr/bin/env node

/**
 * GNUS-DAO Security Metrics Dashboard
 * Generates security metrics reports and visualizations
 * Tracks security posture over time and provides insights
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class SecurityMetricsDashboard {
  constructor() {
    this.metricsDir = path.join(__dirname, "..", "test-assets", "metrics");
    this.reportsDir = path.join(__dirname, "..", "test-assets", "reports");
    this.dashboardDir = path.join(
      __dirname,
      "..",
      "docs",
      "security-dashboard",
    );
    this.config = this.loadConfiguration();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load dashboard configuration
   */
  loadConfiguration() {
    return {
      metrics: {
        retention: 90, // days
        updateInterval: 3600000, // 1 hour
        thresholds: {
          criticalEvents: 10,
          highEvents: 50,
          mediumEvents: 100,
          incidents: 5,
        },
      },
      reports: {
        daily: true,
        weekly: true,
        monthly: true,
        formats: ["json", "html", "markdown"],
      },
      dashboard: {
        enabled: true,
        refreshInterval: 300000, // 5 minutes
        charts: ["timeline", "severity", "trends", "incidents"],
      },
    };
  }

  /**
   * Generate comprehensive security metrics report
   */
  async generateMetricsReport(options = {}) {
    this.log("📊 Generating security metrics report");

    const {
      period = "weekly",
      format = "json",
      includeCharts = true,
    } = options;

    const report = {
      generated: new Date().toISOString(),
      period,
      title: `GNUS-DAO Security Metrics Report - ${period}`,
      summary: {},
      metrics: {},
      trends: {},
      recommendations: [],
    };

    // Load metrics data
    const metrics = this.loadMetricsData();
    const incidents = this.loadIncidentsData();
    const alerts = this.loadAlertsData();

    // Calculate summary metrics
    report.summary = this.calculateSummaryMetrics(
      metrics,
      incidents,
      alerts,
      period,
    );

    // Generate detailed metrics
    report.metrics = this.generateDetailedMetrics(metrics, period);

    // Calculate trends
    report.trends = this.calculateTrends(metrics, period);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    // Generate charts if requested
    if (includeCharts) {
      report.charts = await this.generateCharts(metrics, period);
    }

    // Save report in requested format
    await this.saveReport(report, format);

    // Update dashboard
    if (this.config.dashboard.enabled) {
      await this.updateDashboard(report);
    }

    this.log(`✅ Security metrics report generated: ${period} period`);
    return report;
  }

  /**
   * Load metrics data
   */
  loadMetricsData() {
    try {
      const metricsFile = path.join(this.metricsDir, "security-metrics.json");
      if (fs.existsSync(metricsFile)) {
        return JSON.parse(fs.readFileSync(metricsFile, "utf8"));
      }
    } catch (error) {
      this.log(`Error loading metrics data: ${error.message}`, "warn");
    }
    return {};
  }

  /**
   * Load incidents data
   */
  loadIncidentsData() {
    try {
      const incidentsDir = path.join(
        __dirname,
        "..",
        "test-assets",
        "incidents",
      );
      if (fs.existsSync(incidentsDir)) {
        const files = fs.readdirSync(incidentsDir);
        return files
          .filter((f) => f.startsWith("incident-"))
          .map((f) =>
            JSON.parse(fs.readFileSync(path.join(incidentsDir, f), "utf8")),
          );
      }
    } catch (error) {
      this.log(`Error loading incidents data: ${error.message}`, "warn");
    }
    return [];
  }

  /**
   * Load alerts data
   */
  loadAlertsData() {
    try {
      const alertsDir = path.join(__dirname, "..", "test-assets", "alerts");
      if (fs.existsSync(alertsDir)) {
        const files = fs.readdirSync(alertsDir);
        return files
          .filter((f) => f.startsWith("alert-"))
          .map((f) =>
            JSON.parse(fs.readFileSync(path.join(alertsDir, f), "utf8")),
          );
      }
    } catch (error) {
      this.log(`Error loading alerts data: ${error.message}`, "warn");
    }
    return [];
  }

  /**
   * Calculate summary metrics
   */
  calculateSummaryMetrics(metrics, incidents, alerts, period) {
    const periodDays = this.getPeriodDays(period);
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const summary = {
      period: {
        days: periodDays,
        start: cutoffDate.toISOString(),
        end: new Date().toISOString(),
      },
      events: {
        total: 0,
        byType: {},
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      alerts: {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      incidents: {
        total: 0,
        active: 0,
        resolved: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      health: {
        score: 0,
        status: "unknown",
      },
    };

    // Process metrics
    Object.entries(metrics).forEach(([date, dayMetrics]) => {
      const metricDate = new Date(date);
      if (metricDate >= cutoffDate) {
        // Events
        Object.entries(dayMetrics.events || {}).forEach(([type, count]) => {
          summary.events.total += count;
          summary.events.byType[type] =
            (summary.events.byType[type] || 0) + count;
        });

        // Alerts by severity
        Object.entries(dayMetrics.alerts || {}).forEach(([severity, count]) => {
          summary.alerts.total += count;
          summary.alerts.bySeverity[severity] =
            (summary.alerts.bySeverity[severity] || 0) + count;
        });
      }
    });

    // Process incidents
    incidents.forEach((incident) => {
      const incidentDate = new Date(incident.created);
      if (incidentDate >= cutoffDate) {
        summary.incidents.total++;
        if (incident.status === "active") {
          summary.incidents.active++;
        } else {
          summary.incidents.resolved++;
        }
        summary.incidents.bySeverity[incident.severity] =
          (summary.incidents.bySeverity[incident.severity] || 0) + 1;
      }
    });

    // Calculate health score (0-100, higher is better)
    summary.health.score = this.calculateHealthScore(summary);
    summary.health.status = this.getHealthStatus(summary.health.score);

    return summary;
  }

  /**
   * Generate detailed metrics
   */
  generateDetailedMetrics(metrics, period) {
    const periodDays = this.getPeriodDays(period);
    const detailed = {
      dailyBreakdown: [],
      topEventTypes: [],
      topAlertTypes: [],
      responseTimes: {},
      compliance: {},
    };

    // Daily breakdown
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    Object.entries(metrics).forEach(([date, dayMetrics]) => {
      const metricDate = new Date(date);
      if (metricDate >= cutoffDate) {
        detailed.dailyBreakdown.push({
          date,
          events: Object.values(dayMetrics.events || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
          alerts: Object.values(dayMetrics.alerts || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
          incidents: Object.values(dayMetrics.incidents || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
        });
      }
    });

    // Top event types
    const eventCounts = {};
    Object.values(metrics).forEach((dayMetrics) => {
      Object.entries(dayMetrics.events || {}).forEach(([type, count]) => {
        eventCounts[type] = (eventCounts[type] || 0) + count;
      });
    });
    detailed.topEventTypes = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return detailed;
  }

  /**
   * Calculate trends
   */
  calculateTrends(metrics, period) {
    const trends = {
      events: { change: 0, direction: "stable" },
      alerts: { change: 0, direction: "stable" },
      incidents: { change: 0, direction: "stable" },
    };

    const dates = Object.keys(metrics).sort();
    if (dates.length < 2) return trends;

    const midPoint = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, midPoint);
    const secondHalf = dates.slice(midPoint);

    // Calculate trends for each metric
    ["events", "alerts", "incidents"].forEach((metric) => {
      const firstHalfAvg = this.calculateAverage(metrics, firstHalf, metric);
      const secondHalfAvg = this.calculateAverage(metrics, secondHalf, metric);

      if (firstHalfAvg > 0) {
        trends[metric].change =
          ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        trends[metric].direction =
          trends[metric].change > 5
            ? "increasing"
            : trends[metric].change < -5
              ? "decreasing"
              : "stable";
      }
    });

    return trends;
  }

  /**
   * Calculate average for metric over date range
   */
  calculateAverage(metrics, dates, metric) {
    let total = 0;
    let count = 0;

    dates.forEach((date) => {
      if (metrics[date] && metrics[date][metric]) {
        const dayTotal = Object.values(metrics[date][metric]).reduce(
          (sum, val) => sum + val,
          0,
        );
        total += dayTotal;
        count++;
      }
    });

    return count > 0 ? total / count : 0;
  }

  /**
   * Generate recommendations based on metrics
   */
  generateRecommendations(report) {
    const recommendations = [];

    const { summary, trends } = report;

    // Event volume recommendations
    if (summary.events.total > this.config.metrics.thresholds.mediumEvents) {
      recommendations.push({
        priority: "high",
        category: "Monitoring",
        recommendation:
          "High event volume detected. Consider increasing monitoring capacity.",
        impact: "Improve detection coverage",
        effort: "Medium",
      });
    }

    // Alert severity recommendations
    if (summary.alerts.bySeverity.critical > 0) {
      recommendations.push({
        priority: "critical",
        category: "Response",
        recommendation:
          "Critical alerts detected. Immediate investigation required.",
        impact: "Prevent security incidents",
        effort: "High",
      });
    }

    // Incident trends
    if (trends.incidents.direction === "increasing") {
      recommendations.push({
        priority: "high",
        category: "Process",
        recommendation:
          "Incident rate is increasing. Review incident response procedures.",
        impact: "Improve response effectiveness",
        effort: "Medium",
      });
    }

    // Health score recommendations
    if (summary.health.score < 70) {
      recommendations.push({
        priority: "medium",
        category: "Security",
        recommendation:
          "Security health score is low. Implement recommended security improvements.",
        impact: "Enhance overall security posture",
        effort: "High",
      });
    }

    return recommendations;
  }

  /**
   * Generate charts data
   */
  async generateCharts(metrics, period) {
    const charts = {
      timeline: this.generateTimelineChart(metrics, period),
      severity: this.generateSeverityChart(metrics, period),
      trends: this.generateTrendsChart(metrics, period),
      incidents: this.generateIncidentsChart(metrics, period),
    };

    return charts;
  }

  /**
   * Generate timeline chart data
   */
  generateTimelineChart(metrics, period) {
    const periodDays = this.getPeriodDays(period);
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const data = [];
    Object.entries(metrics).forEach(([date, dayMetrics]) => {
      const metricDate = new Date(date);
      if (metricDate >= cutoffDate) {
        data.push({
          date,
          events: Object.values(dayMetrics.events || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
          alerts: Object.values(dayMetrics.alerts || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
          incidents: Object.values(dayMetrics.incidents || {}).reduce(
            (sum, count) => sum + count,
            0,
          ),
        });
      }
    });

    return {
      type: "line",
      title: "Security Events Timeline",
      xAxis: "Date",
      yAxis: "Count",
      series: [
        { name: "Events", data: data.map((d) => ({ x: d.date, y: d.events })) },
        { name: "Alerts", data: data.map((d) => ({ x: d.date, y: d.alerts })) },
        {
          name: "Incidents",
          data: data.map((d) => ({ x: d.date, y: d.incidents })),
        },
      ],
    };
  }

  /**
   * Generate severity chart data
   */
  generateSeverityChart(metrics, period) {
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    Object.values(metrics).forEach((dayMetrics) => {
      Object.entries(dayMetrics.alerts || {}).forEach(([severity, count]) => {
        severityCounts[severity] = (severityCounts[severity] || 0) + count;
      });
    });

    return {
      type: "pie",
      title: "Alert Severity Distribution",
      series: Object.entries(severityCounts).map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count,
        color: this.getSeverityColor(severity),
      })),
    };
  }

  /**
   * Generate trends chart data
   */
  generateTrendsChart(metrics, period) {
    // Implementation for trends visualization
    return {
      type: "bar",
      title: "Security Trends",
      data: [], // Would contain trend analysis data
    };
  }

  /**
   * Generate incidents chart data
   */
  generateIncidentsChart(metrics, period) {
    // Implementation for incidents visualization
    return {
      type: "bar",
      title: "Incident Analysis",
      data: [], // Would contain incident analysis data
    };
  }

  /**
   * Calculate health score
   */
  calculateHealthScore(summary) {
    let score = 100;

    // Deduct points for incidents
    score -= summary.incidents.total * 5;
    score -= summary.incidents.active * 10;

    // Deduct points for critical alerts
    score -= summary.alerts.bySeverity.critical * 15;
    score -= summary.alerts.bySeverity.high * 5;

    // Deduct points for high event volume
    if (summary.events.total > this.config.metrics.thresholds.mediumEvents) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get health status from score
   */
  getHealthStatus(score) {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "fair";
    if (score >= 60) return "poor";
    return "critical";
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity) {
    const colors = {
      critical: "#FF0000",
      high: "#FFA500",
      medium: "#FFFF00",
      low: "#00FF00",
    };
    return colors[severity] || "#808080";
  }

  /**
   * Get period in days
   */
  getPeriodDays(period) {
    const periods = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
    };
    return periods[period] || 7;
  }

  /**
   * Save report in specified format
   */
  async saveReport(report, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `security-metrics-${report.period}-${timestamp}`;

    switch (format) {
      case "json":
        const jsonFile = path.join(this.reportsDir, `${baseName}.json`);
        fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
        fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
        break;

      case "html":
        const htmlContent = this.generateHtmlReport(report);
        const htmlFile = path.join(this.reportsDir, `${baseName}.html`);
        fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
        fs.writeFileSync(htmlFile, htmlContent);
        break;

      case "markdown":
        const mdContent = this.generateMarkdownReport(report);
        const mdFile = path.join(this.reportsDir, `${baseName}.md`);
        fs.mkdirSync(path.dirname(mdFile), { recursive: true });
        fs.writeFileSync(mdFile, mdContent);
        break;
    }
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(report) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${report.title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
                .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
                .critical { background: #ffebee; }
                .high { background: #fff3e0; }
                .medium { background: #fffde7; }
                .low { background: #e8f5e8; }
                .recommendation { margin: 10px 0; padding: 10px; border-left: 5px solid #2196F3; background: #f9f9f9; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${report.title}</h1>
                <p>Generated: ${report.generated}</p>
                <p>Period: ${report.period}</p>
            </div>

            <h2>Summary</h2>
            <div class="metric ${report.summary.health.status}">
                <strong>Health Score:</strong> ${report.summary.health.score}/100 (${report.summary.health.status})
            </div>
            <div class="metric">
                <strong>Total Events:</strong> ${report.summary.events.total}
            </div>
            <div class="metric">
                <strong>Total Alerts:</strong> ${report.summary.alerts.total}
            </div>
            <div class="metric">
                <strong>Active Incidents:</strong> ${report.summary.incidents.active}
            </div>

            <h2>Recommendations</h2>
            ${report.recommendations
              .map(
                (rec) => `
                <div class="recommendation">
                    <strong>${rec.priority.toUpperCase()}: ${rec.category}</strong>
                    <p>${rec.recommendation}</p>
                    <small>Impact: ${rec.impact} | Effort: ${rec.effort}</small>
                </div>
            `,
              )
              .join("")}

            <h2>Raw Data</h2>
            <pre>${JSON.stringify(report, null, 2)}</pre>
        </body>
        </html>
        `;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report) {
    return `
# ${report.title}

**Generated:** ${report.generated}
**Period:** ${report.period}

## Summary

- **Health Score:** ${report.summary.health.score}/100 (${report.summary.health.status})
- **Total Events:** ${report.summary.events.total}
- **Total Alerts:** ${report.summary.alerts.total}
- **Active Incidents:** ${report.summary.incidents.active}

## Events by Type

${Object.entries(report.summary.events.byType)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join("\n")}

## Alerts by Severity

${Object.entries(report.summary.alerts.bySeverity)
  .map(([severity, count]) => `- ${severity}: ${count}`)
  .join("\n")}

## Recommendations

${report.recommendations
  .map(
    (rec) =>
      `### ${rec.priority.toUpperCase()}: ${rec.category}\n${rec.recommendation}\n*Impact: ${rec.impact} | Effort: ${rec.effort}*`,
  )
  .join("\n\n")}

## Trends

${Object.entries(report.trends)
  .map(
    ([metric, trend]) =>
      `- ${metric}: ${trend.direction} (${trend.change.toFixed(1)}% change)`,
  )
  .join("\n")}
        `.trim();
  }

  /**
   * Update dashboard
   */
  async updateDashboard(report) {
    const dashboardFile = path.join(this.dashboardDir, "index.html");
    fs.mkdirSync(path.dirname(dashboardFile), { recursive: true });

    const dashboardHtml = this.generateDashboardHtml(report);
    fs.writeFileSync(dashboardFile, dashboardHtml);

    this.log(`📊 Dashboard updated: ${dashboardFile}`);
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHtml(report) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>GNUS-DAO Security Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .dashboard { max-width: 1200px; margin: 0 auto; }
                .header { background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .metric { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
                .metric-value { font-size: 2em; font-weight: bold; }
                .metric-label { color: #666; margin-top: 5px; }
                .health-excellent { color: #4CAF50; }
                .health-good { color: #8BC34A; }
                .health-fair { color: #FFC107; }
                .health-poor { color: #FF9800; }
                .health-critical { color: #F44336; }
                .recommendations { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .recommendation { margin: 10px 0; padding: 10px; border-left: 5px solid #2196F3; background: #f9f9f9; }
                .priority-critical { border-left-color: #F44336; }
                .priority-high { border-left-color: #FF9800; }
                .priority-medium { border-left-color: #FFC107; }
            </style>
        </head>
        <body>
            <div class="dashboard">
                <div class="header">
                    <h1>GNUS-DAO Security Dashboard</h1>
                    <p>Last updated: ${report.generated} | Period: ${report.period}</p>
                </div>

                <div class="metrics">
                    <div class="metric">
                        <div class="metric-value health-${report.summary.health.status}">${report.summary.health.score}</div>
                        <div class="metric-label">Health Score</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.summary.events.total}</div>
                        <div class="metric-label">Total Events</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.summary.alerts.total}</div>
                        <div class="metric-label">Total Alerts</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${report.summary.incidents.active}</div>
                        <div class="metric-label">Active Incidents</div>
                    </div>
                </div>

                <div class="recommendations">
                    <h2>Security Recommendations</h2>
                    ${report.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendation priority-${rec.priority}">
                            <strong>${rec.priority.toUpperCase()}: ${rec.category}</strong>
                            <p>${rec.recommendation}</p>
                            <small>Impact: ${rec.impact} | Effort: ${rec.effort}</small>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        </body>
        </html>
        `;
  }

  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      enabled: this.config.dashboard.enabled,
      lastReport: this.getLastReportTime(),
      metrics: this.getMetricsSummary(),
      reports: this.getReportsCount(),
    };
  }

  /**
   * Get last report time
   */
  getLastReportTime() {
    try {
      const files = fs.readdirSync(this.reportsDir);
      const reportFiles = files.filter((f) =>
        f.startsWith("security-metrics-"),
      );
      if (reportFiles.length > 0) {
        const latest = reportFiles.sort().reverse()[0];
        return latest.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1];
      }
    } catch {
      // Directory doesn't exist or no reports
    }
    return null;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const metrics = this.loadMetricsData();
    const today = new Date().toISOString().split("T")[0];
    return metrics[today] || { events: {}, alerts: {}, incidents: {} };
  }

  /**
   * Get reports count
   */
  getReportsCount() {
    try {
      const files = fs.readdirSync(this.reportsDir);
      return files.filter((f) => f.startsWith("security-metrics-")).length;
    } catch {
      return 0;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const dashboard = new SecurityMetricsDashboard();

  switch (command) {
    case "generate":
      const period = args[1] || "weekly";
      const format = args[2] || "json";
      await dashboard.generateMetricsReport({ period, format });
      break;

    case "dashboard":
      await dashboard.generateMetricsReport({ includeCharts: true });
      break;

    case "status":
      const status = dashboard.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node security-metrics-dashboard.js generate [period] [format]  # Generate metrics report",
      );
      console.log(
        "  node security-metrics-dashboard.js dashboard                # Update dashboard",
      );
      console.log(
        "  node security-metrics-dashboard.js status                   # Show dashboard status",
      );
      process.exit(1);
  }
}

// Export for use as module
module.exports = SecurityMetricsDashboard;

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Security metrics dashboard failed:", error.message);
    process.exit(1);
  });
}
