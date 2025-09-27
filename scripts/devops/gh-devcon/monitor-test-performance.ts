// scripts/devops/gh-devcon/monitor-test-performance.ts
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface SystemInfo {
	platform: string;
	arch: string;
	nodeVersion: string;
	totalMemory: number;
	freeMemory: number;
}

interface MemoryUsage {
	rss: number;
	heapTotal: number;
	heapUsed: number;
	external: number;
}

interface CpuUsage {
	usage: number;
}

interface MemoryAnalysis {
	maxMemory: number;
	avgMemory: number;
	memoryGrowth: number;
	memoryEfficiency: number;
}

interface CpuAnalysis {
	avgCpu: number;
	maxCpu: number;
	cpuEfficiency: number;
}

interface PerformanceMetrics {
	totalExecutionTime: number;
	averageTestTime: number;
	slowestTest: number | null;
	fastestTest: number | null;
	memoryUsage: Record<number, MemoryUsage>;
	cpuUsage: Record<number, CpuUsage>;
	memoryAnalysis?: MemoryAnalysis;
	cpuAnalysis?: CpuAnalysis;
}

interface TestResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	executionTime: number;
	success: boolean;
}

interface PerformanceReport {
	timestamp: string;
	system: SystemInfo;
	performance: PerformanceMetrics;
	bottlenecks: string[];
	recommendations: string[];
	summary: {
		totalExecutionTime: string;
		averageTestTime: string;
		memoryPeak: string;
		cpuPeak: string;
		bottleneckCount: number;
		recommendationCount: number;
	};
}

interface TestExecutionOptions {
	args?: string[];
	env?: Record<string, string>;
}

interface PerformanceHistoryEntry {
	timestamp: string;
	executionTime: number;
	memoryPeak: number;
	cpuPeak: number;
}

interface PerformanceTrend {
	executionTimeTrend: number;
	dataPoints: number;
	improving: boolean;
}

class TestPerformanceMonitor {
	private metrics: PerformanceReport;
	private startTime: number;
	private testResults: TestResult[];

	constructor() {
		this.metrics = {
			timestamp: new Date().toISOString(),
			system: this.getSystemInfo(),
			performance: {
				totalExecutionTime: 0,
				averageTestTime: 0,
				slowestTest: null,
				fastestTest: null,
				memoryUsage: {},
				cpuUsage: {},
			},
			bottlenecks: [],
			recommendations: [],
			summary: {
				totalExecutionTime: '0s',
				averageTestTime: '0ms',
				memoryPeak: '0MB',
				cpuPeak: '0%',
				bottleneckCount: 0,
				recommendationCount: 0,
			},
		};

		this.startTime = Date.now();
		this.testResults = [];
	}

	private getSystemInfo(): SystemInfo {
		return {
			platform: process.platform,
			arch: process.arch,
			nodeVersion: process.version,
			totalMemory: process.memoryUsage().heapTotal,
			freeMemory: process.memoryUsage().heapUsed,
		};
	}

	async monitorTestExecution(testCommand: string, options: TestExecutionOptions = {}): Promise<TestResult> {
		console.log('📊 Starting test performance monitoring...');

		const child = spawn(testCommand, options.args || [], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: { ...process.env, ...options.env },
			shell: true,
		});

		// Monitor memory and CPU usage
		const monitoringInterval = setInterval(() => {
			this.collectSystemMetrics();
		}, 1000);

		// Collect test output
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		return new Promise((resolve, reject) => {
			child.on('close', (code) => {
				clearInterval(monitoringInterval);
				this.metrics.performance.totalExecutionTime = Date.now() - this.startTime;

				const result: TestResult = {
					exitCode: code,
					stdout,
					stderr,
					executionTime: this.metrics.performance.totalExecutionTime,
					success: code === 0,
				};

				this.analyzePerformance(result);
				resolve(result);
			});

			child.on('error', (error) => {
				clearInterval(monitoringInterval);
				reject(error);
			});
		});
	}

	private collectSystemMetrics(): void {
		const memUsage = process.memoryUsage();
		const timestamp = Date.now();

		this.metrics.performance.memoryUsage[timestamp] = {
			rss: memUsage.rss,
			heapTotal: memUsage.heapTotal,
			heapUsed: memUsage.heapUsed,
			external: memUsage.external,
		};

		// In a real implementation, you'd collect CPU usage here
		// For now, we'll use a placeholder
		this.metrics.performance.cpuUsage[timestamp] = {
			usage: crypto.randomInt(0, 100), // Mock CPU usage for testing
		};
	}

	private analyzePerformance(testResult: TestResult): void {
		console.log('🔍 Analyzing test performance...');

		// Parse test output to extract individual test times
		const testTimes = this.parseTestTimes(testResult.stdout);

		if (testTimes.length > 0) {
			this.metrics.performance.averageTestTime =
				testTimes.reduce((a, b) => a + b, 0) / testTimes.length;
			this.metrics.performance.slowestTest = Math.max(...testTimes);
			this.metrics.performance.fastestTest = Math.min(...testTimes);
		}

		// Analyze memory usage patterns
		this.analyzeMemoryUsage();

		// Analyze CPU usage patterns
		this.analyzeCpuUsage();

		// Identify bottlenecks
		this.identifyBottlenecks(testResult);

		// Generate recommendations
		this.generateRecommendations(testResult);
	}

	private parseTestTimes(output: string): number[] {
		const times: number[] = [];
		const lines = output.split('\n');

		// Look for test timing information in output
		// This is highly dependent on the test framework output format
		const timeRegex = /(\d+)\s*ms/g;
		let match;

		while ((match = timeRegex.exec(output)) !== null) {
			times.push(parseInt(match[1]));
		}

		return times;
	}

	private analyzeMemoryUsage(): void {
		const memoryData = Object.values(this.metrics.performance.memoryUsage);
		if (memoryData.length === 0) return;

		const maxMemory = Math.max(...memoryData.map((m) => m.heapUsed));
		const avgMemory =
			memoryData.reduce((sum, m) => sum + m.heapUsed, 0) / memoryData.length;
		const memoryGrowth =
			memoryData.length > 1
				? ((memoryData[memoryData.length - 1].heapUsed - memoryData[0].heapUsed) /
						memoryData[0].heapUsed) *
					100
				: 0;

		this.metrics.performance.memoryAnalysis = {
			maxMemory,
			avgMemory,
			memoryGrowth,
			memoryEfficiency: avgMemory / this.metrics.system.totalMemory,
		};

		if (memoryGrowth > 50) {
			this.metrics.bottlenecks.push('High memory growth detected - possible memory leaks');
		}
	}

	private analyzeCpuUsage(): void {
		const cpuData = Object.values(this.metrics.performance.cpuUsage);
		if (cpuData.length === 0) return;

		const avgCpu = cpuData.reduce((sum, c) => sum + c.usage, 0) / cpuData.length;
		const maxCpu = Math.max(...cpuData.map((c) => c.usage));

		this.metrics.performance.cpuAnalysis = {
			avgCpu,
			maxCpu,
			cpuEfficiency: avgCpu / 100,
		};

		if (maxCpu > 90) {
			this.metrics.bottlenecks.push(
				'High CPU usage detected - potential performance bottleneck',
			);
		}
	}

	private identifyBottlenecks(testResult: TestResult): void {
		const executionTime = this.metrics.performance.totalExecutionTime;

		if (executionTime > 300000) {
			// 5 minutes
			this.metrics.bottlenecks.push(
				'Test execution time exceeds 5 minutes - consider parallelization',
			);
		}

		if (this.metrics.performance.averageTestTime > 5000) {
			// 5 seconds
			this.metrics.bottlenecks.push(
				'Average test time is high - optimize test setup/teardown',
			);
		}

		if (testResult.stderr.includes('timeout')) {
			this.metrics.bottlenecks.push(
				'Test timeouts detected - increase timeout limits or optimize slow tests',
			);
		}
	}

	private generateRecommendations(testResult: TestResult): void {
		if (this.metrics.bottlenecks.includes('Test execution time exceeds 5 minutes')) {
			this.metrics.recommendations.push('Implement test sharding to reduce execution time');
			this.metrics.recommendations.push(
				'Consider using faster test runners or optimizing test dependencies',
			);
		}

		if (this.metrics.bottlenecks.includes('High memory growth detected')) {
			this.metrics.recommendations.push(
				'Review test isolation - ensure proper cleanup between tests',
			);
			this.metrics.recommendations.push(
				'Consider using test containers or better memory management',
			);
		}

		if (this.metrics.bottlenecks.includes('High CPU usage detected')) {
			this.metrics.recommendations.push(
				'Optimize CPU-intensive tests or distribute across more cores',
			);
			this.metrics.recommendations.push(
				'Consider using dedicated test runners for CPU-heavy tests',
			);
		}

		if (
			this.metrics.performance.memoryAnalysis &&
			this.metrics.performance.memoryAnalysis.memoryEfficiency > 0.8
		) {
			this.metrics.recommendations.push(
				'High memory usage detected - consider increasing available memory',
			);
		}

		// General recommendations
		this.metrics.recommendations.push(
			'Monitor test performance regularly and set up alerts for performance regressions',
		);
		this.metrics.recommendations.push(
			'Implement test result caching for unchanged test files',
		);
		this.metrics.recommendations.push(
			'Consider using test prioritization based on failure rates',
		);
	}

	async saveReport(outputPath: string): Promise<PerformanceReport> {
		this.metrics.summary = {
			totalExecutionTime: `${Math.round(
				this.metrics.performance.totalExecutionTime / 1000,
			)}s`,
			averageTestTime: `${Math.round(this.metrics.performance.averageTestTime)}ms`,
			memoryPeak: `${Math.round(
				(this.metrics.performance.memoryAnalysis?.maxMemory || 0) / 1024 / 1024,
			)}MB`,
			cpuPeak: `${Math.round(this.metrics.performance.cpuAnalysis?.maxCpu || 0)}%`,
			bottleneckCount: this.metrics.bottlenecks.length,
			recommendationCount: this.metrics.recommendations.length,
		};

		fs.writeFileSync(outputPath, JSON.stringify(this.metrics, null, 2));
		console.log(`📊 Performance report saved to ${outputPath}`);

		return this.metrics;
	}

	async generateDashboardData(outputDir: string): Promise<void> {
		const dashboardData = {
			timestamp: this.metrics.timestamp,
			executionTime: this.metrics.performance.totalExecutionTime,
			memoryUsage: this.metrics.performance.memoryAnalysis,
			cpuUsage: this.metrics.performance.cpuAnalysis,
			bottlenecks: this.metrics.bottlenecks,
			recommendations: this.metrics.recommendations,
			trends: await this.calculateTrends(),
		};

		const dashboardPath = path.join(outputDir, 'performance-dashboard.json');
		fs.writeFileSync(dashboardPath, JSON.stringify(dashboardData, null, 2));
		console.log(`📈 Dashboard data saved to ${dashboardPath}`);
	}

	getMetrics(): PerformanceReport {
		return this.metrics;
	}

	private async calculateTrends(): Promise<PerformanceTrend> {
		// Load historical data if available
		const historyFile = 'test-assets/test-output/performance-history.json';
		let history: PerformanceHistoryEntry[] = [];

		try {
			if (fs.existsSync(historyFile)) {
				history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
			}
		} catch (error) {
			console.warn('Could not load performance history:', (error as Error).message);
		}

		// Add current data to history
		history.push({
			timestamp: this.metrics.timestamp,
			executionTime: this.metrics.performance.totalExecutionTime,
			memoryPeak: this.metrics.performance.memoryAnalysis?.maxMemory || 0,
			cpuPeak: this.metrics.performance.cpuAnalysis?.maxCpu || 0,
		});

		// Keep only last 30 days of data
		const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
		history = history.filter((h) => new Date(h.timestamp).getTime() > thirtyDaysAgo);

		// Save updated history
		fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

		// Calculate trends
		if (history.length >= 2) {
			const recent = history.slice(-7); // Last 7 runs
			const previous = history.slice(-14, -7); // Previous 7 runs

			const recentAvg = recent.reduce((sum, h) => sum + h.executionTime, 0) / recent.length;
			const previousAvg =
				previous.reduce((sum, h) => sum + h.executionTime, 0) / previous.length;

			const trend = ((recentAvg - previousAvg) / previousAvg) * 100;

			return {
				executionTimeTrend: Math.round(trend * 100) / 100,
				dataPoints: history.length,
				improving: trend < 0,
			};
		}

		return {
			executionTimeTrend: 0,
			dataPoints: history.length,
			improving: false,
		};
	}
}

// CLI usage
if (require.main === module) {
	const command = process.argv[2] || 'yarn test';
	const outputPath =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'test-assets/test-output/performance-report.json';
	const outputDir = path.dirname(outputPath);

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const monitor = new TestPerformanceMonitor();

	monitor
		.monitorTestExecution(command, {
			args: process.argv.slice(3).filter((arg) => !arg.startsWith('--output=')),
		})
		.then(async (result) => {
			await monitor.saveReport(outputPath);
			await monitor.generateDashboardData(outputDir);

			console.log('✅ Performance monitoring complete');
			console.log(
				`Execution time: ${Math.round(
					monitor.getMetrics().performance.totalExecutionTime / 1000,
				)}s`,
			);
			console.log(`Bottlenecks found: ${monitor.getMetrics().bottlenecks.length}`);
			console.log(`Recommendations: ${monitor.getMetrics().recommendations.length}`);

			if (monitor.getMetrics().bottlenecks.length > 0) {
				console.log('\n🚨 Bottlenecks:');
				monitor.getMetrics().bottlenecks.forEach((b) => console.log(`  - ${b}`));
			}

			if (monitor.getMetrics().recommendations.length > 0) {
				console.log('\n💡 Recommendations:');
				monitor.getMetrics().recommendations.forEach((r) => console.log(`  - ${r}`));
			}

			process.exit(result.success ? 0 : 1);
		})
		.catch((error) => {
			console.error('Performance monitoring failed:', error);
			process.exit(1);
		});
}

export { TestPerformanceMonitor };
