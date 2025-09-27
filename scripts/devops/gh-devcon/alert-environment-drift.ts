// scripts/devops/gh-devcon/alert-environment-drift.ts
import * as fs from 'fs';
import * as path from 'path';
import EnvironmentDriftDetector from './detect-environment-drift';

interface AlertConfig {
	webhook_url?: string;
	email_recipients?: string[];
	slack_channel?: string;
	teams_webhook_url?: string;
	alert_levels: ('low' | 'medium' | 'high' | 'critical')[];
	cooldown_minutes: number;
	template_file?: string;
}

interface AlertHistory {
	timestamp: string;
	drift_level: string;
	alert_type: string;
	recipients: string[];
	success: boolean;
	error?: string;
}

class EnvironmentDriftAlerter {
	private config: AlertConfig;
	private history: AlertHistory[] = [];
	private lastAlertTime: Map<string, number> = new Map();

	constructor(config: AlertConfig) {
		this.config = config;
		this.loadHistory();
	}

	async alertDrift(analysis: any): Promise<boolean> {
		// Check if alert level is configured
		if (!this.config.alert_levels.includes(analysis.drift_level)) {
			console.log(
				`ℹ️  Skipping alert for ${analysis.drift_level} level drift (not in configured levels)`,
			);
			return false;
		}

		// Check cooldown
		const lastAlert = this.lastAlertTime.get(analysis.drift_level);
		if (lastAlert) {
			const cooldownMs = this.config.cooldown_minutes * 60 * 1000;
			const timeSinceLastAlert = Date.now() - lastAlert;
			if (timeSinceLastAlert < cooldownMs) {
				console.log(
					`⏰ Skipping alert for ${analysis.drift_level} level drift (cooldown active)`,
				);
				return false;
			}
		}

		console.log(`🚨 Sending alerts for ${analysis.drift_level} level drift`);

		const alertHistory: AlertHistory = {
			timestamp: new Date().toISOString(),
			drift_level: analysis.drift_level,
			alert_type: 'drift',
			recipients: [],
			success: true,
		};

		try {
			// Send webhook alerts
			if (this.config.webhook_url) {
				alertHistory.recipients.push('webhook');
				await this.sendWebhookAlert(analysis);
			}

			// Send Slack alerts
			if (this.config.slack_channel) {
				alertHistory.recipients.push('slack');
				await this.sendSlackAlert(analysis);
			}

			// Send Teams alerts
			if (this.config.teams_webhook_url) {
				alertHistory.recipients.push('teams');
				await this.sendTeamsAlert(analysis);
			}

			// Send email alerts
			if (this.config.email_recipients && this.config.email_recipients.length > 0) {
				alertHistory.recipients.push(...this.config.email_recipients);
				await this.sendEmailAlerts(analysis);
			}

			// Update last alert time
			this.lastAlertTime.set(analysis.drift_level, Date.now());

			console.log('✅ All alerts sent successfully');
		} catch (error) {
			console.error('❌ Alert sending failed:', error);
			alertHistory.success = false;
			alertHistory.error = (error as Error).message;
		}

		// Save to history
		this.history.push(alertHistory);
		this.saveHistory();

		return alertHistory.success;
	}

	private async sendWebhookAlert(analysis: any): Promise<void> {
		const payload = {
			alert_type: 'environment_drift',
			severity: analysis.drift_level,
			timestamp: analysis.timestamp,
			summary: `Environment drift detected: ${analysis.drift_level} level`,
			details: {
				changes_since_baseline: analysis.changes_since_baseline,
				critical_changes: analysis.critical_changes,
				warning_changes: analysis.warning_changes,
				info_changes: analysis.info_changes,
				recommendations: analysis.recommendations,
			},
			comparison_result: analysis.comparison_result,
		};

		console.log('📤 Sending webhook alert...');
		// In a real implementation, use fetch or axios to send HTTP POST
		console.log('Webhook payload:', JSON.stringify(payload, null, 2));
	}

	private async sendSlackAlert(analysis: any): Promise<void> {
		const blocks = [
			{
				type: 'header',
				text: {
					type: 'plain_text',
					text: '🚨 Environment Drift Alert',
					emoji: true,
				},
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*Drift Level:* ${analysis.drift_level.toUpperCase()}\n*Changes:* ${analysis.changes_since_baseline}\n*Critical:* ${analysis.critical_changes}\n*Timestamp:* ${analysis.timestamp}`,
				},
			},
		];

		if (analysis.recommendations.length > 0) {
			blocks.push({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*Recommendations:*\n${analysis.recommendations.map((r: string) => `• ${r}`).join('\n')}`,
				},
			});
		}

		const payload = {
			channel: this.config.slack_channel,
			blocks: blocks,
		};

		console.log('📤 Sending Slack alert...');
		console.log('Slack payload:', JSON.stringify(payload, null, 2));
	}

	private async sendTeamsAlert(analysis: any): Promise<void> {
		const card = {
			type: 'message',
			attachments: [
				{
					contentType: 'application/vnd.microsoft.card.adaptive',
					contentUrl: null,
					content: {
						$type: 'AdaptiveCard',
						version: '1.2',
						body: [
							{
								type: 'TextBlock',
								size: 'Medium',
								weight: 'Bolder',
								text: '🚨 Environment Drift Alert',
							},
							{
								type: 'FactSet',
								facts: [
									{
										title: 'Drift Level:',
										value: analysis.drift_level.toUpperCase(),
									},
									{
										title: 'Changes:',
										value: analysis.changes_since_baseline.toString(),
									},
									{
										title: 'Critical Changes:',
										value: analysis.critical_changes.toString(),
									},
									{
										title: 'Timestamp:',
										value: analysis.timestamp,
									},
								],
							},
							{
								type: 'TextBlock',
								text: `**Recommendations:**\n${analysis.recommendations.map((r: string) => `• ${r}`).join('\n')}`,
								wrap: true,
							},
						],
					},
				},
			],
		};

		console.log('📤 Sending Teams alert...');
		console.log('Teams payload:', JSON.stringify(card, null, 2));
	}

	private async sendEmailAlerts(analysis: any): Promise<void> {
		const subject = `🚨 Environment Drift Alert: ${analysis.drift_level.toUpperCase()} Level`;
		const htmlBody = this.generateEmailHTML(analysis);
		const textBody = this.generateEmailText(analysis);

		console.log('📧 Sending email alerts...');
		for (const recipient of this.config.email_recipients!) {
			console.log(`  To: ${recipient}`);
			// In a real implementation, use nodemailer or similar
			console.log(`  Subject: ${subject}`);
			console.log(`  Body: ${textBody.substring(0, 200)}...`);
		}
	}

	private generateEmailHTML(analysis: any): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Environment Drift Alert</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .alert-header { background-color: #ff6b6b; color: white; padding: 15px; border-radius: 5px; }
        .alert-critical { background-color: #ff6b6b; }
        .alert-high { background-color: #ffa726; }
        .alert-medium { background-color: #ffb74d; }
        .alert-low { background-color: #81c784; }
        .alert-info { background-color: #64b5f6; }
        .metric { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .recommendations { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="alert-header">
        <h1>🚨 Environment Drift Alert</h1>
        <p><strong>Drift Level:</strong> ${analysis.drift_level.toUpperCase()}</p>
        <p><strong>Timestamp:</strong> ${analysis.timestamp}</p>
    </div>

    <div class="metric alert-${analysis.drift_level}">
        <h3>Drift Metrics</h3>
        <ul>
            <li><strong>Total Changes:</strong> ${analysis.changes_since_baseline}</li>
            <li><strong>Critical Changes:</strong> ${analysis.critical_changes}</li>
            <li><strong>Warning Changes:</strong> ${analysis.warning_changes}</li>
            <li><strong>Info Changes:</strong> ${analysis.info_changes}</li>
        </ul>
    </div>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${analysis.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
        </ul>
    </div>

    <div class="footer">
        <p>This alert was generated by the GNUS-DAO environment monitoring system.</p>
        <p>For more details, check the environment monitoring dashboard.</p>
    </div>
</body>
</html>
		`.trim();
	}

	private generateEmailText(analysis: any): string {
		return `
🚨 ENVIRONMENT DRIFT ALERT 🚨

Drift Level: ${analysis.drift_level.toUpperCase()}
Timestamp: ${analysis.timestamp}

DRIFT METRICS:
- Total Changes: ${analysis.changes_since_baseline}
- Critical Changes: ${analysis.critical_changes}
- Warning Changes: ${analysis.warning_changes}
- Info Changes: ${analysis.info_changes}

RECOMMENDATIONS:
${analysis.recommendations.map((r: string) => `- ${r}`).join('\n')}

---
This alert was generated by the GNUS-DAO environment monitoring system.
For more details, check the environment monitoring dashboard.
		`.trim();
	}

	private loadHistory(): void {
		try {
			if (fs.existsSync('alert-history.json')) {
				this.history = JSON.parse(fs.readFileSync('alert-history.json', 'utf8'));
			}
		} catch (error) {
			console.warn('⚠️  Failed to load alert history:', error);
			this.history = [];
		}
	}

	private saveHistory(): void {
		try {
			// Keep only last 1000 entries
			if (this.history.length > 1000) {
				this.history = this.history.slice(-1000);
			}
			fs.writeFileSync('alert-history.json', JSON.stringify(this.history, null, 2));
		} catch (error) {
			console.error('❌ Failed to save alert history:', error);
		}
	}

	getHistory(limit?: number): AlertHistory[] {
		const entries = [...this.history].reverse(); // Most recent first
		return limit ? entries.slice(0, limit) : entries;
	}

	getAlertStats(): any {
		const stats = {
			total_alerts: this.history.length,
			successful_alerts: this.history.filter((h) => h.success).length,
			failed_alerts: this.history.filter((h) => !h.success).length,
			alerts_by_level: {} as Record<string, number>,
			alerts_by_type: {} as Record<string, number>,
		};

		this.history.forEach((entry) => {
			stats.alerts_by_level[entry.drift_level] =
				(stats.alerts_by_level[entry.drift_level] || 0) + 1;
			stats.alerts_by_type[entry.alert_type] =
				(stats.alerts_by_type[entry.alert_type] || 0) + 1;
		});

		return stats;
	}
}

// CLI usage
if (require.main === module) {
	const configFile =
		process.argv.find((arg) => arg.startsWith('--config='))?.split('=')[1] ||
		'alert-config.json';
	const driftAnalysisFile = process.argv
		.find((arg) => arg.startsWith('--analysis='))
		?.split('=')[1];
	const command =
		process.argv.find((arg) => arg.startsWith('--command='))?.split('=')[1] || 'alert';

	// Default configuration
	let config: AlertConfig = {
		alert_levels: ['high', 'critical'],
		cooldown_minutes: 60, // 1 hour cooldown
	};

	// Load config file if it exists
	if (fs.existsSync(configFile)) {
		try {
			const loadedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
			config = { ...config, ...loadedConfig };
		} catch (error) {
			console.error('❌ Failed to load alert config:', error);
		}
	}

	const alerter = new EnvironmentDriftAlerter(config);

	switch (command) {
		case 'alert':
			if (!driftAnalysisFile) {
				console.error('❌ --analysis=<file> required for alert command');
				process.exit(1);
			}

			try {
				const analysis = JSON.parse(fs.readFileSync(driftAnalysisFile, 'utf8'));
				alerter.alertDrift(analysis).then((success) => {
					console.log(success ? '✅ Alert sent successfully' : '❌ Alert failed');
					process.exit(success ? 0 : 1);
				});
			} catch (error) {
				console.error('❌ Failed to load drift analysis:', error);
				process.exit(1);
			}
			break;

		case 'test':
			// Generate a test alert
			const testAnalysis = {
				timestamp: new Date().toISOString(),
				drift_level: 'high',
				changes_since_baseline: 5,
				critical_changes: 1,
				warning_changes: 3,
				info_changes: 1,
				recommendations: ['Test recommendation 1', 'Test recommendation 2'],
			};

			alerter.alertDrift(testAnalysis).then((success) => {
				console.log(success ? '✅ Test alert sent successfully' : '❌ Test alert failed');
			});
			break;

		case 'history':
			const limit = parseInt(
				process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '10',
			);
			const history = alerter.getHistory(limit);
			console.log(`📋 Recent Alert History (last ${limit} entries):`);
			history.forEach((entry, index) => {
				console.log(
					`${index + 1}. ${entry.timestamp} - ${entry.drift_level} (${entry.success ? '✅' : '❌'})`,
				);
			});
			break;

		case 'stats':
			const stats = alerter.getAlertStats();
			console.log('📊 Alert Statistics:');
			console.log(`  Total Alerts: ${stats.total_alerts}`);
			console.log(`  Successful: ${stats.successful_alerts}`);
			console.log(`  Failed: ${stats.failed_alerts}`);
			console.log('  By Level:', stats.alerts_by_level);
			console.log('  By Type:', stats.alerts_by_type);
			break;

		default:
			console.log('Usage: alert-environment-drift.ts [options]');
			console.log('Options:');
			console.log(
				'  --config=<file>        Alert config file (default: alert-config.json)',
			);
			console.log('  --command=<cmd>        Command: alert|test|history|stats');
			console.log('  --analysis=<file>      Drift analysis file for alert command');
			console.log('  --limit=<num>          Limit for history command (default: 10)');
			process.exit(1);
	}
}

export default EnvironmentDriftAlerter;
