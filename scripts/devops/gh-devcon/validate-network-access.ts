// scripts/devops/gh-devcon/validate-network-access.ts
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { execSync } from 'child_process';

interface NetworkEndpoint {
	name: string;
	url: string;
	protocol: 'http' | 'https';
	expected_status: number;
	timeout_ms: number;
	category: 'blockchain' | 'npm' | 'security' | 'ci' | 'general';
	required: boolean;
}

interface NetworkTestResult {
	endpoint_name: string;
	success: boolean;
	response_time_ms: number;
	status_code?: number;
	error_message?: string;
	ip_address?: string;
	dns_resolution_time_ms?: number;
}

interface NetworkValidationReport {
	timestamp: string;
	environment: string;
	total_endpoints: number;
	successful_connections: number;
	failed_connections: number;
	total_response_time_ms: number;
	average_response_time_ms: number;
	results: NetworkTestResult[];
	summary: {
		overall_connectivity: boolean;
		critical_failures: string[];
		blockchain_connectivity: boolean;
		package_registry_access: boolean;
		security_tools_access: boolean;
		recommendations: string[];
	};
}

class NetworkAccessValidator {
	private readonly endpoints: { [key: string]: NetworkEndpoint[] } = {
		blockchain: [
			{
				name: 'Ethereum Mainnet RPC',
				url: 'https://eth-mainnet.g.alchemy.com/v2/demo',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 10000,
				category: 'blockchain',
				required: true,
			},
			{
				name: 'Polygon RPC',
				url: 'https://polygon-rpc.com/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 10000,
				category: 'blockchain',
				required: false,
			},
			{
				name: 'Arbitrum RPC',
				url: 'https://arb1.arbitrum.io/rpc',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 10000,
				category: 'blockchain',
				required: false,
			},
			{
				name: 'Base RPC',
				url: 'https://mainnet.base.org/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 10000,
				category: 'blockchain',
				required: false,
			},
		],
		npm: [
			{
				name: 'NPM Registry',
				url: 'https://registry.npmjs.org/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 5000,
				category: 'npm',
				required: true,
			},
			{
				name: 'Yarn Registry',
				url: 'https://registry.yarnpkg.com/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 5000,
				category: 'npm',
				required: true,
			},
		],
		security: [
			{
				name: 'Snyk API',
				url: 'https://api.snyk.io/',
				protocol: 'https',
				expected_status: 401, // Expected unauthorized without API key
				timeout_ms: 5000,
				category: 'security',
				required: false,
			},
			{
				name: 'GitHub Security API',
				url: 'https://api.github.com/repos/microsoft/vscode/codeql',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 5000,
				category: 'security',
				required: false,
			},
		],
		ci: [
			{
				name: 'GitHub API',
				url: 'https://api.github.com/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 5000,
				category: 'ci',
				required: true,
			},
			{
				name: 'GitHub Container Registry',
				url: 'https://ghcr.io/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 5000,
				category: 'ci',
				required: false,
			},
		],
		general: [
			{
				name: 'Google DNS',
				url: 'https://dns.google/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 3000,
				category: 'general',
				required: true,
			},
			{
				name: 'Cloudflare',
				url: 'https://www.cloudflare.com/',
				protocol: 'https',
				expected_status: 200,
				timeout_ms: 3000,
				category: 'general',
				required: true,
			},
		],
	};

	async validateNetworkAccess(
		categories: string[] = ['blockchain', 'npm', 'security', 'ci', 'general'],
		environment: string = 'container',
	): Promise<NetworkValidationReport> {
		console.log(`🌐 Validating network access in ${environment} environment...`);
		console.log(`📋 Testing categories: ${categories.join(', ')}`);

		const allEndpoints = categories.flatMap((category) => this.endpoints[category] || []);
		const results: NetworkTestResult[] = [];
		let successfulConnections = 0;
		let totalResponseTime = 0;

		for (const endpoint of allEndpoints) {
			console.log(`\n🔗 Testing: ${endpoint.name} (${endpoint.url})`);
			const result = await this.testEndpoint(endpoint);
			results.push(result);

			if (result.success) {
				successfulConnections++;
				totalResponseTime += result.response_time_ms;
				console.log(
					`✅ SUCCESS (${result.response_time_ms}ms, Status: ${result.status_code})`,
				);
			} else {
				console.log(`❌ FAILED (${result.response_time_ms}ms): ${result.error_message}`);
			}
		}

		const averageResponseTime =
			successfulConnections > 0 ? totalResponseTime / successfulConnections : 0;
		const overallConnectivity = successfulConnections === allEndpoints.length;

		const report: NetworkValidationReport = {
			timestamp: new Date().toISOString(),
			environment,
			total_endpoints: allEndpoints.length,
			successful_connections: successfulConnections,
			failed_connections: allEndpoints.length - successfulConnections,
			total_response_time_ms: totalResponseTime,
			average_response_time_ms: Math.round(averageResponseTime),
			results,
			summary: {
				overall_connectivity: overallConnectivity,
				critical_failures: results
					.filter((r) => !r.success && this.isCriticalEndpoint(r.endpoint_name))
					.map((r) => r.endpoint_name),
				blockchain_connectivity: this.checkCategoryConnectivity(results, 'blockchain'),
				package_registry_access: this.checkCategoryConnectivity(results, 'npm'),
				security_tools_access: this.checkCategoryConnectivity(results, 'security'),
				recommendations: this.generateRecommendations(results, categories),
			},
		};

		console.log(`\n📊 Network Access Validation Summary:`);
		console.log(`Total Endpoints: ${allEndpoints.length}`);
		console.log(`Successful: ${successfulConnections}`);
		console.log(`Failed: ${allEndpoints.length - successfulConnections}`);
		console.log(
			`Success Rate: ${((successfulConnections / allEndpoints.length) * 100).toFixed(1)}%`,
		);
		console.log(`Average Response Time: ${Math.round(averageResponseTime)}ms`);
		console.log(
			`Overall Connectivity: ${overallConnectivity ? '✅ GOOD' : '❌ ISSUES DETECTED'}`,
		);

		return report;
	}

	private async testEndpoint(endpoint: NetworkEndpoint): Promise<NetworkTestResult> {
		const startTime = Date.now();

		try {
			// DNS resolution test
			const dnsStartTime = Date.now();
			const ipAddress = await this.resolveDNS(endpoint.url);
			const dnsResolutionTime = Date.now() - dnsStartTime;

			// HTTP/HTTPS request test
			const response = await this.makeRequest(endpoint);
			const totalTime = Date.now() - startTime;

			const success =
				response.statusCode === endpoint.expected_status ||
				(endpoint.category === 'blockchain' && response.statusCode === 429); // Rate limiting is OK for demo RPCs

			return {
				endpoint_name: endpoint.name,
				success,
				response_time_ms: totalTime,
				status_code: response.statusCode,
				ip_address: ipAddress,
				dns_resolution_time_ms: dnsResolutionTime,
			};
		} catch (error) {
			const totalTime = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : String(error);

			return {
				endpoint_name: endpoint.name,
				success: false,
				response_time_ms: totalTime,
				error_message: errorMessage,
			};
		}
	}

	private async resolveDNS(url: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const hostname = new URL(url).hostname;
			require('dns').lookup(
				hostname,
				(err: NodeJS.ErrnoException | null, address: string) => {
					if (err) reject(err);
					else resolve(address);
				},
			);
		});
	}

	private async makeRequest(endpoint: NetworkEndpoint): Promise<{ statusCode: number }> {
		return new Promise((resolve, reject) => {
			const url = new URL(endpoint.url);
			const isBlockchainRPC = endpoint.category === 'blockchain';

			const options = {
				hostname: url.hostname,
				port: url.port || (endpoint.protocol === 'https' ? 443 : 80),
				path: url.pathname + url.search,
				method: isBlockchainRPC ? 'POST' : 'GET',
				timeout: endpoint.timeout_ms,
				headers: {
					'User-Agent': 'GNUS-DAO-Network-Validator/1.0',
					...(isBlockchainRPC && {
						'Content-Type': 'application/json',
					}),
				},
			};

			const req = (endpoint.protocol === 'https' ? https : http).request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					// For blockchain RPCs, check if we got a valid JSON-RPC response
					if (isBlockchainRPC) {
						try {
							const response = JSON.parse(data);
							// If we got a JSON-RPC response (even with error), consider it successful
							if (response.jsonrpc && typeof response.id !== 'undefined') {
								resolve({ statusCode: res.statusCode || 200 });
								return;
							}
						} catch (e) {
							// Not valid JSON-RPC, fall through to status check
						}
						// For blockchain RPCs, also accept rate limiting (429) as successful connectivity
						if (res.statusCode === 429) {
							resolve({ statusCode: 429 });
							return;
						}
					}
					resolve({ statusCode: res.statusCode || 0 });
				});
			});

			req.on('error', reject);
			req.on('timeout', () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});

			// Send JSON-RPC payload for blockchain endpoints
			if (isBlockchainRPC) {
				const payload = JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_blockNumber',
					params: [],
					id: 1,
				});
				req.write(payload);
			}

			req.end();
		});
	}

	private isCriticalEndpoint(endpointName: string): boolean {
		const criticalEndpoints = [
			'Ethereum Mainnet RPC',
			'NPM Registry',
			'Yarn Registry',
			'GitHub API',
			'Google DNS',
		];
		return criticalEndpoints.includes(endpointName);
	}

	private checkCategoryConnectivity(
		results: NetworkTestResult[],
		category: string,
	): boolean {
		const categoryEndpoints = this.endpoints[category] || [];
		const categoryResults = results.filter((r) =>
			categoryEndpoints.some((e) => e.name === r.endpoint_name),
		);

		if (categoryResults.length === 0) return true; // No endpoints to test

		const successfulResults = categoryResults.filter((r) => r.success);
		return successfulResults.length === categoryResults.length;
	}

	private generateRecommendations(
		results: NetworkTestResult[],
		categories: string[],
	): string[] {
		const recommendations = [];

		const failedResults = results.filter((r) => !r.success);

		if (failedResults.length > 0) {
			recommendations.push(
				`${failedResults.length} network endpoints failed - check firewall and proxy settings`,
			);
		}

		const criticalFailures = failedResults.filter((r) =>
			this.isCriticalEndpoint(r.endpoint_name),
		);
		if (criticalFailures.length > 0) {
			recommendations.push(
				`${criticalFailures.length} critical endpoints unreachable - immediate attention required`,
			);
		}

		const slowResponses = results.filter((r) => r.success && r.response_time_ms > 5000);
		if (slowResponses.length > 0) {
			recommendations.push(
				`${slowResponses.length} endpoints responded slowly (>5s) - consider network optimization`,
			);
		}

		if (
			categories.includes('blockchain') &&
			!this.checkCategoryConnectivity(results, 'blockchain')
		) {
			recommendations.push(
				'Blockchain RPC connectivity issues - verify RPC endpoints and API keys',
			);
		}

		if (categories.includes('npm') && !this.checkCategoryConnectivity(results, 'npm')) {
			recommendations.push(
				'Package registry access issues - check npm/yarn configuration and credentials',
			);
		}

		if (
			categories.includes('security') &&
			!this.checkCategoryConnectivity(results, 'security')
		) {
			recommendations.push(
				'Security tools access issues - verify API keys and network permissions',
			);
		}

		const dnsFailures = failedResults.filter(
			(r) => r.error_message?.includes('ENOTFOUND') || r.error_message?.includes('DNS'),
		);
		if (dnsFailures.length > 0) {
			recommendations.push('DNS resolution failures detected - check DNS configuration');
		}

		if (recommendations.length === 0) {
			recommendations.push('All network endpoints accessible with good performance');
		}

		return recommendations;
	}

	saveReport(report: NetworkValidationReport, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
		console.log(`📄 Network access validation report saved to ${outputFile}`);
	}

	generateMarkdownReport(report: NetworkValidationReport): string {
		const status = report.summary.overall_connectivity ? '✅ GOOD' : '❌ ISSUES DETECTED';

		let markdown = `# Network Access Validation Report

## 📋 Summary

- **Environment**: ${report.environment}
- **Total Endpoints**: ${report.total_endpoints}
- **Status**: ${status}
- **Successful**: ${report.successful_connections}
- **Failed**: ${report.failed_connections}
- **Success Rate**: ${((report.successful_connections / report.total_endpoints) * 100).toFixed(1)}%
- **Average Response Time**: ${report.average_response_time_ms}ms
- **Generated**: ${report.timestamp}

## 🚨 Critical Failures

${
	report.summary.critical_failures.length === 0
		? 'No critical failures detected ✅'
		: report.summary.critical_failures.map((failure) => `- ❌ ${failure}`).join('\n')
}

## 🌐 Connectivity Status

- **Blockchain RPCs**: ${report.summary.blockchain_connectivity ? '✅ Accessible' : '❌ Issues'}
- **Package Registries**: ${report.summary.package_registry_access ? '✅ Accessible' : '❌ Issues'}
- **Security Tools**: ${report.summary.security_tools_access ? '✅ Accessible' : '❌ Issues'}

## 📊 Detailed Results

${report.results
	.map(
		(result) => `
### ${result.success ? '✅' : '❌'} ${result.endpoint_name}

- **URL**: ${this.getEndpointUrl(result.endpoint_name)}
- **Status**: ${result.success ? 'SUCCESS' : 'FAILED'}
- **Response Time**: ${result.response_time_ms}ms
${result.status_code ? `- **Status Code**: ${result.status_code}` : ''}
${result.ip_address ? `- **IP Address**: ${result.ip_address}` : ''}
${result.dns_resolution_time_ms ? `- **DNS Resolution**: ${result.dns_resolution_time_ms}ms` : ''}
${result.error_message ? `- **Error**: ${result.error_message}` : ''}
`,
	)
	.join('')}

## 💡 Recommendations

${report.summary.recommendations.map((rec) => `- ${rec}`).join('\n')}

---
*Network Access Validation Report*
`;

		return markdown;
	}

	private getEndpointUrl(endpointName: string): string {
		for (const category of Object.values(this.endpoints)) {
			const endpoint = category.find((e) => e.name === endpointName);
			if (endpoint) return endpoint.url;
		}
		return 'Unknown';
	}
}

// CLI usage
if (require.main === module) {
	const args = process.argv.slice(2);
	const categories = args
		.find((arg) => arg.startsWith('--categories='))
		?.split('=')[1]
		?.split(',') || ['blockchain', 'npm', 'security', 'ci', 'general'];
	const environment =
		args.find((arg) => arg.startsWith('--environment='))?.split('=')[1] || 'container';
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];
	const reportFile = args.find((arg) => arg.startsWith('--report='))?.split('=')[1];

	// Check for specific category flags
	if (args.includes('--blockchain-rpcs')) {
		categories.length = 0;
		categories.push('blockchain');
	}

	const validator = new NetworkAccessValidator();

	validator
		.validateNetworkAccess(categories, environment)
		.then((report) => {
			if (outputFile) {
				validator.saveReport(report, outputFile);
			}

			if (reportFile) {
				const markdown = validator.generateMarkdownReport(report);
				fs.writeFileSync(reportFile, markdown);
				console.log(`📄 Markdown report saved to ${reportFile}`);
			}

			// Exit with appropriate code
			process.exit(report.summary.overall_connectivity ? 0 : 1);
		})
		.catch((error) => {
			console.error('❌ Network access validation failed:', error);
			process.exit(1);
		});
}

export default NetworkAccessValidator;
