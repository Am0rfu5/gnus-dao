// scripts/devops/gh-devcon/gh-devconrun-multi-chain-tests.ts
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import BlockchainForkManager from './setup-blockchain-forks';

interface TestShard {
	name: string;
	files: string[];
	category?: string;
}

interface TestOptions {
	forkBlock?: string;
	network?: string;
	chainId?: number;
	coverage?: boolean;
	outputDir?: string;
}

interface NetworkTestResult {
	network: string;
	success: boolean;
	error?: string;
	duration: number;
	tests: number;
	passed: number;
	failed: number;
	coverage?: number;
	gasUsage?: number;
}

interface ShardResult {
	shard: string;
	networks: Record<string, NetworkTestResult>;
	totalDuration: number;
	overallSuccess: boolean;
}

interface TestSuiteResult {
	success: boolean;
	tests: number;
	passed: number;
	failed: number;
	pending: number;
	gasUsage: number;
	output: string;
	errors: string;
	coverage?: number;
}

interface AggregatedResults {
	timestamp: string;
	totalShards: number;
	networks: string[];
	shardResults: ShardResult[];
	summary: {
		totalTests: number;
		totalPassed: number;
		totalFailed: number;
		totalDuration: number;
		successRate: number;
	};
}

interface ValidationResult {
	success: boolean;
	networks: Record<string, any>;
}

class MultiChainTestRunner {
	private forkManager: BlockchainForkManager;
	private results: any[];
	private networks: string[];

	constructor() {
		this.forkManager = new BlockchainForkManager();
		this.results = [];
		this.networks = ['ethereum', 'polygon', 'arbitrum', 'optimism'];
	}

	async runParallelMultiChainTests(
		testShard: TestShard,
		options: TestOptions = {},
	): Promise<ShardResult> {
		console.log(`🚀 Starting multi-chain tests for shard: ${testShard.name}`);

		const networkPromises = this.networks.map((network) =>
			this.runTestsOnNetwork(network, testShard, options),
		);

		const results = await Promise.allSettled(networkPromises);

		// Process results
		const networkResults: Record<string, NetworkTestResult> = {};
		results.forEach((result, index) => {
			const network = this.networks[index];
			if (result.status === 'fulfilled') {
				networkResults[network] = result.value;
			} else {
				networkResults[network] = {
					network,
					success: false,
					error:
						result.reason instanceof Error ? result.reason.message : String(result.reason),
					duration: 0,
					tests: 0,
					passed: 0,
					failed: 0,
				};
			}
		});

		return {
			shard: testShard.name,
			networks: networkResults,
			totalDuration: Object.values(networkResults).reduce((sum, r) => sum + r.duration, 0),
			overallSuccess: Object.values(networkResults).every((r) => r.success),
		};
	}

	private async runTestsOnNetwork(
		network: string,
		testShard: TestShard,
		options: TestOptions,
	): Promise<NetworkTestResult> {
		const startTime = Date.now();

		try {
			// Setup fork for this network
			const forkConfig = await this.forkManager.setupFork(network as any, {
				forkBlock: options.forkBlock || 'latest',
			});

			console.log(`🧪 Running ${testShard.name} tests on ${network}...`);

			// Run tests with network-specific configuration
			const testResult = await this.executeTestSuite(testShard, {
				...options,
				network: forkConfig.rpc,
				chainId: forkConfig.chainId,
			});

			const duration = Date.now() - startTime;

			return {
				network,
				success: testResult.success,
				duration,
				tests: testResult.tests,
				passed: testResult.passed,
				failed: testResult.failed,
				coverage: testResult.coverage,
				gasUsage: testResult.gasUsage,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			console.error(
				`❌ ${network} tests failed:`,
				error instanceof Error ? error.message : String(error),
			);

			return {
				network,
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration,
				tests: 0,
				passed: 0,
				failed: 0,
			};
		}
	}

	private async executeTestSuite(
		testShard: TestShard,
		options: TestOptions,
	): Promise<TestSuiteResult> {
		return new Promise((resolve, reject) => {
			const env = {
				...process.env,
				HARDHAT_NETWORK: options.network ? 'custom' : 'hardhat',
				RPC_URL: options.network || '',
				CHAIN_ID: options.chainId?.toString() || '31337',
				TEST_SHARD: testShard.name,
				COVERAGE: options.coverage ? 'true' : 'false',
			};

			const testProcess = spawn(
				'npx',
				['hardhat', 'test', ...testShard.files.map((file) => `test/${file}`)],
				{
					stdio: ['pipe', 'pipe', 'pipe'],
					env,
					shell: true,
				},
			);

			let stdout = '';
			let stderr = '';

			testProcess.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			testProcess.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			testProcess.on('close', (code) => {
				try {
					const result = this.parseTestOutput(stdout, stderr, code || 0);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});

			testProcess.on('error', reject);
		});
	}

	private parseTestOutput(
		stdout: string,
		stderr: string,
		exitCode: number,
	): TestSuiteResult {
		// Parse Hardhat test output
		const success = exitCode === 0;

		// Extract test counts from output
		const testMatch = stdout.match(/(\d+) passing/);
		const failMatch = stdout.match(/(\d+) failing/);
		const pendingMatch = stdout.match(/(\d+) pending/);

		const passed = testMatch ? parseInt(testMatch[1]) : 0;
		const failed = failMatch ? parseInt(failMatch[1]) : 0;
		const pending = pendingMatch ? parseInt(pendingMatch[1]) : 0;
		const total = passed + failed + pending;

		// Extract gas usage if available
		const gasMatch = stdout.match(/Gas used: (\d+)/);
		const gasUsage = gasMatch ? parseInt(gasMatch[1]) : 0;

		return {
			success,
			tests: total,
			passed,
			failed,
			pending,
			gasUsage,
			output: stdout,
			errors: stderr,
		};
	}

	async runAllShards(
		shards: TestShard[],
		options: TestOptions = {},
	): Promise<AggregatedResults> {
		console.log(
			`🎯 Running multi-chain tests for ${shards.length} shards across ${this.networks.length} networks`,
		);

		const shardPromises = shards.map((shard) =>
			this.runParallelMultiChainTests(shard, options),
		);

		const results = await Promise.allSettled(shardPromises);

		// Aggregate results
		const aggregatedResults: AggregatedResults = {
			timestamp: new Date().toISOString(),
			totalShards: shards.length,
			networks: this.networks,
			shardResults: [],
			summary: {
				totalTests: 0,
				totalPassed: 0,
				totalFailed: 0,
				totalDuration: 0,
				successRate: 0,
			},
		};

		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				aggregatedResults.shardResults.push(result.value);

				// Update summary
				const shard = result.value;
				aggregatedResults.summary.totalTests += Object.values(shard.networks).reduce(
					(sum, n) => sum + n.tests,
					0,
				);
				aggregatedResults.summary.totalPassed += Object.values(shard.networks).reduce(
					(sum, n) => sum + n.passed,
					0,
				);
				aggregatedResults.summary.totalFailed += Object.values(shard.networks).reduce(
					(sum, n) => sum + n.failed,
					0,
				);
				aggregatedResults.summary.totalDuration += shard.totalDuration;
			} else {
				console.error(`Shard ${index} failed:`, result.reason);
			}
		});

		aggregatedResults.summary.successRate =
			aggregatedResults.summary.totalTests > 0
				? (aggregatedResults.summary.totalPassed / aggregatedResults.summary.totalTests) *
					100
				: 0;

		// Save results
		await this.saveResults(aggregatedResults, options.outputDir);

		// Cleanup forks
		await this.forkManager.cleanup();

		return aggregatedResults;
	}

	private async saveResults(
		results: AggregatedResults,
		outputDir: string = 'test-assets/test-output',
	): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `multi-chain-test-results-${timestamp}.json`;

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(results, null, 2));

		console.log(`📊 Multi-chain test results saved to ${filename}`);
	}

	async validateMultiChainSetup(): Promise<ValidationResult> {
		console.log('🔍 Validating multi-chain setup...');

		const validationResults: Record<string, any> = {};

		for (const network of this.networks) {
			try {
				const forkConfig = await this.forkManager.setupFork(network as any);
				validationResults[network] = {
					status: 'success',
					rpc: forkConfig.rpc,
					chainId: forkConfig.chainId,
				};
			} catch (error) {
				validationResults[network] = {
					status: 'failed',
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		// Cleanup
		await this.forkManager.cleanup();

		const allSuccessful = Object.values(validationResults).every(
			(r) => r.status === 'success',
		);

		console.log(
			allSuccessful
				? '✅ Multi-chain setup validation passed'
				: '❌ Multi-chain setup validation failed',
		);

		return {
			success: allSuccessful,
			networks: validationResults,
		};
	}
}

// CLI usage
if (require.main === module) {
	const runner = new MultiChainTestRunner();
	const command = process.argv[2];

	switch (command) {
		case 'validate':
			runner
				.validateMultiChainSetup()
				.then((result) => {
					console.log('Validation result:', result);
					process.exit(result.success ? 0 : 1);
				})
				.catch((error) => {
					console.error('Validation failed:', error);
					process.exit(1);
				});
			break;

		case 'run':
			const shardFile = process.argv
				.find((arg) => arg.startsWith('--shards='))
				?.split('=')[1];
			const outputDir =
				process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
				'test-assets/test-output';

			if (!shardFile) {
				console.error(
					'Usage: ts-node scripts/devops/gh-devcon/gh-devconrun-multi-chain-tests.ts run --shards=<path-to-shards.json> [--output=<output-dir>]',
				);
				process.exit(1);
			}

			const shards: TestShard[] = JSON.parse(fs.readFileSync(shardFile, 'utf8'));

			runner
				.runAllShards(shards, { outputDir })
				.then((results) => {
					console.log('Multi-chain test results:', results.summary);
					process.exit(results.summary.successRate === 100 ? 0 : 1);
				})
				.catch((error) => {
					console.error('Multi-chain tests failed:', error);
					process.exit(1);
				});
			break;

		default:
			console.log('Usage:');
			console.log(
				'  ts-node scripts/devops/gh-devcon/gh-devconrun-multi-chain-tests.ts validate',
			);
			console.log(
				'  ts-node scripts/devops/gh-devcon/gh-devconrun-multi-chain-tests.ts run --shards=<path> [--output=<dir>]',
			);
			process.exit(1);
	}
}

export default MultiChainTestRunner;
