#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import DevContainerPerformanceMonitor from './performance-monitor.js';

interface CollectionOptions {
	environment: 'local' | 'devcontainer' | 'github-actions';
	output: string;
	verbose: boolean;
	category: 'all' | 'container' | 'workflow' | 'resources' | 'cache' | 'optimization';
}

class PerformanceMetricsCollector {
	private options: CollectionOptions;

	constructor(options: Partial<CollectionOptions> = {}) {
		this.options = {
			environment: (process.env.GITHUB_ACTIONS
				? 'github-actions'
				: process.env.REMOTE_CONTAINERS
					? 'devcontainer'
					: 'local') as any,
			output: 'performance-metrics.json',
			verbose: false,
			category: 'all',
			...options,
		};
	}

	async collect(): Promise<void> {
		console.log(`🚀 Starting performance metrics collection...`);
		console.log(`Environment: ${this.options.environment}`);
		console.log(`Category: ${this.options.category}`);
		console.log(`Output: ${this.options.output}`);

		const startTime = Date.now();

		try {
			const monitor = new DevContainerPerformanceMonitor();

			// Override environment if specified
			if (this.options.environment !== monitor['metrics'].environment) {
				monitor['metrics'].environment = this.options.environment;
			}

			console.log(`\n📊 Collecting metrics...`);

			// Collect metrics based on category
			switch (this.options.category) {
				case 'container':
					await monitor['collectContainerMetrics']();
					break;
				case 'workflow':
					await monitor['collectWorkflowMetrics']();
					break;
				case 'resources':
					await monitor['collectResourceMetrics']();
					break;
				case 'cache':
					await monitor['collectCacheMetrics']();
					break;
				case 'optimization':
					await monitor['collectOptimizationMetrics']();
					break;
				default:
					await monitor.collectAllMetrics();
			}

			const collectionTime = Date.now() - startTime;
			console.log(`\n✅ Metrics collection completed in ${collectionTime}ms`);

			// Save metrics
			monitor.saveMetrics(this.options.output);

			if (this.options.verbose) {
				console.log(`\n📋 Collection Summary:`);
				console.log(`- Total time: ${collectionTime}ms`);
				console.log(`- Environment: ${this.options.environment}`);
				console.log(`- Category: ${this.options.category}`);
				console.log(`- Output file: ${this.options.output}`);
			}
		} catch (error) {
			console.error(`❌ Failed to collect performance metrics:`, error);
			process.exit(1);
		}
	}

	static parseArgs(): CollectionOptions {
		const args = process.argv.slice(2);
		const options: Partial<CollectionOptions> = {};

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			switch (arg) {
				case '--environment':
				case '-e':
					options.environment = args[++i] as any;
					break;
				case '--output':
				case '-o':
					options.output = args[++i];
					break;
				case '--category':
				case '-c':
					options.category = args[++i] as any;
					break;
				case '--verbose':
				case '-v':
					options.verbose = true;
					break;
				case '--help':
				case '-h':
					this.showHelp();
					process.exit(0);
			}
		}

		return options as CollectionOptions;
	}

	static showHelp(): void {
		console.log(`
🔍 GNUS-DAO DevContainer Performance Metrics Collector

Usage: collect-performance-metrics.ts [options]

Options:
  -e, --environment <env>    Environment type: local, devcontainer, github-actions (default: auto-detect)
  -o, --output <file>        Output file path (default: performance-metrics.json)
  -c, --category <cat>       Metrics category: all, container, workflow, resources, cache, optimization (default: all)
  -v, --verbose              Enable verbose output
  -h, --help                 Show this help message

Examples:
  # Collect all metrics for local environment
  npx tsx collect-performance-metrics.ts

  # Collect only container metrics with verbose output
  npx tsx collect-performance-metrics.ts --category container --verbose

  # Collect workflow metrics for GitHub Actions environment
  npx tsx collect-performance-metrics.ts --environment github-actions --category workflow --output workflow-metrics.json

  # Collect resource metrics and save to custom file
  npx tsx collect-performance-metrics.ts --category resources --output resource-metrics.json
`);
	}
}

// CLI usage
if (require.main === module) {
	const options = PerformanceMetricsCollector.parseArgs();
	const collector = new PerformanceMetricsCollector(options);
	collector.collect();
}

export default PerformanceMetricsCollector;
