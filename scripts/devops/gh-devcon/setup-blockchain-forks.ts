// scripts/devops/gh-devcon/setup-blockchain-forks.ts
import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';

interface NetworkConfig {
	rpc: string;
	chainId: number;
	port: number;
}

interface ForkOptions {
	forkBlock?: string;
}

interface ForkResult {
	network: string;
	port: number;
	chainId: number;
	rpc: string;
}

interface RpcResponse {
	jsonrpc: string;
	id: number;
	result: unknown;
}

type SupportedNetwork = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';

class BlockchainForkManager {
	private networks: Record<SupportedNetwork, NetworkConfig>;
	private processes: Map<string, ChildProcess>;

	constructor() {
		this.networks = {
			ethereum: {
				rpc: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
				chainId: 1,
				port: 8545,
			},
			polygon: {
				rpc: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
				chainId: 137,
				port: 8546,
			},
			arbitrum: {
				rpc: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
				chainId: 42161,
				port: 8547,
			},
			optimism: {
				rpc: process.env.OPTIMISM_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/demo',
				chainId: 10,
				port: 8548,
			},
		};

		this.processes = new Map();
	}

	async setupFork(
		networkName: SupportedNetwork,
		options: ForkOptions = {},
	): Promise<ForkResult> {
		if (!this.networks[networkName]) {
			throw new Error(`Unknown network: ${networkName}`);
		}

		const network = this.networks[networkName];
		const forkBlock = options.forkBlock || 'latest';

		console.log(`Setting up ${networkName} fork at block ${forkBlock}...`);

		// Kill any existing process on this port
		await this.killProcessOnPort(network.port);

		// Start Hardhat network fork
		const args = [
			'node',
			'--network',
			'hardhat',
			'--fork',
			network.rpc,
			'--port',
			network.port.toString(),
			'--chain-id',
			network.chainId.toString(),
		];

		if (forkBlock !== 'latest') {
			args.push('--fork-block-number', forkBlock.toString());
		}

		const process = spawn('npx', ['hardhat', ...args], {
			stdio: ['pipe', 'pipe', 'pipe'],
			detached: false,
		});

		this.processes.set(networkName, process);

		// Wait for network to be ready
		await this.waitForNetwork(network.port);

		// Update Hardhat config for this network
		await this.updateHardhatConfig(networkName, network);

		console.log(`✅ ${networkName} fork ready on port ${network.port}`);

		return {
			network: networkName,
			port: network.port,
			chainId: network.chainId,
			rpc: `http://localhost:${network.port}`,
		};
	}

	private async killProcessOnPort(port: number): Promise<void> {
		return new Promise((resolve) => {
			const kill = spawn('npx', ['kill-port', port.toString()]);
			kill.on('close', () => resolve());
			setTimeout(resolve, 2000); // Timeout after 2 seconds
		});
	}

	private async waitForNetwork(port: number, maxAttempts: number = 30): Promise<void> {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const response = await this.makeRpcCall(port, 'eth_chainId');
				if (response) {
					return;
				}
			} catch (error) {
				// Network not ready yet
			}

			if (attempt < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}

		throw new Error(
			`Network on port ${port} failed to start after ${maxAttempts} attempts`,
		);
	}

	private async makeRpcCall(
		port: number,
		method: string,
		params: unknown[] = [],
	): Promise<unknown> {
		const postData = JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: method,
			params: params,
		});

		return new Promise((resolve, reject) => {
			const req = http.request(
				{
					hostname: 'localhost',
					port: port,
					path: '/',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(postData),
					},
				},
				(res) => {
					let data = '';
					res.on('data', (chunk) => (data += chunk));
					res.on('end', () => {
						try {
							const response: RpcResponse = JSON.parse(data);
							resolve(response.result);
						} catch (error) {
							reject(error);
						}
					});
				},
			);

			req.on('error', reject);
			req.write(postData);
			req.end();
		});
	}

	private async updateHardhatConfig(
		networkName: string,
		network: NetworkConfig,
	): Promise<void> {
		const configPath = 'hardhat.config.ts';
		const backupPath = `${configPath}.backup`;

		// Create backup if it doesn't exist
		if (!fs.existsSync(backupPath)) {
			fs.copyFileSync(configPath, backupPath);
		}

		let config = fs.readFileSync(configPath, 'utf8');

		// Add or update network configuration
		const networkConfig = `
    ${networkName}_fork: {
      url: "http://localhost:${network.port}",
      chainId: ${network.chainId},
      accounts: "remote",
      timeout: 60000
    },`;

		// Simple regex replacement - in production, use proper AST manipulation
		if (!config.includes(`${networkName}_fork:`)) {
			const networksMatch = config.match(/(networks:\s*{)/);
			if (networksMatch) {
				config = config.replace(networksMatch[1], `${networksMatch[1]}${networkConfig}`);
			}
		}

		fs.writeFileSync(`${configPath}.parallel`, config);
		console.log(`Updated Hardhat config for ${networkName} fork`);
	}

	async cleanup(): Promise<void> {
		console.log('Cleaning up blockchain forks...');

		for (const [networkName, process] of Array.from(this.processes)) {
			try {
				process.kill('SIGTERM');
				console.log(`Stopped ${networkName} fork`);
			} catch (error) {
				console.warn(
					`Failed to stop ${networkName} fork:`,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		this.processes.clear();
	}

	async setupMultipleForks(networks: SupportedNetwork[]): Promise<ForkResult[]> {
		const results: ForkResult[] = [];

		for (const network of networks) {
			try {
				const result = await this.setupFork(network);
				results.push(result);
			} catch (error) {
				console.error(
					`Failed to setup ${network} fork:`,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		return results;
	}
}

// CLI usage
if (require.main === module) {
	const manager = new BlockchainForkManager();
	const networkName = process.argv
		.find((arg) => arg.startsWith('--network='))
		?.split('=')[1] as SupportedNetwork;
	const forkBlock = process.argv
		.find((arg) => arg.startsWith('--fork-block='))
		?.split('=')[1];

	if (!networkName) {
		console.error(
			'Usage: ts-node scripts/devops/gh-devcon/setup-blockchain-forks.ts --network=<ethereum|polygon|arbitrum|optimism> [--fork-block=<number|latest>]',
		);
		process.exit(1);
	}

	manager
		.setupFork(networkName, { forkBlock })
		.then((result) => {
			console.log('Fork setup result:', result);

			// Keep process alive for testing
			process.on('SIGINT', async () => {
				await manager.cleanup();
				process.exit(0);
			});
		})
		.catch((error) => {
			console.error('Fork setup failed:', error);
			process.exit(1);
		});
}

export default BlockchainForkManager;
