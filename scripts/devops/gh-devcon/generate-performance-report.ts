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
	regression_level: string;
	changes: {
		workflow_time_change: number;
		container_startup_change: number;
		cache_hit_ratio_change: number;
		performance_score_change: number;
	};
	recommendations: string[];
}

interface CostAnalysis {
	total_cost: number;
	estimated_monthly_cost: number;
	cost_breakdown: {
		workflow_minutes: number;
		paid_minutes: number;
		included_minutes: number;
	};
	workflow_costs: { [key: string]: any };
	optimization_opportunities: {
		potential_savings: number;
		recommendations: string[];
		priority_actions: string[];
	};
}

interface PerformanceReport {
	timestamp: number;
	period: string;
	summary: {
		overall_performance_score: number;
		total_cost: number;
		workflow_efficiency: number;
		cost_efficiency: number;
		critical_issues: number;
	};
	performance_analysis: {
		workflow_performance: {
			average_execution_time: number;
			queue_time_percentage: number;
			efficiency_score: number;
		};
		container_performance: {
			average_startup_time: number;
			resource_utilization: number;
			optimization_score: number;
		};
		cache_performance: {
			average_hit_ratio: number;
			cache_efficiency: number;
			recommendations: string[];
		};
	};
	cost_analysis: {
		current_spending: number;
		estimated_monthly: number;
		cost_breakdown: any;
		optimization_opportunities: any;
	};
	regression_analysis: {
		regression_detected: boolean;
		regression_level: string;
		key_changes: any;
		recommendations: string[];
	};
	recommendations: {
		immediate_actions: string[];
		short_term_improvements: string[];
		long_term_optimizations: string[];
	};
	compliance_status: {
		target_workflow_time: boolean;
		target_cost_reduction: boolean;
		target_startup_time: boolean;
		target_cache_ratio: boolean;
		target_resource_efficiency: boolean;
	};
}

class PerformanceReportGenerator {
	private readonly targets = {
		workflow_time: 8 * 60 * 1000, // 8 minutes in ms
		cost_reduction: 0.3, // 30% reduction
		startup_time: 45 * 1000, // 45 seconds in ms
		cache_hit_ratio: 0.8, // 80%
		resource_efficiency: 0.85, // 85%
	};

	generateReport(inputDir: string, format: 'markdown' | 'json' = 'markdown'): string {
		try {
			console.log('📊 Generating comprehensive performance report...');

			// Load all analysis data
			const metrics = this.loadPerformanceMetrics(inputDir);
			const regression = this.loadRegressionAnalysis(inputDir);
			const cost = this.loadCostAnalysis(inputDir);

			// Generate comprehensive report
			const report: PerformanceReport = {
				timestamp: Date.now(),
				period: 'Last analysis period',
				summary: this.generateSummary(metrics, regression, cost),
				performance_analysis: this.generatePerformanceAnalysis(metrics),
				cost_analysis: this.generateCostAnalysis(cost),
				regression_analysis: this.generateRegressionAnalysis(regression),
				recommendations: this.generateRecommendations(metrics, regression, cost),
				compliance_status: this.checkCompliance(metrics, cost),
			};

			if (format === 'json') {
				return JSON.stringify(report, null, 2);
			} else {
				return this.generateMarkdownReport(report);
			}
		} catch (error) {
			console.error('Error generating performance report:', error);
			throw new Error(
				`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private loadPerformanceMetrics(inputDir: string): PerformanceMetrics | null {
		try {
			const metricsPath = join(inputDir, 'performance-metrics.json');
			return JSON.parse(readFileSync(metricsPath, 'utf-8'));
		} catch {
			console.warn('Performance metrics not found, using defaults');
			return null;
		}
	}

	private loadRegressionAnalysis(inputDir: string): RegressionAnalysis | null {
		try {
			const regressionPath = join(inputDir, 'regression-analysis.json');
			return JSON.parse(readFileSync(regressionPath, 'utf-8'));
		} catch {
			console.warn('Regression analysis not found, using defaults');
			return null;
		}
	}

	private loadCostAnalysis(inputDir: string): CostAnalysis | null {
		try {
			const costPath = join(inputDir, 'cost-analysis.json');
			return JSON.parse(readFileSync(costPath, 'utf-8'));
		} catch {
			console.warn('Cost analysis not found, using defaults');
			return null;
		}
	}

	private generateSummary(
		metrics: PerformanceMetrics | null,
		regression: RegressionAnalysis | null,
		cost: CostAnalysis | null,
	) {
		const performanceScore = metrics?.optimization.performance_score || 0;
		const totalCost = cost?.total_cost || 0;
		const criticalIssues = metrics?.optimization.bottlenecks.length || 0;

		return {
			overall_performance_score: performanceScore,
			total_cost: totalCost,
			workflow_efficiency: this.calculateWorkflowEfficiency(metrics),
			cost_efficiency: this.calculateCostEfficiency(cost),
			critical_issues: criticalIssues,
		};
	}

	private calculateWorkflowEfficiency(metrics: PerformanceMetrics | null): number {
		if (!metrics) return 0;

		const queueTimePercentage =
			(metrics.workflow.queue_time / metrics.workflow.total_workflow_time) * 100;
		// Lower queue time percentage = higher efficiency
		return Math.max(0, 100 - queueTimePercentage);
	}

	private calculateCostEfficiency(cost: CostAnalysis | null): number {
		if (!cost) return 0;

		// Efficiency based on how much of the free tier is used vs paid
		const totalMinutes = cost.cost_breakdown.workflow_minutes;
		const paidMinutes = cost.cost_breakdown.paid_minutes;
		const includedMinutes = cost.cost_breakdown.included_minutes;

		if (totalMinutes === 0) return 100;

		// Higher efficiency if using more included minutes
		return (includedMinutes / totalMinutes) * 100;
	}

	private generatePerformanceAnalysis(metrics: PerformanceMetrics | null) {
		return {
			workflow_performance: {
				average_execution_time: metrics?.workflow.execution_time || 0,
				queue_time_percentage: metrics
					? (metrics.workflow.queue_time / metrics.workflow.total_workflow_time) * 100
					: 0,
				efficiency_score: this.calculateWorkflowEfficiency(metrics),
			},
			container_performance: {
				average_startup_time: metrics?.container.startup_time || 0,
				resource_utilization:
					(metrics?.container.memory_usage || 0) + (metrics?.container.cpu_usage || 0),
				optimization_score: metrics?.optimization.performance_score || 0,
			},
			cache_performance: {
				average_hit_ratio: metrics?.cache.hit_ratio || 0,
				cache_efficiency: (metrics?.cache.hit_ratio || 0) * 100,
				recommendations: this.generateCacheRecommendations(metrics),
			},
		};
	}

	private generateCacheRecommendations(metrics: PerformanceMetrics | null): string[] {
		const recommendations: string[] = [];

		if (!metrics) return recommendations;

		if (metrics.cache.hit_ratio < 0.8) {
			recommendations.push('Implement more aggressive caching strategies');
			recommendations.push('Review cache key generation for better hit rates');
		}

		if (metrics.cache.size_mb > 1000) {
			recommendations.push('Consider cache size limits to prevent storage bloat');
		}

		return recommendations;
	}

	private generateCostAnalysis(cost: CostAnalysis | null) {
		if (!cost) {
			return {
				current_spending: 0,
				estimated_monthly: 0,
				cost_breakdown: {},
				optimization_opportunities: {
					potential_savings: 0,
					recommendations: [],
					priority_actions: [],
				},
			};
		}

		return {
			current_spending: cost.total_cost,
			estimated_monthly: cost.estimated_monthly_cost,
			cost_breakdown: cost.cost_breakdown,
			optimization_opportunities: cost.optimization_opportunities,
		};
	}

	private generateRegressionAnalysis(regression: RegressionAnalysis | null) {
		if (!regression) {
			return {
				regression_detected: false,
				regression_level: 'none',
				key_changes: {},
				recommendations: [],
			};
		}

		return {
			regression_detected: regression.regression_detected,
			regression_level: regression.regression_level,
			key_changes: regression.changes,
			recommendations: regression.recommendations,
		};
	}

	private generateRecommendations(
		metrics: PerformanceMetrics | null,
		regression: RegressionAnalysis | null,
		cost: CostAnalysis | null,
	) {
		const immediate: string[] = [];
		const shortTerm: string[] = [];
		const longTerm: string[] = [];

		// Performance-based recommendations
		if (metrics) {
			if (metrics.workflow.total_workflow_time > this.targets.workflow_time) {
				immediate.push(
					'Optimize workflow execution time - currently exceeds 8-minute target',
				);
			}

			if (metrics.container.startup_time > this.targets.startup_time) {
				immediate.push(
					'Reduce container startup time - currently exceeds 45-second target',
				);
			}

			if (metrics.cache.hit_ratio < this.targets.cache_hit_ratio) {
				shortTerm.push('Improve cache hit ratio through better caching strategies');
			}

			if (metrics.optimization.bottlenecks.length > 0) {
				immediate.push(
					`Address ${metrics.optimization.bottlenecks.length} performance bottlenecks`,
				);
			}
		}

		// Regression-based recommendations
		if (regression?.regression_detected) {
			immediate.push(`Address ${regression.regression_level} performance regression`);
			regression.recommendations.forEach((rec) => immediate.push(rec));
		}

		// Cost-based recommendations
		if (cost) {
			if (cost.optimization_opportunities.priority_actions.length > 0) {
				immediate.push(...cost.optimization_opportunities.priority_actions.slice(0, 3));
			}

			if (cost.optimization_opportunities.potential_savings > 50) {
				shortTerm.push(
					`Implement cost optimization strategies for $${cost.optimization_opportunities.potential_savings.toFixed(2)} in savings`,
				);
			}
		}

		// General recommendations
		longTerm.push('Implement comprehensive monitoring and alerting');
		longTerm.push('Set up automated performance regression testing');
		longTerm.push('Establish performance budgets and SLAs');

		return {
			immediate_actions: immediate,
			short_term_improvements: shortTerm,
			long_term_optimizations: longTerm,
		};
	}

	private checkCompliance(metrics: PerformanceMetrics | null, cost: CostAnalysis | null) {
		return {
			target_workflow_time: metrics
				? metrics.workflow.total_workflow_time <= this.targets.workflow_time
				: false,
			target_cost_reduction: cost ? cost.total_cost <= 100 : false, // Assuming baseline cost reduction target
			target_startup_time: metrics
				? metrics.container.startup_time <= this.targets.startup_time
				: false,
			target_cache_ratio: metrics
				? metrics.cache.hit_ratio >= this.targets.cache_hit_ratio
				: false,
			target_resource_efficiency: metrics
				? metrics.container.cpu_usage >= this.targets.resource_efficiency * 100
				: false,
		};
	}

	private generateMarkdownReport(report: PerformanceReport): string {
		const complianceStatus = Object.entries(report.compliance_status)
			.map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value ? '✅' : '❌'}`)
			.join('\n  - ');

		return `# 🚀 DevContainer Performance Report

**Generated:** ${new Date(report.timestamp).toISOString()}
**Period:** ${report.period}

## 📊 Executive Summary

- **Overall Performance Score:** ${report.summary.overall_performance_score}/100
- **Total Cost:** $${report.summary.total_cost.toFixed(2)}
- **Workflow Efficiency:** ${report.summary.workflow_efficiency.toFixed(1)}%
- **Cost Efficiency:** ${report.summary.cost_efficiency.toFixed(1)}%
- **Critical Issues:** ${report.summary.critical_issues}

## 🎯 Target Compliance Status

- ${complianceStatus}

## 📈 Performance Analysis

### Workflow Performance
- **Average Execution Time:** ${(report.performance_analysis.workflow_performance.average_execution_time / 1000).toFixed(1)}s
- **Queue Time Percentage:** ${report.performance_analysis.workflow_performance.queue_time_percentage.toFixed(1)}%
- **Efficiency Score:** ${report.performance_analysis.workflow_performance.efficiency_score.toFixed(1)}%

### Container Performance
- **Average Startup Time:** ${(report.performance_analysis.container_performance.average_startup_time / 1000).toFixed(1)}s
- **Resource Utilization:** ${report.performance_analysis.container_performance.resource_utilization.toFixed(1)}%
- **Optimization Score:** ${report.performance_analysis.container_performance.optimization_score}/100

### Cache Performance
- **Average Hit Ratio:** ${(report.performance_analysis.cache_performance.average_hit_ratio * 100).toFixed(1)}%
- **Cache Efficiency:** ${report.performance_analysis.cache_performance.cache_efficiency.toFixed(1)}%

${
	report.performance_analysis.cache_performance.recommendations.length > 0
		? `**Recommendations:**\n${report.performance_analysis.cache_performance.recommendations.map((r) => `- ${r}`).join('\n')}`
		: ''
}

## 💰 Cost Analysis

- **Current Spending:** $${report.cost_analysis.current_spending.toFixed(2)}
- **Estimated Monthly:** $${report.cost_analysis.estimated_monthly.toFixed(2)}
- **Paid Minutes:** ${report.cost_analysis.cost_breakdown.paid_minutes || 0}
- **Included Minutes:** ${report.cost_analysis.cost_breakdown.included_minutes || 0}

### Optimization Opportunities
- **Potential Savings:** $${report.cost_analysis.optimization_opportunities.potential_savings?.toFixed(2) || '0.00'}

${
	report.cost_analysis.optimization_opportunities.priority_actions?.length > 0
		? `**Priority Actions:**\n${report.cost_analysis.optimization_opportunities.priority_actions.map((a: string) => `- ${a}`).join('\n')}`
		: ''
}

## 🔍 Regression Analysis

- **Regression Detected:** ${report.regression_analysis.regression_detected ? 'YES' : 'NO'}
- **Regression Level:** ${report.regression_analysis.regression_level}

${
	report.regression_analysis.recommendations.length > 0
		? `**Recommendations:**\n${report.regression_analysis.recommendations.map((r) => `- ${r}`).join('\n')}`
		: ''
}

## 💡 Recommendations

### Immediate Actions
${report.recommendations.immediate_actions.map((a) => `- ${a}`).join('\n')}

### Short-term Improvements
${report.recommendations.short_term_improvements.map((i) => `- ${i}`).join('\n')}

### Long-term Optimizations
${report.recommendations.long_term_optimizations.map((o) => `- ${o}`).join('\n')}

---

*This report was generated automatically by the DevContainer Performance Monitoring System.*
*For questions or concerns, please refer to the performance monitoring documentation.*`;
	}

	saveReport(report: string, outputPath: string): void {
		try {
			writeFileSync(outputPath, report);
			console.log(`✅ Performance report saved to: ${outputPath}`);
		} catch (error) {
			console.error('Error saving performance report:', error);
			throw new Error(
				`Failed to save report: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}

// CLI Interface
function parseArgs() {
	const args = process.argv.slice(2);
	let inputDir = './artifacts';
	let outputPath = 'performance-report.md';
	let format: 'markdown' | 'json' = 'markdown';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--input':
			case '-i':
				inputDir = args[++i];
				break;
			case '--output':
			case '-o':
				outputPath = args[++i];
				break;
			case '--format':
			case '-f':
				const fmt = args[++i];
				if (fmt === 'json' || fmt === 'markdown') {
					format = fmt;
				} else {
					console.error('Format must be "json" or "markdown"');
					process.exit(1);
				}
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

	return { inputDir, outputPath, format };
}

function printUsage() {
	console.log(`
Performance Report Generator

Usage: tsx generate-performance-report.ts [options]

Options:
  -i, --input <dir>       Input directory containing analysis files (default: ./artifacts)
  -o, --output <path>     Output path for report (default: performance-report.md)
  -f, --format <format>   Report format: markdown or json (default: markdown)
  -h, --help             Show this help message

Examples:
  tsx generate-performance-report.ts --input ./artifacts --output report.md
  tsx generate-performance-report.ts -i ./data -o report.json -f json
`);
}

// Main execution
if (require.main === module) {
	try {
		const { inputDir, outputPath, format } = parseArgs();

		console.log(`📊 Generating ${format} performance report from ${inputDir}...`);

		const generator = new PerformanceReportGenerator();
		const report = generator.generateReport(inputDir, format);
		generator.saveReport(report, outputPath);

		console.log(`✅ Report generated successfully: ${outputPath}`);
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

export { PerformanceReportGenerator, PerformanceReport };
