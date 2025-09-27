#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer Security Baseline Management
 * Manages security baselines for containerized security scanning
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityBaseline {
	version: string;
	timestamp: string;
	tools: Record<string, ToolBaseline>;
	policies: SecurityPolicies;
	exceptions: SecurityException[];
}

interface ToolBaseline {
	version: string;
	config: Record<string, unknown>;
	expected_results: {
		vulnerabilities: number;
		severity_breakdown: Record<string, number>;
	};
}

interface SecurityPolicies {
	severity_threshold: 'low' | 'medium' | 'high' | 'critical';
	fail_on_new_vulnerabilities: boolean;
	allowed_patterns: string[];
	blocked_patterns: string[];
}

interface SecurityException {
	id: string;
	tool: string;
	rule: string;
	reason: string;
	approved_by: string;
	expires_at?: string;
}

interface ToolsConfig {
	tools: Record<string, ToolConfig>;
}

interface ToolConfig {
	version: string;
	config: Record<string, unknown>;
}

interface SnykScanResult {
	vulnerabilities: SnykVulnerability[];
}

interface SnykVulnerability {
	severity?: string;
}

interface SocketScanResult {
	issues: SocketIssue[];
}

interface SocketIssue {
	severity?: string;
}

interface SemgrepScanResult {
	results: SemgrepFinding[];
}

interface SemgrepFinding {
	extra?: {
		severity?: string;
	};
}

interface OSVScanResult {
	results: OSVPackageResult[];
}

interface OSVPackageResult {
	vulnerabilities?: OSVVulnerability[];
}

interface OSVVulnerability {
	severity?: string;
}

interface SlitherScanResult {
	results: {
		detectors: SlitherDetector[];
	};
}

interface SlitherDetector {
	impact?: string;
}

class SecurityBaselineManager {
	private readonly projectRoot: string;
	private readonly baselinesDir: string;
	private readonly currentBaselineFile: string;
	private readonly toolsConfig: ToolsConfig;

	constructor() {
		this.projectRoot = path.resolve(__dirname, '../../..');
		this.baselinesDir = path.join(this.projectRoot, '.github/security/baselines');
		this.currentBaselineFile = path.join(this.baselinesDir, 'current.json');
		this.toolsConfig = this.loadToolsConfig();
	}

	private loadToolsConfig(): ToolsConfig {
		const configPath = path.join(this.projectRoot, '.devcontainer/security/tools.json');
		if (!fs.existsSync(configPath)) {
			throw new Error(`Tools configuration not found: ${configPath}`);
		}
		return JSON.parse(fs.readFileSync(configPath, 'utf8'));
	}

	private ensureDirectories(): void {
		if (!fs.existsSync(this.baselinesDir)) {
			fs.mkdirSync(this.baselinesDir, { recursive: true });
		}
	}

	private getCurrentTimestamp(): string {
		return new Date().toISOString();
	}

	private getGitCommit(): string {
		try {
			return execSync('git rev-parse HEAD', {
				cwd: this.projectRoot,
				encoding: 'utf8',
			}).trim();
		} catch {
			return 'unknown';
		}
	}

	private loadCurrentBaseline(): SecurityBaseline | null {
		if (!fs.existsSync(this.currentBaselineFile)) {
			return null;
		}
		return JSON.parse(fs.readFileSync(this.currentBaselineFile, 'utf8'));
	}

	private saveBaseline(baseline: SecurityBaseline): void {
		this.ensureDirectories();
		fs.writeFileSync(this.currentBaselineFile, JSON.stringify(baseline, null, 2));
		console.log(`✅ Baseline saved to: ${this.currentBaselineFile}`);
	}

	private async runSecurityScan(tool: string): Promise<SnykScanResult | SocketScanResult | SemgrepScanResult | OSVScanResult | SlitherScanResult | { vulnerabilities: unknown[]; summary: { total: number } }> {
		const toolConfig = this.toolsConfig.tools[tool];
		if (!toolConfig) {
			throw new Error(`Tool configuration not found: ${tool}`);
		}

		console.log(`🔍 Running ${tool} security scan...`);

		try {
			let command: string;
			let result: SnykScanResult | SocketScanResult | SemgrepScanResult | OSVScanResult | SlitherScanResult;

			switch (tool) {
				case 'snyk':
					command = `cd ${this.projectRoot} && snyk test --json --fail-on=upgradable`;
					result = JSON.parse(execSync(command, { encoding: 'utf8', timeout: 300000 })) as SnykScanResult;
					break;

				case 'socket':
					if (!process.env.SOCKET_API_KEY) {
						console.warn(`⚠️  Skipping ${tool} scan (no API key)`);
						return { vulnerabilities: [], summary: { total: 0 } };
					}
					command = `cd ${this.projectRoot} && socket scan --json`;
					result = JSON.parse(execSync(command, { encoding: 'utf8', timeout: 300000 })) as SocketScanResult;
					break;

				case 'semgrep':
					command = `cd ${this.projectRoot} && semgrep --config=auto --json --disable-version-check`;
					result = JSON.parse(execSync(command, { encoding: 'utf8', timeout: 300000 })) as SemgrepScanResult;
					break;

				case 'osv-scanner':
					command = `cd ${this.projectRoot} && osv-scanner --format=json --lockfile=yarn.lock`;
					result = JSON.parse(execSync(command, { encoding: 'utf8', timeout: 300000 })) as OSVScanResult;
					break;

				case 'slither':
					command = `cd ${this.projectRoot}/contracts && slither --json --exclude-dependencies --exclude-informational .`;
					result = JSON.parse(execSync(command, { encoding: 'utf8', timeout: 600000 })) as SlitherScanResult;
					break;

				default:
					console.warn(`⚠️  Unsupported tool: ${tool}`);
					return { vulnerabilities: [], summary: { total: 0 } };
			}

			return result;
		} catch (error: unknown) {
			const err = error as Error;
			console.error(`❌ ${tool} scan failed:`, err.message);
			throw error;
		}
	}

	private analyzeScanResults(tool: string, results: SnykScanResult | SocketScanResult | SemgrepScanResult | OSVScanResult | SlitherScanResult | { vulnerabilities: unknown[]; summary: { total: number } }): ToolBaseline {
		// Handle fallback case
		if ('summary' in results) {
			return {
				version: this.toolsConfig.tools[tool]?.version || 'unknown',
				config: this.toolsConfig.tools[tool]?.config || {},
				expected_results: {
					vulnerabilities: results.summary.total,
					severity_breakdown: { low: 0, medium: 0, high: 0, critical: 0 },
				},
			};
		}

		let vulnerabilities: SnykVulnerability[] | SocketIssue[] | SemgrepFinding[] | OSVPackageResult[] | SlitherDetector[] = [];
		let severityBreakdown: Record<string, number> = {};

		switch (tool) {
			case 'snyk':
				vulnerabilities = (results as SnykScanResult).vulnerabilities || [];
				severityBreakdown = this.categorizeSnykSeverities(vulnerabilities as SnykVulnerability[]);
				break;

			case 'socket':
				vulnerabilities = (results as SocketScanResult).issues || [];
				severityBreakdown = this.categorizeSocketSeverities(vulnerabilities as SocketIssue[]);
				break;

			case 'semgrep':
				vulnerabilities = (results as SemgrepScanResult).results || [];
				severityBreakdown = this.categorizeSemgrepSeverities(vulnerabilities as SemgrepFinding[]);
				break;

			case 'osv-scanner':
				vulnerabilities = (results as OSVScanResult).results || [];
				severityBreakdown = this.categorizeOSVSeverities(vulnerabilities as OSVPackageResult[]);
				break;

			case 'slither':
				vulnerabilities = (results as SlitherScanResult).results?.detectors || [];
				severityBreakdown = this.categorizeSlitherSeverities(vulnerabilities as SlitherDetector[]);
				break;
		}

		return {
			version: this.toolsConfig.tools[tool].version,
			config: this.toolsConfig.tools[tool].config,
			expected_results: {
				vulnerabilities: vulnerabilities.length,
				severity_breakdown: severityBreakdown,
			},
		};
	}

	private categorizeSnykSeverities(vulnerabilities: SnykVulnerability[]): Record<string, number> {
		const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
		vulnerabilities.forEach((vuln) => {
			const severity = vuln.severity?.toLowerCase() || 'medium';
			breakdown[severity] = (breakdown[severity] || 0) + 1;
		});
		return breakdown;
	}

	private categorizeSocketSeverities(vulnerabilities: SocketIssue[]): Record<string, number> {
		const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
		vulnerabilities.forEach((issue) => {
			const severity = issue.severity?.toLowerCase() || 'medium';
			breakdown[severity] = (breakdown[severity] || 0) + 1;
		});
		return breakdown;
	}

	private categorizeSemgrepSeverities(vulnerabilities: SemgrepFinding[]): Record<string, number> {
		const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
		vulnerabilities.forEach((finding) => {
			const severity = finding.extra?.severity?.toLowerCase() || 'medium';
			breakdown[severity] = (breakdown[severity] || 0) + 1;
		});
		return breakdown;
	}

	private categorizeOSVSeverities(vulnerabilities: OSVPackageResult[]): Record<string, number> {
		const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
		vulnerabilities.forEach((result) => {
			if (result.vulnerabilities) {
				result.vulnerabilities.forEach((vuln) => {
					const severity = vuln.severity?.toLowerCase() || 'medium';
					breakdown[severity] = (breakdown[severity] || 0) + 1;
				});
			}
		});
		return breakdown;
	}

	private categorizeSlitherSeverities(vulnerabilities: SlitherDetector[]): Record<string, number> {
		const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
		vulnerabilities.forEach((detector) => {
			const severity = detector.impact?.toLowerCase() || 'medium';
			breakdown[severity] = (breakdown[severity] || 0) + 1;
		});
		return breakdown;
	}

	async generateBaseline(): Promise<void> {
		console.log('🚀 Generating security baseline...');

		const tools = Object.keys(this.toolsConfig.tools);
		const baseline: SecurityBaseline = {
			version: '1.0.0',
			timestamp: this.getCurrentTimestamp(),
			tools: {},
			policies: {
				severity_threshold: 'high',
				fail_on_new_vulnerabilities: true,
				allowed_patterns: [],
				blocked_patterns: [],
			},
			exceptions: [],
		};

		for (const tool of tools) {
			try {
				const scanResults = await this.runSecurityScan(tool);
				baseline.tools[tool] = this.analyzeScanResults(tool, scanResults);
				console.log(`✅ ${tool} baseline generated`);
			} catch (error) {
				console.error(`❌ Failed to generate ${tool} baseline:`, error);
				// Continue with other tools
			}
		}

		this.saveBaseline(baseline);
		console.log('🎉 Security baseline generation completed');
	}

	async validateBaseline(): Promise<boolean> {
		console.log('🔍 Validating current security baseline...');

		const currentBaseline = this.loadCurrentBaseline();
		if (!currentBaseline) {
			console.error('❌ No current baseline found');
			return false;
		}

		let allValid = true;
		const tools = Object.keys(currentBaseline.tools);

		for (const tool of tools) {
			try {
				console.log(`🔍 Validating ${tool} against baseline...`);
				const scanResults = await this.runSecurityScan(tool);
				const currentResults = this.analyzeScanResults(tool, scanResults);
				const baselineResults = currentBaseline.tools[tool];

				// Compare results
				const currentVulns = currentResults.expected_results.vulnerabilities;
				const baselineVulns = baselineResults.expected_results.vulnerabilities;

				if (currentVulns > baselineVulns) {
					console.error(
						`❌ ${tool}: New vulnerabilities detected (${currentVulns} vs ${baselineVulns} baseline)`,
					);
					allValid = false;
				} else if (currentVulns < baselineVulns) {
					console.log(
						`✅ ${tool}: Vulnerabilities reduced (${currentVulns} vs ${baselineVulns} baseline)`,
					);
				} else {
					console.log(`✅ ${tool}: No change in vulnerability count (${currentVulns})`);
				}

				// Check severity breakdown
				const currentSeverity = currentResults.expected_results.severity_breakdown;
				const baselineSeverity = baselineResults.expected_results.severity_breakdown;

				for (const severity of ['critical', 'high', 'medium', 'low']) {
					const current = currentSeverity[severity] || 0;
					const baseline = baselineSeverity[severity] || 0;

					if (current > baseline) {
						console.error(
							`❌ ${tool}: New ${severity} severity vulnerabilities (${current} vs ${baseline} baseline)`,
						);
						allValid = false;
					}
				}
			} catch (error) {
				console.error(`❌ Failed to validate ${tool}:`, error);
				allValid = false;
			}
		}

		if (allValid) {
			console.log('🎉 Security baseline validation passed');
		} else {
			console.error('❌ Security baseline validation failed');
		}

		return allValid;
	}

	updateBaseline(): void {
		console.log('🔄 Updating security baseline...');

		const currentBaseline = this.loadCurrentBaseline();
		if (!currentBaseline) {
			console.error('❌ No current baseline found to update');
			return;
		}

		// Create backup
		const backupFile = path.join(this.baselinesDir, `backup-${Date.now()}.json`);
		fs.writeFileSync(backupFile, JSON.stringify(currentBaseline, null, 2));
		console.log(`📦 Backup created: ${backupFile}`);

		// Update timestamp
		currentBaseline.timestamp = this.getCurrentTimestamp();
		currentBaseline.version = this.incrementVersion(currentBaseline.version);

		this.saveBaseline(currentBaseline);
		console.log('🎉 Security baseline updated');
	}

	private incrementVersion(version: string): string {
		const parts = version.split('.');
		const patch = parseInt(parts[2] || '0') + 1;
		return `${parts[0]}.${parts[1]}.${patch}`;
	}

	showBaseline(): void {
		const baseline = this.loadCurrentBaseline();
		if (!baseline) {
			console.error('❌ No current baseline found');
			return;
		}

		console.log('📊 Current Security Baseline:');
		console.log(`Version: ${baseline.version}`);
		console.log(`Timestamp: ${baseline.timestamp}`);
		console.log(`Tools: ${Object.keys(baseline.tools).join(', ')}`);

		console.log('\n🔧 Tool Details:');
		for (const [tool, config] of Object.entries(baseline.tools)) {
			const toolBaseline = config as ToolBaseline;
			console.log(`\n${tool}:`);
			console.log(`  Version: ${toolBaseline.version}`);
			console.log(
				`  Expected Vulnerabilities: ${toolBaseline.expected_results.vulnerabilities}`,
			);
			console.log(
				`  Severity Breakdown:`,
				toolBaseline.expected_results.severity_breakdown,
			);
		}
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	const manager = new SecurityBaselineManager();

	try {
		switch (command) {
			case 'generate':
				await manager.generateBaseline();
				break;

			case 'validate':
				const isValid = await manager.validateBaseline();
				process.exit(isValid ? 0 : 1);
				break;

			case 'update':
				manager.updateBaseline();
				break;

			case 'show':
				manager.showBaseline();
				break;

			default:
				console.log('Usage: manage-security-baselines.ts <command>');
				console.log('Commands:');
				console.log('  generate  - Generate new security baseline');
				console.log('  validate  - Validate current baseline');
				console.log('  update    - Update baseline with current results');
				console.log('  show      - Show current baseline details');
				process.exit(1);
		}
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { SecurityBaselineManager };
