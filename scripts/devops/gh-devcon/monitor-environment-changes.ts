// scripts/devops/gh-devcon/monitor-environment-changes.ts
import * as fs from 'fs';
import * as path from 'path';
import EnvironmentDriftDetector, { DriftAnalysis } from './detect-environment-drift';

interface MonitoringConfig {
	interval_minutes: number;
	baseline_file: string;
	log_file: string;
	alert_threshold: 'low' | 'medium' | 'high' | 'critical';
	alert_webhook_url?: string;
	alert_email?: string;
	max_history_entries: number;
}

interface MonitoringEntry {
	timestamp: string;
	drift_analysis: DriftAnalysis;
	alert_sent: boolean;
	alert_type?: string;
}

interface MonitoringStatus {
	is_running: boolean;
	config: MonitoringConfig;
	last_check: MonitoringEntry | null;
	total_checks: number;
	alerts_sent: number;
}

class EnvironmentMonitor {
	private config: MonitoringConfig;
	private isRunning: boolean = false;
	private intervalId?: NodeJS.Timeout;
	private history: MonitoringEntry[] = [];

	constructor(config: MonitoringConfig) {
		this.config = config;
		this.loadHistory();
	}

	start(): void {
		if (this.isRunning) {
			console.log('🔄 Environment monitoring already running');
			return;
		}

		console.log(
			`🚀 Starting environment monitoring (every ${this.config.interval_minutes} minutes)`,
		);
		this.isRunning = true;

		// Run initial check
		this.runCheck();

		// Schedule periodic checks
		this.intervalId = setInterval(
			() => {
				this.runCheck();
			},
			this.config.interval_minutes * 60 * 1000,
		);
	}

	stop(): void {
		if (!this.isRunning) {
			console.log('⏹️  Environment monitoring not running');
			return;
		}

		console.log('⏹️  Stopping environment monitoring');
		this.isRunning = false;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}

	private async runCheck(): Promise<void> {
		console.log(`🔍 Running environment check at ${new Date().toISOString()}`);

		try {
			const detector = new EnvironmentDriftDetector(this.config.baseline_file);
			const analysis = await detector.detectDrift();

			const entry: MonitoringEntry = {
				timestamp: analysis.timestamp,
				drift_analysis: analysis,
				alert_sent: false,
			};

			// Check if alert is needed
			if (this.shouldAlert(analysis)) {
				entry.alert_sent = await this.sendAlert(analysis);
				entry.alert_type = analysis.drift_level;
			}

			// Add to history
			this.history.push(entry);
			this.trimHistory();
			this.saveHistory();

			// Log the check
			this.logCheck(analysis, entry.alert_sent);
		} catch (error) {
			console.error('❌ Environment check failed:', error);
			this.logError(error as Error);
		}
	}

	private shouldAlert(analysis: DriftAnalysis): boolean {
		const levels = ['low', 'medium', 'high', 'critical'];
		const thresholdIndex = levels.indexOf(this.config.alert_threshold);
		const currentIndex = levels.indexOf(analysis.drift_level);

		return currentIndex >= thresholdIndex && analysis.drift_detected;
	}

	private async sendAlert(analysis: DriftAnalysis): Promise<boolean> {
		console.log(`🚨 Sending alert for ${analysis.drift_level} level drift`);

		let success = false;

		try {
			// Send webhook alert
			if (this.config.alert_webhook_url) {
				success = await this.sendWebhookAlert(analysis);
			}

			// Send email alert
			if (this.config.alert_email) {
				await this.sendEmailAlert(analysis);
			}

			if (success) {
				console.log('✅ Alert sent successfully');
			} else {
				console.log('⚠️  Alert sending failed');
			}
		} catch (error) {
			console.error('❌ Failed to send alert:', error);
		}

		return success;
	}

	private async sendWebhookAlert(analysis: DriftAnalysis): Promise<boolean> {
		try {
			const payload = {
				text: `Environment Drift Alert: ${analysis.drift_level.toUpperCase()}`,
				blocks: [
					{
						type: 'header',
						text: {
							type: 'plain_text',
							text: '🚨 Environment Drift Detected',
						},
					},
					{
						type: 'section',
						fields: [
							{
								type: 'mrkdwn',
								text: `*Drift Level:* ${analysis.drift_level.toUpperCase()}`,
							},
							{
								type: 'mrkdwn',
								text: `*Changes:* ${analysis.changes_since_baseline}`,
							},
							{
								type: 'mrkdwn',
								text: `*Critical:* ${analysis.critical_changes}`,
							},
							{
								type: 'mrkdwn',
								text: `*Timestamp:* ${analysis.timestamp}`,
							},
						],
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `*Recommendations:*\n${analysis.recommendations.map((r: string) => `• ${r}`).join('\n')}`,
						},
					},
				],
			};

			// Note: In a real implementation, you'd use a proper HTTP client like axios
			// For now, we'll just log the payload
			console.log('📤 Webhook payload:', JSON.stringify(payload, null, 2));
			return true;
		} catch (error) {
			console.error('❌ Webhook alert failed:', error);
			return false;
		}
	}

	private async sendEmailAlert(analysis: DriftAnalysis): Promise<void> {
		const subject = `Environment Drift Alert: ${analysis.drift_level.toUpperCase()} Level`;
		const body = `
Environment Drift Detected

Drift Level: ${analysis.drift_level.toUpperCase()}
Changes Since Baseline: ${analysis.changes_since_baseline}
Critical Changes: ${analysis.critical_changes}
Timestamp: ${analysis.timestamp}

Recommendations:
${analysis.recommendations.map((r: string) => `- ${r}`).join('\n')}

This is an automated alert from the GNUS-DAO environment monitoring system.
		`.trim();

		// Note: In a real implementation, you'd use a proper email service
		console.log('📧 Email alert:', { to: this.config.alert_email, subject, body });
	}

	private logCheck(analysis: DriftAnalysis, alertSent: boolean): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			drift_level: analysis.drift_level,
			changes: analysis.changes_since_baseline,
			alert_sent: alertSent,
			message: `Environment check: ${analysis.drift_level} drift (${analysis.changes_since_baseline} changes)`,
		};

		fs.appendFileSync(this.config.log_file, JSON.stringify(logEntry) + '\n');
	}

	private logError(error: Error): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			level: 'error',
			message: `Environment check failed: ${error.message}`,
			stack: error.stack,
		};

		fs.appendFileSync(this.config.log_file, JSON.stringify(logEntry) + '\n');
	}

	private loadHistory(): void {
		try {
			if (fs.existsSync('monitoring-history.json')) {
				this.history = JSON.parse(fs.readFileSync('monitoring-history.json', 'utf8'));
			}
		} catch (error) {
			console.warn('⚠️  Failed to load monitoring history:', error);
			this.history = [];
		}
	}

	private saveHistory(): void {
		try {
			fs.writeFileSync('monitoring-history.json', JSON.stringify(this.history, null, 2));
		} catch (error) {
			console.error('❌ Failed to save monitoring history:', error);
		}
	}

	private trimHistory(): void {
		if (this.history.length > this.config.max_history_entries) {
			this.history = this.history.slice(-this.config.max_history_entries);
		}
	}

	getStatus(): MonitoringStatus {
		return {
			is_running: this.isRunning,
			config: this.config,
			last_check: this.history.length > 0 ? this.history[this.history.length - 1] : null,
			total_checks: this.history.length,
			alerts_sent: this.history.filter((h) => h.alert_sent).length,
		};
	}

	getHistory(limit?: number): MonitoringEntry[] {
		const entries = [...this.history].reverse(); // Most recent first
		return limit ? entries.slice(0, limit) : entries;
	}

	forceCheck(): Promise<void> {
		return this.runCheck();
	}
}

// CLI usage
if (require.main === module) {
	const configFile =
		process.argv.find((arg) => arg.startsWith('--config='))?.split('=')[1] ||
		'monitoring-config.json';
	const command =
		process.argv.find((arg) => arg.startsWith('--command='))?.split('=')[1] || 'start';

	// Default configuration
	let config: MonitoringConfig = {
		interval_minutes: 60, // Check every hour
		baseline_file: 'environment-baseline.json',
		log_file: 'environment-monitoring.log',
		alert_threshold: 'high',
		max_history_entries: 1000,
	};

	// Load config file if it exists
	if (fs.existsSync(configFile)) {
		try {
			const loadedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
			config = { ...config, ...loadedConfig };
		} catch (error) {
			console.error('❌ Failed to load config file:', error);
		}
	}

	const monitor = new EnvironmentMonitor(config);

	switch (command) {
		case 'start':
			monitor.start();
			// Keep the process running
			process.on('SIGINT', () => {
				console.log('\n🛑 Received SIGINT, stopping monitoring...');
				monitor.stop();
				process.exit(0);
			});
			break;

		case 'stop':
			monitor.stop();
			break;

		case 'status':
			const status = monitor.getStatus();
			console.log('📊 Monitoring Status:');
			console.log(`  Running: ${status.is_running}`);
			console.log(`  Interval: ${status.config.interval_minutes} minutes`);
			console.log(`  Total Checks: ${status.total_checks}`);
			console.log(`  Alerts Sent: ${status.alerts_sent}`);
			if (status.last_check) {
				console.log(`  Last Check: ${status.last_check.timestamp}`);
				console.log(`  Last Drift Level: ${status.last_check.drift_analysis.drift_level}`);
			}
			break;

		case 'check':
			monitor
				.forceCheck()
				.then(() => {
					console.log('✅ Manual check completed');
				})
				.catch((error) => {
					console.error('❌ Manual check failed:', error);
					process.exit(1);
				});
			break;

		case 'history':
			const limit = parseInt(
				process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '10',
			);
			const history = monitor.getHistory(limit);
			console.log(`📋 Recent Monitoring History (last ${limit} entries):`);
			history.forEach((entry, index) => {
				console.log(
					`${index + 1}. ${entry.timestamp} - ${entry.drift_analysis.drift_level} (${entry.drift_analysis.changes_since_baseline} changes) ${entry.alert_sent ? '🚨' : ''}`,
				);
			});
			break;

		default:
			console.log('Usage: monitor-environment-changes.ts [options]');
			console.log('Options:');
			console.log('  --config=<file>        Config file (default: monitoring-config.json)');
			console.log('  --command=<cmd>        Command: start|stop|status|check|history');
			console.log('  --limit=<num>          Limit for history command (default: 10)');
			process.exit(1);
	}
}

export default EnvironmentMonitor;
