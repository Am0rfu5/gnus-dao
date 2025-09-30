// scripts/devops/gh-devcon/test-reproducibility.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

interface ReproducibilityResults {
	timestamp: string;
	test_iterations: number;
	iterations: IterationResult[];
	overall_reproducible: boolean;
	reproducibility_percentage: number;
	non_deterministic_factors: string[];
	recommendations: string[];
	performance_summary: {
		total_time_seconds: number;
		average_iteration_time_seconds: number;
		max_iteration_time_seconds: number;
	};
}

interface ErrorInfo {
	stage: string;
	error: string;
	stack?: string;
}

interface IterationResult {
	iteration: number;
	timestamp: string;
	environment_fingerprint: EnvironmentFingerprint | { error: string; hash: string } | null;
	build_artifacts: BuildArtifacts;
	performance_metrics: PerformanceMetrics;
	docker_compatibility?: DockerCompatibility;
	errors: ErrorInfo[];
	duration_seconds: number;
}

interface EnvironmentFingerprint {
	timestamp: string;
	node_version: string;
	platform: string;
	arch: string;
	hostname: string;
	cpus: number;
	total_memory: number;
	environment_type: string;
	env_hash: string;
	hash?: string;
}

interface BuildArtifacts {
	contracts?: Record<string, unknown>;
	typechain?: Record<string, unknown>;
	compile_skipped?: boolean;
	cache_used?: boolean;
	compile_time?: number;
	error?: string;
}

interface PerformanceMetrics {
	cpu_iterations_per_ms: number;
	cpu_time_ns: number;
	memory_heap_used: number;
	memory_heap_total: number;
	io_time_ns?: number;
	error?: string;
}

interface DockerCompatibility {
	version?: string;
	compatible?: boolean;
	issues?: string[];
	available?: boolean;
	note?: string;
	container_test?: boolean;
	devcontainer_config?: boolean;
	error?: string;
}

interface TestOptions {
	iterations?: number;
	output?: string;
	dockerVersions?: boolean;
	timeoutSeconds?: number;
	skipFullCompile?: boolean;
	quickMode?: boolean;
}

class ReproducibilityTester {
	private results: ReproducibilityResults;
	private firstIteration: boolean = true;
	private cachedArtifacts: Partial<BuildArtifacts> = {};
	private startTime: number = Date.now();

	constructor() {
		this.results = {
			timestamp: new Date().toISOString(),
			test_iterations: 0,
			iterations: [],
			overall_reproducible: false,
			reproducibility_percentage: 0,
			non_deterministic_factors: [],
			recommendations: [],
			performance_summary: {
				total_time_seconds: 0,
				average_iteration_time_seconds: 0,
				max_iteration_time_seconds: 0,
			},
		};
	}

	async testReproducibility(options: TestOptions = {}) {
		const iterations = Math.min(options.iterations || 3, 5); // Cap at 5 iterations max
		const outputFile = options.output || 'reproducibility-results.json';
		const dockerVersions = options.dockerVersions || false;
		const timeoutSeconds = options.timeoutSeconds || 300; // 5 minute default timeout
		const skipFullCompile = options.skipFullCompile || false;
		const quickMode = options.quickMode || false;

		console.log(
			`Testing reproducibility with ${iterations} iterations (${quickMode ? 'quick' : 'standard'} mode)...`,
		);
		if (skipFullCompile) {
			console.log('Skipping full compilation for faster testing...');
		}

		this.results.test_iterations = iterations;
		const overallTimeout = Date.now() + timeoutSeconds * 1000;

		for (let i = 0; i < iterations; i++) {
			// Check if we're approaching overall timeout
			if (Date.now() > overallTimeout - 30000) {
				// 30 seconds buffer
				console.log(`\n⚠️  Approaching timeout, stopping at iteration ${i + 1}`);
				break;
			}

			console.log(`\n=== Iteration ${i + 1}/${iterations} ===`);

			const iterationStart = Date.now();
			const iterationResult = await this.runIteration(
				i,
				dockerVersions,
				skipFullCompile,
				quickMode,
				timeoutSeconds,
			);
			iterationResult.duration_seconds = (Date.now() - iterationStart) / 1000;

			this.results.iterations.push(iterationResult);
		}

		// Analyze results
		this.analyzeResults();

		// Calculate performance summary
		this.calculatePerformanceSummary();

		// Save results
		this.saveResults(outputFile);

		return this.results;
	}

	async runIteration(
		iterationNumber: number,
		dockerVersions: boolean,
		skipFullCompile: boolean,
		quickMode: boolean,
		timeoutSeconds: number,
	): Promise<IterationResult> {
		const iteration: IterationResult = {
			iteration: iterationNumber + 1,
			timestamp: new Date().toISOString(),
			environment_fingerprint: null,
			build_artifacts: {},
			performance_metrics: {
				cpu_iterations_per_ms: 0,
				cpu_time_ns: 0,
				memory_heap_used: 0,
				memory_heap_total: 0,
			},
			errors: [],
			duration_seconds: 0,
		};

		try {
			// Generate environment fingerprint
			console.log('Generating environment fingerprint...');
			const fingerprint = await this.generateFingerprint();
			iteration.environment_fingerprint = fingerprint;

			// Test build reproducibility
			console.log('Testing build reproducibility...');
			const buildResult = await this.testBuildReproducibility(
				skipFullCompile,
				quickMode,
				timeoutSeconds,
			);
			iteration.build_artifacts = buildResult;

			// Measure performance
			console.log('Measuring performance...');
			const performance = await this.measurePerformance();
			iteration.performance_metrics = performance;

			// Test Docker compatibility if requested
			if (dockerVersions) {
				console.log('Testing Docker compatibility...');
				const dockerResult = await this.testDockerCompatibility();
				iteration.docker_compatibility = dockerResult;
			}
		} catch (error: any) {
			iteration.errors.push({
				stage: 'iteration',
				error: error.message,
				stack: error.stack,
			});
		}

		return iteration;
	}

	async generateFingerprint(): Promise<
		EnvironmentFingerprint | { error: string; hash: string }
	> {
		try {
			// Fast, simple fingerprint for reproducibility testing
			const fingerprint: EnvironmentFingerprint = {
				timestamp: new Date().toISOString(),
				node_version: process.version,
				platform: process.platform,
				arch: process.arch,
				hostname: require('os').hostname(),
				cpus: require('os').cpus().length,
				total_memory: require('os').totalmem(),
				environment_type: this.detectEnvironmentType(),
				// Simple hash of key environment variables
				env_hash: this.hashString(
					JSON.stringify({
						NODE_ENV: process.env.NODE_ENV,
						PATH: process.env.PATH?.split(':').length, // Just count path elements
						HOME: process.env.HOME,
						USER: process.env.USER,
					}),
				),
			};

			// Generate overall hash
			fingerprint.hash = this.hashString(JSON.stringify(fingerprint));

			return fingerprint;
		} catch (error: any) {
			return { error: error.message, hash: 'error' };
		}
	}

	private detectEnvironmentType(): string {
		if (process.env.GITHUB_ACTIONS) return 'github-actions';
		if (process.env.REMOTE_CONTAINERS) return 'devcontainer';
		if (require('fs').existsSync('/.dockerenv')) return 'docker';
		return 'native';
	}

	private hashString(content: string): string {
		return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16); // Short hash for speed
	}

	async testBuildReproducibility(
		skipFullCompile: boolean,
		quickMode: boolean,
		timeoutSeconds: number,
	): Promise<BuildArtifacts> {
		const artifacts: BuildArtifacts = {};

		try {
			// Only do full compilation on first iteration, incremental on others (unless skipped)
			console.log('Testing Hardhat compilation...');
			const compileStart = Date.now();

			if (this.firstIteration && !skipFullCompile) {
				// Full compilation with force on first iteration (with timeout)
				console.log('Performing full compilation (this may take a few minutes)...');
				execSync('timeout 120 npx hardhat compile --force', { stdio: 'pipe' }); // 2 minute timeout
				this.firstIteration = false;
			} else if (!skipFullCompile) {
				// Incremental compilation on subsequent iterations
				execSync('timeout 60 npx hardhat compile', { stdio: 'pipe' }); // 1 minute timeout
			} else {
				// Skip compilation entirely for quick mode
				console.log('Skipping compilation in quick mode...');
				artifacts.compile_skipped = true;
			}

			const compileTime = Date.now() - compileStart;

			// Generate optimized artifact hashes (only key files in quick mode)
			if (!quickMode || this.firstIteration) {
				const artifactsDir = path.join(process.cwd(), 'artifacts');
				if (fs.existsSync(artifactsDir)) {
					artifacts.contracts = this.hashDirectoryOptimized(artifactsDir, quickMode);
				}
			} else {
				// Use cached hashes in quick mode for subsequent iterations
				artifacts.contracts = this.cachedArtifacts.contracts || {};
				artifacts.cache_used = true;
			}

			// Only regenerate TypeChain on first iteration or when not in quick mode
			if (
				(!quickMode && this.firstIteration) ||
				(!quickMode && Object.keys(this.cachedArtifacts).length === 0)
			) {
				console.log('Testing TypeChain generation...');
				execSync('timeout 30 npx hardhat typechain', { stdio: 'pipe' }); // 30 second timeout

				const typechainDir = path.join(process.cwd(), 'typechain-types');
				if (fs.existsSync(typechainDir)) {
					this.cachedArtifacts.typechain = this.hashDirectoryOptimized(
						typechainDir,
						quickMode,
					);
				}
			}

			// Use cached TypeChain hashes for subsequent iterations
			if (this.cachedArtifacts.typechain) {
				artifacts.typechain = this.cachedArtifacts.typechain;
			}

			artifacts.compile_time = compileTime;
		} catch (error: any) {
			artifacts.error = error.message;
		}

		return artifacts;
	}

	async measurePerformance(): Promise<PerformanceMetrics> {
		const metrics: PerformanceMetrics = {
			cpu_iterations_per_ms: 0,
			cpu_time_ns: 0,
			memory_heap_used: 0,
			memory_heap_total: 0,
		};

		try {
			// Faster CPU benchmark (reduced duration)
			const cpuStart = process.hrtime.bigint();
			let iterations = 0;
			const benchmarkDuration = 50; // Reduced from 100ms

			const startTime = Date.now();
			while (Date.now() - startTime < benchmarkDuration) {
				Math.sqrt(crypto.randomInt(1000000));
				iterations++;
			}
			const cpuEnd = process.hrtime.bigint();

			metrics.cpu_iterations_per_ms = iterations / benchmarkDuration;
			metrics.cpu_time_ns = Number(cpuEnd - cpuStart);

			// Memory usage (unchanged)
			const memUsage = process.memoryUsage();
			metrics.memory_heap_used = memUsage.heapUsed;
			metrics.memory_heap_total = memUsage.heapTotal;

			// Simplified I/O benchmark (smaller file)
			const ioStart = process.hrtime.bigint();
			const testData = Buffer.alloc(64 * 1024, 'test'); // Reduced from 1MB to 64KB
			fs.writeFileSync('/tmp/io-test.tmp', testData);
			fs.readFileSync('/tmp/io-test.tmp');
			fs.unlinkSync('/tmp/io-test.tmp');
			const ioEnd = process.hrtime.bigint();

			metrics.io_time_ns = Number(ioEnd - ioStart);
		} catch (error: any) {
			metrics.error = error.message;
		}

		return metrics;
	}

	async testDockerCompatibility(): Promise<DockerCompatibility> {
		const dockerResults: DockerCompatibility = {};

		try {
			// Check if Docker is available by trying to get version
			let dockerAvailable = false;
			try {
				execSync('docker --version', { stdio: 'pipe' });
				dockerAvailable = true;
			} catch {
				dockerAvailable = false;
			}

			dockerResults.available = dockerAvailable;

			if (!dockerAvailable) {
				dockerResults.note =
					'Docker not available in current environment - skipping Docker compatibility tests';
				return dockerResults;
			}

			// Get Docker version
			const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
			dockerResults.version = dockerVersion;

			// Test container execution
			const containerTest = execSync('docker run --rm hello-world', { encoding: 'utf8' });
			dockerResults.container_test = containerTest.includes('Hello from Docker!');

			// Test DevContainer if available
			if (fs.existsSync('.devcontainer/devcontainer.json')) {
				dockerResults.devcontainer_config = true;
				// Could add more DevContainer specific tests here
			}
		} catch (error: any) {
			dockerResults.error = error.message;
		}

		return dockerResults;
	}

	hashDirectory(dirPath: string): Record<string, unknown> {
		const hashes: Record<string, unknown> = {};

		try {
			const files = this.getAllFiles(dirPath);

			for (const file of files) {
				if (fs.statSync(file).isFile()) {
					const relativePath = path.relative(dirPath, file);
					hashes[relativePath] = this.hashFile(file);
				}
			}
		} catch (error: any) {
			hashes.error = error.message;
		}

		return hashes;
	}

	hashDirectoryOptimized(
		dirPath: string,
		quickMode: boolean = false,
	): Record<string, unknown> {
		const hashes: Record<string, unknown> = {};

		try {
			const files = this.getAllFiles(dirPath);
			let fileCount = 0;

			// Limit files processed based on mode
			const maxFiles = quickMode ? 10 : 50; // Much fewer files in quick mode
			const prioritizedFiles = files
				.filter((file) => {
					const relativePath = path.relative(dirPath, file);
					// Prioritize contract artifacts and key metadata files
					return (
						relativePath.includes('.json') ||
						relativePath.includes('.sol') ||
						relativePath.endsWith('hardhat/console.sol')
					);
				})
				.slice(0, maxFiles); // Limit based on mode

			for (const file of prioritizedFiles) {
				if (fs.statSync(file).isFile()) {
					const relativePath = path.relative(dirPath, file);
					// Use file size + modification time for faster comparison in quick mode
					const stat = fs.statSync(file);
					if (quickMode) {
						// In quick mode, just use size and mtime for speed
						hashes[relativePath] = {
							size: stat.size,
							mtime: stat.mtime.getTime(),
						};
					} else {
						// Full mode: hash small files, skip large ones
						hashes[relativePath] = {
							size: stat.size,
							mtime: stat.mtime.getTime(),
							hash: stat.size < 1024 * 10 ? this.hashFile(file) : 'large-file-skip-hash',
						};
					}
					fileCount++;
				}
			}

			hashes._metadata = {
				total_files: files.length,
				hashed_files: fileCount,
				mode: quickMode ? 'quick' : 'full',
				optimization: quickMode ? 'size_and_mtime_only' : 'prioritized_key_files_only',
			};
		} catch (error: any) {
			hashes.error = error.message;
		}

		return hashes;
	}

	getAllFiles(dirPath: string): string[] {
		const files: string[] = [];

		function traverse(currentPath: string) {
			const items = fs.readdirSync(currentPath);

			for (const item of items) {
				const fullPath = path.join(currentPath, item);
				const stat = fs.statSync(fullPath);

				if (stat.isDirectory()) {
					traverse(fullPath);
				} else {
					files.push(fullPath);
				}
			}
		}

		traverse(dirPath);
		return files;
	}

	hashFile(filePath: string): string | null {
		try {
			const content = fs.readFileSync(filePath);
			return crypto.createHash('sha256').update(content).digest('hex');
		} catch (error) {
			return null;
		}
	}

	analyzeResults() {
		if (this.results.iterations.length === 0) return;

		// Check environment fingerprint consistency
		const fingerprints = this.results.iterations
			.map((iter) => iter.environment_fingerprint?.hash)
			.filter(Boolean);
		const uniqueFingerprints = new Set(fingerprints);
		const fingerprintConsistent = uniqueFingerprints.size === 1;

		// Check build artifact consistency
		const buildArtifacts = this.results.iterations.map((iter) => iter.build_artifacts);
		const artifactConsistent = this.checkArtifactConsistency(buildArtifacts);

		// Check performance consistency
		const performances = this.results.iterations.map((iter) => iter.performance_metrics);
		const performanceConsistent = this.checkPerformanceConsistency(performances);

		// Calculate overall reproducibility
		const consistentFactors = [
			fingerprintConsistent,
			artifactConsistent,
			performanceConsistent,
		].filter(Boolean).length;
		this.results.reproducibility_percentage = (consistentFactors / 3) * 100;
		this.results.overall_reproducible = this.results.reproducibility_percentage >= 80; // 80% threshold

		// Identify non-deterministic factors
		if (!fingerprintConsistent) {
			this.results.non_deterministic_factors.push(
				'Environment fingerprint varies between runs',
			);
		}
		if (!artifactConsistent) {
			this.results.non_deterministic_factors.push('Build artifacts are not reproducible');
		}
		if (!performanceConsistent) {
			this.results.non_deterministic_factors.push('Performance metrics vary significantly');
		}

		// Generate recommendations
		this.generateRecommendations();
	}

	calculatePerformanceSummary() {
		if (this.results.iterations.length === 0) return;

		const durations = this.results.iterations.map((iter) => iter.duration_seconds);
		const totalTime = Date.now() - this.startTime;

		this.results.performance_summary = {
			total_time_seconds: totalTime / 1000,
			average_iteration_time_seconds:
				durations.reduce((a, b) => a + b, 0) / durations.length,
			max_iteration_time_seconds: Math.max(...durations),
		};
	}

	checkArtifactConsistency(artifacts: BuildArtifacts[]): boolean {
		if (artifacts.length < 2) return true;

		// Compare contract artifacts
		const contractHashes = artifacts
			.map((a: BuildArtifacts) => a.contracts)
			.filter(Boolean) as Record<string, unknown>[];
		if (contractHashes.length > 1) {
			const firstHash = JSON.stringify(contractHashes[0]);
			return contractHashes.every(
				(hash: Record<string, unknown>) => JSON.stringify(hash) === firstHash,
			);
		}

		return true;
	}

	checkPerformanceConsistency(performances: PerformanceMetrics[]): boolean {
		if (performances.length < 2) return true;

		// Check CPU performance variation
		const cpuPerformances = performances
			.map((p: PerformanceMetrics) => p.cpu_iterations_per_ms)
			.filter(Boolean);
		if (cpuPerformances.length > 1) {
			const avg =
				cpuPerformances.reduce((a: number, b: number) => a + b, 0) / cpuPerformances.length;
			const variation = cpuPerformances.some((p: number) => Math.abs(p - avg) / avg > 0.5); // 50% variation
			if (variation) return false;
		}

		return true;
	}

	generateRecommendations() {
		if (this.results.non_deterministic_factors.length === 0) {
			this.results.recommendations.push(
				'✅ Build is highly reproducible - no action required',
			);
			return;
		}

		if (
			this.results.non_deterministic_factors.includes(
				'Environment fingerprint varies between runs',
			)
		) {
			this.results.recommendations.push(
				'🔧 Stabilize environment variables and system configuration',
			);
			this.results.recommendations.push('📦 Use fixed dependency versions in package.json');
		}

		if (
			this.results.non_deterministic_factors.includes(
				'Build artifacts are not reproducible',
			)
		) {
			this.results.recommendations.push(
				'🔨 Ensure deterministic compilation by fixing source file ordering',
			);
			this.results.recommendations.push(
				'📝 Check for timestamp or random value generation in contracts',
			);
		}

		if (
			this.results.non_deterministic_factors.includes(
				'Performance metrics vary significantly',
			)
		) {
			this.results.recommendations.push(
				'⚡ Investigate system resource contention or background processes',
			);
			this.results.recommendations.push(
				'🖥️ Ensure consistent hardware/environment for benchmarking',
			);
		}

		this.results.recommendations.push(
			`📊 Overall reproducibility: ${this.results.reproducibility_percentage.toFixed(1)}%`,
		);
	}

	saveResults(outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));
		console.log(`Reproducibility test results saved to ${outputFile}`);
	}
}

// CLI usage
if (require.main === module) {
	const iterations = parseInt(
		process.argv.find((arg) => arg.startsWith('--iterations='))?.split('=')[1] || '3',
	);
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'reproducibility-results.json';
	const dockerVersions = process.argv.includes('--docker-versions');
	const timeoutSeconds = parseInt(
		process.argv.find((arg) => arg.startsWith('--timeout='))?.split('=')[1] || '300',
	);
	const skipFullCompile = process.argv.includes('--skip-full-compile');
	const quickMode = process.argv.includes('--quick');

	const tester = new ReproducibilityTester();
	tester
		.testReproducibility({
			iterations,
			output: outputFile,
			dockerVersions,
			timeoutSeconds,
			skipFullCompile,
			quickMode,
		})
		.then((results) => {
			console.log('\n=== REPRODUCIBILITY SUMMARY ===');
			console.log(`Iterations: ${results.test_iterations}`);
			console.log(`Reproducible: ${results.overall_reproducible ? '✅ YES' : '❌ NO'}`);
			console.log(`Reproducibility: ${results.reproducibility_percentage.toFixed(1)}%`);
			console.log(
				`Total Time: ${results.performance_summary.total_time_seconds.toFixed(1)}s`,
			);
			console.log(
				`Avg Iteration: ${results.performance_summary.average_iteration_time_seconds.toFixed(1)}s`,
			);

			if (results.non_deterministic_factors.length > 0) {
				console.log('\nNon-deterministic factors:');
				results.non_deterministic_factors.forEach((factor) => console.log(`  - ${factor}`));
			}

			console.log('\nRecommendations:');
			results.recommendations.forEach((rec) => console.log(`  - ${rec}`));
		})
		.catch((error) => {
			console.error('Reproducibility testing failed:', error);
			process.exit(1);
		});
}

module.exports = ReproducibilityTester;
