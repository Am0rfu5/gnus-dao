#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
	timestamp: number;
	workflow: {
		total_workflow_time: number;
		queue_time: number;
		execution_time: number;
	};
	container: {
		startup_time: number;
		memory_usage: number;
		cpu_usage: number;
	};
	cache: {
		hit_ratio: number;
		size_mb: number;
	};
	optimization: {
		performance_score: number;
		bottlenecks: string[];
	};
}

interface RegressionAnalysis {
	regression_detected: boolean;
	regression_level: 'minor' | 'moderate' | 'severe' | 'critical';
	changes: {
		workflow_time_change: number;
		container_startup_change: number;
		cache_hit_ratio_change: number;
		performance_score_change: number;
	};
	recommendations: string[];
	details: {
		baseline_metrics: PerformanceMetrics;
		current_metrics: PerformanceMetrics;
		thresholds: {
			workflow_time_threshold: number;
			startup_time_threshold: number;
			cache_ratio_threshold: number;
			performance_score_threshold: number;
		};
	};
}

class PerformanceRegressionDetector {
	private readonly thresholds = {
		workflow_time_threshold: 0.15, // 15% increase
		startup_time_threshold: 0.2, // 20% increase
		cache_ratio_threshold: -0.1, // 10% decrease
		performance_score_threshold: -10, // 10 points decrease
	};

	private readonly severityThresholds = {
		minor: 1,
		moderate: 2,
		severe: 3,
		critical: 4,
	};

	detectRegression(baselinePath: string, currentPath: string): RegressionAnalysis {
		try {
			const baseline: PerformanceMetrics = JSON.parse(readFileSync(baselinePath, 'utf-8'));
			const current: PerformanceMetrics = JSON.parse(readFileSync(currentPath, 'utf-8'));

			const changes = this.calculateChanges(baseline, current);
			const regressionLevel = this.determineRegressionLevel(changes);
			const recommendations = this.generateRecommendations(changes, regressionLevel);

			return {
				regression_detected: regressionLevel !== 'minor',
				regression_level: regressionLevel,
				changes,
				recommendations,
				details: {
					baseline_metrics: baseline,
					current_metrics: current,
					thresholds: this.thresholds,
				},
			};
		} catch (error) {
			console.error('Error detecting performance regression:', error);
			throw new Error(
				`Failed to detect regression: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private calculateChanges(baseline: PerformanceMetrics, current: PerformanceMetrics) {
		return {
			workflow_time_change: this.calculatePercentageChange(
				baseline.workflow.total_workflow_time,
				current.workflow.total_workflow_time,
			),
			container_startup_change: this.calculatePercentageChange(
				baseline.container.startup_time,
				current.container.startup_time,
			),
			cache_hit_ratio_change: this.calculatePercentageChange(
				baseline.cache.hit_ratio,
				current.cache.hit_ratio,
			),
			performance_score_change:
				current.optimization.performance_score - baseline.optimization.performance_score,
		};
	}

	private calculatePercentageChange(oldValue: number, newValue: number): number {
		if (oldValue === 0) return newValue > 0 ? 1 : 0;
		return (newValue - oldValue) / oldValue;
	}

	private determineRegressionLevel(
		changes: RegressionAnalysis['changes'],
	): RegressionAnalysis['regression_level'] {
		let severityScore = 0;

		// Workflow time regression
		if (changes.workflow_time_change > this.thresholds.workflow_time_threshold) {
			severityScore += changes.workflow_time_change > 0.3 ? 2 : 1;
		}

		// Container startup regression
		if (changes.container_startup_change > this.thresholds.startup_time_threshold) {
			severityScore += changes.container_startup_change > 0.4 ? 2 : 1;
		}

		// Cache hit ratio regression
		if (changes.cache_hit_ratio_change < this.thresholds.cache_ratio_threshold) {
			severityScore += Math.abs(changes.cache_hit_ratio_change) > 0.2 ? 2 : 1;
		}

		// Performance score regression
		if (changes.performance_score_change < this.thresholds.performance_score_threshold) {
			severityScore += Math.abs(changes.performance_score_change) > 20 ? 2 : 1;
		}

		// Determine level based on severity score
		if (severityScore >= this.severityThresholds.critical) return 'critical';
		if (severityScore >= this.severityThresholds.severe) return 'severe';
		if (severityScore >= this.severityThresholds.moderate) return 'moderate';
		return 'minor';
	}

	private generateRecommendations(
		changes: RegressionAnalysis['changes'],
		level: RegressionAnalysis['regression_level'],
	): string[] {
		const recommendations: string[] = [];

		if (changes.workflow_time_change > this.thresholds.workflow_time_threshold) {
			recommendations.push(
				`Workflow time increased by ${(changes.workflow_time_change * 100).toFixed(1)}%. ` +
					'Consider optimizing build steps, reducing test execution time, or implementing parallel processing.',
			);
		}

		if (changes.container_startup_change > this.thresholds.startup_time_threshold) {
			recommendations.push(
				`Container startup time increased by ${(changes.container_startup_change * 100).toFixed(1)}%. ` +
					'Review container layers, optimize Docker image size, or implement container caching.',
			);
		}

		if (changes.cache_hit_ratio_change < this.thresholds.cache_ratio_threshold) {
			recommendations.push(
				`Cache hit ratio decreased by ${(Math.abs(changes.cache_hit_ratio_change) * 100).toFixed(1)}%. ` +
					'Check cache invalidation policies, optimize cache keys, or increase cache size.',
			);
		}

		if (changes.performance_score_change < this.thresholds.performance_score_threshold) {
			recommendations.push(
				`Performance score decreased by ${Math.abs(changes.performance_score_change).toFixed(1)} points. ` +
					'Review resource utilization, identify bottlenecks, and implement optimization strategies.',
			);
		}

		// Add level-specific recommendations
		switch (level) {
			case 'critical':
				recommendations.push(
					'🚨 CRITICAL: Immediate action required. Consider pausing deployments until performance is restored.',
					'Investigate root cause analysis and implement emergency optimizations.',
					'Notify development team and stakeholders about critical performance degradation.',
				);
				break;
			case 'severe':
				recommendations.push(
					'⚠️ SEVERE: High priority optimization needed within 24-48 hours.',
					'Review recent changes and roll back if performance-critical modifications are identified.',
					'Implement monitoring alerts for similar regressions in the future.',
				);
				break;
			case 'moderate':
				recommendations.push(
					'MODERATE: Address performance issues in the next sprint.',
					'Monitor performance trends and implement gradual optimizations.',
					'Consider performance budget thresholds for future development.',
				);
				break;
			case 'minor':
				recommendations.push(
					'MINOR: Monitor performance trends and optimize when convenient.',
					'Consider implementing performance monitoring in development workflow.',
				);
				break;
		}

		return recommendations;
	}

	saveAnalysis(analysis: RegressionAnalysis, outputPath: string): void {
		try {
			writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
			console.log(`✅ Regression analysis saved to: ${outputPath}`);
		} catch (error) {
			console.error('Error saving regression analysis:', error);
			throw new Error(
				`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}

// CLI Interface
function parseArgs() {
	const args = process.argv.slice(2);
	let baselinePath = '';
	let currentPath = '';
	let outputPath = 'regression-analysis.json';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--baseline':
			case '-b':
				baselinePath = args[++i];
				break;
			case '--current':
			case '-c':
				currentPath = args[++i];
				break;
			case '--output':
			case '-o':
				outputPath = args[++i];
				break;
			case '--help':
			case '-h':
				printUsage();
				process.exit(0);
			default:
				if (args[i].startsWith('-')) {
					console.error(`Unknown option: ${args[i]}`);
					printUsage();
					process.exit(1);
				}
		}
	}

	if (!baselinePath || !currentPath) {
		console.error('Error: Both baseline and current metrics files are required');
		printUsage();
		process.exit(1);
	}

	return { baselinePath, currentPath, outputPath };
}

function printUsage() {
	console.log(`
Performance Regression Detection Tool

Usage: tsx detect-performance-regression.ts [options]

Options:
  -b, --baseline <path>    Path to baseline performance metrics JSON file
  -c, --current <path>     Path to current performance metrics JSON file
  -o, --output <path>      Output path for regression analysis (default: regression-analysis.json)
  -h, --help              Show this help message

Examples:
  tsx detect-performance-regression.ts --baseline baseline.json --current current.json
  tsx detect-performance-regression.ts -b ./baseline/metrics.json -c ./current/metrics.json -o analysis.json
`);
}

// Main execution
if (require.main === module) {
	try {
		const { baselinePath, currentPath, outputPath } = parseArgs();

		console.log('🔍 Detecting performance regression...');
		console.log(`📊 Baseline: ${baselinePath}`);
		console.log(`📈 Current: ${currentPath}`);
		console.log(`💾 Output: ${outputPath}`);

		const detector = new PerformanceRegressionDetector();
		const analysis = detector.detectRegression(baselinePath, currentPath);
		detector.saveAnalysis(analysis, outputPath);

		console.log(`\n📋 Regression Analysis Results:`);
		console.log(`   Detected: ${analysis.regression_detected ? 'YES' : 'NO'}`);
		console.log(`   Level: ${analysis.regression_level.toUpperCase()}`);
		console.log(`   Changes:`);
		console.log(
			`     - Workflow time: ${(analysis.changes.workflow_time_change * 100).toFixed(1)}%`,
		);
		console.log(
			`     - Container startup: ${(analysis.changes.container_startup_change * 100).toFixed(1)}%`,
		);
		console.log(
			`     - Cache hit ratio: ${(analysis.changes.cache_hit_ratio_change * 100).toFixed(1)}%`,
		);
		console.log(
			`     - Performance score: ${analysis.changes.performance_score_change > 0 ? '+' : ''}${analysis.changes.performance_score_change.toFixed(1)}`,
		);

		if (analysis.recommendations.length > 0) {
			console.log(`\n💡 Recommendations:`);
			analysis.recommendations.forEach((rec, i) => {
				console.log(`   ${i + 1}. ${rec}`);
			});
		}

		// Exit with appropriate code
		process.exit(analysis.regression_detected ? 1 : 0);
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

export { PerformanceRegressionDetector, RegressionAnalysis };
