#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CostAnalysis {
	total_cost: number;
	estimated_monthly_cost: number;
	cost_breakdown: {
		workflow_minutes: number;
		paid_minutes: number;
		included_minutes: number;
	};
	workflow_costs: {
		[workflow: string]: {
			cost: number;
			minutes: number;
			runs: number;
			average_cost_per_run: number;
		};
	};
	optimization_opportunities: {
		potential_savings: number;
		recommendations: string[];
		priority_actions: string[];
	};
}

interface OptimizationStrategy {
	description: string;
	implementation_effort: 'low' | 'medium' | 'high';
	impact: 'low' | 'medium' | 'high';
	potential_savings_percentage: number;
	implementation_steps: string[];
	estimated_time_to_implement: string;
}

interface ApplicableStrategy extends OptimizationStrategy {
	potential_savings: number;
	workflows_affected: string[];
}

interface WorkflowOptimization {
	current_cost: number;
	optimized_cost: number;
	savings: number;
	optimizations: string[];
}

interface WorkflowOptimizationPlan {
	timestamp: number;
	total_current_cost: number;
	total_optimized_cost: number;
	potential_savings: number;
	savings_percentage: number;
	optimization_strategies: {
		[strategy: string]: {
			description: string;
			potential_savings: number;
			implementation_effort: 'low' | 'medium' | 'high';
			impact: 'low' | 'medium' | 'high';
			workflows_affected: string[];
			implementation_steps: string[];
			estimated_time_to_implement: string;
		};
	};
	workflow_specific_optimizations: {
		[workflow: string]: {
			current_cost: number;
			optimized_cost: number;
			savings: number;
			optimizations: string[];
		};
	};
	implementation_roadmap: {
		immediate_actions: string[];
		short_term: string[];
		long_term: string[];
	};
	monitoring_and_maintenance: {
		key_metrics: string[];
		alerting_thresholds: {
			[metric: string]: number;
		};
		review_frequency: string;
	};
}

class WorkflowCostOptimizer {
	private readonly strategies = {
		caching: {
			description: 'Implement comprehensive caching for dependencies and build artifacts',
			implementation_effort: 'medium' as const,
			impact: 'high' as const,
			potential_savings_percentage: 0.25, // 25% savings
			implementation_steps: [
				'Add dependency caching to package managers (yarn, npm, pip)',
				'Implement Docker layer caching for container builds',
				'Add build artifact caching for compiled outputs',
				'Configure cache keys based on file changes',
				'Set up cache size limits and cleanup policies',
			],
			estimated_time_to_implement: '2-3 days',
		},
		parallelization: {
			description: 'Parallelize test execution and build processes',
			implementation_effort: 'medium' as const,
			impact: 'high' as const,
			potential_savings_percentage: 0.3, // 30% savings
			implementation_steps: [
				'Split tests into parallel jobs using matrix strategy',
				'Implement parallel build processes where possible',
				'Optimize job dependencies to maximize concurrency',
				'Configure proper resource allocation for parallel jobs',
				'Monitor and adjust parallelism based on performance',
			],
			estimated_time_to_implement: '3-5 days',
		},
		conditional_execution: {
			description: 'Skip unnecessary workflow runs based on file changes',
			implementation_effort: 'low' as const,
			impact: 'medium' as const,
			potential_savings_percentage: 0.2, // 20% savings
			implementation_steps: [
				'Add path filters to workflow triggers',
				'Implement file change detection logic',
				'Configure conditional job execution',
				'Add manual workflow dispatch for special cases',
				'Test conditional logic with various change scenarios',
			],
			estimated_time_to_implement: '1-2 days',
		},
		self_hosted_runners: {
			description: 'Migrate cost-intensive workflows to self-hosted runners',
			implementation_effort: 'high' as const,
			impact: 'high' as const,
			potential_savings_percentage: 0.4, // 40% savings for eligible workflows
			implementation_steps: [
				'Set up self-hosted runner infrastructure',
				'Configure runner auto-scaling based on demand',
				'Migrate selected workflows to self-hosted runners',
				'Implement runner health monitoring and maintenance',
				'Configure backup GitHub-hosted runners for reliability',
			],
			estimated_time_to_implement: '1-2 weeks',
		},
		scheduling_optimization: {
			description: 'Schedule workflows to avoid peak usage hours',
			implementation_effort: 'low' as const,
			impact: 'low' as const,
			potential_savings_percentage: 0.1, // 10% savings
			implementation_steps: [
				'Analyze current workflow execution patterns',
				'Identify peak usage hours and costs',
				'Reschedule non-urgent workflows to off-peak hours',
				'Implement workflow queuing for cost optimization',
				'Monitor cost savings and adjust scheduling as needed',
			],
			estimated_time_to_implement: '1 day',
		},
		workflow_consolidation: {
			description: 'Combine related workflows to reduce overhead',
			implementation_effort: 'medium' as const,
			impact: 'medium' as const,
			potential_savings_percentage: 0.15, // 15% savings
			implementation_steps: [
				'Analyze workflow dependencies and relationships',
				'Identify workflows that can be combined',
				'Refactor workflows to share common steps',
				'Implement conditional execution within combined workflows',
				'Test combined workflow performance and reliability',
			],
			estimated_time_to_implement: '2-4 days',
		},
	};

	generateOptimizationPlan(costAnalysisPath: string): WorkflowOptimizationPlan {
		try {
			const costAnalysis: CostAnalysis = JSON.parse(
				readFileSync(costAnalysisPath, 'utf-8'),
			);

			console.log('🎯 Generating workflow cost optimization plan...');

			const optimizationStrategies = this.calculateOptimizationStrategies(costAnalysis);
			const workflowOptimizations =
				this.generateWorkflowSpecificOptimizations(costAnalysis);
			const implementationRoadmap =
				this.createImplementationRoadmap(optimizationStrategies);
			const monitoringPlan = this.createMonitoringPlan();

			const totalOptimizedCost = this.calculateTotalOptimizedCost(
				costAnalysis,
				optimizationStrategies,
			);
			const potentialSavings = costAnalysis.total_cost - totalOptimizedCost;
			const savingsPercentage = (potentialSavings / costAnalysis.total_cost) * 100;

			return {
				timestamp: Date.now(),
				total_current_cost: costAnalysis.total_cost,
				total_optimized_cost: totalOptimizedCost,
				potential_savings: potentialSavings,
				savings_percentage: savingsPercentage,
				optimization_strategies: optimizationStrategies,
				workflow_specific_optimizations: workflowOptimizations,
				implementation_roadmap: implementationRoadmap,
				monitoring_and_maintenance: monitoringPlan,
			};
		} catch (error) {
			console.error('Error generating optimization plan:', error);
			throw new Error(
				`Failed to generate optimization plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private calculateOptimizationStrategies(costAnalysis: CostAnalysis) {
		const applicableStrategies: Record<string, ApplicableStrategy> = {};

		// Analyze cost patterns to determine applicable strategies
		const totalCost = costAnalysis.total_cost;
		const highCostWorkflows = Object.entries(costAnalysis.workflow_costs)
			.filter(([, cost]) => cost.cost > totalCost * 0.1) // Workflows costing >10% of total
			.map(([name]) => name);

		// Caching strategy - always applicable but prioritize for high-cost workflows
		applicableStrategies.caching = {
			...this.strategies.caching,
			potential_savings: totalCost * this.strategies.caching.potential_savings_percentage,
			workflows_affected: highCostWorkflows,
		};

		// Parallelization - good for test-heavy workflows
		const testWorkflows = Object.keys(costAnalysis.workflow_costs).filter(
			(name) => name.toLowerCase().includes('test') || name.toLowerCase().includes('ci'),
		);
		if (testWorkflows.length > 0) {
			applicableStrategies.parallelization = {
				...this.strategies.parallelization,
				potential_savings:
					costAnalysis.workflow_costs[testWorkflows[0]]?.cost *
						this.strategies.parallelization.potential_savings_percentage || 0,
				workflows_affected: testWorkflows,
			};
		}

		// Conditional execution - always beneficial
		applicableStrategies.conditional_execution = {
			...this.strategies.conditional_execution,
			potential_savings:
				totalCost * this.strategies.conditional_execution.potential_savings_percentage,
			workflows_affected: Object.keys(costAnalysis.workflow_costs),
		};

		// Self-hosted runners - for very high cost scenarios
		if (totalCost > 100) {
			// $100+ per period
			const highCostWorkflowSavings = highCostWorkflows.reduce((sum, workflow) => {
				return (
					sum +
					(costAnalysis.workflow_costs[workflow]?.cost *
						this.strategies.self_hosted_runners.potential_savings_percentage || 0)
				);
			}, 0);

			applicableStrategies.self_hosted_runners = {
				...this.strategies.self_hosted_runners,
				potential_savings: highCostWorkflowSavings,
				workflows_affected: highCostWorkflows,
			};
		}

		// Scheduling optimization - low effort, always applicable
		applicableStrategies.scheduling_optimization = {
			...this.strategies.scheduling_optimization,
			potential_savings:
				totalCost * this.strategies.scheduling_optimization.potential_savings_percentage,
			workflows_affected: Object.keys(costAnalysis.workflow_costs).filter(
				(name) => !name.toLowerCase().includes('deploy'), // Don't schedule deployment workflows
			),
		};

		// Workflow consolidation - if multiple similar workflows
		const workflowNames = Object.keys(costAnalysis.workflow_costs);
		if (workflowNames.length > 3) {
			applicableStrategies.workflow_consolidation = {
				...this.strategies.workflow_consolidation,
				potential_savings:
					totalCost * this.strategies.workflow_consolidation.potential_savings_percentage,
				workflows_affected: workflowNames,
			};
		}

		return applicableStrategies;
	}

	private generateWorkflowSpecificOptimizations(costAnalysis: CostAnalysis) {
		const optimizations: Record<string, WorkflowOptimization> = {};

		for (const [workflowName, cost] of Object.entries(costAnalysis.workflow_costs)) {
			const workflowOptimizations: string[] = [];
			let optimizedCost = cost.cost;

			// Analyze workflow-specific optimizations
			if (cost.average_cost_per_run > 2.0) {
				workflowOptimizations.push(
					'High per-run cost detected - implement caching and parallelization',
				);
				optimizedCost *= 0.7; // Assume 30% reduction
			}

			if (cost.minutes / cost.runs > 20) {
				workflowOptimizations.push(
					'Long runtime detected - consider splitting into parallel jobs',
				);
				optimizedCost *= 0.8; // Assume 20% reduction
			}

			if (cost.runs > 50) {
				workflowOptimizations.push(
					'High frequency - implement conditional execution based on file changes',
				);
				optimizedCost *= 0.85; // Assume 15% reduction
			}

			optimizations[workflowName] = {
				current_cost: cost.cost,
				optimized_cost: optimizedCost,
				savings: cost.cost - optimizedCost,
				optimizations: workflowOptimizations,
			};
		}

		return optimizations;
	}

	private createImplementationRoadmap(
		optimizationStrategies: Record<string, ApplicableStrategy>,
	) {
		const immediateActions: string[] = [];
		const shortTerm: string[] = [];
		const longTerm: string[] = [];

		// Sort strategies by impact and effort
		const sortedStrategies = Object.entries(optimizationStrategies).sort(
			([, a]: [string, any], [, b]: [string, any]) => {
				const impactScore = { low: 1, medium: 2, high: 3 };
				const effortScore = { low: 3, medium: 2, high: 1 }; // Lower effort = higher priority
				const aImpact = a.impact as keyof typeof impactScore;
				const bImpact = b.impact as keyof typeof impactScore;
				const aEffort = a.implementation_effort as keyof typeof effortScore;
				const bEffort = b.implementation_effort as keyof typeof effortScore;
				return (
					impactScore[bImpact] * 2 +
					effortScore[bEffort] -
					(impactScore[aImpact] * 2 + effortScore[aEffort])
				);
			},
		);

		for (const [strategyName, strategy] of sortedStrategies) {
			const strategyData = strategy as any;
			const action = `${strategyName}: ${strategyData.description} (Est. savings: $${strategyData.potential_savings.toFixed(2)})`;

			if (strategyData.implementation_effort === 'low') {
				immediateActions.push(action);
			} else if (strategyData.implementation_effort === 'medium') {
				shortTerm.push(action);
			} else {
				longTerm.push(action);
			}
		}

		return {
			immediate_actions: immediateActions,
			short_term: shortTerm,
			long_term: longTerm,
		};
	}

	private createMonitoringPlan() {
		return {
			key_metrics: [
				'Workflow execution time',
				'Cache hit ratios',
				'Parallel job utilization',
				'Cost per workflow run',
				'Monthly spending trends',
				'Resource utilization efficiency',
			],
			alerting_thresholds: {
				cost_increase_percentage: 15, // Alert if costs increase by 15%
				performance_degradation: 10, // Alert if performance drops by 10%
				cache_hit_ratio_drop: 20, // Alert if cache hit ratio drops by 20%
			},
			review_frequency: 'weekly',
		};
	}

	private calculateTotalOptimizedCost(
		costAnalysis: CostAnalysis,
		strategies: Record<string, ApplicableStrategy>,
	): number {
		let totalSavings = 0;

		for (const strategy of Object.values(strategies) as any[]) {
			totalSavings += strategy.potential_savings;
		}

		return Math.max(0, costAnalysis.total_cost - totalSavings);
	}

	saveOptimizationPlan(plan: WorkflowOptimizationPlan, outputPath: string): void {
		try {
			writeFileSync(outputPath, JSON.stringify(plan, null, 2));
			console.log(`✅ Optimization plan saved to: ${outputPath}`);
		} catch (error) {
			console.error('Error saving optimization plan:', error);
			throw new Error(
				`Failed to save plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}

// CLI Interface
function parseArgs() {
	const args = process.argv.slice(2);
	let analysisPath = 'cost-analysis.json';
	let outputPath = 'cost-optimization-plan.json';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--analysis':
			case '-a':
				analysisPath = args[++i];
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

	return { analysisPath, outputPath };
}

function printUsage() {
	console.log(`
Workflow Cost Optimization Tool

Usage: tsx optimize-workflow-costs.ts [options]

Options:
  -a, --analysis <path>    Path to cost analysis JSON file (default: cost-analysis.json)
  -o, --output <path>      Output path for optimization plan (default: cost-optimization-plan.json)
  -h, --help              Show this help message

Examples:
  tsx optimize-workflow-costs.ts --analysis analysis.json
  tsx optimize-workflow-costs.ts -a cost-analysis.json -o plan.json
`);
}

// Main execution
if (require.main === module) {
	try {
		const { analysisPath, outputPath } = parseArgs();

		console.log('💰 Generating workflow cost optimization plan...');

		const optimizer = new WorkflowCostOptimizer();
		const plan = optimizer.generateOptimizationPlan(analysisPath);
		optimizer.saveOptimizationPlan(plan, outputPath);

		console.log(`\n💡 Cost Optimization Plan:`);
		console.log(`   Current Cost: $${plan.total_current_cost.toFixed(2)}`);
		console.log(`   Optimized Cost: $${plan.total_optimized_cost.toFixed(2)}`);
		console.log(
			`   Potential Savings: $${plan.potential_savings.toFixed(2)} (${plan.savings_percentage.toFixed(1)}%)`,
		);

		console.log(`\n🚀 Implementation Roadmap:`);

		if (plan.implementation_roadmap.immediate_actions.length > 0) {
			console.log(`\nImmediate Actions (High Impact, Low Effort):`);
			plan.implementation_roadmap.immediate_actions.forEach((action, i) => {
				console.log(`   ${i + 1}. ${action}`);
			});
		}

		if (plan.implementation_roadmap.short_term.length > 0) {
			console.log(`\nShort Term (Next 1-2 weeks):`);
			plan.implementation_roadmap.short_term.forEach((action, i) => {
				console.log(`   ${i + 1}. ${action}`);
			});
		}

		if (plan.implementation_roadmap.long_term.length > 0) {
			console.log(`\nLong Term (Future optimization):`);
			plan.implementation_roadmap.long_term.forEach((action, i) => {
				console.log(`   ${i + 1}. ${action}`);
			});
		}

		console.log(`\n📊 Key Metrics to Monitor:`);
		plan.monitoring_and_maintenance.key_metrics.forEach((metric, i) => {
			console.log(`   ${i + 1}. ${metric}`);
		});
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

export { WorkflowCostOptimizer, WorkflowOptimizationPlan };
