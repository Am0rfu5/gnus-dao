// scripts/devops/gh-devcon/compare-environments.ts
import * as fs from 'fs';

interface ComparisonDifference {
	category: string;
	field: string;
	baseline: any;
	current: any;
	impact: 'critical' | 'warning' | 'info';
	message: string;
}

interface ComparisonResult {
	timestamp: string;
	overall_match: boolean;
	match_percentage: number;
	critical_differences: ComparisonDifference[];
	warnings: ComparisonDifference[];
	info: ComparisonDifference[];
	summary: string;
}

class EnvironmentComparator {
	private comparison: ComparisonResult;

	constructor() {
		this.comparison = {
			timestamp: new Date().toISOString(),
			overall_match: false,
			match_percentage: 0,
			critical_differences: [],
			warnings: [],
			info: [],
			summary: '',
		};
	}

	compare(baselineFile: string, currentFile: string): ComparisonResult {
		console.log('🔍 Comparing environment fingerprints...');

		const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
		const current = JSON.parse(fs.readFileSync(currentFile, 'utf8'));

		// Quick hash comparison
		if (baseline.hash === current.hash) {
			this.comparison.overall_match = true;
			this.comparison.match_percentage = 100;
			console.log('✅ Environments match perfectly!');
			this.generateSummary();
			return this.comparison;
		}

		// Detailed comparison
		this.compareSystemInfo(baseline.system, current.system);
		this.compareRuntimeInfo(baseline.runtime, current.runtime);
		this.compareTools(baseline.tools, current.tools);
		this.compareSecurityTools(baseline.security_tools, current.security_tools);
		this.compareConfiguration(baseline.configuration, current.configuration);
		this.comparePerformance(baseline.performance, current.performance);
		this.compareNetwork(baseline.network, current.network);
		this.compareEnvironmentVariables(
			baseline.environment_variables,
			current.environment_variables,
		);

		// Calculate overall match percentage
		this.calculateMatchPercentage();

		// Generate summary
		this.generateSummary();

		return this.comparison;
	}

	private compareSystemInfo(baseline: any, current: any): void {
		const criticalFields = ['platform', 'arch', 'cpus'];
		const warningFields = ['release', 'memory'];

		criticalFields.forEach((field) => {
			if (baseline[field] !== current[field]) {
				this.comparison.critical_differences.push({
					category: 'system',
					field: field,
					baseline: baseline[field],
					current: current[field],
					impact: 'critical',
					message: `System ${field} mismatch: ${baseline[field]} vs ${current[field]}`,
				});
			}
		});

		warningFields.forEach((field) => {
			if (baseline[field] !== current[field]) {
				this.comparison.warnings.push({
					category: 'system',
					field: field,
					baseline: baseline[field],
					current: current[field],
					impact: 'warning',
					message: `System ${field} difference: ${baseline[field]} vs ${current[field]}`,
				});
			}
		});

		// Container vs native check
		if ((baseline.container || false) !== (current.container || false)) {
			this.comparison.critical_differences.push({
				category: 'system',
				field: 'container_type',
				baseline: baseline.container ? 'container' : 'native',
				current: current.container ? 'container' : 'native',
				impact: 'critical',
				message: 'Container vs native environment mismatch',
			});
		}

		// Environment type comparison
		if (baseline.github_actions && !current.github_actions) {
			this.comparison.critical_differences.push({
				category: 'system',
				field: 'environment_type',
				baseline: 'github-actions',
				current: current.devcontainer ? 'devcontainer' : 'unknown',
				impact: 'critical',
				message: 'Environment type mismatch: GitHub Actions vs local',
			});
		}
	}

	private compareRuntimeInfo(baseline: any, current: any): void {
		const criticalVersions = ['node_version', 'npm_version', 'yarn_version'];
		const warningVersions = ['python_version', 'git_version'];

		criticalVersions.forEach((version) => {
			if (!this.versionsCompatible(baseline[version], current[version])) {
				this.comparison.critical_differences.push({
					category: 'runtime',
					field: version,
					baseline: baseline[version],
					current: current[version],
					impact: 'critical',
					message: `Runtime version mismatch: ${version} ${baseline[version]} vs ${current[version]}`,
				});
			}
		});

		warningVersions.forEach((version) => {
			if (!this.versionsCompatible(baseline[version], current[version])) {
				this.comparison.warnings.push({
					category: 'runtime',
					field: version,
					baseline: baseline[version],
					current: current[version],
					impact: 'warning',
					message: `Runtime version difference: ${version} ${baseline[version]} vs ${current[version]}`,
				});
			}
		});

		// Configuration hashes
		['npmrc_hash', 'yarnrc_hash'].forEach((configHash) => {
			if (baseline[configHash] !== current[configHash]) {
				this.comparison.warnings.push({
					category: 'runtime',
					field: configHash,
					baseline: baseline[configHash],
					current: current[configHash],
					impact: 'warning',
					message: `Package manager configuration changed: ${configHash}`,
				});
			}
		});
	}

	private compareTools(baseline: any, current: any): void {
		const allTools = new Set([...Object.keys(baseline), ...Object.keys(current)]);

		allTools.forEach((tool) => {
			const baselineTool = baseline[tool];
			const currentTool = current[tool];

			// Tool availability
			if (!baselineTool?.available && currentTool?.available) {
				this.comparison.info.push({
					category: 'tools',
					field: tool,
					message: `Tool ${tool} newly available`,
					impact: 'info',
					baseline: false,
					current: true,
				});
			} else if (baselineTool?.available && !currentTool?.available) {
				this.comparison.critical_differences.push({
					category: 'tools',
					field: tool,
					baseline: 'available',
					current: 'unavailable',
					impact: 'critical',
					message: `Tool ${tool} no longer available`,
				});
			} else if (baselineTool?.available && currentTool?.available) {
				// Version comparison
				if (!this.versionsCompatible(baselineTool.version, currentTool.version)) {
					this.comparison.warnings.push({
						category: 'tools',
						field: tool,
						baseline: baselineTool.version,
						current: currentTool.version,
						impact: 'warning',
						message: `Tool ${tool} version changed: ${baselineTool.version} vs ${currentTool.version}`,
					});
				}

				// Path comparison
				if (baselineTool.path !== currentTool.path) {
					this.comparison.info.push({
						category: 'tools',
						field: `${tool}_path`,
						baseline: baselineTool.path,
						current: currentTool.path,
						message: `Tool ${tool} path changed`,
						impact: 'info',
					});
				}
			}
		});
	}

	private compareSecurityTools(baseline: any, current: any): void {
		const allTools = new Set([...Object.keys(baseline), ...Object.keys(current)]);

		allTools.forEach((tool) => {
			const baselineTool = baseline[tool];
			const currentTool = current[tool];

			if (!baselineTool && currentTool) {
				this.comparison.info.push({
					category: 'security_tools',
					field: tool,
					message: `Security tool ${tool} newly configured`,
					impact: 'info',
					baseline: null,
					current: currentTool,
				});
			} else if (baselineTool && !currentTool) {
				this.comparison.warnings.push({
					category: 'security_tools',
					field: tool,
					message: `Security tool ${tool} configuration removed`,
					impact: 'warning',
					baseline: baselineTool,
					current: null,
				});
			} else if (baselineTool && currentTool) {
				if (baselineTool.config_hash !== currentTool.config_hash) {
					this.comparison.warnings.push({
						category: 'security_tools',
						field: `${tool}_config`,
						baseline: baselineTool.config_hash,
						current: currentTool.config_hash,
						impact: 'warning',
						message: `Security tool ${tool} configuration changed`,
					});
				}

				if (baselineTool.env_configured !== currentTool.env_configured) {
					const impact = tool === 'snyk' || tool === 'semgrep' ? 'critical' : 'warning';
					const difference = {
						category: 'security_tools',
						field: `${tool}_env`,
						baseline: baselineTool.env_configured,
						current: currentTool.env_configured,
						impact: impact as 'critical' | 'warning',
						message: `Security tool ${tool} environment ${currentTool.env_configured ? 'configured' : 'not configured'}`,
					};

					if (impact === 'critical') {
						this.comparison.critical_differences.push(difference);
					} else {
						this.comparison.warnings.push(difference);
					}
				}
			}
		});
	}

	private compareConfiguration(baseline: any, current: any): void {
		const allConfigs = new Set([...Object.keys(baseline), ...Object.keys(current)]);

		allConfigs.forEach((config) => {
			const baselineConfig = baseline[config];
			const currentConfig = current[config];

			if (!baselineConfig?.exists && currentConfig?.exists) {
				this.comparison.info.push({
					category: 'configuration',
					field: config,
					message: `Configuration file ${config} added`,
					impact: 'info',
					baseline: false,
					current: true,
				});
			} else if (baselineConfig?.exists && !currentConfig?.exists) {
				this.comparison.warnings.push({
					category: 'configuration',
					field: config,
					message: `Configuration file ${config} removed`,
					impact: 'warning',
					baseline: true,
					current: false,
				});
			} else if (baselineConfig?.exists && currentConfig?.exists) {
				if (baselineConfig.hash !== currentConfig.hash) {
					const importance = this.getConfigImportance(config);
					const difference = {
						category: 'configuration',
						field: config,
						baseline: baselineConfig.hash,
						current: currentConfig.hash,
						message: `Configuration file ${config} modified`,
						impact: importance,
					};

					if (importance === 'critical') {
						this.comparison.critical_differences.push(difference);
					} else {
						this.comparison.warnings.push(difference);
					}
				}
			}
		});
	}

	private comparePerformance(baseline: any, current: any): void {
		if (!baseline || !current) return;

		const cpuDifference =
			Math.abs(
				(current.cpu_benchmark?.iterations_per_ms || 0) -
					(baseline.cpu_benchmark?.iterations_per_ms || 0),
			) / (baseline.cpu_benchmark?.iterations_per_ms || 1);

		if (cpuDifference > 0.5) {
			// 50% difference
			this.comparison.warnings.push({
				category: 'performance',
				field: 'cpu_performance',
				baseline: baseline.cpu_benchmark?.iterations_per_ms,
				current: current.cpu_benchmark?.iterations_per_ms,
				message: `Significant CPU performance difference: ${(cpuDifference * 100).toFixed(1)}%`,
				impact: 'warning',
			});
		}

		const memoryDifference =
			Math.abs(
				(current.memory_usage?.heap_used || 0) - (baseline.memory_usage?.heap_used || 0),
			) / (baseline.memory_usage?.heap_used || 1);

		if (memoryDifference > 0.3) {
			// 30% difference
			this.comparison.warnings.push({
				category: 'performance',
				field: 'memory_usage',
				baseline: baseline.memory_usage?.heap_used,
				current: current.memory_usage?.heap_used,
				message: `Significant memory usage difference: ${(memoryDifference * 100).toFixed(1)}%`,
				impact: 'warning',
			});
		}
	}

	private compareNetwork(baseline: any, current: any): void {
		if (!baseline?.connectivity || !current?.connectivity) return;

		const baselineEndpoints = Object.keys(baseline.connectivity);
		const currentEndpoints = Object.keys(current.connectivity);

		baselineEndpoints.forEach((endpoint) => {
			const baselineStatus = baseline.connectivity[endpoint];
			const currentStatus = current.connectivity[endpoint];

			if (baselineStatus.accessible !== currentStatus?.accessible) {
				this.comparison.critical_differences.push({
					category: 'network',
					field: endpoint,
					baseline: baselineStatus.accessible ? 'accessible' : 'blocked',
					current: currentStatus?.accessible ? 'accessible' : 'blocked',
					message: `Network connectivity changed for ${endpoint}`,
					impact: 'critical',
				});
			} else if (baselineStatus.accessible && currentStatus.accessible) {
				const responseDiff =
					Math.abs(currentStatus.response_time - baselineStatus.response_time) /
					baselineStatus.response_time;

				if (responseDiff > 2.0) {
					// 200% difference
					this.comparison.warnings.push({
						category: 'network',
						field: `${endpoint}_response_time`,
						baseline: baselineStatus.response_time,
						current: currentStatus.response_time,
						message: `Significant response time difference for ${endpoint}`,
						impact: 'warning',
					});
				}
			}
		});
	}

	private compareEnvironmentVariables(baseline: any, current: any): void {
		const criticalVars = ['NODE_ENV', 'HARDHAT_NETWORK'];
		const importantVars = ['PATH', 'HOME', 'USER'];

		// Check critical environment variables
		criticalVars.forEach((envVar) => {
			if (baseline[envVar] !== current[envVar]) {
				this.comparison.critical_differences.push({
					category: 'environment',
					field: envVar,
					baseline: baseline[envVar],
					current: current[envVar],
					message: `Critical environment variable ${envVar} changed`,
					impact: 'critical',
				});
			}
		});

		// Check important environment variables
		importantVars.forEach((envVar) => {
			if (baseline[envVar] !== current[envVar]) {
				this.comparison.warnings.push({
					category: 'environment',
					field: envVar,
					baseline: baseline[envVar],
					current: current[envVar],
					message: `Environment variable ${envVar} changed`,
					impact: 'warning',
				});
			}
		});
	}

	private versionsCompatible(version1: string, version2: string): boolean {
		if (!version1 || !version2) return version1 === version2;

		// Extract major.minor version for comparison
		const v1Match = version1.match(/(\d+)\.(\d+)/);
		const v2Match = version2.match(/(\d+)\.(\d+)/);

		if (!v1Match || !v2Match) return version1 === version2;

		// Consider versions compatible if major.minor match
		return v1Match[1] === v2Match[1] && v1Match[2] === v2Match[2];
	}

	private getConfigImportance(configFile: string): 'critical' | 'warning' | 'info' {
		const criticalConfigs = ['hardhat.config.ts', 'hardhat.config.js', 'package.json'];
		const warningConfigs = ['tsconfig.json', '.eslintrc.json'];

		if (criticalConfigs.includes(configFile)) return 'critical';
		if (warningConfigs.includes(configFile)) return 'warning';
		return 'info';
	}

	private calculateMatchPercentage(): void {
		const totalIssues =
			this.comparison.critical_differences.length +
			this.comparison.warnings.length +
			this.comparison.info.length;

		if (totalIssues === 0) {
			this.comparison.match_percentage = 100;
			this.comparison.overall_match = true;
		} else {
			// Weight critical issues more heavily
			const weightedIssues =
				this.comparison.critical_differences.length * 3 +
				this.comparison.warnings.length * 1 +
				this.comparison.info.length * 0.1;

			// Assume baseline of 50 potential differences for percentage calculation
			this.comparison.match_percentage = Math.max(0, 100 - weightedIssues * 2);
			this.comparison.overall_match =
				this.comparison.critical_differences.length === 0 &&
				this.comparison.warnings.length <= 2;
		}
	}

	private generateSummary(): void {
		const summary = [];

		if (this.comparison.overall_match) {
			summary.push('✅ Environments are compatible');
		} else {
			summary.push('❌ Environments have compatibility issues');
		}

		summary.push(`📊 Match percentage: ${this.comparison.match_percentage.toFixed(1)}%`);

		if (this.comparison.critical_differences.length > 0) {
			summary.push(`🚨 Critical issues: ${this.comparison.critical_differences.length}`);
		}

		if (this.comparison.warnings.length > 0) {
			summary.push(`⚠️  Warnings: ${this.comparison.warnings.length}`);
		}

		if (this.comparison.info.length > 0) {
			summary.push(`ℹ️  Info: ${this.comparison.info.length}`);
		}

		this.comparison.summary = summary.join(' | ');
	}

	generateReport(outputFile: string): void {
		const report = `
# Environment Parity Comparison Report

## 📋 Summary

${this.comparison.summary}

**Overall Match**: ${this.comparison.overall_match ? '✅ YES' : '❌ NO'}
**Match Percentage**: ${this.comparison.match_percentage.toFixed(1)}%
**Generated**: ${this.comparison.timestamp}

## 🚨 Critical Differences

${
	this.comparison.critical_differences.length === 0
		? 'No critical differences found ✅'
		: this.comparison.critical_differences
				.map(
					(diff) => `
### ${diff.category}/${diff.field}
- **Impact**: ${diff.impact}
- **Baseline**: ${diff.baseline}
- **Current**: ${diff.current}
- **Message**: ${diff.message}
`,
				)
				.join('')
}

## ⚠️ Warnings

${
	this.comparison.warnings.length === 0
		? 'No warnings ✅'
		: this.comparison.warnings
				.slice(0, 10)
				.map(
					(warn) => `
### ${warn.category}/${warn.field}
- **Impact**: ${warn.impact}
- **Baseline**: ${warn.baseline}
- **Current**: ${warn.current}
- **Message**: ${warn.message}
`,
				)
				.join('') +
			(this.comparison.warnings.length > 10
				? `\n... and ${this.comparison.warnings.length - 10} more warnings`
				: '')
}

## ℹ️ Information

${
	this.comparison.info.length === 0
		? 'No additional information'
		: this.comparison.info
				.slice(0, 5)
				.map((info) => `- ${info.message}`)
				.join('\n') +
			(this.comparison.info.length > 5
				? `\n... and ${this.comparison.info.length - 5} more items`
				: '')
}

## 🔧 Recommendations

${this.generateRecommendations()
	.map((rec) => `- ${rec}`)
	.join('\n')}

---
*Environment Parity Validation Report*
`;

		if (outputFile) {
			fs.writeFileSync(outputFile, report);
			console.log(`📝 Comparison report saved to ${outputFile}`);
		}
	}

	private generateRecommendations(): string[] {
		const recommendations = [];

		if (this.comparison.critical_differences.length > 0) {
			recommendations.push(
				'❗ Address critical differences before deploying to production',
			);

			const systemIssues = this.comparison.critical_differences.filter(
				(d) => d.category === 'system',
			);
			if (systemIssues.length > 0) {
				recommendations.push(
					'🖥️  Update container configuration to match system requirements',
				);
			}

			const toolIssues = this.comparison.critical_differences.filter(
				(d) => d.category === 'tools',
			);
			if (toolIssues.length > 0) {
				recommendations.push('🔧 Install missing tools or update tool versions');
			}

			const configIssues = this.comparison.critical_differences.filter(
				(d) => d.category === 'configuration',
			);
			if (configIssues.length > 0) {
				recommendations.push('⚙️  Synchronize configuration files between environments');
			}
		}

		if (this.comparison.warnings.length > 5) {
			recommendations.push('📋 Review warnings and update environment configurations');
		}

		const performanceIssues = this.comparison.warnings.filter(
			(w) => w.category === 'performance',
		);
		if (performanceIssues.length > 0) {
			recommendations.push(
				'🚀 Consider performance implications of environment differences',
			);
		}

		if (recommendations.length === 0) {
			recommendations.push('✅ Environments are well-aligned! No action required.');
		}

		return recommendations;
	}
}

// CLI usage
if (require.main === module) {
	const baselineFile = process.argv
		.find((arg) => arg.startsWith('--baseline='))
		?.split('=')[1];
	const currentFile = process.argv
		.find((arg) => arg.startsWith('--current='))
		?.split('=')[1];
	const outputFile = process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1];
	const reportFile = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];

	if (!baselineFile || !currentFile) {
		console.error(
			'Usage: node compare-environments.ts --baseline=baseline.json --current=current.json [--output=comparison.json] [--report=report.md]',
		);
		process.exit(1);
	}

	const comparator = new EnvironmentComparator();
	const result = comparator.compare(baselineFile, currentFile);

	if (outputFile) {
		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log(`💾 Comparison results saved to ${outputFile}`);
	}

	if (reportFile) {
		comparator.generateReport(reportFile);
	}

	// Print summary
	console.log('\n=== COMPARISON SUMMARY ===');
	console.log(result.summary);

	if (result.critical_differences.length > 0) {
		console.log('\n🚨 Critical Issues:');
		result.critical_differences.slice(0, 3).forEach((diff) => {
			console.log(`  - ${diff.message}`);
		});
		if (result.critical_differences.length > 3) {
			console.log(`  ... and ${result.critical_differences.length - 3} more`);
		}
	}

	// Exit with appropriate code
	process.exit(result.overall_match ? 0 : 1);
}

export default EnvironmentComparator;
