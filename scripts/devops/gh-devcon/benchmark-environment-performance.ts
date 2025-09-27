// scripts/devops/gh-devcon/benchmark-environment-performance.ts
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

interface PerformanceMetrics {
	timestamp: string;
	system_info: {
		platform: string;
		arch: string;
		cpus: number;
		total_memory: number;
		free_memory: number;
		load_average: number[];
		uptime: number;
	};
	benchmarks: {
		cpu_performance: number;
		memory_performance: number;
		disk_performance: {
			read_speed: number;
			write_speed: number;
		};
		network_performance: {
			latency_ms: number;
			download_speed_mbps: number;
		};
		nodejs_performance: {
			event_loop_latency: number;
			gc_performance: number;
		};
	};
	scores: {
		overall_score: number;
		cpu_score: number;
		memory_score: number;
		disk_score: number;
		network_score: number;
		nodejs_score: number;
	};
	thresholds: {
		min_acceptable_score: number;
		good_score: number;
		excellent_score: number;
	};
	assessment: {
		performance_level: 'poor' | 'acceptable' | 'good' | 'excellent';
		bottlenecks: string[];
		recommendations: string[];
	};
}

class EnvironmentPerformanceBenchmark {
	private readonly SAMPLE_SIZE = 5;
	private readonly TEST_DURATION_MS = 1000;
	private readonly MIN_ACCEPTABLE_SCORE = 50;
	private readonly GOOD_SCORE = 75;
	private readonly EXCELLENT_SCORE = 90;

	async runFullBenchmark(): Promise<PerformanceMetrics> {
		console.log('🏃 Running comprehensive environment performance benchmark...');

		const metrics: PerformanceMetrics = {
			timestamp: new Date().toISOString(),
			system_info: this.getSystemInfo(),
			benchmarks: {
				cpu_performance: 0,
				memory_performance: 0,
				disk_performance: { read_speed: 0, write_speed: 0 },
				network_performance: { latency_ms: 0, download_speed_mbps: 0 },
				nodejs_performance: { event_loop_latency: 0, gc_performance: 0 },
			},
			scores: {
				overall_score: 0,
				cpu_score: 0,
				memory_score: 0,
				disk_score: 0,
				network_score: 0,
				nodejs_score: 0,
			},
			thresholds: {
				min_acceptable_score: this.MIN_ACCEPTABLE_SCORE,
				good_score: this.GOOD_SCORE,
				excellent_score: this.EXCELLENT_SCORE,
			},
			assessment: {
				performance_level: 'poor',
				bottlenecks: [],
				recommendations: [],
			},
		};

		try {
			// Run individual benchmarks
			console.log('🔢 Running CPU benchmark...');
			metrics.benchmarks.cpu_performance = await this.benchmarkCPU();

			console.log('💾 Running memory benchmark...');
			metrics.benchmarks.memory_performance = await this.benchmarkMemory();

			console.log('💿 Running disk benchmark...');
			metrics.benchmarks.disk_performance = await this.benchmarkDisk();

			console.log('🌐 Running network benchmark...');
			metrics.benchmarks.network_performance = await this.benchmarkNetwork();

			console.log('⚡ Running Node.js benchmark...');
			metrics.benchmarks.nodejs_performance = await this.benchmarkNodeJS();

			// Calculate scores
			this.calculateScores(metrics);

			// Assess performance
			this.assessPerformance(metrics);

			console.log(
				`✅ Benchmark complete - Overall score: ${metrics.scores.overall_score.toFixed(1)}`,
			);
		} catch (error) {
			console.error('❌ Benchmark failed:', error);
			metrics.assessment.bottlenecks.push(`Benchmark failed: ${(error as Error).message}`);
		}

		return metrics;
	}

	private getSystemInfo() {
		return {
			platform: os.platform(),
			arch: os.arch(),
			cpus: os.cpus().length,
			total_memory: os.totalmem(),
			free_memory: os.freemem(),
			load_average: os.loadavg(),
			uptime: os.uptime(),
		};
	}

	private async benchmarkCPU(): Promise<number> {
		const results: number[] = [];

		for (let i = 0; i < this.SAMPLE_SIZE; i++) {
			const startTime = process.hrtime.bigint();
			let iterations = 0;

			// CPU-intensive calculation
			const endTime = startTime + BigInt(this.TEST_DURATION_MS * 1000000); // Convert to nanoseconds
			while (process.hrtime.bigint() < endTime) {
				// Perform some CPU work
				let result = 0;
				for (let j = 0; j < 1000; j++) {
					result += Math.sin(j) * Math.cos(j);
				}
				iterations++;
			}

			results.push(iterations);
		}

		// Return average iterations per millisecond
		const avgIterations = results.reduce((a, b) => a + b, 0) / results.length;
		return avgIterations / this.TEST_DURATION_MS;
	}

	private async benchmarkMemory(): Promise<number> {
		const results: number[] = [];

		for (let i = 0; i < this.SAMPLE_SIZE; i++) {
			const startTime = process.hrtime.bigint();
			let operations = 0;

			// Memory-intensive operations
			const endTime = startTime + BigInt(this.TEST_DURATION_MS * 1000000);
			while (process.hrtime.bigint() < endTime) {
				// Allocate and manipulate memory
				const array = new Array(10000).fill(0).map((_, idx) => idx * Math.random());
				array.sort((a, b) => a - b);
				array.reverse();
				operations++;
			}

			results.push(operations);
		}

		// Return average operations per millisecond
		const avgOperations = results.reduce((a, b) => a + b, 0) / results.length;
		return avgOperations / this.TEST_DURATION_MS;
	}

	private async benchmarkDisk(): Promise<{ read_speed: number; write_speed: number }> {
		const testFile = 'benchmark-test-file.tmp';
		const testData = crypto.randomBytes(1024 * 1024); // 1MB of random data

		try {
			// Write benchmark
			const writeStart = process.hrtime.bigint();
			for (let i = 0; i < 10; i++) {
				fs.writeFileSync(testFile, testData);
			}
			const writeEnd = process.hrtime.bigint();
			const writeTimeMs = Number(writeEnd - writeStart) / 1000000;
			const writeSpeed = (10 * 1024 * 1024) / (writeTimeMs / 1000) / (1024 * 1024); // MB/s

			// Read benchmark
			const readStart = process.hrtime.bigint();
			for (let i = 0; i < 10; i++) {
				fs.readFileSync(testFile);
			}
			const readEnd = process.hrtime.bigint();
			const readTimeMs = Number(readEnd - readStart) / 1000000;
			const readSpeed = (10 * 1024 * 1024) / (readTimeMs / 1000) / (1024 * 1024); // MB/s

			return {
				read_speed: readSpeed,
				write_speed: writeSpeed,
			};
		} finally {
			// Cleanup
			if (fs.existsSync(testFile)) {
				fs.unlinkSync(testFile);
			}
		}
	}

	private async benchmarkNetwork(): Promise<{
		latency_ms: number;
		download_speed_mbps: number;
	}> {
		try {
			// Test latency to Google DNS
			const latencyStart = process.hrtime.bigint();
			execSync('ping -c 3 8.8.8.8', { timeout: 5000, stdio: 'pipe' });
			const latencyEnd = process.hrtime.bigint();
			const latencyMs = Number(latencyEnd - latencyStart) / 1000000 / 3; // Average over 3 pings

			// Test download speed (simple HTTP request to a small file)
			const downloadStart = process.hrtime.bigint();
			const response = execSync(
				'curl -s -w "%{speed_download}" -o /dev/null https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
				{ timeout: 10000 },
			);
			const downloadEnd = process.hrtime.bigint();

			const downloadSpeed = parseFloat(response.toString().trim());
			const downloadSpeedMbps = (downloadSpeed * 8) / (1024 * 1024); // Convert to Mbps

			return {
				latency_ms: latencyMs,
				download_speed_mbps: downloadSpeedMbps,
			};
		} catch (error) {
			console.warn('⚠️  Network benchmark failed, using fallback values:', error);
			return {
				latency_ms: 50, // Fallback latency
				download_speed_mbps: 10, // Fallback speed
			};
		}
	}

	private async benchmarkNodeJS(): Promise<{
		event_loop_latency: number;
		gc_performance: number;
	}> {
		// Event loop latency measurement
		const latencies: number[] = [];
		for (let i = 0; i < 100; i++) {
			const start = process.hrtime.bigint();
			setImmediate(() => {
				const end = process.hrtime.bigint();
				latencies.push(Number(end - start) / 1000000); // Convert to milliseconds
			});
		}

		// Wait for all measurements
		await new Promise((resolve) => setTimeout(resolve, 100));

		const avgEventLoopLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

		// GC performance (simple allocation test)
		const gcStart = process.hrtime.bigint();
		for (let i = 0; i < 100; i++) {
			// Allocate objects to trigger GC
			const objects = [];
			for (let j = 0; j < 1000; j++) {
				objects.push({ data: new Array(100).fill(Math.random()) });
			}
		}
		const gcEnd = process.hrtime.bigint();
		const gcTimeMs = Number(gcEnd - gcStart) / 1000000;

		return {
			event_loop_latency: avgEventLoopLatency,
			gc_performance: gcTimeMs,
		};
	}

	private calculateScores(metrics: PerformanceMetrics): void {
		// CPU score (higher iterations = better performance)
		const baseCpuIterations = 50; // Baseline for comparison
		metrics.scores.cpu_score = Math.min(
			100,
			(metrics.benchmarks.cpu_performance / baseCpuIterations) * 100,
		);

		// Memory score (higher operations = better performance)
		const baseMemoryOps = 30; // Baseline for comparison
		metrics.scores.memory_score = Math.min(
			100,
			(metrics.benchmarks.memory_performance / baseMemoryOps) * 100,
		);

		// Disk score (higher speeds = better performance)
		const baseDiskSpeed = 100; // MB/s baseline
		const avgDiskSpeed =
			(metrics.benchmarks.disk_performance.read_speed +
				metrics.benchmarks.disk_performance.write_speed) /
			2;
		metrics.scores.disk_score = Math.min(100, (avgDiskSpeed / baseDiskSpeed) * 100);

		// Network score (lower latency and higher speed = better performance)
		const latencyScore = Math.max(
			0,
			100 - metrics.benchmarks.network_performance.latency_ms / 2,
		); // Penalize high latency
		const speedScore = Math.min(
			100,
			(metrics.benchmarks.network_performance.download_speed_mbps / 50) * 100,
		); // 50 Mbps baseline
		metrics.scores.network_score = (latencyScore + speedScore) / 2;

		// Node.js score (lower latency and GC time = better performance)
		const eventLoopScore = Math.max(
			0,
			100 - metrics.benchmarks.nodejs_performance.event_loop_latency * 10,
		);
		const gcScore = Math.max(
			0,
			100 - metrics.benchmarks.nodejs_performance.gc_performance / 10,
		);
		metrics.scores.nodejs_score = (eventLoopScore + gcScore) / 2;

		// Overall score (weighted average)
		metrics.scores.overall_score =
			metrics.scores.cpu_score * 0.3 +
			metrics.scores.memory_score * 0.2 +
			metrics.scores.disk_score * 0.2 +
			metrics.scores.network_score * 0.15 +
			metrics.scores.nodejs_score * 0.15;
	}

	private assessPerformance(metrics: PerformanceMetrics): void {
		const { overall_score } = metrics.scores;

		// Determine performance level
		if (overall_score >= this.EXCELLENT_SCORE) {
			metrics.assessment.performance_level = 'excellent';
		} else if (overall_score >= this.GOOD_SCORE) {
			metrics.assessment.performance_level = 'good';
		} else if (overall_score >= this.MIN_ACCEPTABLE_SCORE) {
			metrics.assessment.performance_level = 'acceptable';
		} else {
			metrics.assessment.performance_level = 'poor';
		}

		// Identify bottlenecks
		const scoreThreshold = this.GOOD_SCORE;

		if (metrics.scores.cpu_score < scoreThreshold) {
			metrics.assessment.bottlenecks.push('CPU performance below optimal');
		}
		if (metrics.scores.memory_score < scoreThreshold) {
			metrics.assessment.bottlenecks.push('Memory performance below optimal');
		}
		if (metrics.scores.disk_score < scoreThreshold) {
			metrics.assessment.bottlenecks.push('Disk I/O performance below optimal');
		}
		if (metrics.scores.network_score < scoreThreshold) {
			metrics.assessment.bottlenecks.push('Network performance below optimal');
		}
		if (metrics.scores.nodejs_score < scoreThreshold) {
			metrics.assessment.bottlenecks.push('Node.js runtime performance below optimal');
		}

		// Generate recommendations
		this.generateRecommendations(metrics);
	}

	private generateRecommendations(metrics: PerformanceMetrics): void {
		const recommendations: string[] = [];

		if (metrics.scores.cpu_score < this.GOOD_SCORE) {
			recommendations.push(
				'Consider upgrading to a machine with more CPU cores or higher clock speed',
			);
		}

		if (metrics.scores.memory_score < this.GOOD_SCORE) {
			recommendations.push(
				'Consider increasing available RAM for better memory performance',
			);
		}

		if (metrics.scores.disk_score < this.GOOD_SCORE) {
			recommendations.push('Consider using SSD storage or upgrading to faster disk drives');
		}

		if (metrics.scores.network_score < this.GOOD_SCORE) {
			recommendations.push(
				'Check network connection and consider upgrading to faster internet',
			);
		}

		if (metrics.scores.nodejs_score < this.GOOD_SCORE) {
			recommendations.push(
				'Consider upgrading Node.js to a newer version for better performance',
			);
		}

		if (metrics.assessment.performance_level === 'poor') {
			recommendations.unshift(
				'Overall system performance is poor - consider hardware upgrades',
			);
		}

		metrics.assessment.recommendations = recommendations;
	}

	saveBenchmarkReport(metrics: PerformanceMetrics, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
		console.log(`💾 Benchmark report saved to ${outputFile}`);
	}

	generateMarkdownReport(metrics: PerformanceMetrics): string {
		let report = `# Environment Performance Benchmark Report\n\n`;
		report += `**Generated:** ${metrics.timestamp}\n\n`;
		report += `**Overall Score:** ${metrics.scores.overall_score.toFixed(1)}/100 (${metrics.assessment.performance_level.toUpperCase()})\n\n`;

		report += `## System Information\n\n`;
		report += `- **Platform:** ${metrics.system_info.platform} ${metrics.system_info.arch}\n`;
		report += `- **CPU Cores:** ${metrics.system_info.cpus}\n`;
		report += `- **Total Memory:** ${(metrics.system_info.total_memory / (1024 * 1024 * 1024)).toFixed(1)} GB\n`;
		report += `- **Free Memory:** ${(metrics.system_info.free_memory / (1024 * 1024 * 1024)).toFixed(1)} GB\n`;
		report += `- **Load Average:** ${metrics.system_info.load_average.map((l) => l.toFixed(2)).join(', ')}\n`;
		report += `- **Uptime:** ${(metrics.system_info.uptime / 3600).toFixed(1)} hours\n\n`;

		report += `## Performance Scores\n\n`;
		report += `| Component | Score | Status |\n`;
		report += `|-----------|-------|--------|\n`;
		report += `| CPU | ${metrics.scores.cpu_score.toFixed(1)} | ${this.getScoreStatus(metrics.scores.cpu_score)} |\n`;
		report += `| Memory | ${metrics.scores.memory_score.toFixed(1)} | ${this.getScoreStatus(metrics.scores.memory_score)} |\n`;
		report += `| Disk | ${metrics.scores.disk_score.toFixed(1)} | ${this.getScoreStatus(metrics.scores.disk_score)} |\n`;
		report += `| Network | ${metrics.scores.network_score.toFixed(1)} | ${this.getScoreStatus(metrics.scores.network_score)} |\n`;
		report += `| Node.js | ${metrics.scores.nodejs_score.toFixed(1)} | ${this.getScoreStatus(metrics.scores.nodejs_score)} |\n\n`;

		report += `## Detailed Benchmarks\n\n`;
		report += `### CPU Performance\n`;
		report += `- Iterations/ms: ${metrics.benchmarks.cpu_performance.toFixed(2)}\n\n`;

		report += `### Memory Performance\n`;
		report += `- Operations/ms: ${metrics.benchmarks.memory_performance.toFixed(2)}\n\n`;

		report += `### Disk Performance\n`;
		report += `- Read Speed: ${metrics.benchmarks.disk_performance.read_speed.toFixed(2)} MB/s\n`;
		report += `- Write Speed: ${metrics.benchmarks.disk_performance.write_speed.toFixed(2)} MB/s\n\n`;

		report += `### Network Performance\n`;
		report += `- Latency: ${metrics.benchmarks.network_performance.latency_ms.toFixed(2)} ms\n`;
		report += `- Download Speed: ${metrics.benchmarks.network_performance.download_speed_mbps.toFixed(2)} Mbps\n\n`;

		report += `### Node.js Performance\n`;
		report += `- Event Loop Latency: ${metrics.benchmarks.nodejs_performance.event_loop_latency.toFixed(2)} ms\n`;
		report += `- GC Performance: ${metrics.benchmarks.nodejs_performance.gc_performance.toFixed(2)} ms\n\n`;

		if (metrics.assessment.bottlenecks.length > 0) {
			report += `## 🚧 Performance Bottlenecks\n\n`;
			for (const bottleneck of metrics.assessment.bottlenecks) {
				report += `- ${bottleneck}\n`;
			}
			report += '\n';
		}

		if (metrics.assessment.recommendations.length > 0) {
			report += `## 🔧 Recommendations\n\n`;
			for (const recommendation of metrics.assessment.recommendations) {
				report += `- ${recommendation}\n`;
			}
		}

		return report;
	}

	private getScoreStatus(score: number): string {
		if (score >= this.EXCELLENT_SCORE) return '🟢 Excellent';
		if (score >= this.GOOD_SCORE) return '🟡 Good';
		if (score >= this.MIN_ACCEPTABLE_SCORE) return '🟠 Acceptable';
		return '🔴 Poor';
	}
}

// CLI usage
if (require.main === module) {
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'performance-benchmark-report.json';
	const reportFile = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];
	const verbose = process.argv.includes('--verbose');

	const benchmark = new EnvironmentPerformanceBenchmark();

	benchmark
		.runFullBenchmark()
		.then((metrics) => {
			// Save JSON report
			benchmark.saveBenchmarkReport(metrics, outputFile);

			// Generate Markdown report if requested
			if (reportFile) {
				const markdownReport = benchmark.generateMarkdownReport(metrics);
				fs.writeFileSync(reportFile, markdownReport);
				console.log(`📄 Markdown report saved to ${reportFile}`);
			}

			// Print summary
			console.log('\n=== PERFORMANCE BENCHMARK SUMMARY ===');
			console.log(
				`Overall Score: ${metrics.scores.overall_score.toFixed(1)}/100 (${metrics.assessment.performance_level.toUpperCase()})`,
			);
			console.log(`CPU Score: ${metrics.scores.cpu_score.toFixed(1)}`);
			console.log(`Memory Score: ${metrics.scores.memory_score.toFixed(1)}`);
			console.log(`Disk Score: ${metrics.scores.disk_score.toFixed(1)}`);
			console.log(`Network Score: ${metrics.scores.network_score.toFixed(1)}`);
			console.log(`Node.js Score: ${metrics.scores.nodejs_score.toFixed(1)}`);

			if (verbose && metrics.assessment.bottlenecks.length > 0) {
				console.log('\n🚧 Performance Bottlenecks:');
				metrics.assessment.bottlenecks.forEach((bottleneck) =>
					console.log(`  - ${bottleneck}`),
				);
			}

			if (verbose && metrics.assessment.recommendations.length > 0) {
				console.log('\n🔧 Recommendations:');
				metrics.assessment.recommendations.forEach((rec) => console.log(`  - ${rec}`));
			}

			// Exit with appropriate code (0 for good/excellent, 1 for poor)
			const exitCode = metrics.assessment.performance_level === 'poor' ? 1 : 0;
			process.exit(exitCode);
		})
		.catch((error) => {
			console.error('❌ Performance benchmark failed:', error);
			process.exit(1);
		});
}

export default EnvironmentPerformanceBenchmark;
