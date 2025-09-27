#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

interface ContainerProfile {
	timestamp: string;
	container_info: ContainerInfo;
	performance_metrics: ContainerPerformanceMetrics;
	resource_usage: ContainerResourceUsage;
	network_analysis: NetworkAnalysis;
	optimization_suggestions: string[];
}

interface ContainerInfo {
	image_name: string;
	image_size: string;
	layer_count: number;
	base_image: string;
	environment_variables: Record<string, string>;
	exposed_ports: string[];
	volumes: string[];
}

interface ContainerPerformanceMetrics {
	startup_time_ms: number;
	memory_peak_mb: number;
	cpu_usage_percent: number;
	disk_read_mb: number;
	disk_write_mb: number;
	network_rx_mb: number;
	network_tx_mb: number;
}

interface ContainerResourceUsage {
	current_memory_mb: number;
	memory_limit_mb: number;
	memory_usage_percent: number;
	cpu_shares: number;
	cpu_quota: number;
	cpu_period: number;
	block_io_weight: number;
}

interface NetworkAnalysis {
	interface_stats: NetworkInterfaceStats[];
	dns_resolution_time_ms: number;
	connection_count: number;
	established_connections: number;
}

interface NetworkInterfaceStats {
	interface: string;
	rx_bytes: number;
	tx_bytes: number;
	rx_packets: number;
	tx_packets: number;
}

class ContainerPerformanceProfiler {
	private containerId: string;
	private profile: Partial<ContainerProfile>;

	constructor(containerId?: string) {
		this.containerId = containerId || this.detectContainerId();
		this.profile = {
			timestamp: new Date().toISOString(),
			container_info: {} as ContainerInfo,
			performance_metrics: {} as ContainerPerformanceMetrics,
			resource_usage: {} as ContainerResourceUsage,
			network_analysis: {} as NetworkAnalysis,
			optimization_suggestions: [],
		};
	}

	private detectContainerId(): string {
		try {
			// Try to get container ID from cgroup
			if (existsSync('/proc/1/cgroup')) {
				const cgroup = readFileSync('/proc/1/cgroup', 'utf8');
				const containerMatch = cgroup.match(/docker[\/-]([a-f0-9]{64})/);
				if (containerMatch) {
					return containerMatch[1].substring(0, 12); // Short ID
				}
			}

			// Try hostname
			const hostname = execSync('hostname', { encoding: 'utf8' }).trim();
			if (hostname.length === 12 && /^[a-f0-9]+$/.test(hostname)) {
				return hostname;
			}

			// Fallback to docker ps
			const output = execSync('docker ps --format "{{.ID}}" | head -1', {
				encoding: 'utf8',
			}).trim();
			return output;
		} catch (error) {
			console.warn('Could not detect container ID, using fallback');
			return 'unknown';
		}
	}

	async profileContainer(): Promise<ContainerProfile> {
		console.log(`🔍 Profiling container performance: ${this.containerId}`);

		try {
			await this.collectContainerInfo();
			await this.measurePerformanceMetrics();
			await this.analyzeResourceUsage();
			await this.performNetworkAnalysis();
			await this.generateOptimizationSuggestions();

			return this.profile as ContainerProfile;
		} catch (error) {
			console.error(`❌ Failed to profile container:`, error);
			throw error;
		}
	}

	private async collectContainerInfo(): Promise<void> {
		console.log('📋 Collecting container information...');

		try {
			// Get container details from Docker
			const inspectOutput = execSync(`docker inspect ${this.containerId}`, {
				encoding: 'utf8',
			});
			const containerData = JSON.parse(inspectOutput)[0];

			this.profile.container_info = {
				image_name: containerData.Config.Image,
				image_size: await this.getImageSize(),
				layer_count: await this.getLayerCount(),
				base_image: containerData.Config.Image.split(':')[0],
				environment_variables: this.parseEnvironmentVariables(
					containerData.Config.Env || [],
				),
				exposed_ports: Object.keys(containerData.Config.ExposedPorts || {}),
				volumes: Object.keys(containerData.Config.Volumes || {}),
			};
		} catch (error) {
			console.warn('Could not get container info from Docker, using fallback');
			this.profile.container_info = {
				image_name: 'unknown',
				image_size: 'unknown',
				layer_count: 0,
				base_image: 'unknown',
				environment_variables: {},
				exposed_ports: [],
				volumes: [],
			};
		}
	}

	private async getImageSize(): Promise<string> {
		try {
			const output = execSync(
				`docker images --format "table {{.Size}}" | grep ${this.profile.container_info?.image_name} | head -1`,
				{ encoding: 'utf8' },
			);
			return output.trim().split(/\s+/)[0] || 'unknown';
		} catch (error) {
			return 'unknown';
		}
	}

	private async getLayerCount(): Promise<number> {
		try {
			const output = execSync(
				`docker history ${this.profile.container_info?.image_name} | wc -l`,
				{ encoding: 'utf8' },
			);
			return parseInt(output.trim()) - 1; // Subtract header
		} catch (error) {
			return 0;
		}
	}

	private parseEnvironmentVariables(envArray: string[]): Record<string, string> {
		const env: Record<string, string> = {};
		envArray.forEach((envVar) => {
			const [key, ...valueParts] = envVar.split('=');
			env[key] = valueParts.join('=');
		});
		return env;
	}

	private async measurePerformanceMetrics(): Promise<void> {
		console.log('⚡ Measuring performance metrics...');

		const startTime = Date.now();

		this.profile.performance_metrics = {
			startup_time_ms: await this.measureStartupTime(),
			memory_peak_mb: await this.measureMemoryPeak(),
			cpu_usage_percent: await this.measureCPUUsage(),
			disk_read_mb: await this.measureDiskIO('read'),
			disk_write_mb: await this.measureDiskIO('write'),
			network_rx_mb: await this.measureNetworkIO('rx'),
			network_tx_mb: await this.measureNetworkIO('tx'),
		};

		console.log(`Performance metrics collected in ${Date.now() - startTime}ms`);
	}

	private async measureStartupTime(): Promise<number> {
		// This would typically be measured from container creation to ready state
		// For now, return a placeholder based on current uptime
		try {
			const uptime = execSync('cat /proc/uptime | cut -d" " -f1', { encoding: 'utf8' });
			return Math.round(parseFloat(uptime.trim()) * 1000);
		} catch (error) {
			return 0;
		}
	}

	private async measureMemoryPeak(): Promise<number> {
		try {
			if (existsSync('/sys/fs/cgroup/memory/memory.max_usage_in_bytes')) {
				const maxUsage = readFileSync(
					'/sys/fs/cgroup/memory/memory.max_usage_in_bytes',
					'utf8',
				);
				return Math.round(parseInt(maxUsage.trim()) / 1024 / 1024);
			}
		} catch (error) {
			// Fallback to current memory usage
			return await this.getCurrentMemoryUsage();
		}
		return 0;
	}

	private async getCurrentMemoryUsage(): Promise<number> {
		try {
			const usage = readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8');
			return Math.round(parseInt(usage.trim()) / 1024 / 1024);
		} catch (error) {
			return 0;
		}
	}

	private async measureCPUUsage(): Promise<number> {
		try {
			const cpuUsage = readFileSync('/sys/fs/cgroup/cpu,cpuacct/cpuacct.usage', 'utf8');
			const cpuPeriod = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8');
			const cpuQuota = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8');

			const usageNs = parseInt(cpuUsage.trim());
			const periodUs = parseInt(cpuPeriod.trim());
			const quotaUs = parseInt(cpuQuota.trim());

			if (periodUs > 0 && quotaUs > 0) {
				const usagePercent = (usageNs / 1000000 / (quotaUs / periodUs)) * 100;
				return Math.round(usagePercent * 100) / 100;
			}
		} catch (error) {
			return 0;
		}
		return 0;
	}

	private async measureDiskIO(direction: 'read' | 'write'): Promise<number> {
		try {
			if (existsSync('/proc/diskstats')) {
				const stats = readFileSync('/proc/diskstats', 'utf8');
				const lines = stats.split('\n').filter((line) => line.includes('sda'));

				if (lines.length > 0) {
					const fields = lines[0].trim().split(/\s+/);
					const sectors = direction === 'read' ? parseInt(fields[5]) : parseInt(fields[9]);
					return Math.round((sectors * 512) / 1024 / 1024); // Convert to MB
				}
			}
		} catch (error) {
			return 0;
		}
		return 0;
	}

	private async measureNetworkIO(direction: 'rx' | 'tx'): Promise<number> {
		try {
			if (existsSync('/proc/net/dev')) {
				const stats = readFileSync('/proc/net/dev', 'utf8');
				const lines = stats.split('\n').slice(2);

				let totalBytes = 0;
				lines.forEach((line) => {
					if (line.trim()) {
						const fields = line.trim().split(/\s+/);
						const bytes = direction === 'rx' ? parseInt(fields[1]) : parseInt(fields[9]);
						totalBytes += bytes;
					}
				});

				return Math.round(totalBytes / 1024 / 1024); // Convert to MB
			}
		} catch (error) {
			return 0;
		}
		return 0;
	}

	private async analyzeResourceUsage(): Promise<void> {
		console.log('📊 Analyzing resource usage...');

		this.profile.resource_usage = {
			current_memory_mb: await this.getCurrentMemoryUsage(),
			memory_limit_mb: await this.getMemoryLimit(),
			memory_usage_percent: await this.getMemoryUsagePercent(),
			cpu_shares: await this.getCPUShares(),
			cpu_quota: await this.getCPUQuota(),
			cpu_period: await this.getCPUPeriod(),
			block_io_weight: await this.getBlockIOWeight(),
		};
	}

	private async getMemoryLimit(): Promise<number> {
		try {
			const limit = readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8');
			return Math.round(parseInt(limit.trim()) / 1024 / 1024);
		} catch (error) {
			return 0;
		}
	}

	private async getMemoryUsagePercent(): Promise<number> {
		try {
			const usage = await this.getCurrentMemoryUsage();
			const limit = await this.getMemoryLimit();
			return limit > 0 ? Math.round((usage / limit) * 100) : 0;
		} catch (error) {
			return 0;
		}
	}

	private async getCPUShares(): Promise<number> {
		try {
			const shares = readFileSync('/sys/fs/cgroup/cpu/cpu.shares', 'utf8');
			return parseInt(shares.trim());
		} catch (error) {
			return 0;
		}
	}

	private async getCPUQuota(): Promise<number> {
		try {
			const quota = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8');
			return parseInt(quota.trim());
		} catch (error) {
			return 0;
		}
	}

	private async getCPUPeriod(): Promise<number> {
		try {
			const period = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8');
			return parseInt(period.trim());
		} catch (error) {
			return 0;
		}
	}

	private async getBlockIOWeight(): Promise<number> {
		try {
			const weight = readFileSync('/sys/fs/cgroup/blkio/blkio.weight', 'utf8');
			return parseInt(weight.trim());
		} catch (error) {
			return 0;
		}
	}

	private async performNetworkAnalysis(): Promise<void> {
		console.log('🌐 Performing network analysis...');

		this.profile.network_analysis = {
			interface_stats: await this.getNetworkInterfaceStats(),
			dns_resolution_time_ms: await this.measureDNSResolutionTime(),
			connection_count: await this.getConnectionCount(),
			established_connections: await this.getEstablishedConnections(),
		};
	}

	private async getNetworkInterfaceStats(): Promise<NetworkInterfaceStats[]> {
		try {
			if (existsSync('/proc/net/dev')) {
				const stats = readFileSync('/proc/net/dev', 'utf8');
				const lines = stats.split('\n').slice(2);

				return lines
					.filter((line) => line.trim())
					.map((line) => {
						const fields = line.trim().split(/\s+/);
						return {
							interface: fields[0].replace(':', ''),
							rx_bytes: parseInt(fields[1]),
							tx_bytes: parseInt(fields[9]),
							rx_packets: parseInt(fields[2]),
							tx_packets: parseInt(fields[10]),
						};
					});
			}
		} catch (error) {
			return [];
		}
		return [];
	}

	private async measureDNSResolutionTime(): Promise<number> {
		try {
			const start = Date.now();
			execSync('nslookup google.com 2>/dev/null || nslookup 8.8.8.8 2>/dev/null', {
				stdio: 'pipe',
			});
			return Date.now() - start;
		} catch (error) {
			return 0;
		}
	}

	private async getConnectionCount(): Promise<number> {
		try {
			const output = execSync('netstat -tun 2>/dev/null | wc -l', { encoding: 'utf8' });
			return parseInt(output.trim());
		} catch (error) {
			return 0;
		}
	}

	private async getEstablishedConnections(): Promise<number> {
		try {
			const output = execSync('netstat -tun 2>/dev/null | grep ESTABLISHED | wc -l', {
				encoding: 'utf8',
			});
			return parseInt(output.trim());
		} catch (error) {
			return 0;
		}
	}

	private async generateOptimizationSuggestions(): Promise<void> {
		console.log('💡 Generating optimization suggestions...');

		const suggestions: string[] = [];

		// Memory optimization
		if (
			this.profile.resource_usage?.memory_usage_percent &&
			this.profile.resource_usage.memory_usage_percent > 80
		) {
			suggestions.push(
				'High memory usage detected. Consider increasing memory limits or optimizing memory-intensive operations.',
			);
		}

		// CPU optimization
		if (
			this.profile.performance_metrics?.cpu_usage_percent &&
			this.profile.performance_metrics.cpu_usage_percent > 90
		) {
			suggestions.push(
				'High CPU usage detected. Consider optimizing CPU-intensive tasks or increasing CPU allocation.',
			);
		}

		// Network optimization
		if (
			this.profile.network_analysis?.connection_count &&
			this.profile.network_analysis.connection_count > 100
		) {
			suggestions.push(
				'High number of network connections. Consider connection pooling or reducing concurrent requests.',
			);
		}

		// Startup optimization
		if (
			this.profile.performance_metrics?.startup_time_ms &&
			this.profile.performance_metrics.startup_time_ms > 30000
		) {
			suggestions.push(
				'Slow container startup detected. Consider using multi-stage builds or optimizing entrypoint scripts.',
			);
		}

		// Layer optimization
		if (
			this.profile.container_info?.layer_count &&
			this.profile.container_info.layer_count > 50
		) {
			suggestions.push(
				'High number of container layers. Consider consolidating layers to reduce image size and build time.',
			);
		}

		this.profile.optimization_suggestions = suggestions;
	}

	saveProfile(outputFile: string): void {
		writeFileSync(outputFile, JSON.stringify(this.profile, null, 2));
		console.log(`📊 Container profile saved to ${outputFile}`);

		// Print summary
		console.log('\n=== CONTAINER PROFILE SUMMARY ===');
		console.log(`Container ID: ${this.containerId}`);
		console.log(`Image: ${this.profile.container_info?.image_name}`);
		console.log(`Startup Time: ${this.profile.performance_metrics?.startup_time_ms}ms`);
		console.log(
			`Memory Usage: ${this.profile.resource_usage?.current_memory_mb}MB (${this.profile.resource_usage?.memory_usage_percent}%)`,
		);
		console.log(`CPU Usage: ${this.profile.performance_metrics?.cpu_usage_percent}%`);
		console.log(`Network Connections: ${this.profile.network_analysis?.connection_count}`);

		if (
			this.profile.optimization_suggestions &&
			this.profile.optimization_suggestions.length > 0
		) {
			console.log('\n💡 Optimization Suggestions:');
			this.profile.optimization_suggestions.forEach((suggestion) => {
				console.log(`  - ${suggestion}`);
			});
		}
	}
}

// CLI usage
if (require.main === module) {
	const containerId = process.argv
		.find((arg) => arg.startsWith('--container='))
		?.split('=')[1];
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'container-profile.json';
	const detailed = process.argv.includes('--detailed');

	const profiler = new ContainerPerformanceProfiler(containerId);

	profiler
		.profileContainer()
		.then((profile) => {
			profiler.saveProfile(outputFile);

			if (detailed) {
				console.log('\n=== DETAILED PROFILE ===');
				console.log(JSON.stringify(profile, null, 2));
			}
		})
		.catch((error) => {
			console.error('❌ Failed to profile container:', error);
			process.exit(1);
		});
}

export default ContainerPerformanceProfiler;
