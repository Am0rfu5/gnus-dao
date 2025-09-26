#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer Incremental Dependency Scan
 * Performs intelligent incremental dependency security scanning
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DependencyScanResult {
	tool: string;
	timestamp: string;
	scan_type: 'full' | 'incremental';
	dependencies: DependencyInfo[];
	vulnerabilities: VulnerabilityInfo[];
	scan_metadata: {
		duration_ms: number;
		cache_hit_ratio?: number;
		changed_dependencies: number;
	};
}

interface DependencyInfo {
	name: string;
	version: string;
	ecosystem: string;
	is_direct: boolean;
	last_updated?: string;
	vulnerabilities: VulnerabilityInfo[];
}

interface VulnerabilityInfo {
	id: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	package: string;
	version: string;
	description: string;
	cwe_ids?: string[];
	cvss_score?: number;
	fix_available: boolean;
	fix_version?: string;
}

interface CacheEntry {
	dependency: string;
	version: string;
	last_scan: string;
	vulnerabilities: VulnerabilityInfo[];
	ttl_hours: number;
}

class IncrementalDependencyScanner {
	private readonly projectRoot: string;
	private readonly cacheDir: string;
	private readonly cacheFile: string;
	private readonly toolsConfig: any;
	private readonly yarnLockPath: string;
	private readonly packageJsonPath: string;

	constructor() {
		this.projectRoot = path.resolve(__dirname, '../../..');
		this.cacheDir = path.join(this.projectRoot, '.devcontainer/cache/security');
		this.cacheFile = path.join(this.cacheDir, 'dependency-scan-cache.json');
		this.toolsConfig = this.loadToolsConfig();
		this.yarnLockPath = path.join(this.projectRoot, 'yarn.lock');
		this.packageJsonPath = path.join(this.projectRoot, 'package.json');
	}

	private loadToolsConfig(): any {
		const configPath = path.join(this.projectRoot, '.devcontainer/security/tools.json');
		if (!fs.existsSync(configPath)) {
			throw new Error(`Tools configuration not found: ${configPath}`);
		}
		return JSON.parse(fs.readFileSync(configPath, 'utf8'));
	}

	private loadCache(): Record<string, CacheEntry> {
		if (!fs.existsSync(this.cacheFile)) {
			return {};
		}
		try {
			return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
		} catch {
			console.warn('Failed to load cache, starting fresh');
			return {};
		}
	}

	private saveCache(cache: Record<string, CacheEntry>): void {
		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir, { recursive: true });
		}
		fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
	}

	private isCacheValid(entry: CacheEntry): boolean {
		const now = new Date();
		const lastScan = new Date(entry.last_scan);
		const ttlMs = entry.ttl_hours * 60 * 60 * 1000;
		return now.getTime() - lastScan.getTime() < ttlMs;
	}

	private getChangedDependencies(): string[] {
		try {
			// Get dependencies changed since last scan
			const lastScanTime = this.getLastScanTime();
			if (!lastScanTime) {
				return []; // No previous scan, scan all
			}

			// Use git to find changed package.json files
			const changedFiles = execSync(
				`git diff --name-only ${lastScanTime}..HEAD -- package.json`,
				{ cwd: this.projectRoot, encoding: 'utf8' },
			)
				.trim()
				.split('\n')
				.filter(Boolean);

			if (changedFiles.length > 0) {
				console.log(`📦 Found ${changedFiles.length} changed package.json files`);
				return this.extractChangedDependencies(changedFiles);
			}

			return [];
		} catch (error) {
			console.warn('Failed to determine changed dependencies:', error);
			return [];
		}
	}

	private getLastScanTime(): string | null {
		try {
			const cache = this.loadCache();
			const entries = Object.values(cache);
			if (entries.length === 0) return null;

			const latestScan = entries.reduce((latest, entry) =>
				new Date(entry.last_scan) > new Date(latest.last_scan) ? entry : latest,
			);

			return latestScan.last_scan;
		} catch {
			return null;
		}
	}

	private extractChangedDependencies(changedFiles: string[]): string[] {
		const changedDeps = new Set<string>();

		for (const file of changedFiles) {
			try {
				const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
				const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

				for (const dep of Object.keys(allDeps)) {
					changedDeps.add(dep);
				}
			} catch (error) {
				console.warn(`Failed to parse ${file}:`, error);
			}
		}

		return Array.from(changedDeps);
	}

	private async runSnykScan(
		scanType: 'full' | 'incremental',
		changedDeps?: string[],
	): Promise<DependencyScanResult> {
		const startTime = Date.now();

		console.log(`🔍 Running Snyk ${scanType} scan...`);

		try {
			let command = 'snyk test --json --fail-on=upgradable';
			let vulnerabilities: VulnerabilityInfo[] = [];

			if (scanType === 'incremental' && changedDeps && changedDeps.length > 0) {
				// For incremental scans, we still need to run full scan but can optimize caching
				console.log(`📦 Focusing on ${changedDeps.length} changed dependencies`);
			}

			const output = execSync(command, {
				cwd: this.projectRoot,
				encoding: 'utf8',
				timeout: 300000,
			});

			const results = JSON.parse(output);

			// Parse Snyk results
			if (results.vulnerabilities) {
				vulnerabilities = results.vulnerabilities.map((vuln: any) => ({
					id: vuln.id,
					severity: vuln.severity,
					package: vuln.packageName,
					version: vuln.version,
					description: vuln.title,
					cwe_ids: vuln.identifiers?.CWE || [],
					cvss_score: vuln.cvssScore,
					fix_available: !!vuln.fixAvailable,
					fix_version: vuln.fixAvailable?.upgradePath?.[0],
				}));
			}

			const duration = Date.now() - startTime;

			return {
				tool: 'snyk',
				timestamp: new Date().toISOString(),
				scan_type: scanType,
				dependencies: [], // Snyk doesn't provide full dependency list
				vulnerabilities,
				scan_metadata: {
					duration_ms: duration,
					changed_dependencies: changedDeps?.length || 0,
				},
			};
		} catch (error: any) {
			console.error(`❌ Snyk scan failed:`, error.message);
			throw error;
		}
	}

	private async runSocketScan(
		scanType: 'full' | 'incremental',
		changedDeps?: string[],
	): Promise<DependencyScanResult> {
		const startTime = Date.now();

		console.log(`🔍 Running Socket.dev ${scanType} scan...`);

		try {
			const output = execSync('socket scan --json', {
				cwd: this.projectRoot,
				encoding: 'utf8',
				timeout: 300000,
			});

			const results = JSON.parse(output);
			const vulnerabilities: VulnerabilityInfo[] = [];

			// Parse Socket results
			if (results.issues) {
				for (const issue of results.issues) {
					if (issue.type === 'vulnerability') {
						vulnerabilities.push({
							id: issue.key,
							severity: issue.severity,
							package: issue.package,
							version: issue.version,
							description: issue.description,
							fix_available: !!issue.fix,
							fix_version: issue.fix,
						});
					}
				}
			}

			const duration = Date.now() - startTime;

			return {
				tool: 'socket',
				timestamp: new Date().toISOString(),
				scan_type: scanType,
				dependencies: [],
				vulnerabilities,
				scan_metadata: {
					duration_ms: duration,
					changed_dependencies: changedDeps?.length || 0,
				},
			};
		} catch (error: any) {
			console.error(`❌ Socket scan failed:`, error.message);
			throw error;
		}
	}

	private async runOSVScannerScan(
		scanType: 'full' | 'incremental',
		changedDeps?: string[],
	): Promise<DependencyScanResult> {
		const startTime = Date.now();

		console.log(`🔍 Running OSV-Scanner ${scanType} scan...`);

		try {
			const output = execSync('osv-scanner --lockfile=yarn.lock --format=json', {
				cwd: this.projectRoot,
				encoding: 'utf8',
				timeout: 300000,
			});

			const results = JSON.parse(output);
			const vulnerabilities: VulnerabilityInfo[] = [];

			// Parse OSV results
			if (results.results) {
				for (const result of results.results) {
					if (result.vulnerabilities) {
						for (const vuln of result.vulnerabilities) {
							vulnerabilities.push({
								id: vuln.id,
								severity: vuln.severity || 'medium',
								package: result.package?.name || 'unknown',
								version: result.package?.version || 'unknown',
								description: vuln.summary,
								fix_available: false, // OSV doesn't provide fix info directly
							});
						}
					}
				}
			}

			const duration = Date.now() - startTime;

			return {
				tool: 'osv-scanner',
				timestamp: new Date().toISOString(),
				scan_type: scanType,
				dependencies: [],
				vulnerabilities,
				scan_metadata: {
					duration_ms: duration,
					changed_dependencies: changedDeps?.length || 0,
				},
			};
		} catch (error: any) {
			console.error(`❌ OSV-Scanner scan failed:`, error.message);
			throw error;
		}
	}

	private aggregateResults(results: DependencyScanResult[]): DependencyScanResult {
		const aggregated: DependencyScanResult = {
			tool: 'aggregated',
			timestamp: new Date().toISOString(),
			scan_type: results[0]?.scan_type || 'full',
			dependencies: [],
			vulnerabilities: [],
			scan_metadata: {
				duration_ms: results.reduce((sum, r) => sum + r.scan_metadata.duration_ms, 0),
				changed_dependencies: Math.max(
					...results.map((r) => r.scan_metadata.changed_dependencies || 0),
				),
			},
		};

		// Collect all vulnerabilities
		for (const result of results) {
			aggregated.vulnerabilities.push(...result.vulnerabilities);
		}

		// Remove duplicates based on vulnerability ID
		const uniqueVulns = new Map<string, VulnerabilityInfo>();
		for (const vuln of aggregated.vulnerabilities) {
			if (!uniqueVulns.has(vuln.id)) {
				uniqueVulns.set(vuln.id, vuln);
			}
		}
		aggregated.vulnerabilities = Array.from(uniqueVulns.values());

		return aggregated;
	}

	async scanDependencies(
		options: { incremental?: boolean } = {},
	): Promise<DependencyScanResult> {
		const scanType = options.incremental ? 'incremental' : 'full';
		const changedDeps = options.incremental ? this.getChangedDependencies() : undefined;

		console.log(`🚀 Starting ${scanType} dependency security scan...`);

		const results: DependencyScanResult[] = [];

		try {
			// Run Snyk scan
			results.push(await this.runSnykScan(scanType, changedDeps));
		} catch (error) {
			console.warn('Snyk scan failed, continuing with other tools...');
		}

		try {
			// Run Socket scan
			results.push(await this.runSocketScan(scanType, changedDeps));
		} catch (error) {
			console.warn('Socket scan failed, continuing with other tools...');
		}

		try {
			// Run OSV-Scanner
			results.push(await this.runOSVScannerScan(scanType, changedDeps));
		} catch (error) {
			console.warn('OSV-Scanner failed, continuing with other tools...');
		}

		if (results.length === 0) {
			throw new Error('All dependency scanning tools failed');
		}

		const aggregatedResult = this.aggregateResults(results);

		console.log(
			`✅ Dependency scan completed in ${aggregatedResult.scan_metadata.duration_ms}ms`,
		);
		console.log(`📊 Found ${aggregatedResult.vulnerabilities.length} vulnerabilities`);

		return aggregatedResult;
	}

	async scanWithCache(
		options: { incremental?: boolean } = {},
	): Promise<DependencyScanResult> {
		const cache = this.loadCache();
		const result = await this.scanDependencies(options);

		// Update cache with new results
		for (const vuln of result.vulnerabilities) {
			const cacheKey = `${vuln.package}@${vuln.version}`;
			cache[cacheKey] = {
				dependency: vuln.package,
				version: vuln.version,
				last_scan: result.timestamp,
				vulnerabilities: [vuln],
				ttl_hours: 24, // Cache for 24 hours
			};
		}

		this.saveCache(cache);

		// Calculate cache hit ratio
		const totalDeps = Object.keys(cache).length;
		const freshScans = result.scan_metadata.changed_dependencies || 0;
		result.scan_metadata.cache_hit_ratio =
			totalDeps > 0 ? (totalDeps - freshScans) / totalDeps : 0;

		return result;
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const incremental = args.includes('--changed-only') || args.includes('--incremental');
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

	const scanner = new IncrementalDependencyScanner();

	try {
		const result = await scanner.scanWithCache({ incremental });

		if (outputFile) {
			fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
			console.log(`📄 Results saved to: ${outputFile}`);
		} else {
			console.log(JSON.stringify(result, null, 2));
		}

		// Exit with error if critical vulnerabilities found
		const criticalVulns = result.vulnerabilities.filter((v) => v.severity === 'critical');
		if (criticalVulns.length > 0) {
			console.error(`❌ Found ${criticalVulns.length} critical vulnerabilities`);
			process.exit(1);
		}
	} catch (error) {
		console.error('❌ Dependency scan failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

export { IncrementalDependencyScanner };
