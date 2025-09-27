// scripts/devops/gh-devcon/validate-tool-versions.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ToolVersion {
	name: string;
	required_version?: string;
	min_version?: string;
	max_version?: string;
	current_version: string;
	available: boolean;
	compatible: boolean;
	error?: string;
}

interface ValidationResult {
	timestamp: string;
	overall_compatible: boolean;
	tools_validated: number;
	compatible_tools: number;
	incompatible_tools: number;
	missing_tools: number;
	tool_results: ToolVersion[];
	recommendations: string[];
	critical_issues: string[];
}

class ToolVersionValidator {
	private requiredTools: { [key: string]: any } = {
		// Runtime tools
		node: { min_version: '18.0.0', critical: true },
		npm: { min_version: '8.0.0', critical: true },
		yarn: { min_version: '1.22.0', critical: true },

		// Development tools
		git: { min_version: '2.30.0', critical: true },
		docker: { min_version: '20.0.0', critical: true },

		// Blockchain tools
		hardhat: { min_version: '2.0.0', critical: true },

		// Security tools
		slither: { min_version: '0.9.0', critical: false },
		'osv-scanner': { min_version: '1.0.0', critical: false },
		snyk: { min_version: '1.1000.0', critical: false },
		semgrep: { min_version: '1.0.0', critical: false },
		socket: { min_version: '1.0.0', critical: false },

		// Testing tools
		mocha: { min_version: '9.0.0', critical: false },
		chai: { min_version: '4.0.0', critical: false },

		// Build tools
		typescript: { min_version: '4.5.0', critical: true },
	};

	async validateAllTools(): Promise<ValidationResult> {
		console.log('🔍 Validating tool versions...');

		const result: ValidationResult = {
			timestamp: new Date().toISOString(),
			overall_compatible: true,
			tools_validated: 0,
			compatible_tools: 0,
			incompatible_tools: 0,
			missing_tools: 0,
			tool_results: [],
			recommendations: [],
			critical_issues: [],
		};

		for (const [toolName, config] of Object.entries(this.requiredTools)) {
			const toolResult = await this.validateTool(toolName, config);
			result.tool_results.push(toolResult);
			result.tools_validated++;

			if (!toolResult.available) {
				result.missing_tools++;
				if (config.critical) {
					result.overall_compatible = false;
					result.critical_issues.push(`${toolName} is required but not available`);
				}
				result.recommendations.push(
					`Install ${toolName} (required for GNUS-DAO development)`,
				);
			} else if (!toolResult.compatible) {
				result.incompatible_tools++;
				if (config.critical) {
					result.overall_compatible = false;
					result.critical_issues.push(
						`${toolName} version ${toolResult.current_version} is incompatible (required: ${config.min_version || config.required_version})`,
					);
				}
				result.recommendations.push(
					`Update ${toolName} from ${toolResult.current_version} to ${config.min_version || config.required_version}+`,
				);
			} else {
				result.compatible_tools++;
			}
		}

		console.log(
			`✅ Tool validation complete: ${result.compatible_tools}/${result.tools_validated} tools compatible`,
		);
		return result;
	}

	private async validateTool(toolName: string, config: any): Promise<ToolVersion> {
		const result: ToolVersion = {
			name: toolName,
			required_version: config.required_version,
			min_version: config.min_version,
			max_version: config.max_version,
			current_version: '',
			available: false,
			compatible: false,
		};

		try {
			// Get version command based on tool
			const versionCommand = this.getVersionCommand(toolName);
			const versionOutput = execSync(versionCommand, {
				encoding: 'utf8',
				timeout: 5000,
				maxBuffer: 1024 * 1024,
			}).trim();

			// Extract version from output
			result.current_version = this.extractVersion(versionOutput, toolName);
			result.available = true;

			// Check compatibility
			result.compatible = this.checkVersionCompatibility(result.current_version, config);
		} catch (error) {
			result.available = false;
			result.error = (error as Error).message;
			console.warn(`⚠️  Failed to validate ${toolName}: ${(error as Error).message}`);
		}

		return result;
	}

	private getVersionCommand(toolName: string): string {
		const commands: { [key: string]: string } = {
			node: 'node --version',
			npm: 'npm --version',
			yarn: 'yarn --version',
			git: 'git --version',
			docker: 'docker --version',
			hardhat: 'npx hardhat --version',
			slither: 'slither --version',
			'osv-scanner': 'osv-scanner --version',
			snyk: 'snyk --version',
			semgrep: 'semgrep --version',
			socket: 'socket --version',
			mocha: 'npx mocha --version',
			chai: 'node -e "console.log(require(\'chai/package.json\').version)"',
			typescript: 'npx tsc --version',
		};

		return commands[toolName] || `${toolName} --version`;
	}

	private extractVersion(output: string, toolName: string): string {
		// Extract version patterns from different tool outputs
		const patterns: { [key: string]: RegExp } = {
			node: /v?(\d+\.\d+\.\d+)/,
			npm: /(\d+\.\d+\.\d+)/,
			yarn: /(\d+\.\d+\.\d+)/,
			git: /git version (\d+\.\d+\.\d+)/,
			docker: /Docker version (\d+\.\d+\.\d+)/,
			hardhat: /(\d+\.\d+\.\d+)/,
			slither: /(\d+\.\d+\.\d+)/,
			'osv-scanner': /(\d+\.\d+\.\d+)/,
			snyk: /(\d+\.\d+\.\d+)/,
			semgrep: /(\d+\.\d+\.\d+)/,
			socket: /(\d+\.\d+\.\d+)/,
			mocha: /(\d+\.\d+\.\d+)/,
			chai: /(\d+\.\d+\.\d+)/,
			typescript: /Version (\d+\.\d+\.\d+)/,
		};

		const pattern = patterns[toolName] || /(\d+\.\d+\.\d+)/;
		const match = output.match(pattern);

		if (match && match[1]) {
			return match[1];
		}

		// Fallback: try to find any version-like string
		const fallbackMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
		return fallbackMatch ? fallbackMatch[1] : output.trim();
	}

	private checkVersionCompatibility(version: string, config: any): boolean {
		if (!version) return false;

		try {
			// Exact version match
			if (config.required_version) {
				return this.compareVersions(version, config.required_version) === 0;
			}

			// Version range check
			if (config.min_version) {
				const minCheck = this.compareVersions(version, config.min_version) >= 0;
				if (config.max_version) {
					const maxCheck = this.compareVersions(version, config.max_version) <= 0;
					return minCheck && maxCheck;
				}
				return minCheck;
			}

			// No version constraints = always compatible
			return true;
		} catch (error) {
			console.warn(
				`⚠️  Version comparison failed for ${version}: ${(error as Error).message}`,
			);
			return false;
		}
	}

	private compareVersions(version1: string, version2: string): number {
		// Simple semantic version comparison
		const v1Parts = version1.split('.').map((n) => parseInt(n, 10));
		const v2Parts = version2.split('.').map((n) => parseInt(n, 10));

		for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
			const v1Part = v1Parts[i] || 0;
			const v2Part = v2Parts[i] || 0;

			if (v1Part > v2Part) return 1;
			if (v1Part < v2Part) return -1;
		}

		return 0;
	}

	saveValidationReport(result: ValidationResult, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log(`💾 Validation report saved to ${outputFile}`);
	}

	generateMarkdownReport(result: ValidationResult): string {
		let report = `# Tool Version Validation Report\n\n`;
		report += `**Generated:** ${result.timestamp}\n\n`;
		report += `**Overall Status:** ${result.overall_compatible ? '✅ Compatible' : '❌ Incompatible'}\n\n`;

		report += `## Summary\n\n`;
		report += `- **Tools Validated:** ${result.tools_validated}\n`;
		report += `- **Compatible:** ${result.compatible_tools}\n`;
		report += `- **Incompatible:** ${result.incompatible_tools}\n`;
		report += `- **Missing:** ${result.missing_tools}\n\n`;

		report += `## Tool Details\n\n`;
		report += `| Tool | Required | Current | Status | Compatible |\n`;
		report += `|------|----------|---------|--------|------------|\n`;

		for (const tool of result.tool_results) {
			const required = tool.required_version || tool.min_version || 'Any';
			const status = tool.available ? (tool.compatible ? '✅' : '❌') : '❓';
			const compatible = tool.available ? (tool.compatible ? 'Yes' : 'No') : 'N/A';
			report += `| ${tool.name} | ${required} | ${tool.current_version || 'N/A'} | ${status} | ${compatible} |\n`;
		}

		if (result.critical_issues.length > 0) {
			report += `\n## 🚨 Critical Issues\n\n`;
			for (const issue of result.critical_issues) {
				report += `- ${issue}\n`;
			}
		}

		if (result.recommendations.length > 0) {
			report += `\n## 🔧 Recommendations\n\n`;
			for (const rec of result.recommendations) {
				report += `- ${rec}\n`;
			}
		}

		return report;
	}
}

// CLI usage
if (require.main === module) {
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'tool-validation-report.json';
	const reportFile = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];
	const verbose = process.argv.includes('--verbose');

	const validator = new ToolVersionValidator();

	validator
		.validateAllTools()
		.then((result) => {
			// Save JSON report
			validator.saveValidationReport(result, outputFile);

			// Generate Markdown report if requested
			if (reportFile) {
				const markdownReport = validator.generateMarkdownReport(result);
				fs.writeFileSync(reportFile, markdownReport);
				console.log(`📄 Markdown report saved to ${reportFile}`);
			}

			// Print summary
			console.log('\n=== TOOL VALIDATION SUMMARY ===');
			console.log(
				`Overall Status: ${result.overall_compatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`,
			);
			console.log(`Tools Validated: ${result.tools_validated}`);
			console.log(`Compatible: ${result.compatible_tools}`);
			console.log(`Incompatible: ${result.incompatible_tools}`);
			console.log(`Missing: ${result.missing_tools}`);

			if (verbose && result.critical_issues.length > 0) {
				console.log('\n🚨 Critical Issues:');
				result.critical_issues.forEach((issue) => console.log(`  - ${issue}`));
			}

			if (verbose && result.recommendations.length > 0) {
				console.log('\n🔧 Recommendations:');
				result.recommendations.forEach((rec) => console.log(`  - ${rec}`));
			}

			// Exit with appropriate code
			process.exit(result.overall_compatible ? 0 : 1);
		})
		.catch((error) => {
			console.error('❌ Tool validation failed:', error);
			process.exit(1);
		});
}

export default ToolVersionValidator;
