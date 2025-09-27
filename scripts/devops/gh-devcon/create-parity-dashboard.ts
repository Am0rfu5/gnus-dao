#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ParityResult {
	overall_parity_score: number;
	critical_issues_count: number;
	validation_passed: boolean;
	environment_fingerprint?: any;
	tool_versions?: any;
	performance_metrics?: any;
	network_access?: any;
	reproducibility?: any;
}

function generateDashboard(inputFile: string, outputFile: string): void {
	try {
		console.log(`📊 Generating parity validation dashboard...`);
		console.log(`Input: ${inputFile}`);
		console.log(`Output: ${outputFile}`);

		// Read the aggregated parity results
		const parityData: ParityResult = JSON.parse(readFileSync(inputFile, 'utf-8'));

		const overallScore = parityData.overall_parity_score || 0;
		const criticalIssues = parityData.critical_issues_count || 0;
		const validationPassed = parityData.validation_passed || false;

		// Generate HTML dashboard
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GNUS-DAO Environment Parity Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 30px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: ${validationPassed ? '#28a745' : '#dc3545'};
        }
        .metric-label {
            color: #6c757d;
            margin-top: 5px;
        }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-warn { color: #ffc107; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .summary {
            background: ${validationPassed ? '#d4edda' : '#f8d7da'};
            border: 1px solid ${validationPassed ? '#c3e6cb' : '#f5c6cb'};
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 GNUS-DAO Environment Parity Dashboard</h1>
            <p>Comprehensive environment consistency validation between local DevContainer and CI/CD execution</p>
        </div>
        <div class="content">
            <div class="summary">
                <h2>${validationPassed ? '✅' : '❌'} Validation ${validationPassed ? 'PASSED' : 'FAILED'}</h2>
                <p>Generated on: ${new Date().toISOString()}</p>
            </div>

            <h2>📋 Validation Summary</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${overallScore}%</div>
                    <div class="metric-label">Overall Parity Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${criticalIssues}</div>
                    <div class="metric-label">Critical Issues</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${validationPassed ? 'PASSED' : 'FAILED'}</div>
                    <div class="metric-label">Validation Status</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${parityData.environment_fingerprint ? '✅' : '❌'}</div>
                    <div class="metric-label">Environment Check</div>
                </div>
            </div>

            <h2>📄 Detailed Reports</h2>
            <ul>
                <li><a href="environment-parity-report.md">📊 Environment Parity Report</a> - Comprehensive analysis and recommendations</li>
                <li><a href="aggregated-parity.json">🔧 Raw Validation Data</a> - JSON data for further analysis</li>
            </ul>

            <h2>🔍 Validation Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Validation Type</th>
                        <th>Status</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Environment Fingerprinting</td>
                        <td class="${parityData.environment_fingerprint ? 'status-pass' : 'status-fail'}">${parityData.environment_fingerprint ? '✅ Completed' : '❌ Failed'}</td>
                        <td>Generated comprehensive environment fingerprints</td>
                    </tr>
                    <tr>
                        <td>Tool Version Validation</td>
                        <td class="${parityData.tool_versions ? 'status-pass' : 'status-fail'}">${parityData.tool_versions ? '✅ Completed' : '❌ Failed'}</td>
                        <td>Verified development tool consistency</td>
                    </tr>
                    <tr>
                        <td>Performance Benchmarking</td>
                        <td class="${parityData.performance_metrics ? 'status-pass' : 'status-fail'}">${parityData.performance_metrics ? '✅ Completed' : '❌ Failed'}</td>
                        <td>Measured and compared performance metrics</td>
                    </tr>
                    <tr>
                        <td>Network Access Testing</td>
                        <td class="${parityData.network_access ? 'status-pass' : 'status-fail'}">${parityData.network_access ? '✅ Completed' : '❌ Failed'}</td>
                        <td>Validated network connectivity and access</td>
                    </tr>
                    <tr>
                        <td>Reproducibility Testing</td>
                        <td class="${parityData.reproducibility ? 'status-pass' : 'status-fail'}">${parityData.reproducibility ? '✅ Completed' : '❌ Failed'}</td>
                        <td>Tested cross-platform reproducibility</td>
                    </tr>
                </tbody>
            </table>

            <h2>📞 Support</h2>
            <p>For questions or issues with environment parity validation:</p>
            <ul>
                <li>📖 Check the <a href="docs/environment-parity-guide.md">Environment Parity Guide</a></li>
                <li>🐛 <a href="https://github.com/gnus-ai/gnus-dao/issues" target="_blank">Create an Issue</a> for bugs or problems</li>
                <li>💬 <a href="https://github.com/gnus-ai/gnus-dao/discussions" target="_blank">Start a Discussion</a> for questions</li>
            </ul>
        </div>
    </div>
</body>
</html>`;

		writeFileSync(outputFile, html, 'utf-8');
		console.log(`✅ Dashboard generated successfully: ${outputFile}`);
	} catch (error) {
		console.error(`❌ Failed to generate dashboard:`, error);
		process.exit(1);
	}
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
	console.error(
		'Usage: create-parity-dashboard.ts --input <input-file> --output <output-file>',
	);
	process.exit(1);
}

const inputFile = args[1];
const outputFile = args[3];

generateDashboard(inputFile, outputFile);
