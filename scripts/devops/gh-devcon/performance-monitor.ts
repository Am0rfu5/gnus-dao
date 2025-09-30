#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

interface PerformanceMetrics {
	timestamp: string;
	environment: string;
	container?: ContainerMetrics;
	workflow?: WorkflowMetrics;
	resources?: ResourceMetrics;
	cache?: CacheMetrics;
	optimization?: OptimizationMetrics;
	total_collection_time?: number;
}

interface ContainerMetrics {
	startup_time?: number | null;
	build_time?: number | null;
	image_size?: string | null;
	layer_count?: number | null;
	pull_time?: number | null;
	collection_time?: number;
}

interface WorkflowMetrics {
	job_execution_times?: Record<string, number | null>;
	parallel_efficiency?: number | null;
	queue_time?: number | null;
	total_workflow_time?: number | null;
	step_breakdown?: Record<string, number | null>;
	collection_time?: number;
}

interface ResourceMetrics {
	cpu_usage?: CPUUsage | null;
	memory_usage?: MemoryUsage | null;
	disk_io?: DiskIOMetrics | null;
	network_io?: NetworkIOMetrics | null;
	container_resources?: ContainerResourceUsage | null;
	collection_time?: number;
}

interface CPUUsage {
	user_cpu_percent: number;
	system_cpu_percent: number;
	total_cpu_percent: number;
}

interface MemoryUsage {
	heap_used_mb: number;
	heap_total_mb: number;
	rss_mb: number;
	external_mb: number;
}

interface DiskIOMetrics {
	reads_completed: number;
	writes_completed: number;
	read_bytes: number;
	write_bytes: number;
}

interface NetworkIOMetrics {
	bytes_received: number;
	bytes_transmitted: number;
	total_bytes: number;
}

interface ContainerResourceUsage {
	container_cpu: CgroupCPUStats | null;
	container_memory: CgroupMemoryStats | null;
}

interface CgroupCPUStats {
	total_usage_nanoseconds: number;
}

interface CgroupMemoryStats {
	usage_bytes: number;
	limit_bytes: number;
	usage_percent: number;
}

interface CacheMetrics {
	dependency_cache?: DependencyCacheMetrics | null;
	docker_layer_cache?: DockerLayerCacheMetrics | null;
	build_cache?: BuildCacheMetrics | null;
	overall_cache_efficiency?: number | null;
	collection_time?: number;
}

interface DependencyCacheMetrics {
	yarn_cache: YarnCacheStats | null;
	npm_cache: NpmCacheStats | null;
	node_modules_cache: NodeModulesCacheStats | null;
}

interface YarnCacheStats {
	cache_size: number;
	file_count: number;
	hit_rate: number | null;
}

interface NpmCacheStats {
	cache_entries: number;
}

interface NodeModulesCacheStats {
	size: number;
	install_time: number | null;
}

interface DockerLayerCacheMetrics {
	cached_layers: number | null;
	cache_size: string | null;
	build_time_saved: number | null;
}

interface BuildCacheMetrics {
	typescript_cache: TypeScriptCacheStats | null;
	hardhat_cache: HardhatCacheStats | null;
	eslint_cache: ESLintCacheStats | null;
}

interface TypeScriptCacheStats {
	cache_file_size: number;
	last_modified: string;
}

interface HardhatCacheStats {
	cache_size: number;
	file_count: number;
}

interface ESLintCacheStats {
	cache_file_size: number;
	last_modified: string;
}

interface OptimizationMetrics {
	bottlenecks?: Bottleneck[];
	optimization_opportunities?: OptimizationOpportunity[];
	performance_score?: number;
	recommendations?: string[];
	collection_time?: number;
}

interface Bottleneck {
	type: string;
	component: string;
	time?: number;
	usage?: number;
	severity: 'high' | 'medium' | 'low';
}

interface OptimizationOpportunity {
	type: string;
	current_efficiency?: number;
	current_startup_time?: number;
	potential_improvement: string;
	recommendation: string;
}

class DevContainerPerformanceMonitor {
	private metrics: Partial<PerformanceMetrics>;
	private startTime: number;

	constructor() {
		this.metrics = {
			timestamp: new Date().toISOString(),
			environment: this.detectEnvironment(),
			container: {},
			workflow: {},
			resources: {},
			cache: {},
			optimization: {},
		};
		this.startTime = Date.now();
	}

	private detectEnvironment(): string {
		if (process.env.GITHUB_ACTIONS) return 'github-actions';
		if (process.env.REMOTE_CONTAINERS) return 'devcontainer';
		return 'local';
	}

	async collectAllMetrics(): Promise<PerformanceMetrics> {
		console.log('🔍 Collecting comprehensive performance metrics...');

		await this.collectContainerMetrics();
		await this.collectWorkflowMetrics();
		await this.collectResourceMetrics();
		await this.collectCacheMetrics();
		await this.collectOptimizationMetrics();

		this.metrics.total_collection_time = Date.now() - this.startTime;
		return this.metrics as PerformanceMetrics;
	}

	private async collectContainerMetrics(): Promise<void> {
		const startTime = Date.now();

		this.metrics.container = {
			startup_time: await this.measureContainerStartupTime(),
			build_time: await this.getContainerBuildTime(),
			image_size: await this.getContainerImageSize(),
			layer_count: await this.getContainerLayerCount(),
			pull_time: await this.measureContainerPullTime(),
			collection_time: Date.now() - startTime,
		};
	}

	private async measureContainerStartupTime(): Promise<number | null> {
		try {
			if (this.metrics.environment === 'github-actions') {
				return await this.parseGitHubActionsContainerTime();
			} else {
				const start = Date.now();
				execSync('docker ps', { stdio: 'pipe' });
				return Date.now() - start;
			}
		} catch (error) {
			return null;
		}
	}

	private async parseGitHubActionsContainerTime(): Promise<number | null> {
		const workflowStartTime = process.env.GITHUB_WORKFLOW_START_TIME;
		if (workflowStartTime) {
			return Date.now() - new Date(workflowStartTime).getTime();
		}
		return null;
	}

	private async getContainerBuildTime(): Promise<number | null> {
		try {
			if (existsSync('/tmp/container-build.log')) {
				const log = readFileSync('/tmp/container-build.log', 'utf8');
				const buildTimeMatch = log.match(/Total build time: (\d+)s/);
				return buildTimeMatch ? parseInt(buildTimeMatch[1]) * 1000 : null;
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getContainerImageSize(): Promise<string | null> {
		try {
			const output = execSync('docker images --format "table {{.Size}}" | tail -n +2', {
				encoding: 'utf8',
			});
			return output.trim().split('\n')[0] || null;
		} catch (error) {
			return null;
		}
	}

	private async getContainerLayerCount(): Promise<number | null> {
		try {
			const output = execSync('docker history $(docker images -q | head -1) | wc -l', {
				encoding: 'utf8',
			});
			return parseInt(output.trim()) - 1;
		} catch (error) {
			return null;
		}
	}

	private async measureContainerPullTime(): Promise<number | null> {
		return null; // Would be measured during actual pull operation
	}

	private async collectWorkflowMetrics(): Promise<void> {
		const startTime = Date.now();

		this.metrics.workflow = {
			job_execution_times: await this.getJobExecutionTimes(),
			parallel_efficiency: await this.calculateParallelEfficiency(),
			queue_time: await this.getWorkflowQueueTime(),
			total_workflow_time: await this.getTotalWorkflowTime(),
			step_breakdown: await this.getStepPerformanceBreakdown(),
			collection_time: Date.now() - startTime,
		};
	}

	private async getJobExecutionTimes(): Promise<Record<string, number | null>> {
		const jobs: Record<string, number | null> = {
			build: null,
			test: null,
			security: null,
			deployment: null,
		};

		try {
			if (process.env.GITHUB_ACTIONS) {
				return await this.parseGitHubActionsJobTimes();
			}
			return { current_job: Date.now() - this.startTime };
		} catch (error) {
			return jobs;
		}
	}

	private async parseGitHubActionsJobTimes(): Promise<Record<string, number | null>> {
		return {
			build: process.env.BUILD_JOB_TIME ? parseInt(process.env.BUILD_JOB_TIME) : null,
			test: process.env.TEST_JOB_TIME ? parseInt(process.env.TEST_JOB_TIME) : null,
			security: process.env.SECURITY_JOB_TIME
				? parseInt(process.env.SECURITY_JOB_TIME)
				: null,
		};
	}

	private async calculateParallelEfficiency(): Promise<number | null> {
		try {
			const totalTime = await this.getTotalWorkflowTime();
			const parallelTime = await this.getParallelExecutionTime();

			if (totalTime && parallelTime) {
				return (parallelTime / totalTime) * 100;
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getParallelExecutionTime(): Promise<number> {
		const jobTimes = await this.getJobExecutionTimes();
		return Object.values(jobTimes).reduce((sum: number, time) => sum + (time || 0), 0);
	}

	private async getWorkflowQueueTime(): Promise<number | null> {
		if (process.env.GITHUB_ACTIONS && process.env.WORKFLOW_QUEUE_TIME) {
			return parseInt(process.env.WORKFLOW_QUEUE_TIME);
		}
		return null;
	}

	private async getTotalWorkflowTime(): Promise<number | null> {
		if (process.env.GITHUB_ACTIONS && process.env.WORKFLOW_TOTAL_TIME) {
			return parseInt(process.env.WORKFLOW_TOTAL_TIME);
		}
		return Date.now() - this.startTime;
	}

	private async getStepPerformanceBreakdown(): Promise<Record<string, number | null>> {
		const steps: Record<string, number | null> = {
			checkout: null,
			setup: null,
			dependencies: null,
			build: null,
			test: null,
			security: null,
		};

		Object.keys(steps).forEach((step) => {
			const envVar = `STEP_${step.toUpperCase()}_TIME`;
			if (process.env[envVar]) {
				steps[step] = parseInt(process.env[envVar]);
			}
		});

		return steps;
	}

	private async collectResourceMetrics(): Promise<void> {
		const startTime = Date.now();

		this.metrics.resources = {
			cpu_usage: await this.getCPUUsage(),
			memory_usage: await this.getMemoryUsage(),
			disk_io: await this.getDiskIOMetrics(),
			network_io: await this.getNetworkIOMetrics(),
			container_resources: await this.getContainerResourceUsage(),
			collection_time: Date.now() - startTime,
		};
	}

	private async getCPUUsage(): Promise<CPUUsage | null> {
		try {
			const usage = process.cpuUsage();
			const uptime = process.uptime() * 1000000;

			return {
				user_cpu_percent: (usage.user / uptime) * 100,
				system_cpu_percent: (usage.system / uptime) * 100,
				total_cpu_percent: ((usage.user + usage.system) / uptime) * 100,
			};
		} catch (error) {
			return null;
		}
	}

	private async getMemoryUsage(): Promise<MemoryUsage | null> {
		try {
			const usage = process.memoryUsage();

			return {
				heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
				heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
				rss_mb: Math.round(usage.rss / 1024 / 1024),
				external_mb: Math.round(usage.external / 1024 / 1024),
			};
		} catch (error) {
			return null;
		}
	}

	private async getDiskIOMetrics(): Promise<DiskIOMetrics | null> {
		try {
			if (existsSync('/proc/diskstats')) {
				const stats = readFileSync('/proc/diskstats', 'utf8');
				const lines = stats.split('\n').filter((line) => line.includes('sda'));
				if (lines.length > 0) {
					const fields = lines[0].trim().split(/\s+/);
					return {
						reads_completed: parseInt(fields[3]),
						writes_completed: parseInt(fields[7]),
						read_bytes: parseInt(fields[5]) * 512,
						write_bytes: parseInt(fields[9]) * 512,
					};
				}
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getNetworkIOMetrics(): Promise<NetworkIOMetrics | null> {
		try {
			if (existsSync('/proc/net/dev')) {
				const stats = readFileSync('/proc/net/dev', 'utf8');
				const lines = stats.split('\n').slice(2);

				let totalRx = 0,
					totalTx = 0;
				lines.forEach((line) => {
					if (line.trim()) {
						const fields = line.trim().split(/\s+/);
						totalRx += parseInt(fields[1]) || 0;
						totalTx += parseInt(fields[9]) || 0;
					}
				});

				return {
					bytes_received: totalRx,
					bytes_transmitted: totalTx,
					total_bytes: totalRx + totalTx,
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getContainerResourceUsage(): Promise<ContainerResourceUsage | null> {
		try {
			if (existsSync('/.dockerenv')) {
				return {
					container_cpu: await this.getCgroupCPUStats(),
					container_memory: await this.getCgroupMemoryStats(),
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getCgroupCPUStats(): Promise<CgroupCPUStats | null> {
		try {
			const cpuacctUsage = readFileSync('/sys/fs/cgroup/cpu,cpuacct/cpuacct.usage', 'utf8');
			return {
				total_usage_nanoseconds: parseInt(cpuacctUsage.trim()),
			};
		} catch (error) {
			return null;
		}
	}

	private async getCgroupMemoryStats(): Promise<CgroupMemoryStats | null> {
		try {
			const memoryUsage = readFileSync(
				'/sys/fs/cgroup/memory/memory.usage_in_bytes',
				'utf8',
			);
			const memoryLimit = readFileSync(
				'/sys/fs/cgroup/memory/memory.limit_in_bytes',
				'utf8',
			);

			return {
				usage_bytes: parseInt(memoryUsage.trim()),
				limit_bytes: parseInt(memoryLimit.trim()),
				usage_percent: (parseInt(memoryUsage.trim()) / parseInt(memoryLimit.trim())) * 100,
			};
		} catch (error) {
			return null;
		}
	}

	private async collectCacheMetrics(): Promise<void> {
		const startTime = Date.now();

		this.metrics.cache = {
			dependency_cache: await this.getDependencyCacheMetrics(),
			docker_layer_cache: await this.getDockerLayerCacheMetrics(),
			build_cache: await this.getBuildCacheMetrics(),
			overall_cache_efficiency: await this.calculateOverallCacheEfficiency(),
			collection_time: Date.now() - startTime,
		};
	}

	private async getDependencyCacheMetrics(): Promise<DependencyCacheMetrics | null> {
		try {
			return {
				yarn_cache: await this.getYarnCacheStats(),
				npm_cache: await this.getNpmCacheStats(),
				node_modules_cache: await this.getNodeModulesCacheStats(),
			};
		} catch (error) {
			return null;
		}
	}

	private async getYarnCacheStats(): Promise<YarnCacheStats | null> {
		try {
			if (existsSync('.yarn/cache')) {
				const files = execSync('find .yarn/cache -type f | wc -l', {
					encoding: 'utf8',
				}).trim();
				return {
					cache_size: await this.getDirectorySize('.yarn/cache'),
					file_count: parseInt(files),
					hit_rate: await this.calculateYarnCacheHitRate(),
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getNpmCacheStats(): Promise<NpmCacheStats | null> {
		try {
			const output = execSync('npm cache ls 2>/dev/null | wc -l', { encoding: 'utf8' });
			return {
				cache_entries: parseInt(output.trim()),
			};
		} catch (error) {
			return null;
		}
	}

	private async getNodeModulesCacheStats(): Promise<NodeModulesCacheStats | null> {
		try {
			if (existsSync('node_modules')) {
				return {
					size: await this.getDirectorySize('node_modules'),
					install_time: process.env.NODE_MODULES_INSTALL_TIME
						? parseInt(process.env.NODE_MODULES_INSTALL_TIME)
						: null,
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async calculateYarnCacheHitRate(): Promise<number | null> {
		return process.env.YARN_CACHE_HIT_RATE
			? parseFloat(process.env.YARN_CACHE_HIT_RATE)
			: null;
	}

	private async getDockerLayerCacheMetrics(): Promise<DockerLayerCacheMetrics | null> {
		try {
			return {
				cached_layers: process.env.DOCKER_CACHED_LAYERS
					? parseInt(process.env.DOCKER_CACHED_LAYERS)
					: null,
				cache_size: process.env.DOCKER_CACHE_SIZE || null,
				build_time_saved: process.env.DOCKER_CACHE_TIME_SAVED
					? parseInt(process.env.DOCKER_CACHE_TIME_SAVED)
					: null,
			};
		} catch (error) {
			return null;
		}
	}

	private async getBuildCacheMetrics(): Promise<BuildCacheMetrics | null> {
		try {
			return {
				typescript_cache: await this.getTypeScriptCacheStats(),
				hardhat_cache: await this.getHardhatCacheStats(),
				eslint_cache: await this.getESLintCacheStats(),
			};
		} catch (error) {
			return null;
		}
	}

	private async getTypeScriptCacheStats(): Promise<TypeScriptCacheStats | null> {
		try {
			if (existsSync('.tsbuildinfo')) {
				const stats = execSync('stat -c "%s %Y" .tsbuildinfo', { encoding: 'utf8' })
					.trim()
					.split(' ');
				return {
					cache_file_size: parseInt(stats[0]),
					last_modified: new Date(parseInt(stats[1]) * 1000).toISOString(),
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getHardhatCacheStats(): Promise<HardhatCacheStats | null> {
		try {
			if (existsSync('cache')) {
				const fileCount = execSync('find cache -type f | wc -l', {
					encoding: 'utf8',
				}).trim();
				return {
					cache_size: await this.getDirectorySize('cache'),
					file_count: parseInt(fileCount),
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async getESLintCacheStats(): Promise<ESLintCacheStats | null> {
		try {
			if (existsSync('.eslintcache')) {
				const stats = execSync('stat -c "%s %Y" .eslintcache', { encoding: 'utf8' })
					.trim()
					.split(' ');
				return {
					cache_file_size: parseInt(stats[0]),
					last_modified: new Date(parseInt(stats[1]) * 1000).toISOString(),
				};
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async calculateOverallCacheEfficiency(): Promise<number | null> {
		try {
			const totalBuildTime = this.metrics.workflow?.total_workflow_time || 0;
			const cacheTimeSaved =
				parseInt(process.env.DOCKER_CACHE_TIME_SAVED || '0') +
				parseInt(process.env.DEPENDENCY_CACHE_TIME_SAVED || '0') +
				parseInt(process.env.BUILD_CACHE_TIME_SAVED || '0');

			if (totalBuildTime > 0) {
				return (cacheTimeSaved / totalBuildTime) * 100;
			}
		} catch (error) {
			return null;
		}
		return null;
	}

	private async collectOptimizationMetrics(): Promise<void> {
		const startTime = Date.now();

		this.metrics.optimization = {
			bottlenecks: await this.identifyBottlenecks(),
			optimization_opportunities: await this.identifyOptimizationOpportunities(),
			performance_score: await this.calculatePerformanceScore(),
			recommendations: await this.generateRecommendations(),
			collection_time: Date.now() - startTime,
		};
	}

	private async identifyBottlenecks(): Promise<Bottleneck[]> {
		const bottlenecks: Bottleneck[] = [];

		// Analyze workflow step times
		const stepTimes = this.metrics.workflow?.step_breakdown;
		if (stepTimes) {
			const times = Object.values(stepTimes).filter((t) => t !== null) as number[];
			const maxTime = Math.max(...times);
			Object.entries(stepTimes).forEach(([step, time]) => {
				if (time && time > maxTime * 0.3) {
					bottlenecks.push({
						type: 'workflow_step',
						component: step,
						time,
						severity: time > maxTime * 0.7 ? 'high' : 'medium',
					});
				}
			});
		}

		// Analyze resource usage
		if (
			this.metrics.resources?.cpu_usage?.total_cpu_percent &&
			this.metrics.resources.cpu_usage.total_cpu_percent > 90
		) {
			bottlenecks.push({
				type: 'resource',
				component: 'cpu',
				usage: this.metrics.resources.cpu_usage.total_cpu_percent,
				severity: 'high',
			});
		}

		if (
			this.metrics.resources?.memory_usage?.heap_used_mb &&
			this.metrics.resources.memory_usage.heap_used_mb > 1000
		) {
			bottlenecks.push({
				type: 'resource',
				component: 'memory',
				usage: this.metrics.resources.memory_usage.heap_used_mb,
				severity: 'medium',
			});
		}

		return bottlenecks;
	}

	private async identifyOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
		const opportunities: OptimizationOpportunity[] = [];

		// Cache optimization opportunities
		const cacheEfficiency = this.metrics.cache?.overall_cache_efficiency;
		if (cacheEfficiency != null && cacheEfficiency < 60) {
			opportunities.push({
				type: 'cache_optimization',
				current_efficiency: cacheEfficiency,
				potential_improvement: '20-40%',
				recommendation: 'Optimize caching strategy for dependencies and build artifacts',
			});
		}

		// Parallel execution optimization
		const parallelEfficiency = this.metrics.workflow?.parallel_efficiency;
		if (parallelEfficiency != null && parallelEfficiency < 70) {
			opportunities.push({
				type: 'parallel_optimization',
				current_efficiency: parallelEfficiency,
				potential_improvement: '15-30%',
				recommendation: 'Improve parallel job distribution and resource allocation',
			});
		}

		// Container optimization
		if (
			this.metrics.container?.startup_time &&
			this.metrics.container.startup_time > 60000
		) {
			opportunities.push({
				type: 'container_optimization',
				current_startup_time: this.metrics.container.startup_time,
				potential_improvement: '30-50%',
				recommendation: 'Optimize container layers and reduce startup overhead',
			});
		}

		return opportunities;
	}

	private async calculatePerformanceScore(): Promise<number> {
		let score = 100;

		// Deduct points for performance issues
		const bottlenecks = this.metrics.optimization?.bottlenecks || [];
		bottlenecks.forEach((bottleneck) => {
			switch (bottleneck.severity) {
				case 'high':
					score -= 20;
					break;
				case 'medium':
					score -= 10;
					break;
				case 'low':
					score -= 5;
					break;
			}
		});

		// Bonus points for good cache efficiency
		const cacheEfficiency = this.metrics.cache?.overall_cache_efficiency;
		if (cacheEfficiency != null) {
			if (cacheEfficiency > 80) score += 10;
			else if (cacheEfficiency > 60) score += 5;
			else if (cacheEfficiency < 40) score -= 10;
		}

		// Bonus points for good parallel efficiency
		const parallelEfficiency = this.metrics.workflow?.parallel_efficiency;
		if (parallelEfficiency != null) {
			if (parallelEfficiency > 85) score += 10;
			else if (parallelEfficiency > 70) score += 5;
			else if (parallelEfficiency < 50) score -= 10;
		}

		return Math.max(0, Math.min(100, score));
	}

	private async generateRecommendations(): Promise<string[]> {
		const recommendations: string[] = [];

		// Based on bottlenecks
		const bottlenecks = this.metrics.optimization?.bottlenecks || [];
		bottlenecks.forEach((bottleneck) => {
			switch (bottleneck.component) {
				case 'dependencies':
					recommendations.push(
						'Consider using yarn PnP or npm ci for faster dependency installation',
					);
					break;
				case 'build':
					recommendations.push(
						'Implement incremental builds and improve TypeScript compilation caching',
					);
					break;
				case 'test':
					recommendations.push(
						'Optimize test parallelization and consider test selection strategies',
					);
					break;
				case 'security':
					recommendations.push(
						'Implement incremental security scanning for changed files only',
					);
					break;
			}
		});

		// Based on optimization opportunities
		const opportunities = this.metrics.optimization?.optimization_opportunities || [];
		opportunities.forEach((opportunity) => {
			switch (opportunity.type) {
				case 'cache_optimization':
					recommendations.push(
						'Implement multi-layer caching strategy with proper cache invalidation',
					);
					break;
				case 'parallel_optimization':
					recommendations.push(
						'Rebalance parallel job distribution and optimize resource allocation',
					);
					break;
				case 'container_optimization':
					recommendations.push('Use multi-stage builds and optimize Docker layer ordering');
					break;
			}
		});

		// Generic recommendations based on metrics
		if (
			this.metrics.workflow?.total_workflow_time &&
			this.metrics.workflow.total_workflow_time > 600000
		) {
			recommendations.push('Consider breaking workflow into smaller, more focused jobs');
		}

		return Array.from(new Set(recommendations)); // Remove duplicates
	}

	private async getDirectorySize(dirPath: string): Promise<number> {
		try {
			const output = execSync(`du -sb ${dirPath} | cut -f1`, { encoding: 'utf8' });
			return parseInt(output.trim());
		} catch (error) {
			return 0;
		}
	}

	saveMetrics(outputFile: string): void {
		writeFileSync(outputFile, JSON.stringify(this.metrics, null, 2));
		console.log(`📊 Performance metrics saved to ${outputFile}`);

		// Print summary
		console.log('\n=== PERFORMANCE SUMMARY ===');
		console.log(`Performance Score: ${this.metrics.optimization?.performance_score}/100`);
		console.log(`Container Startup: ${this.metrics.container?.startup_time}ms`);
		console.log(`Total Workflow Time: ${this.metrics.workflow?.total_workflow_time}ms`);
		console.log(`Cache Efficiency: ${this.metrics.cache?.overall_cache_efficiency}%`);
		console.log(`Parallel Efficiency: ${this.metrics.workflow?.parallel_efficiency}%`);

		if (
			this.metrics.optimization?.bottlenecks &&
			this.metrics.optimization.bottlenecks.length > 0
		) {
			console.log('\n🚨 Top Bottlenecks:');
			this.metrics.optimization.bottlenecks.slice(0, 3).forEach((bottleneck) => {
				console.log(`  - ${bottleneck.component}: ${bottleneck.severity} severity`);
			});
		}

		if (
			this.metrics.optimization?.recommendations &&
			this.metrics.optimization.recommendations.length > 0
		) {
			console.log('\n💡 Recommendations:');
			this.metrics.optimization.recommendations.slice(0, 3).forEach((rec) => {
				console.log(`  - ${rec}`);
			});
		}
	}
}

// CLI usage
if (require.main === module) {
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'performance-metrics.json';
	const verbose = process.argv.includes('--verbose');
	const category =
		process.argv.find((arg) => arg.startsWith('--category='))?.split('=')[1] || 'all';

	const monitor = new DevContainerPerformanceMonitor();

	monitor
		.collectAllMetrics()
		.then((metrics) => {
			monitor.saveMetrics(outputFile);

			if (verbose) {
				console.log('\n=== DETAILED METRICS ===');
				console.log(JSON.stringify(metrics, null, 2));
			}

			// Exit with performance-based code
			const score = metrics.optimization?.performance_score ?? 50;
			process.exit(score < 70 ? 1 : 0); // Fail if performance score < 70
		})
		.catch((error) => {
			console.error('❌ Failed to collect performance metrics:', error);
			process.exit(1);
		});
}

export default DevContainerPerformanceMonitor;
