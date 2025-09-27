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

class PerformanceDashboardCreator {
	createDashboard(dataDir: string, outputPath: string): void {
		try {
			console.log('📊 Creating performance dashboard...');

			// Load data
			const metrics = this.loadData(dataDir, 'performance-metrics.json');
			const cost = this.loadData(dataDir, 'cost-analysis.json');
			const regression = this.loadData(dataDir, 'regression-analysis.json');

			// Generate HTML dashboard
			const html = this.generateHTMLDashboard(metrics, cost, regression);

			// Save dashboard
			writeFileSync(outputPath, html);
			console.log(`✅ Performance dashboard created: ${outputPath}`);
		} catch (error) {
			console.error('Error creating performance dashboard:', error);
			throw new Error(
				`Failed to create dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private loadData(dataDir: string, filename: string): any {
		try {
			const filePath = join(dataDir, filename);
			return JSON.parse(readFileSync(filePath, 'utf-8'));
		} catch {
			console.warn(`${filename} not found, using empty data`);
			return {};
		}
	}

	private generateHTMLDashboard(metrics: any, cost: any, regression: any): string {
		const performanceScore = metrics?.optimization?.performance_score || 0;
		const totalCost = cost?.total_cost || 0;
		const regressionDetected = regression?.regression_detected || false;

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GNUS-DAO DevContainer Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
        }

        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }

        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 1.2rem;
        }

        .card-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
        }

        .metric {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }

        .metric-label {
            color: #666;
            font-size: 0.9rem;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-good { background-color: #10b981; }
        .status-warning { background-color: #f59e0b; }
        .status-critical { background-color: #ef4444; }

        .chart-container {
            height: 300px;
            margin: 20px 0;
        }

        .recommendations {
            background: #f8fafc;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }

        .recommendations h4 {
            color: #667eea;
            margin-bottom: 10px;
        }

        .recommendations ul {
            list-style: none;
            padding: 0;
        }

        .recommendations li {
            padding: 5px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .recommendations li:last-child {
            border-bottom: none;
        }

        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .performance-score {
            text-align: center;
            font-size: 4rem;
            font-weight: bold;
            color: white;
            margin: 20px 0;
        }

        .score-ring {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: conic-gradient(#10b981 0% ${performanceScore}%, #e5e7eb ${performanceScore}% 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            position: relative;
        }

        .score-ring::before {
            content: '';
            width: 120px;
            height: 120px;
            background: white;
            border-radius: 50%;
            position: absolute;
        }

        .score-text {
            position: relative;
            z-index: 1;
            font-size: 2rem;
            font-weight: bold;
            color: #333;
        }

        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GNUS-DAO DevContainer Performance Dashboard</h1>
            <p>Real-time monitoring and optimization insights</p>
            <div class="performance-score">
                <div class="score-ring">
                    <div class="score-text">${performanceScore}</div>
                </div>
                <div>Performance Score</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Workflow Performance -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #dbeafe; color: #1e40af;">⚡</div>
                    <h3 class="card-title">Workflow Performance</h3>
                </div>
                <div class="metric">${this.formatTime(metrics?.workflow?.total_workflow_time || 0)}</div>
                <div class="metric-label">Total Execution Time</div>
                <div class="chart-container">
                    <canvas id="workflowChart"></canvas>
                </div>
            </div>

            <!-- Container Performance -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #dcfce7; color: #166534;">🐳</div>
                    <h3 class="card-title">Container Performance</h3>
                </div>
                <div class="metric">${this.formatTime(metrics?.container?.startup_time || 0)}</div>
                <div class="metric-label">Startup Time</div>
                <div class="chart-container">
                    <canvas id="containerChart"></canvas>
                </div>
            </div>

            <!-- Cost Analysis -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #fef3c7; color: #92400e;">💰</div>
                    <h3 class="card-title">Cost Analysis</h3>
                </div>
                <div class="metric">$${totalCost.toFixed(2)}</div>
                <div class="metric-label">Current Period Cost</div>
                <div class="chart-container">
                    <canvas id="costChart"></canvas>
                </div>
            </div>

            <!-- Cache Performance -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #e0e7ff; color: #3730a3;">💾</div>
                    <h3 class="card-title">Cache Performance</h3>
                </div>
                <div class="metric">${((metrics?.cache?.hit_ratio || 0) * 100).toFixed(1)}%</div>
                <div class="metric-label">Cache Hit Ratio</div>
                <div class="chart-container">
                    <canvas id="cacheChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Status Overview -->
        <div class="card">
            <div class="card-header">
                <div class="card-icon" style="background: #f3f4f6; color: #374151;">📊</div>
                <h3 class="card-title">System Status</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div>
                    <span class="status-indicator ${this.getStatusClass(metrics?.workflow?.total_workflow_time, 480000)}"></span>
                    Workflow Time ${metrics?.workflow?.total_workflow_time <= 480000 ? 'Good' : 'Needs Attention'}
                </div>
                <div>
                    <span class="status-indicator ${this.getStatusClass(metrics?.container?.startup_time, 45000)}"></span>
                    Container Startup ${metrics?.container?.startup_time <= 45000 ? 'Good' : 'Needs Attention'}
                </div>
                <div>
                    <span class="status-indicator ${this.getStatusClass((metrics?.cache?.hit_ratio || 0) * 100, 80, true)}"></span>
                    Cache Performance ${(metrics?.cache?.hit_ratio || 0) * 100 >= 80 ? 'Good' : 'Needs Attention'}
                </div>
                <div>
                    <span class="status-indicator ${regressionDetected ? 'status-critical' : 'status-good'}"></span>
                    Performance Regression ${regressionDetected ? 'Detected' : 'None'}
                </div>
            </div>
        </div>

        <!-- Recommendations -->
        ${this.generateRecommendationsHTML(cost, regression)}

    </div>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} | GNUS-DAO Performance Monitoring System</p>
    </div>

    <script>
        // Workflow Chart
        const workflowCtx = document.getElementById('workflowChart').getContext('2d');
        new Chart(workflowCtx, {
            type: 'doughnut',
            data: {
                labels: ['Execution Time', 'Queue Time'],
                datasets: [{
                    data: [${metrics?.workflow?.execution_time || 0}, ${metrics?.workflow?.queue_time || 0}],
                    backgroundColor: ['#667eea', '#cbd5e0'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Container Chart
        const containerCtx = document.getElementById('containerChart').getContext('2d');
        new Chart(containerCtx, {
            type: 'bar',
            data: {
                labels: ['CPU Usage', 'Memory Usage'],
                datasets: [{
                    label: 'Resource Usage (%)',
                    data: [${metrics?.container?.cpu_usage || 0}, ${metrics?.container?.memory_usage || 0}],
                    backgroundColor: ['#10b981', '#f59e0b'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });

        // Cost Chart
        const costCtx = document.getElementById('costChart').getContext('2d');
        new Chart(costCtx, {
            type: 'pie',
            data: {
                labels: ['Paid Minutes', 'Included Minutes'],
                datasets: [{
                    data: [${cost?.cost_breakdown?.paid_minutes || 0}, ${cost?.cost_breakdown?.included_minutes || 0}],
                    backgroundColor: ['#ef4444', '#10b981'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Cache Chart
        const cacheCtx = document.getElementById('cacheChart').getContext('2d');
        new Chart(cacheCtx, {
            type: 'line',
            data: {
                labels: ['Current'],
                datasets: [{
                    label: 'Cache Hit Ratio (%)',
                    data: [${(metrics?.cache?.hit_ratio || 0) * 100}],
                    borderColor: '#667eea',
                    backgroundColor: '#667eea20',
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    </script>
</body>
</html>`;
	}

	private formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${remainingSeconds}s`;
	}

	private getStatusClass(
		value: number,
		threshold: number,
		higherIsBetter: boolean = false,
	): string {
		if (higherIsBetter) {
			if (value >= threshold) return 'status-good';
			if (value >= threshold * 0.8) return 'status-warning';
			return 'status-critical';
		} else {
			if (value <= threshold) return 'status-good';
			if (value <= threshold * 1.5) return 'status-warning';
			return 'status-critical';
		}
	}

	private generateRecommendationsHTML(cost: any, regression: any): string {
		const recommendations = [
			...(cost?.optimization_opportunities?.priority_actions || []).slice(0, 3),
			...(regression?.recommendations || []).slice(0, 2),
		];

		if (recommendations.length === 0) {
			return '';
		}

		const recommendationsHTML = recommendations.map((rec) => `<li>${rec}</li>`).join('');

		return `
        <div class="card">
            <div class="card-header">
                <div class="card-icon" style="background: #dbeafe; color: #1e40af;">💡</div>
                <h3 class="card-title">Key Recommendations</h3>
            </div>
            <div class="recommendations">
                <ul>
                    ${recommendationsHTML}
                </ul>
            </div>
        </div>
    `;
	}
}

// CLI Interface
function parseArgs() {
	const args = process.argv.slice(2);
	let dataDir = './artifacts';
	let outputPath = 'performance-dashboard.html';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--data':
			case '-d':
				dataDir = args[++i];
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

	return { dataDir, outputPath };
}

function printUsage() {
	console.log(`
Performance Dashboard Creator

Usage: tsx create-performance-dashboard.ts [options]

Options:
  -d, --data <dir>       Directory containing performance data files (default: ./artifacts)
  -o, --output <path>    Output path for HTML dashboard (default: performance-dashboard.html)
  -h, --help            Show this help message

Examples:
  tsx create-performance-dashboard.ts --data ./artifacts --output dashboard.html
  tsx create-performance-dashboard.ts -d ./data -o dashboard.html
`);
}

// Main execution
if (require.main === module) {
	try {
		const { dataDir, outputPath } = parseArgs();

		console.log(`📊 Creating performance dashboard from ${dataDir}...`);

		const creator = new PerformanceDashboardCreator();
		creator.createDashboard(dataDir, outputPath);

		console.log(`✅ Dashboard created successfully: ${outputPath}`);
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
		process.exit(1);
	}
}

export { PerformanceDashboardCreator };
