#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer SARIF Results Generator
 * Converts security scan results to SARIF format for GitHub Security integration
 */

import * as fs from 'fs';
import * as path from 'path';

interface SARIFLog {
	version: string;
	$schema: string;
	runs: SARIFRun[];
}

interface SARIFRun {
	tool: {
		driver: {
			name: string;
			version?: string;
			informationUri?: string;
			rules: SARIFRule[];
		};
	};
	results: SARIFResult[];
	invocations?: SARIFInvocation[];
	properties?: {
		[key: string]: unknown;
	};
}

interface SARIFRule {
	id: string;
	name: string;
	shortDescription: {
		text: string;
	};
	fullDescription?: {
		text: string;
	};
	helpUri?: string;
	properties?: {
		[key: string]: unknown;
	};
}

interface SARIFResult {
	ruleId: string;
	level: 'error' | 'warning' | 'note' | 'none';
	message: {
		text: string;
	};
	locations: SARIFLocation[];
	properties?: {
		[key: string]: unknown;
	};
}

interface SARIFLocation {
	physicalLocation: {
		artifactLocation: {
			uri: string;
			uriBaseId?: string;
		};
		region?: {
			startLine?: number;
			startColumn?: number;
			endLine?: number;
			endColumn?: number;
			snippet?: {
				text: string;
			};
		};
	};
}

interface SARIFInvocation {
	executionSuccessful: boolean;
	startTimeUtc: string;
	endTimeUtc: string;
	properties?: {
		[key: string]: unknown;
	};
}

interface SecurityScanResult {
	tool: string;
	timestamp: string;
	vulnerabilities?: VulnerabilityInfo[];
	snykResults?: SnykResult[];
	socketResults?: SocketResult[];
	semgrepResults?: SemgrepResult[];
	osvResults?: OSVResult[];
	slitherResults?: SlitherResult[];
}

interface VulnerabilityInfo {
	id: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	package?: string;
	version?: string;
	description: string;
	file_path?: string;
	line_number?: number;
	cwe_ids?: string[];
	cvss_score?: number;
	fix_available?: boolean;
	fix_version?: string;
}

interface SnykResult {
	id?: string;
	packageName: string;
	version: string;
	severity?: string;
	title?: string;
	description?: string;
	filePath?: string;
	lineNumber?: number;
	identifiers?: {
		CWE?: string[];
	};
	cvssScore?: number;
	fixAvailable?: {
		upgradePath?: string[];
	};
}

interface SocketResult {
	key?: string;
	package: string;
	version: string;
	severity?: string;
	description?: string;
	cwe_ids?: string[];
	fix?: string;
}

interface SemgrepResult {
	check_id?: string;
	path: string;
	line: number;
	extra?: {
		message?: string;
		severity?: string;
		metadata?: {
			cwe?: string[];
		};
	};
}

interface OSVResult {
	package?: {
		name: string;
		version: string;
	};
	vulnerabilities?: OSVVulnerability[];
}

interface OSVVulnerability {
	id: string;
	severity?: string;
	summary?: string;
	cwe_ids?: string[];
}

interface SlitherResult {
	check?: string;
	contract?: string;
	line: number;
	impact?: string;
	description?: string;
	file: string;
	cwe_ids?: string[];
}

class SARIFGenerator {
	private readonly projectRoot: string;

	constructor() {
		this.projectRoot = path.resolve(__dirname, '../../..');
	}

	private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
		switch (severity.toLowerCase()) {
			case 'critical':
			case 'error':
				return 'critical';
			case 'high':
			case 'warning':
				return 'high';
			case 'medium':
			case 'info':
				return 'medium';
			case 'low':
				return 'low';
			default:
				return 'medium';
		}
	}

	private mapSeverityToLevel(severity: string): 'error' | 'warning' | 'note' | 'none' {
		switch (severity.toLowerCase()) {
			case 'critical':
			case 'high':
				return 'error';
			case 'medium':
				return 'warning';
			case 'low':
			case 'info':
				return 'note';
			default:
				return 'none';
		}
	}

	private createRule(vulnerability: VulnerabilityInfo): SARIFRule {
		return {
			id: vulnerability.id,
			name: vulnerability.id,
			shortDescription: {
				text: vulnerability.description.substring(0, 100),
			},
			fullDescription: {
				text: vulnerability.description,
			},
			properties: {
				severity: vulnerability.severity,
				package: vulnerability.package,
				version: vulnerability.version,
				cwe_ids: vulnerability.cwe_ids,
				cvss_score: vulnerability.cvss_score,
				fix_available: vulnerability.fix_available,
				fix_version: vulnerability.fix_version,
			},
		};
	}

	private createResult(vulnerability: VulnerabilityInfo, ruleIndex: number): SARIFResult {
		const result: SARIFResult = {
			ruleId: vulnerability.id,
			level: this.mapSeverityToLevel(vulnerability.severity),
			message: {
				text: vulnerability.description,
			},
			locations: [],
			properties: {
				package: vulnerability.package,
				version: vulnerability.version,
				fix_available: vulnerability.fix_available,
				fix_version: vulnerability.fix_version,
			},
		};

		// Add location if file path is available
		if (vulnerability.file_path) {
			const location: SARIFLocation = {
				physicalLocation: {
					artifactLocation: {
						uri: path.relative(this.projectRoot, vulnerability.file_path),
					},
				},
			};

			if (vulnerability.line_number) {
				location.physicalLocation.region = {
					startLine: vulnerability.line_number,
				};
			}

			result.locations.push(location);
		} else if (vulnerability.package) {
			// For dependency vulnerabilities, point to package.json
			result.locations.push({
				physicalLocation: {
					artifactLocation: {
						uri: 'package.json',
					},
				},
			});
		}

		return result;
	}

	private normalizeSnykResults(results: SnykResult[]): VulnerabilityInfo[] {
		return results.map((result) => ({
			id: result.id || `snyk-${result.packageName}-${result.version}`,
			severity: this.mapSeverity(result.severity || 'medium'),
			package: result.packageName,
			version: result.version,
			description: result.title || result.description || 'Security vulnerability detected',
			file_path: result.filePath,
			line_number: result.lineNumber,
			cwe_ids: result.identifiers?.CWE,
			cvss_score: result.cvssScore,
			fix_available: !!result.fixAvailable,
			fix_version: result.fixAvailable?.upgradePath?.[0],
		}));
	}

	private normalizeSocketResults(results: SocketResult[]): VulnerabilityInfo[] {
		return results.map((result) => ({
			id: result.key || `socket-${result.package}-${result.version}`,
			severity: this.mapSeverity(result.severity || 'medium'),
			package: result.package,
			version: result.version,
			description: result.description || 'Supply chain vulnerability detected',
			cwe_ids: result.cwe_ids,
			fix_available: !!result.fix,
			fix_version: result.fix,
		}));
	}

	private normalizeSemgrepResults(results: SemgrepResult[]): VulnerabilityInfo[] {
		return results.map((result) => ({
			id: result.check_id || `semgrep-${result.path}-${result.line}`,
			severity: this.mapSeverity(result.extra?.severity || 'medium'),
			description: result.extra?.message || 'Code security issue detected',
			file_path: result.path,
			line_number: result.line,
			cwe_ids: result.extra?.metadata?.cwe,
		}));
	}

	private normalizeOSVResults(results: OSVResult[]): VulnerabilityInfo[] {
		const vulnerabilities: VulnerabilityInfo[] = [];

		for (const result of results) {
			if (result.vulnerabilities) {
				for (const vuln of result.vulnerabilities) {
					vulnerabilities.push({
						id: vuln.id,
						severity: this.mapSeverity(vuln.severity || 'medium'),
						package: result.package?.name,
						version: result.package?.version,
						description: vuln.summary || 'Vulnerability detected by OSV',
						cwe_ids: vuln.cwe_ids,
					});
				}
			}
		}

		return vulnerabilities;
	}

	private normalizeSlitherResults(results: SlitherResult[]): VulnerabilityInfo[] {
		return results.map((result) => ({
			id: result.check || `slither-${result.contract}-${result.line}`,
			severity: this.mapSeverity(result.impact || 'medium'),
			description: result.description || 'Smart contract security issue detected',
			file_path: result.file,
			line_number: result.line,
			cwe_ids: result.cwe_ids,
		}));
	}

	private normalizeResults(scanResult: SecurityScanResult): VulnerabilityInfo[] {
		switch (scanResult.tool) {
			case 'snyk':
				return this.normalizeSnykResults(
					scanResult.snykResults || scanResult.vulnerabilities?.map(v => ({
						packageName: v.package || '',
						version: v.version || '',
						severity: v.severity,
						title: v.description,
						description: v.description,
						filePath: v.file_path,
						lineNumber: v.line_number,
						identifiers: { CWE: v.cwe_ids },
						cvssScore: v.cvss_score,
						fixAvailable: v.fix_available ? { upgradePath: v.fix_version ? [v.fix_version] : [] } : undefined,
					})) || [],
				);
			case 'socket':
				return this.normalizeSocketResults(scanResult.socketResults || []);
			case 'semgrep':
				return this.normalizeSemgrepResults(scanResult.semgrepResults || []);
			case 'osv-scanner':
				return this.normalizeOSVResults(scanResult.osvResults || []);
			case 'slither':
				return this.normalizeSlitherResults(scanResult.slitherResults || []);
			default:
				console.warn(`Unknown tool: ${scanResult.tool}`);
				return [];
		}
	}

	generateSARIF(scanResults: SecurityScanResult | SecurityScanResult[]): SARIFLog {
		const resultsArray = Array.isArray(scanResults) ? scanResults : [scanResults];
		const allVulnerabilities: VulnerabilityInfo[] = [];
		const rules: SARIFRule[] = [];
		const results: SARIFResult[] = [];
		const ruleMap = new Map<string, number>();

		// Collect all vulnerabilities
		for (const scanResult of resultsArray) {
			const vulnerabilities = this.normalizeResults(scanResult);
			allVulnerabilities.push(...vulnerabilities);
		}

		// Create rules and results
		for (const vulnerability of allVulnerabilities) {
			// Create rule if not exists
			if (!ruleMap.has(vulnerability.id)) {
				const rule = this.createRule(vulnerability);
				rules.push(rule);
				ruleMap.set(vulnerability.id, rules.length - 1);
			}

			// Create result
			const ruleIndex = ruleMap.get(vulnerability.id)!;
			const result = this.createResult(vulnerability, ruleIndex);
			results.push(result);
		}

		// Create invocations
		const invocations: SARIFInvocation[] = resultsArray.map((scanResult) => ({
			executionSuccessful: true,
			startTimeUtc: scanResult.timestamp,
			endTimeUtc: scanResult.timestamp,
			properties: {
				tool: scanResult.tool,
			},
		}));

		const sarifLog: SARIFLog = {
			version: '2.1.0',
			$schema:
				'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
			runs: [
				{
					tool: {
						driver: {
							name: 'GNUS-DAO Security Scanner',
							version: '1.0.0',
							informationUri: 'https://github.com/GeniusVentures/gnus-dao',
							rules: rules,
						},
					},
					results: results,
					invocations: invocations,
					properties: {
						project: 'GNUS-DAO',
						scan_type: 'containerized-security-scan',
						generated_at: new Date().toISOString(),
					},
				},
			],
		};

		return sarifLog;
	}

	generateFromFiles(inputPaths: string[]): SARIFLog {
		const allResults: SecurityScanResult[] = [];

		for (const inputPath of inputPaths) {
			if (!fs.existsSync(inputPath)) {
				console.warn(`Input file not found: ${inputPath}`);
				continue;
			}

			try {
				const content = fs.readFileSync(inputPath, 'utf8');
				const results = JSON.parse(content);

				if (Array.isArray(results)) {
					allResults.push(...results);
				} else {
					allResults.push(results);
				}
			} catch (error) {
				console.error(`Failed to parse ${inputPath}:`, error);
			}
		}

		return this.generateSARIF(allResults);
	}

	saveSARIF(sarifLog: SARIFLog, outputPath: string): void {
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(outputPath, JSON.stringify(sarifLog, null, 2));
		console.log(`📄 SARIF report saved to: ${outputPath}`);
	}
}

// CLI interface
function main() {
	const args = process.argv.slice(2);
	const inputArg = args.find((arg) => arg.startsWith('--input='))?.split('=')[1];
	const outputArg = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

	if (!inputArg || !outputArg) {
		console.error('Usage: generate-sarif-results.ts --input=<path> --output=<path>');
		console.error('  --input: Path to security scan results (JSON file or directory)');
		console.error('  --output: Path to output SARIF file');
		process.exit(1);
	}

	const generator = new SARIFGenerator();

	try {
		let sarifLog: SARIFLog;

		// Check if input is a directory or file
		if (fs.statSync(inputArg).isDirectory()) {
			const files = fs
				.readdirSync(inputArg)
				.filter((file) => file.endsWith('.json'))
				.map((file) => path.join(inputArg, file));
			sarifLog = generator.generateFromFiles(files);
		} else {
			sarifLog = generator.generateFromFiles([inputArg]);
		}

		generator.saveSARIF(sarifLog, outputArg);

		// Summary
		const totalResults = sarifLog.runs[0].results.length;
		const errorCount = sarifLog.runs[0].results.filter((r) => r.level === 'error').length;
		const warningCount = sarifLog.runs[0].results.filter(
			(r) => r.level === 'warning',
		).length;

		console.log(`📊 SARIF Summary:`);
		console.log(`   Total issues: ${totalResults}`);
		console.log(`   Errors: ${errorCount}`);
		console.log(`   Warnings: ${warningCount}`);
	} catch (error) {
		console.error('❌ SARIF generation failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { SARIFGenerator };
