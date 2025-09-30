// scripts/devops/gh-devcon/fingerprint-environment.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as os from 'os';
import { IncomingMessage } from 'http';

interface SystemInfo {
	platform: string;
	arch: string;
	release: string;
	hostname: string;
	cpus: number;
	memory: number;
	uptime: number;
	container?: boolean;
	docker_version?: string;
	github_actions?: {
		runner_os: string;
		runner_arch: string;
		runner_name: string;
		runner_environment: string;
	};
	devcontainer?: {
		container_name?: string;
		vscode_remote?: boolean;
	};
}

interface RuntimeInfo {
	node_version: string;
	node_env: string;
	npm_version: string;
	yarn_version: string;
	python_version: string;
	git_version: string;
	npmrc_hash?: string;
	yarnrc_hash?: string;
}

interface ToolInfo {
	version: string;
	available: boolean;
	path?: string;
	error?: string;
}

interface ToolsInfo {
	[key: string]: ToolInfo;
}

interface SecurityToolsInfo {
	[key: string]: {
		config_present: boolean;
		config_hash?: string;
		env_configured: boolean;
	};
}

interface NetworkInfo {
	interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
	dns?: {
		nameservers: string[];
		search?: string;
	};
	connectivity: Record<
		string,
		{
			accessible: boolean;
			response_time?: number;
			error?: string;
		}
	>;
}

interface ConfigurationInfo {
	[key: string]: {
		exists: boolean;
		hash?: string;
		size?: number;
		modified?: string;
	};
}

interface EnvironmentVariables {
	[key: string]: string | null;
}

interface CpuBenchmark {
	iterations: number;
	duration_ms: number;
	iterations_per_ms: number;
	time_ns: number;
}

interface MemoryUsage {
	rss: number;
	heapTotal: number;
	heapUsed: number;
	external: number;
	arrayBuffers: number;
}

interface IoBenchmark {
	duration_ns: number;
	throughput_mb_per_sec: number;
}

interface PerformanceInfo {
	cpu_benchmark: CpuBenchmark;
	memory_usage: MemoryUsage;
	io_benchmark: IoBenchmark;
}

export interface EnvironmentFingerprint {
	timestamp: string;
	environment_type: string;
	hash: string;
	system: SystemInfo;
	runtime: RuntimeInfo;
	tools: ToolsInfo;
	security_tools: SecurityToolsInfo;
	network: NetworkInfo;
	configuration: ConfigurationInfo;
	environment_variables: EnvironmentVariables;
	performance: PerformanceInfo;
}

class EnvironmentFingerprinter {
	private fingerprint: EnvironmentFingerprint;

	constructor() {
		this.fingerprint = {
			timestamp: new Date().toISOString(),
			environment_type: this.detectEnvironmentType(),
			hash: '',
			system: {} as SystemInfo,
			runtime: {} as RuntimeInfo,
			tools: {},
			security_tools: {},
			network: {} as NetworkInfo,
			configuration: {},
			environment_variables: {},
			performance: {} as PerformanceInfo,
		};
	}

	private detectEnvironmentType(): string {
		if (process.env.GITHUB_ACTIONS) return 'github-actions';
		if (process.env.REMOTE_CONTAINERS) return 'devcontainer';
		if (fs.existsSync('/.dockerenv')) return 'docker';
		return 'native';
	}

	async generateFingerprint(): Promise<EnvironmentFingerprint> {
		console.log('🔍 Generating comprehensive environment fingerprint...');

		// System information
		this.fingerprint.system = await this.captureSystemInfo();

		// Runtime information
		this.fingerprint.runtime = await this.captureRuntimeInfo();

		// Development tools
		this.fingerprint.tools = await this.captureToolVersions();

		// Security tools
		this.fingerprint.security_tools = await this.captureSecurityToolConfigs();

		// Network configuration
		this.fingerprint.network = await this.captureNetworkInfo();

		// Configuration files
		this.fingerprint.configuration = await this.captureConfiguration();

		// Environment variables
		this.fingerprint.environment_variables = this.captureEnvironmentVariables();

		// Performance characteristics
		this.fingerprint.performance = await this.capturePerformanceMetrics();

		// Generate hash for quick comparison
		this.fingerprint.hash = this.generateHash();

		return this.fingerprint;
	}

	private async captureSystemInfo(): Promise<SystemInfo> {
		const system: SystemInfo = {
			platform: os.platform(),
			arch: os.arch(),
			release: os.release(),
			hostname: os.hostname(),
			cpus: os.cpus().length,
			memory: os.totalmem(),
			uptime: os.uptime(),
		};

		// Container-specific information
		if (fs.existsSync('/.dockerenv')) {
			system.container = true;
			system.docker_version = await this.getCommandOutput('docker --version');
		}

		// GitHub Actions specific
		if (process.env.GITHUB_ACTIONS) {
			system.github_actions = {
				runner_os: process.env.RUNNER_OS || '',
				runner_arch: process.env.RUNNER_ARCH || '',
				runner_name: process.env.RUNNER_NAME || '',
				runner_environment: process.env.RUNNER_ENVIRONMENT || '',
			};
		}

		// DevContainer specific
		if (process.env.REMOTE_CONTAINERS) {
			system.devcontainer = {
				container_name: process.env.REMOTE_CONTAINERS_IPC || undefined,
				vscode_remote: !!process.env.VSCODE_REMOTE,
			};
		}

		return system;
	}

	private async captureRuntimeInfo(): Promise<RuntimeInfo> {
		const runtime: RuntimeInfo = {
			node_version: process.version,
			node_env: process.env.NODE_ENV || 'development',
			npm_version: await this.getCommandOutput('npm --version'),
			yarn_version: await this.getCommandOutput('yarn --version'),
			python_version: await this.getCommandOutput('python3 --version'),
			git_version: await this.getCommandOutput('git --version'),
		};

		// Configuration hashes
		try {
			if (fs.existsSync('.npmrc')) {
				runtime.npmrc_hash = this.hashFile('.npmrc');
			}
			if (fs.existsSync('.yarnrc.yml')) {
				runtime.yarnrc_hash = this.hashFile('.yarnrc.yml');
			}
		} catch (error) {
			console.warn('Could not hash package manager configs:', (error as Error).message);
		}

		return runtime;
	}

	private async captureToolVersions(): Promise<ToolsInfo> {
		const tools: Record<string, string> = {
			hardhat: 'npx hardhat --version',
			snyk: 'snyk --version',
			semgrep: 'semgrep --version',
			socket: 'socket --version',
			osv: './bin/osv-scanner --version',
			slither: 'slither --version',
			go: 'go version',
			rustc: 'rustc --version',
			cargo: 'cargo --version',
		};

		const toolsInfo: ToolsInfo = {};

		for (const [tool, command] of Object.entries(tools)) {
			try {
				const version = await this.getCommandOutput(command);
				const toolPath = await this.getCommandOutput(`which ${tool.split(' ')[0]}`);
				toolsInfo[tool] = {
					version,
					available: true,
					path: toolPath,
				};
			} catch (error) {
				toolsInfo[tool] = {
					version: '',
					available: false,
					error: (error as Error).message,
				};
			}
		}

		return toolsInfo;
	}

	private async captureSecurityToolConfigs(): Promise<SecurityToolsInfo> {
		const securityConfigs: Record<string, { config_file: string; env_vars: string[] }> = {
			snyk: {
				config_file: '.snyk',
				env_vars: ['SNYK_TOKEN'],
			},
			semgrep: {
				config_file: '.semgrep.yml',
				env_vars: ['SEMGREP_APP_TOKEN'],
			},
			socket: {
				config_file: '.socket.yml',
				env_vars: ['SOCKET_CLI_API_TOKEN'],
			},
		};

		const securityTools: SecurityToolsInfo = {};

		for (const [tool, config] of Object.entries(securityConfigs)) {
			securityTools[tool] = {
				config_present: fs.existsSync(config.config_file),
				config_hash: fs.existsSync(config.config_file)
					? this.hashFile(config.config_file)
					: undefined,
				env_configured: config.env_vars.some((env) => !!process.env[env]),
			};
		}

		return securityTools;
	}

	private async captureNetworkInfo(): Promise<NetworkInfo> {
		const network: NetworkInfo = {
			interfaces: os.networkInterfaces(),
			connectivity: {},
		};

		// DNS configuration
		try {
			if (fs.existsSync('/etc/resolv.conf')) {
				const resolv = fs.readFileSync('/etc/resolv.conf', 'utf8');
				network.dns = {
					nameservers:
						resolv.match(/nameserver\s+([^\s]+)/g)?.map((match) => match.split(' ')[1]) ||
						[],
					search: resolv.match(/search\s+([^\n]+)/)?.[1],
				};
			}
		} catch (error) {
			console.warn('Could not read DNS config:', (error as Error).message);
		}

		// Connectivity tests
		const endpoints = [
			'https://registry.yarnpkg.com',
			'https://registry.npmjs.org',
			'https://api.snyk.io',
			'https://semgrep.dev',
			'https://socket.dev',
			'https://api.github.com',
			'https://eth-mainnet.g.alchemy.com/v2/demo',
			'https://polygon-mainnet.g.alchemy.com/v2/demo',
		];

		for (const endpoint of endpoints) {
			try {
				const start = Date.now();
				await this.testEndpoint(endpoint);
				network.connectivity[endpoint] = {
					accessible: true,
					response_time: Date.now() - start,
				};
			} catch (error) {
				network.connectivity[endpoint] = {
					accessible: false,
					error: (error as Error).message,
				};
			}
		}

		return network;
	}

	private async testEndpoint(url: string): Promise<void> {
		const https = require('https');
		const http = require('http');
		const client = url.startsWith('https:') ? https : http;

		return new Promise((resolve, reject) => {
			const req = client.get(url, (res: IncomingMessage) => {
				resolve();
			});
			req.setTimeout(5000);
			req.on('error', reject);
			req.on('timeout', () => reject(new Error('Timeout')));
		});
	}

	private async captureConfiguration(): Promise<ConfigurationInfo> {
		const configFiles = [
			'hardhat.config.ts',
			'hardhat.config.js',
			'tsconfig.json',
			'package.json',
			'yarn.lock',
			'package-lock.json',
			'.eslintrc.json',
			'.prettierrc',
			'.semgrep.yml',
			'slither.config.json',
			'.env.example',
		];

		const configuration: ConfigurationInfo = {};

		for (const file of configFiles) {
			if (fs.existsSync(file)) {
				const stats = fs.statSync(file);
				configuration[file] = {
					exists: true,
					hash: this.hashFile(file),
					size: stats.size,
					modified: stats.mtime.toISOString(),
				};
			} else {
				configuration[file] = { exists: false };
			}
		}

		return configuration;
	}

	private captureEnvironmentVariables(): EnvironmentVariables {
		const envVars = [
			'NODE_ENV',
			'HARDHAT_NETWORK',
			'PATH',
			'LANG',
			'TZ',
			'SHELL',
			'HOME',
			'USER',
		];

		const environmentVariables: EnvironmentVariables = {};
		envVars.forEach((envVar) => {
			environmentVariables[envVar] = process.env[envVar] || null;
		});

		return environmentVariables;
	}

	private async capturePerformanceMetrics(): Promise<PerformanceInfo> {
		console.log('⚡ Capturing performance metrics...');

		// CPU benchmark
		const cpuBenchmark = await this.runCpuBenchmark();

		// Memory usage
		const memoryUsage = process.memoryUsage();

		// I/O benchmark
		const ioBenchmark = await this.runIoBenchmark();

		return {
			cpu_benchmark: cpuBenchmark,
			memory_usage: {
				rss: memoryUsage.rss,
				heapTotal: memoryUsage.heapTotal,
				heapUsed: memoryUsage.heapUsed,
				external: memoryUsage.external,
				arrayBuffers: memoryUsage.arrayBuffers || 0,
			},
			io_benchmark: ioBenchmark,
		};
	}

	private async runCpuBenchmark(): Promise<CpuBenchmark> {
		const benchmarkDuration = 100; // milliseconds
		let iterations = 0;

		const startTime = Date.now();
		const startHrTime = process.hrtime.bigint();

		while (Date.now() - startTime < benchmarkDuration) {
			Math.sqrt(crypto.randomInt(1000000));
			iterations++;
		}

		const endHrTime = process.hrtime.bigint();

		return {
			iterations,
			duration_ms: benchmarkDuration,
			iterations_per_ms: iterations / benchmarkDuration,
			time_ns: Number(endHrTime - startHrTime),
		};
	}

	private async runIoBenchmark(): Promise<IoBenchmark> {
		const testData = Buffer.alloc(1024 * 1024, 'test'); // 1MB
		const startTime = process.hrtime.bigint();

		fs.writeFileSync('/tmp/io-test.tmp', testData);
		fs.readFileSync('/tmp/io-test.tmp');
		fs.unlinkSync('/tmp/io-test.tmp');

		const endTime = process.hrtime.bigint();

		return {
			duration_ns: Number(endTime - startTime),
			throughput_mb_per_sec: 1 / (Number(endTime - startTime) / 1000000000),
		};
	}

	private async getCommandOutput(command: string): Promise<string> {
		try {
			return execSync(command, {
				encoding: 'utf8',
				timeout: 10000,
				stdio: 'pipe',
			}).trim();
		} catch (error) {
			throw new Error(`Command "${command}" failed: ${(error as Error).message}`);
		}
	}

	private hashFile(filePath: string): string {
		try {
			const content = fs.readFileSync(filePath);
			return crypto.createHash('sha256').update(content).digest('hex');
		} catch (error) {
			return '';
		}
	}

	private generateHash(): string {
		const hashContent = JSON.stringify({
			system: this.fingerprint.system,
			runtime: this.fingerprint.runtime,
			tools: this.fingerprint.tools,
			configuration: this.fingerprint.configuration,
		});

		return crypto.createHash('sha256').update(hashContent).digest('hex');
	}

	saveFingerprint(outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(this.fingerprint, null, 2));
		console.log(`💾 Environment fingerprint saved to ${outputFile}`);
		console.log(`🔒 Fingerprint hash: ${this.fingerprint.hash}`);
	}
}

// CLI usage
if (require.main === module) {
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'environment-fingerprint.json';
	const verbose = process.argv.includes('--verbose');

	const fingerprinter = new EnvironmentFingerprinter();
	fingerprinter
		.generateFingerprint()
		.then((fingerprint) => {
			fingerprinter.saveFingerprint(outputFile);

			if (verbose) {
				console.log('\n📊 ENVIRONMENT SUMMARY');
				console.log(`Type: ${fingerprint.environment_type}`);
				console.log(`Platform: ${fingerprint.system.platform}/${fingerprint.system.arch}`);
				console.log(`Node.js: ${fingerprint.runtime.node_version}`);
				console.log(
					`Tools available: ${Object.keys(fingerprint.tools).filter((tool) => fingerprint.tools[tool].available).length}`,
				);
				console.log(
					`Performance score: ${fingerprint.performance.cpu_benchmark.iterations_per_ms.toFixed(2)} iter/ms`,
				);
			}
		})
		.catch((error) => {
			console.error('❌ Failed to generate fingerprint:', error);
			process.exit(1);
		});
}

export default EnvironmentFingerprinter;
