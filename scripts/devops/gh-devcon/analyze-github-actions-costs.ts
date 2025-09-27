#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

interface GitHubActionsUsage {
	total_minutes: number;
	total_paid_minutes: number;
	included_minutes: number;
	repositories: {
		[repo: string]: {
			total_minutes: number;
			total_paid_minutes: number;
			included_minutes: number;
			workflows: {
				[workflow: string]: {
					total_count: number;
					total_minutes: number;
					total_paid_minutes: number;
					included_minutes: number;
				};
			};
		};
	};
}

interface CostAnalysis {
	timestamp: number;
	period_days: number;
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
	cost_trends: {
		daily_average: number;
		peak_usage_days: string[];
		cost_efficiency_score: number;
	};
}

class GitHubActionsCostAnalyzer {
	private readonly minuteRate = 0.008; // $0.008 per minute for paid minutes
	private readonly freeTierMinutes = 2000; // Free tier minutes per month

	async analyzeCosts(periodDays: number = 30): Promise<CostAnalysis> {
		try {
			console.log(`📊 Analyzing GitHub Actions costs for the last ${periodDays} days...`);

			// Get usage data from GitHub API
			const usage = await this.getGitHubActionsUsage(periodDays);

			// Calculate costs
			const costBreakdown = this.calculateCostBreakdown(usage);
			const workflowCosts = this.calculateWorkflowCosts(usage);
			const optimizationOpportunities = this.identifyOptimizationOpportunities(
				usage,
				workflowCosts,
			);
			const costTrends = this.analyzeCostTrends(usage, periodDays);

			const totalCost = costBreakdown.paid_minutes * this.minuteRate;
			const estimatedMonthlyCost = this.estimateMonthlyCost(totalCost, periodDays);

			return {
				timestamp: Date.now(),
				period_days: periodDays,
				total_cost: totalCost,
				estimated_monthly_cost: estimatedMonthlyCost,
				cost_breakdown: costBreakdown,
				workflow_costs: workflowCosts,
				optimization_opportunities: optimizationOpportunities,
				cost_trends: costTrends,
			};
		} catch (error) {
			console.error('Error analyzing GitHub Actions costs:', error);
			throw new Error(
				`Failed to analyze costs: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private async getGitHubActionsUsage(periodDays: number): Promise<GitHubActionsUsage> {
		try {
			// In a real implementation, this would use the GitHub API
			// For now, we'll simulate usage data based on workflow runs
			const usage: GitHubActionsUsage = {
				total_minutes: 0,
				total_paid_minutes: 0,
				included_minutes: 0,
				repositories: {},
			};

			// Get workflow run data from git history or API
			const workflowRuns = this.getWorkflowRunData(periodDays);

			// Process workflow runs to calculate usage
			for (const run of workflowRuns) {
				const repo = run.repository || 'current';
				const workflow = run.workflow_name || 'unknown';

				if (!usage.repositories[repo]) {
					usage.repositories[repo] = {
						total_minutes: 0,
						total_paid_minutes: 0,
						included_minutes: 0,
						workflows: {},
					};
				}

				const repoData = usage.repositories[repo];
				const minutes = run.duration_minutes || 0;

				repoData.total_minutes += minutes;

				if (!repoData.workflows[workflow]) {
					repoData.workflows[workflow] = {
						total_count: 0,
						total_minutes: 0,
						total_paid_minutes: 0,
						included_minutes: 0,
					};
				}

				const workflowData = repoData.workflows[workflow];
				workflowData.total_count += 1;
				workflowData.total_minutes += minutes;

				// Calculate paid vs included minutes
				const paidMinutes = Math.max(0, repoData.total_minutes - this.freeTierMinutes);
				const includedMinutes = Math.min(repoData.total_minutes, this.freeTierMinutes);

				repoData.total_paid_minutes = paidMinutes;
				repoData.included_minutes = includedMinutes;
				workflowData.total_paid_minutes = paidMinutes;
				workflowData.included_minutes = includedMinutes;
			}

			// Calculate totals
			usage.total_minutes = Object.values(usage.repositories).reduce(
				(sum, repo) => sum + repo.total_minutes,
				0,
			);
			usage.total_paid_minutes = Object.values(usage.repositories).reduce(
				(sum, repo) => sum + repo.total_paid_minutes,
				0,
			);
			usage.included_minutes = Object.values(usage.repositories).reduce(
				(sum, repo) => sum + repo.included_minutes,
				0,
			);

			return usage;
		} catch (error) {
			console.error('Error getting GitHub Actions usage:', error);
			// Return mock data for demonstration
			return this.getMockUsageData();
		}
	}

	private getWorkflowRunData(periodDays: number): any[] {
		try {
			// Try to get real workflow data from GitHub CLI or API
			const command = `gh run list --limit 100 --json databaseId,workflowName,createdAt,updatedAt,status,duration --jq '.[] | select(.status == "completed") | {id: .databaseId, workflow_name: .workflowName, created_at: .createdAt, duration_minutes: (.duration / 60)}'`;

			const output = execSync(command, { encoding: 'utf-8' });
			const runs = JSON.parse(`[${output.trim().split('\n').join(',')}]`);

			// Filter by period
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - periodDays);

			return runs.filter((run: any) => new Date(run.created_at) >= cutoffDate);
		} catch (error) {
			console.warn('Could not get real workflow data, using mock data');
			return this.getMockWorkflowRuns();
		}
	}

	private getMockUsageData(): GitHubActionsUsage {
		return {
			total_minutes: 4500,
			total_paid_minutes: 2500,
			included_minutes: 2000,
			repositories: {
				'gnus-dao': {
					total_minutes: 4500,
					total_paid_minutes: 2500,
					included_minutes: 2000,
					workflows: {
						'DevContainer CI': {
							total_count: 45,
							total_minutes: 2700,
							total_paid_minutes: 1700,
							included_minutes: 1000,
						},
						'Security Scan': {
							total_count: 30,
							total_minutes: 900,
							total_paid_minutes: 400,
							included_minutes: 500,
						},
						'Parallel Test': {
							total_count: 60,
							total_minutes: 900,
							total_paid_minutes: 400,
							included_minutes: 500,
						},
					},
				},
			},
		};
	}

	private getMockWorkflowRuns(): any[] {
		const runs = [];
		const now = new Date();

		for (let i = 0; i < 30; i++) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);

			runs.push({
				id: `run-${i}`,
				workflow_name:
					i % 3 === 0 ? 'DevContainer CI' : i % 3 === 1 ? 'Security Scan' : 'Parallel Test',
				created_at: date.toISOString(),
				duration_minutes: Math.random() * 20 + 5, // 5-25 minutes
			});
		}

		return runs;
	}

	private calculateCostBreakdown(usage: GitHubActionsUsage) {
		return {
			workflow_minutes: usage.total_minutes,
			paid_minutes: usage.total_paid_minutes,
			included_minutes: usage.included_minutes,
		};
	}

	private calculateWorkflowCosts(usage: GitHubActionsUsage) {
		const workflowCosts: { [workflow: string]: any } = {};

		for (const repo of Object.values(usage.repositories)) {
			for (const [workflowName, workflowData] of Object.entries(repo.workflows)) {
				if (!workflowCosts[workflowName]) {
					workflowCosts[workflowName] = {
						cost: 0,
						minutes: 0,
						runs: 0,
						average_cost_per_run: 0,
					};
				}

				const cost = workflowData.total_paid_minutes * this.minuteRate;
				workflowCosts[workflowName].cost += cost;
				workflowCosts[workflowName].minutes += workflowData.total_minutes;
				workflowCosts[workflowName].runs += workflowData.total_count;
			}
		}

		// Calculate averages
		for (const workflow of Object.values(workflowCosts)) {
			workflow.average_cost_per_run = workflow.runs > 0 ? workflow.cost / workflow.runs : 0;
		}

		return workflowCosts;
	}

	private identifyOptimizationOpportunities(
		usage: GitHubActionsUsage,
		workflowCosts: CostAnalysis['workflow_costs'],
	) {
		const recommendations: string[] = [];
		const priorityActions: string[] = [];
		let potentialSavings = 0;

		// Analyze workflow efficiency
		for (const [workflowName, cost] of Object.entries(workflowCosts)) {
			if (cost.average_cost_per_run > 1.0) {
				recommendations.push(
					`${workflowName}: High cost per run ($${cost.average_cost_per_run.toFixed(2)}). ` +
						'Consider optimizing build steps or reducing test execution time.',
				);
				potentialSavings += cost.cost * 0.2; // Assume 20% optimization potential
			}

			if (cost.minutes / cost.runs > 15) {
				priorityActions.push(
					`${workflowName}: Long average runtime (${(cost.minutes / cost.runs).toFixed(1)} min). ` +
						'Implement parallel processing or caching optimizations.',
				);
				potentialSavings += cost.cost * 0.3; // Assume 30% optimization potential
			}
		}

		// Analyze overall usage patterns
		if (usage.total_paid_minutes > usage.included_minutes) {
			const overusePercentage =
				((usage.total_paid_minutes - usage.included_minutes) / usage.included_minutes) *
				100;
			recommendations.push(
				`Currently using ${overusePercentage.toFixed(1)}% more minutes than free tier. ` +
					'Consider upgrading to a paid plan or optimizing workflows.',
			);
		}

		// Add general recommendations
		recommendations.push(
			'Implement workflow caching for dependencies and build artifacts',
			'Use matrix builds for parallel test execution',
			'Set up workflow scheduling to avoid peak-hour execution',
			'Implement conditional workflow execution based on file changes',
			'Use self-hosted runners for cost-intensive workflows',
		);

		return {
			potential_savings: potentialSavings,
			recommendations,
			priority_actions: priorityActions,
		};
	}

	private analyzeCostTrends(usage: GitHubActionsUsage, periodDays: number) {
		const dailyAverage = usage.total_minutes / periodDays;
		const costEfficiencyScore = Math.max(
			0,
			100 - (usage.total_paid_minutes / Math.max(usage.total_minutes, 1)) * 100,
		);

		return {
			daily_average: dailyAverage,
			peak_usage_days: [], // Would need historical data to calculate
			cost_efficiency_score: costEfficiencyScore,
		};
	}

	private estimateMonthlyCost(currentCost: number, periodDays: number): number {
		// Simple extrapolation - in reality, this would be more sophisticated
		const dailyCost = currentCost / periodDays;
		return dailyCost * 30;
	}

	saveAnalysis(analysis: CostAnalysis, outputPath: string): void {
		try {
			writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
			console.log(`✅ Cost analysis saved to: ${outputPath}`);
		} catch (error) {
			console.error('Error saving cost analysis:', error);
			throw new Error(
				`Failed to save analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}

// CLI Interface
function parseArgs() {
	const args = process.argv.slice(2);
	let period = '30days';
	let outputPath = 'cost-analysis.json';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--period':
			case '-p':
				period = args[++i];
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

	// Parse period
	const periodMatch = period.match(/^(\d+)days?$/);
	if (!periodMatch) {
		console.error('Error: Invalid period format. Use format like "30days" or "7days"');
		process.exit(1);
	}

	const periodDays = parseInt(periodMatch[1], 10);

	return { periodDays, outputPath };
}

function printUsage() {
	console.log(`
GitHub Actions Cost Analysis Tool

Usage: tsx analyze-github-actions-costs.ts [options]

Options:
  -p, --period <period>    Analysis period (default: 30days, format: "Ndays" or "Ndays")
  -o, --output <path>      Output path for cost analysis (default: cost-analysis.json)
  -h, --help              Show this help message

Examples:
  tsx analyze-github-actions-costs.ts --period 7days
  tsx analyze-github-actions-costs.ts -p 30days -o analysis.json
`);
}

// Main execution
if (require.main === module) {
	(async () => {
		try {
			const { periodDays, outputPath } = parseArgs();

			console.log(`💰 Analyzing GitHub Actions costs for the last ${periodDays} days...`);

			const analyzer = new GitHubActionsCostAnalyzer();
			const analysis = await analyzer.analyzeCosts(periodDays);
			analyzer.saveAnalysis(analysis, outputPath);

			console.log(`\n📊 Cost Analysis Results:`);
			console.log(`   Period: ${periodDays} days`);
			console.log(`   Total Cost: $${analysis.total_cost.toFixed(2)}`);
			console.log(`   Estimated Monthly: $${analysis.estimated_monthly_cost.toFixed(2)}`);
			console.log(`   Paid Minutes: ${analysis.cost_breakdown.paid_minutes}`);
			console.log(`   Included Minutes: ${analysis.cost_breakdown.included_minutes}`);
			console.log(
				`   Cost Efficiency Score: ${analysis.cost_trends.cost_efficiency_score.toFixed(1)}/100`,
			);

			console.log(`\n💡 Optimization Opportunities:`);
			console.log(
				`   Potential Savings: $${analysis.optimization_opportunities.potential_savings.toFixed(2)}`,
			);

			if (analysis.optimization_opportunities.priority_actions.length > 0) {
				console.log(`\n🚨 Priority Actions:`);
				analysis.optimization_opportunities.priority_actions.forEach((action, i) => {
					console.log(`   ${i + 1}. ${action}`);
				});
			}

			if (analysis.optimization_opportunities.recommendations.length > 0) {
				console.log(`\n💡 Recommendations:`);
				analysis.optimization_opportunities.recommendations
					.slice(0, 5)
					.forEach((rec, i) => {
						console.log(`   ${i + 1}. ${rec}`);
					});
				if (analysis.optimization_opportunities.recommendations.length > 5) {
					console.log(
						`   ... and ${analysis.optimization_opportunities.recommendations.length - 5} more`,
					);
				}
			}
		} catch (error) {
			console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
			process.exit(1);
		}
	})();
}
export { GitHubActionsCostAnalyzer, CostAnalysis };
