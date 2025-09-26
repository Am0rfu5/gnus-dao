#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer Security Results Aggregator
 * Aggregates security scan results from multiple tools
 */

import * as fs from 'fs';
import * as path from 'path';

interface AggregatedSecurityResult {
	timestamp: string;
	scan_type: 'full' | 'incremental';
	tools: SecurityToolResult[];
	vulnerabilities: VulnerabilityInfo[];
	summary: {
		total_vulnerabilities: number;
		critical_count: number;
		high_count: number;
		medium_count: number;
		low_count: number;
		tools_ran: number;
		scan_duration_ms: number;
	};
	metadata: {
		project: string;
		commit_sha: string;
		branch: string;
		scan_id: string;
	};
}

interface SecurityToolResult {
	tool: string;
	version?: string;
	scan_time_ms: number;
	success: boolean;
	vulnerabilities_found: number;
	error_message?: string;
}

interface VulnerabilityInfo {
	id: string;
	tool: string;
	severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
	title: string;
	description: string;
	package?: string;
	version?: string;
	file_path?: string;
	line_number?: number;
	cwe_ids?: string[];
	cvss_score?: number;
	fix_available?: boolean;
	fix_version?: string;
	references?: string[];
	tags?: string[];
}

class SecurityResultsAggregator {
	private readonly projectRoot: string;

	constructor() {
		this.projectRoot = path.resolve(__dirname, '../../..');
	}

	private getGitInfo(): { commit_sha: string; branch: string } {
		try {
			const commitSha = require('child_process')
				.execSync('git rev-parse HEAD', { cwd: this.projectRoot, encoding: 'utf8' })
				.trim();

			const branch = require('child_process')
				.execSync('git rev-parse --abbrev-ref HEAD', {
					cwd: this.projectRoot,
					encoding: 'utf8',
				})
				.trim();

			return { commit_sha: commitSha, branch };
		} catch {
			return { commit_sha: 'unknown', branch: 'unknown' };
		}
	}

	private parseDependencyResults(results: any): VulnerabilityInfo[] {
		const vulnerabilities: VulnerabilityInfo[] = [];

		// Handle different tool formats
		if (results.tool === 'snyk' && results.vulnerabilities) {
			for (const vuln of results.vulnerabilities) {
				vulnerabilities.push({
					id: vuln.id,
					tool: 'snyk',
					severity: vuln.severity || 'medium',
					title: vuln.title,
					description: vuln.description || vuln.title,
					package: vuln.packageName,
					version: vuln.version,
					cwe_ids: vuln.identifiers?.CWE,
					cvss_score: vuln.cvssScore,
					fix_available: !!vuln.fixAvailable,
					fix_version: vuln.fixAvailable?.upgradePath?.[0],
					references: vuln.references,
				});
			}
		}

		if (results.tool === 'socket' && results.issues) {
			for (const issue of results.issues) {
				if (issue.type === 'vulnerability') {
					vulnerabilities.push({
						id: issue.key,
						tool: 'socket',
						severity: issue.severity || 'medium',
						title: issue.title || issue.key,
						description: issue.description,
						package: issue.package,
						version: issue.version,
						fix_available: !!issue.fix,
						fix_version: issue.fix,
					});
				}
			}
		}

		if (results.tool === 'osv-scanner' && results.results) {
			for (const result of results.results) {
				if (result.vulnerabilities) {
					for (const vuln of result.vulnerabilities) {
						vulnerabilities.push({
							id: vuln.id,
							tool: 'osv-scanner',
							severity: vuln.severity || 'medium',
							title: vuln.summary,
							description: vuln.details || vuln.summary,
							package: result.package?.name,
							version: result.package?.version,
							cwe_ids: vuln.cwe_ids,
							references: vuln.references,
						});
					}
				}
			}
		}

		return vulnerabilities;
	}

	private parseCodeResults(results: any): VulnerabilityInfo[] {
		const vulnerabilities: VulnerabilityInfo[] = [];

		// Handle different tool formats
		if (results.tool === 'semgrep' && results.results) {
			for (const result of results.results) {
				vulnerabilities.push({
					id: result.check_id,
					tool: 'semgrep',
					severity: result.extra?.severity || 'medium',
					title: result.extra?.message,
					description: result.extra?.message,
					file_path: result.path,
					line_number: result.line,
					cwe_ids: result.extra?.metadata?.cwe,
				});
			}
		}

		if (results.tool === 'slither' && results.results) {
			for (const result of results.results.detectors || []) {
				vulnerabilities.push({
					id: result.check,
					tool: 'slither',
					severity: result.impact || 'medium',
					title: result.description,
					description: result.description,
					file_path: result.file,
					line_number: result.line,
					cwe_ids: result.cwe_ids,
				});
			}
		}

		return vulnerabilities;
	}

	private deduplicateVulnerabilities(
		vulnerabilities: VulnerabilityInfo[],
	): VulnerabilityInfo[] {
		const seen = new Set<string>();
		const unique: VulnerabilityInfo[] = [];

		for (const vuln of vulnerabilities) {
			// Create a unique key based on tool, id, and location
			const key = `${vuln.tool}:${vuln.id}:${vuln.file_path || ''}:${vuln.line_number || ''}`;

			if (!seen.has(key)) {
				seen.add(key);
				unique.push(vuln);
			}
		}

		return unique;
	}

	private calculateSummary(
		vulnerabilities: VulnerabilityInfo[],
		tools: SecurityToolResult[],
	): AggregatedSecurityResult['summary'] {
		const severityCounts = vulnerabilities.reduce(
			(counts, vuln) => {
				counts[`${vuln.severity}_count`] = (counts[`${vuln.severity}_count`] || 0) + 1;
				return counts;
			},
			{} as Record<string, number>,
		);

		const totalDuration = tools.reduce((sum, tool) => sum + tool.scan_time_ms, 0);

		return {
			total_vulnerabilities: vulnerabilities.length,
			critical_count: severityCounts.critical_count || 0,
			high_count: severityCounts.high_count || 0,
			medium_count: severityCounts.medium_count || 0,
			low_count: severityCounts.low_count || 0,
			tools_ran: tools.filter((t) => t.success).length,
			scan_duration_ms: totalDuration,
		};
	}

	aggregateResults(inputDir: string): AggregatedSecurityResult {
		const gitInfo = this.getGitInfo();
		const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		let allVulnerabilities: VulnerabilityInfo[] = [];
		const tools: SecurityToolResult[] = [];
		let scanType: 'full' | 'incremental' = 'full';

		// Read all result files
		if (fs.existsSync(inputDir)) {
			const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.json'));

			for (const file of files) {
				const filePath = path.join(inputDir, file);
				try {
					const content = fs.readFileSync(filePath, 'utf8');
					const results = JSON.parse(content);

					// Determine scan type
					if (results.scan_type === 'incremental') {
						scanType = 'incremental';
					}

					// Parse tool results
					if (results.tool) {
						const toolResult: SecurityToolResult = {
							tool: results.tool,
							version: results.version,
							scan_time_ms: results.scan_metadata?.duration_ms || 0,
							success: !results.error,
							vulnerabilities_found: results.vulnerabilities?.length || 0,
							error_message: results.error,
						};
						tools.push(toolResult);

						// Parse vulnerabilities based on tool type
						let vulnerabilities: VulnerabilityInfo[] = [];
						if (['snyk', 'socket', 'osv-scanner'].includes(results.tool)) {
							vulnerabilities = this.parseDependencyResults(results);
						} else if (['semgrep', 'slither'].includes(results.tool)) {
							vulnerabilities = this.parseCodeResults(results);
						}

						allVulnerabilities.push(...vulnerabilities);
					}
				} catch (error) {
					console.warn(`Failed to parse ${file}:`, error);
				}
			}
		}

		// Deduplicate vulnerabilities
		allVulnerabilities = this.deduplicateVulnerabilities(allVulnerabilities);

		// Calculate summary
		const summary = this.calculateSummary(allVulnerabilities, tools);

		const result: AggregatedSecurityResult = {
			timestamp: new Date().toISOString(),
			scan_type: scanType,
			tools,
			vulnerabilities: allVulnerabilities,
			summary,
			metadata: {
				project: 'GNUS-DAO',
				commit_sha: gitInfo.commit_sha,
				branch: gitInfo.branch,
				scan_id: scanId,
			},
		};

		return result;
	}
}

// CLI interface
function main() {
	const args = process.argv.slice(2);
	const inputDir = args.find((arg) => arg.startsWith('--input='))?.split('=')[1];
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

	if (!inputDir || !outputFile) {
		console.error(
			'Usage: aggregate-security-results.ts --input=<directory> --output=<file>',
		);
		console.error('  --input: Directory containing security scan result files');
		console.error('  --output: Output file for aggregated results');
		process.exit(1);
	}

	const aggregator = new SecurityResultsAggregator();

	try {
		const result = aggregator.aggregateResults(inputDir);

		// Ensure output directory exists
		const outputDir = path.dirname(outputFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log(`📄 Aggregated security results saved to: ${outputFile}`);

		// Print summary
		console.log(`📊 Security Scan Summary:`);
		console.log(`   Scan Type: ${result.scan_type}`);
		console.log(`   Tools Run: ${result.summary.tools_ran}`);
		console.log(`   Total Vulnerabilities: ${result.summary.total_vulnerabilities}`);
		console.log(`   Critical: ${result.summary.critical_count}`);
		console.log(`   High: ${result.summary.high_count}`);
		console.log(`   Medium: ${result.summary.medium_count}`);
		console.log(`   Low: ${result.summary.low_count}`);
		console.log(`   Scan Duration: ${result.summary.scan_duration_ms}ms`);
	} catch (error) {
		console.error('❌ Aggregation failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { SecurityResultsAggregator };
