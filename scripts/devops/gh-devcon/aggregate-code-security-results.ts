#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer Code Security Results Aggregator
 * Aggregates code security scan results from multiple tools
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeSecurityResult {
	tool: string;
	timestamp: string;
	scan_type: 'full' | 'incremental';
	results: CodeIssue[];
	summary: {
		total_issues: number;
		critical_count: number;
		high_count: number;
		medium_count: number;
		low_count: number;
		files_scanned: number;
	};
	metadata: {
		scan_duration_ms: number;
		changed_files?: number;
	};
}

interface CodeIssue {
	id: string;
	check_id?: string;
	severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
	title: string;
	description: string;
	file_path: string;
	line_number?: number;
	column_number?: number;
	code_snippet?: string;
	cwe_ids?: string[];
	owasp_ids?: string[];
	tags?: string[];
	fix_available?: boolean;
	fix_suggestion?: string;
}

class CodeSecurityAggregator {
	private readonly projectRoot: string;

	constructor() {
		this.projectRoot = path.resolve(__dirname, '../../..');
	}

	private parseSemgrepResults(results: any): CodeIssue[] {
		const issues: CodeIssue[] = [];

		if (results.results) {
			for (const result of results.results) {
				issues.push({
					id: result.check_id,
					check_id: result.check_id,
					severity: result.extra?.severity || 'medium',
					title: result.extra?.message || result.check_id,
					description: result.extra?.message || 'Security issue detected',
					file_path: result.path,
					line_number: result.line,
					column_number: result.column,
					code_snippet: result.lines,
					cwe_ids: result.extra?.metadata?.cwe,
					owasp_ids: result.extra?.metadata?.owasp,
					tags: result.extra?.metadata?.tags,
				});
			}
		}

		return issues;
	}

	private parseDiamondPatternResults(results: any): CodeIssue[] {
		const issues: CodeIssue[] = [];

		if (results.results) {
			for (const result of results.results) {
				issues.push({
					id: `diamond-${result.check_id}`,
					check_id: result.check_id,
					severity: result.extra?.severity || 'high',
					title: result.extra?.message || 'Diamond proxy security issue',
					description:
						result.extra?.message ||
						'Potential security issue in Diamond proxy implementation',
					file_path: result.path,
					line_number: result.line,
					column_number: result.column,
					code_snippet: result.lines,
					tags: ['diamond-proxy', 'security'],
				});
			}
		}

		return issues;
	}

	private parseSlitherResults(results: any): CodeIssue[] {
		const issues: CodeIssue[] = [];

		if (results.results && results.results.detectors) {
			for (const detector of results.results.detectors) {
				issues.push({
					id: detector.check,
					check_id: detector.check,
					severity: detector.impact || 'medium',
					title: detector.description,
					description: detector.description,
					file_path: detector.file,
					line_number: detector.line,
					column_number: detector.column,
					code_snippet: detector.code,
					cwe_ids: detector.cwe_ids,
					tags: ['solidity', 'smart-contract'],
				});
			}
		}

		return issues;
	}

	private parseGitSecretsResults(results: any): CodeIssue[] {
		const issues: CodeIssue[] = [];

		// git-secrets typically outputs to stderr, so we may need to parse differently
		// For now, return empty array as git-secrets results need special handling
		return issues;
	}

	private deduplicateIssues(issues: CodeIssue[]): CodeIssue[] {
		const seen = new Set<string>();
		const unique: CodeIssue[] = [];

		for (const issue of issues) {
			// Create a unique key based on file, line, and check
			const key = `${issue.file_path}:${issue.line_number || 0}:${issue.check_id || issue.id}`;

			if (!seen.has(key)) {
				seen.add(key);
				unique.push(issue);
			}
		}

		return unique;
	}

	private calculateSummary(issues: CodeIssue[]): CodeSecurityResult['summary'] {
		const severityCounts = issues.reduce(
			(counts, issue) => {
				counts[`${issue.severity}_count`] = (counts[`${issue.severity}_count`] || 0) + 1;
				return counts;
			},
			{} as Record<string, number>,
		);

		const filesScanned = new Set(issues.map((issue) => issue.file_path)).size;

		return {
			total_issues: issues.length,
			critical_count: severityCounts.critical_count || 0,
			high_count: severityCounts.high_count || 0,
			medium_count: severityCounts.medium_count || 0,
			low_count: severityCounts.low_count || 0,
			files_scanned: filesScanned,
		};
	}

	aggregateCodeResults(resultFiles: string[]): CodeSecurityResult {
		let allIssues: CodeIssue[] = [];
		let scanType: 'full' | 'incremental' = 'full';
		let totalDuration = 0;
		let changedFiles = 0;

		for (const file of resultFiles) {
			if (!fs.existsSync(file)) {
				console.warn(`Result file not found: ${file}`);
				continue;
			}

			try {
				const content = fs.readFileSync(file, 'utf8');
				const results = JSON.parse(content);

				// Update scan type
				if (results.scan_type === 'incremental') {
					scanType = 'incremental';
				}

				// Update metadata
				if (results.scan_metadata) {
					totalDuration += results.scan_metadata.duration_ms || 0;
					changedFiles = Math.max(
						changedFiles,
						results.scan_metadata.changed_dependencies || 0,
					);
				}

				// Parse results based on filename
				let issues: CodeIssue[] = [];
				if (file.includes('semgrep-results')) {
					issues = this.parseSemgrepResults(results);
				} else if (file.includes('diamond-security-results')) {
					issues = this.parseDiamondPatternResults(results);
				} else if (file.includes('slither-results')) {
					issues = this.parseSlitherResults(results);
				} else if (file.includes('git-secrets')) {
					issues = this.parseGitSecretsResults(results);
				}

				allIssues.push(...issues);
			} catch (error) {
				console.warn(`Failed to parse ${file}:`, error);
			}
		}

		// Deduplicate issues
		allIssues = this.deduplicateIssues(allIssues);

		// Calculate summary
		const summary = this.calculateSummary(allIssues);

		const result: CodeSecurityResult = {
			tool: 'code-security-aggregator',
			timestamp: new Date().toISOString(),
			scan_type: scanType,
			results: allIssues,
			summary,
			metadata: {
				scan_duration_ms: totalDuration,
				changed_files: changedFiles > 0 ? changedFiles : undefined,
			},
		};

		return result;
	}
}

// CLI interface
function main() {
	const args = process.argv.slice(2);
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

	if (!outputFile) {
		console.error(
			'Usage: aggregate-code-security-results.ts --output=<file> [result-files...]',
		);
		console.error('  --output: Output file for aggregated results');
		console.error(
			'  result-files: Code security result files (optional, will auto-discover)',
		);
		process.exit(1);
	}

	const aggregator = new CodeSecurityAggregator();

	try {
		// Auto-discover result files if not provided
		let resultFiles: string[] = [];
		const remainingArgs = args.filter((arg) => !arg.startsWith('--output='));

		if (remainingArgs.length > 0) {
			resultFiles = remainingArgs;
		} else {
			// Auto-discover common result files
			const commonFiles = [
				'semgrep-results.json',
				'diamond-security-results.json',
				'slither-results.json',
				'git-secrets-results.json',
			];

			for (const file of commonFiles) {
				if (fs.existsSync(file)) {
					resultFiles.push(file);
				}
			}
		}

		if (resultFiles.length === 0) {
			console.warn('No result files found to aggregate');
			// Create empty result
			const emptyResult: CodeSecurityResult = {
				tool: 'code-security-aggregator',
				timestamp: new Date().toISOString(),
				scan_type: 'full',
				results: [],
				summary: {
					total_issues: 0,
					critical_count: 0,
					high_count: 0,
					medium_count: 0,
					low_count: 0,
					files_scanned: 0,
				},
				metadata: {
					scan_duration_ms: 0,
				},
			};

			fs.writeFileSync(outputFile, JSON.stringify(emptyResult, null, 2));
			console.log(`📄 Empty code security results saved to: ${outputFile}`);
			return;
		}

		const result = aggregator.aggregateCodeResults(resultFiles);

		// Ensure output directory exists
		const outputDir = path.dirname(outputFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log(`📄 Aggregated code security results saved to: ${outputFile}`);

		// Print summary
		console.log(`📊 Code Security Scan Summary:`);
		console.log(`   Scan Type: ${result.scan_type}`);
		console.log(`   Files Scanned: ${result.summary.files_scanned}`);
		console.log(`   Total Issues: ${result.summary.total_issues}`);
		console.log(`   Critical: ${result.summary.critical_count}`);
		console.log(`   High: ${result.summary.high_count}`);
		console.log(`   Medium: ${result.summary.medium_count}`);
		console.log(`   Low: ${result.summary.low_count}`);
		console.log(`   Scan Duration: ${result.metadata.scan_duration_ms}ms`);
	} catch (error) {
		console.error('❌ Code security aggregation failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { CodeSecurityAggregator };
