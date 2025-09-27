#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import * as os from 'os';

interface DiagnosticResult {
	component: string;
	status: 'PASS' | 'FAIL' | 'WARN';
	message: string;
	details?: any;
	recommendation?: string;
}

interface SystemInfo {
	platform: string;
	arch: string;
	nodeVersion: string;
	yarnVersion?: string;
	dockerVersion?: string;
	memory: number;
	cpus: number;
}

class DevContainerDiagnosticTool {
	private results: DiagnosticResult[] = [];
	private systemInfo: SystemInfo;

	constructor() {
		this.systemInfo = this.collectSystemInfo();
	}

	async runComprehensiveDiagnostics(): Promise<void> {
		console.log('🔍 GNUS-DAO DevContainer Diagnostic Tool');
		console.log('=======================================\n');

		console.log('📊 System Information:');
		console.log(`   Platform: ${this.systemInfo.platform}`);
		console.log(`   Architecture: ${this.systemInfo.arch}`);
		console.log(`   Node.js: ${this.systemInfo.nodeVersion}`);
		console.log(`   Memory: ${(this.systemInfo.memory / 1024 / 1024 / 1024).toFixed(1)}GB`);
		console.log(`   CPUs: ${this.systemInfo.cpus}`);
		console.log('');

		// Run all diagnostic checks
		await this.checkEnvironment();
		await this.checkDevContainer();
		await this.checkDependencies();
		await this.checkDevelopmentTools();
		await this.checkSecurityTools();
		await this.checkNetworkConnectivity();
		await this.checkPerformance();
		await this.checkGitConfiguration();

		this.generateReport();
	}

	private collectSystemInfo(): SystemInfo {
		const info: SystemInfo = {
			platform: os.platform(),
			arch: os.arch(),
			nodeVersion: process.version,
			memory: os.totalmem(),
			cpus: os.cpus().length,
		};

		try {
			info.yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
		} catch (error) {
			// Yarn not available
		}

		try {
			const dockerOutput = execSync('docker --version', { encoding: 'utf8' });
			info.dockerVersion = dockerOutput.trim();
		} catch (error) {
			// Docker not available
		}

		return info;
	}

	private async checkEnvironment(): Promise<void> {
		console.log('🔍 Checking Environment...\n');

		// Check if running in DevContainer
		const inContainer = process.env.REMOTE_CONTAINERS === 'true';
		this.addResult({
			component: 'DevContainer Environment',
			status: inContainer ? 'PASS' : 'FAIL',
			message: inContainer ? 'Running in DevContainer' : 'Not running in DevContainer',
			recommendation: inContainer
				? undefined
				: 'Open project in DevContainer using VS Code',
		});

		// Check Node.js version
		const nodeVersionMatch = this.systemInfo.nodeVersion.match(/v(\d+)\.(\d+)\.(\d+)/);
		if (nodeVersionMatch) {
			const major = parseInt(nodeVersionMatch[1]);
			const status = major >= 20 ? 'PASS' : major >= 18 ? 'WARN' : 'FAIL';
			this.addResult({
				component: 'Node.js Version',
				status,
				message: `Node.js ${this.systemInfo.nodeVersion}`,
				recommendation:
					status === 'FAIL'
						? 'Upgrade to Node.js 20+ for best compatibility'
						: status === 'WARN'
							? 'Consider upgrading to Node.js 20 for latest features'
							: undefined,
			});
		}

		// Check available memory
		const memoryGB = this.systemInfo.memory / 1024 / 1024 / 1024;
		const memoryStatus = memoryGB >= 8 ? 'PASS' : memoryGB >= 4 ? 'WARN' : 'FAIL';
		this.addResult({
			component: 'System Memory',
			status: memoryStatus,
			message: `${memoryGB.toFixed(1)}GB available`,
			recommendation:
				memoryStatus === 'FAIL'
					? 'Increase system memory to at least 8GB'
					: memoryStatus === 'WARN'
						? 'Consider 16GB+ for optimal performance'
						: undefined,
		});

		// Check CPU cores
		const cpuStatus =
			this.systemInfo.cpus >= 4 ? 'PASS' : this.systemInfo.cpus >= 2 ? 'WARN' : 'FAIL';
		this.addResult({
			component: 'CPU Cores',
			status: cpuStatus,
			message: `${this.systemInfo.cpus} CPU cores available`,
			recommendation:
				cpuStatus === 'FAIL'
					? 'System requires at least 2 CPU cores'
					: cpuStatus === 'WARN'
						? '4+ CPU cores recommended for optimal performance'
						: undefined,
		});
	}

	private async checkDevContainer(): Promise<void> {
		console.log('🔍 Checking DevContainer Configuration...\n');

		// Check .devcontainer directory exists
		const devContainerPath = path.join(process.cwd(), '.devcontainer');
		const hasDevContainer = fs.existsSync(devContainerPath);
		this.addResult({
			component: 'DevContainer Directory',
			status: hasDevContainer ? 'PASS' : 'FAIL',
			message: hasDevContainer
				? '.devcontainer directory exists'
				: '.devcontainer directory missing',
			recommendation: hasDevContainer
				? undefined
				: 'Ensure .devcontainer directory exists in project root',
		});

		if (hasDevContainer) {
			// Check devcontainer.json
			const configPath = path.join(devContainerPath, 'devcontainer.json');
			const hasConfig = fs.existsSync(configPath);
			this.addResult({
				component: 'DevContainer Config',
				status: hasConfig ? 'PASS' : 'FAIL',
				message: hasConfig ? 'devcontainer.json exists' : 'devcontainer.json missing',
				recommendation: hasConfig
					? undefined
					: 'Create devcontainer.json configuration file',
			});

			// Check Dockerfile
			const dockerfilePath = path.join(devContainerPath, 'Dockerfile');
			const hasDockerfile = fs.existsSync(dockerfilePath);
			this.addResult({
				component: 'DevContainer Dockerfile',
				status: hasDockerfile ? 'PASS' : 'WARN',
				message: hasDockerfile
					? 'Dockerfile exists'
					: 'Using default image (Dockerfile optional)',
				recommendation: hasDockerfile
					? undefined
					: 'Consider creating custom Dockerfile for optimization',
			});
		}
	}

	private async checkDependencies(): Promise<void> {
		console.log('🔍 Checking Dependencies...\n');

		// Check package.json
		const hasPackageJson = fs.existsSync('package.json');
		this.addResult({
			component: 'Package Configuration',
			status: hasPackageJson ? 'PASS' : 'FAIL',
			message: hasPackageJson ? 'package.json exists' : 'package.json missing',
			recommendation: hasPackageJson
				? undefined
				: 'Create package.json with project dependencies',
		});

		if (hasPackageJson) {
			// Check node_modules
			const hasNodeModules = fs.existsSync('node_modules');
			this.addResult({
				component: 'Node Modules',
				status: hasNodeModules ? 'PASS' : 'WARN',
				message: hasNodeModules
					? 'node_modules directory exists'
					: 'Dependencies not installed',
				recommendation: hasNodeModules
					? undefined
					: 'Run yarn install to install dependencies',
			});

			// Check yarn.lock or package-lock.json
			const hasYarnLock = fs.existsSync('yarn.lock');
			const hasPackageLock = fs.existsSync('package-lock.json');
			const hasLockfile = hasYarnLock || hasPackageLock;
			this.addResult({
				component: 'Lockfile',
				status: hasLockfile ? 'PASS' : 'WARN',
				message: hasLockfile
					? `${hasYarnLock ? 'yarn.lock' : 'package-lock.json'} exists`
					: 'No lockfile found',
				recommendation: hasLockfile
					? undefined
					: 'Use yarn install or npm install to create lockfile',
			});
		}
	}

	private async checkDevelopmentTools(): Promise<void> {
		console.log('🔍 Checking Development Tools...\n');

		// Check Hardhat
		try {
			const hardhatVersion = execSync('npx hardhat --version', {
				encoding: 'utf8',
				stdio: 'pipe',
			});
			this.addResult({
				component: 'Hardhat Framework',
				status: 'PASS',
				message: `Hardhat available: ${hardhatVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'Hardhat Framework',
				status: 'FAIL',
				message: 'Hardhat not available',
				recommendation: 'Install Hardhat: npm install -g hardhat or yarn add hardhat',
			});
		}

		// Check TypeScript
		try {
			const tscVersion = execSync('npx tsc --version', { encoding: 'utf8', stdio: 'pipe' });
			this.addResult({
				component: 'TypeScript Compiler',
				status: 'PASS',
				message: `TypeScript available: ${tscVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'TypeScript Compiler',
				status: 'FAIL',
				message: 'TypeScript not available',
				recommendation: 'Install TypeScript: yarn add -D typescript',
			});
		}

		// Check ESLint
		try {
			const eslintVersion = execSync('npx eslint --version', {
				encoding: 'utf8',
				stdio: 'pipe',
			});
			this.addResult({
				component: 'ESLint',
				status: 'PASS',
				message: `ESLint available: ${eslintVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'ESLint',
				status: 'WARN',
				message: 'ESLint not available',
				recommendation: 'Install ESLint: yarn add -D eslint',
			});
		}
	}

	private async checkSecurityTools(): Promise<void> {
		console.log('🔍 Checking Security Tools...\n');

		// Check Snyk
		try {
			const snykVersion = execSync('snyk --version', { encoding: 'utf8', stdio: 'pipe' });
			this.addResult({
				component: 'Snyk Security',
				status: 'PASS',
				message: `Snyk available: v${snykVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'Snyk Security',
				status: 'WARN',
				message: 'Snyk not available',
				recommendation: 'Install Snyk CLI for security scanning',
			});
		}

		// Check Semgrep
		try {
			const semgrepVersion = execSync('semgrep --version', {
				encoding: 'utf8',
				stdio: 'pipe',
			});
			this.addResult({
				component: 'Semgrep SAST',
				status: 'PASS',
				message: `Semgrep available: ${semgrepVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'Semgrep SAST',
				status: 'WARN',
				message: 'Semgrep not available',
				recommendation: 'Install Semgrep for static analysis',
			});
		}

		// Check Slither
		try {
			const slitherVersion = execSync('slither --version', {
				encoding: 'utf8',
				stdio: 'pipe',
			});
			this.addResult({
				component: 'Slither',
				status: 'PASS',
				message: `Slither available: ${slitherVersion.trim()}`,
			});
		} catch (error: any) {
			this.addResult({
				component: 'Slither',
				status: 'WARN',
				message: 'Slither not available',
				recommendation: 'Install Slither for Solidity security analysis',
			});
		}
	}

	private async checkNetworkConnectivity(): Promise<void> {
		console.log('🔍 Checking Network Connectivity...\n');

		// Test internet connectivity
		try {
			execSync('curl -f --max-time 10 https://registry.yarnpkg.com', { stdio: 'pipe' });
			this.addResult({
				component: 'Internet Connectivity',
				status: 'PASS',
				message: 'Internet connection available',
			});
		} catch (error: any) {
			this.addResult({
				component: 'Internet Connectivity',
				status: 'FAIL',
				message: 'No internet connectivity',
				recommendation: 'Check network connection and proxy settings',
			});
			return; // Skip further network tests
		}

		// Test GitHub access
		try {
			execSync('curl -f --max-time 10 https://api.github.com', { stdio: 'pipe' });
			this.addResult({
				component: 'GitHub API Access',
				status: 'PASS',
				message: 'GitHub API accessible',
			});
		} catch (error: any) {
			this.addResult({
				component: 'GitHub API Access',
				status: 'WARN',
				message: 'GitHub API not accessible',
				recommendation: 'Check firewall and proxy settings for GitHub access',
			});
		}

		// Test NPM registry
		try {
			execSync('curl -f --max-time 10 https://registry.npmjs.org', { stdio: 'pipe' });
			this.addResult({
				component: 'NPM Registry Access',
				status: 'PASS',
				message: 'NPM registry accessible',
			});
		} catch (error: any) {
			this.addResult({
				component: 'NPM Registry Access',
				status: 'WARN',
				message: 'NPM registry not accessible',
				recommendation: 'Check network configuration for NPM access',
			});
		}
	}

	private async checkPerformance(): Promise<void> {
		console.log('🔍 Checking Performance Metrics...\n');

		// Check Docker performance
		if (this.systemInfo.dockerVersion) {
			try {
				const dockerStats = execSync('docker system info --format "{{.MemTotal}}"', {
					encoding: 'utf8',
					stdio: 'pipe',
				});
				const dockerMemory = parseInt(dockerStats.trim()) / 1024 / 1024 / 1024; // Convert to GB
				const memoryStatus =
					dockerMemory >= 6 ? 'PASS' : dockerMemory >= 4 ? 'WARN' : 'FAIL';
				this.addResult({
					component: 'Docker Memory Allocation',
					status: memoryStatus,
					message: `${dockerMemory.toFixed(1)}GB allocated to Docker`,
					recommendation:
						memoryStatus === 'FAIL'
							? 'Increase Docker memory to at least 6GB'
							: memoryStatus === 'WARN'
								? 'Consider 8GB+ for optimal performance'
								: undefined,
				});
			} catch (error: any) {
				this.addResult({
					component: 'Docker Memory Allocation',
					status: 'WARN',
					message: 'Could not check Docker memory allocation',
					recommendation: 'Verify Docker Desktop memory settings',
				});
			}
		}

		// Check disk space
		try {
			const diskUsage = execSync("df -BG . | tail -1 | awk '{print $4}'", {
				encoding: 'utf8',
				stdio: 'pipe',
			});
			const freeSpaceGB = parseInt(diskUsage.trim().replace('G', ''));
			const diskStatus = freeSpaceGB >= 20 ? 'PASS' : freeSpaceGB >= 10 ? 'WARN' : 'FAIL';
			this.addResult({
				component: 'Disk Space',
				status: diskStatus,
				message: `${freeSpaceGB}GB free disk space`,
				recommendation:
					diskStatus === 'FAIL'
						? 'Free up at least 20GB disk space'
						: diskStatus === 'WARN'
							? 'Consider freeing up more disk space'
							: undefined,
			});
		} catch (error: any) {
			this.addResult({
				component: 'Disk Space',
				status: 'WARN',
				message: 'Could not check disk space',
				recommendation: 'Ensure sufficient disk space for development',
			});
		}
	}

	private async checkGitConfiguration(): Promise<void> {
		console.log('🔍 Checking Git Configuration...\n');

		// Check Git installation
		try {
			const gitVersion = execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
			this.addResult({
				component: 'Git Installation',
				status: 'PASS',
				message: gitVersion.trim(),
			});
		} catch (error: any) {
			this.addResult({
				component: 'Git Installation',
				status: 'FAIL',
				message: 'Git not available',
				recommendation: 'Install Git for version control',
			});
			return;
		}

		// Check Git user configuration
		try {
			const gitUser = execSync('git config --get user.name', {
				encoding: 'utf8',
				stdio: 'pipe',
			}).trim();
			const gitEmail = execSync('git config --get user.email', {
				encoding: 'utf8',
				stdio: 'pipe',
			}).trim();

			const hasUser = gitUser.length > 0;
			const hasEmail = gitEmail.length > 0;

			this.addResult({
				component: 'Git User Configuration',
				status: hasUser && hasEmail ? 'PASS' : 'FAIL',
				message:
					hasUser && hasEmail
						? `Configured: ${gitUser} <${gitEmail}>`
						: 'Git user/email not configured',
				recommendation:
					hasUser && hasEmail
						? undefined
						: 'Configure git: git config --global user.name "Your Name" && git config --global user.email "your.email@example.com"',
			});
		} catch (error: any) {
			this.addResult({
				component: 'Git User Configuration',
				status: 'FAIL',
				message: 'Could not check Git configuration',
				recommendation: 'Configure Git user name and email',
			});
		}

		// Check if in a Git repository
		try {
			execSync('git rev-parse --git-dir', { stdio: 'pipe' });
			this.addResult({
				component: 'Git Repository',
				status: 'PASS',
				message: 'In a Git repository',
			});
		} catch (error: any) {
			this.addResult({
				component: 'Git Repository',
				status: 'WARN',
				message: 'Not in a Git repository',
				recommendation: 'Initialize Git repository or navigate to project directory',
			});
		}
	}

	private addResult(result: DiagnosticResult): void {
		this.results.push(result);

		const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
		console.log(`${icon} ${result.component}: ${result.message}`);

		if (result.recommendation) {
			console.log(`   💡 ${result.recommendation}`);
		}
		console.log('');
	}

	private generateReport(): void {
		console.log('📋 Diagnostic Summary');
		console.log('====================\n');

		const passed = this.results.filter((r) => r.status === 'PASS').length;
		const warnings = this.results.filter((r) => r.status === 'WARN').length;
		const failed = this.results.filter((r) => r.status === 'FAIL').length;
		const total = this.results.length;

		console.log(`Total Checks: ${total}`);
		console.log(`✅ Passed: ${passed}`);
		console.log(`⚠️  Warnings: ${warnings}`);
		console.log(`❌ Failed: ${failed}\n`);

		const overallStatus =
			failed > 0 ? 'CRITICAL' : warnings > 0 ? 'NEEDS ATTENTION' : 'HEALTHY';
		console.log(`🏥 Overall Status: ${overallStatus}\n`);

		if (failed > 0) {
			console.log('🚨 Critical Issues (must fix):');
			this.results
				.filter((r) => r.status === 'FAIL')
				.forEach((result) => {
					console.log(`   • ${result.component}: ${result.message}`);
					if (result.recommendation) {
						console.log(`     💡 ${result.recommendation}`);
					}
				});
			console.log('');
		}

		if (warnings > 0) {
			console.log('⚠️  Warnings (should fix):');
			this.results
				.filter((r) => r.status === 'WARN')
				.forEach((result) => {
					console.log(`   • ${result.component}: ${result.message}`);
					if (result.recommendation) {
						console.log(`     💡 ${result.recommendation}`);
					}
				});
			console.log('');
		}

		// Generate recommendations
		this.generateRecommendations();

		// Save detailed report
		this.saveReport();
	}

	private generateRecommendations(): void {
		console.log('🎯 Recommendations:');
		console.log('==================\n');

		const recommendations = this.results
			.filter((r) => r.recommendation)
			.map((r) => `• ${r.component}: ${r.recommendation}`);

		if (recommendations.length === 0) {
			console.log('✅ No recommendations needed - your DevContainer is well configured!\n');
		} else {
			recommendations.forEach((rec) => console.log(rec));
			console.log('');
		}

		// Quick fixes
		console.log('🔧 Quick Fixes:');
		console.log('===============\n');

		const quickFixes = [
			'Run "yarn install" to install missing dependencies',
			'Check Docker Desktop memory allocation (6GB+ recommended)',
			'Verify internet connectivity for package downloads',
			'Run "yarn security-check:quick" for security validation',
			'Execute "yarn ci:local" to test complete workflow',
		];

		quickFixes.forEach((fix, index) => {
			console.log(`${index + 1}. ${fix}`);
		});
		console.log('');
	}

	private saveReport(): void {
		const report = {
			timestamp: new Date().toISOString(),
			systemInfo: this.systemInfo,
			results: this.results,
			summary: {
				total: this.results.length,
				passed: this.results.filter((r) => r.status === 'PASS').length,
				warnings: this.results.filter((r) => r.status === 'WARN').length,
				failed: this.results.filter((r) => r.status === 'FAIL').length,
			},
		};

		const reportPath = 'devcontainer-diagnostic-report.json';
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

		console.log(`📄 Detailed report saved to: ${reportPath}`);
		console.log('   Use this file for support requests or further analysis.\n');

		// Also save human-readable summary
		const summaryPath = 'devcontainer-diagnostic-summary.txt';
		const summary = this.generateTextSummary();
		fs.writeFileSync(summaryPath, summary);

		console.log(`📄 Summary report saved to: ${summaryPath}\n`);
	}

	private generateTextSummary(): string {
		let summary = 'GNUS-DAO DevContainer Diagnostic Summary\n';
		summary += '======================================\n\n';
		summary += `Generated: ${new Date().toISOString()}\n\n`;

		summary += 'System Information:\n';
		summary += `- Platform: ${this.systemInfo.platform}\n`;
		summary += `- Architecture: ${this.systemInfo.arch}\n`;
		summary += `- Node.js: ${this.systemInfo.nodeVersion}\n`;
		summary += `- Memory: ${(this.systemInfo.memory / 1024 / 1024 / 1024).toFixed(1)}GB\n`;
		summary += `- CPUs: ${this.systemInfo.cpus}\n\n`;

		const passed = this.results.filter((r) => r.status === 'PASS').length;
		const warnings = this.results.filter((r) => r.status === 'WARN').length;
		const failed = this.results.filter((r) => r.status === 'FAIL').length;

		summary += `Diagnostic Results:\n`;
		summary += `- Total Checks: ${this.results.length}\n`;
		summary += `- Passed: ${passed}\n`;
		summary += `- Warnings: ${warnings}\n`;
		summary += `- Failed: ${failed}\n\n`;

		if (failed > 0) {
			summary += 'Critical Issues:\n';
			this.results
				.filter((r) => r.status === 'FAIL')
				.forEach((result) => {
					summary += `- ${result.component}: ${result.message}\n`;
					if (result.recommendation) {
						summary += `  Recommendation: ${result.recommendation}\n`;
					}
				});
			summary += '\n';
		}

		if (warnings > 0) {
			summary += 'Warnings:\n';
			this.results
				.filter((r) => r.status === 'WARN')
				.forEach((result) => {
					summary += `- ${result.component}: ${result.message}\n`;
					if (result.recommendation) {
						summary += `  Recommendation: ${result.recommendation}\n`;
					}
				});
			summary += '\n';
		}

		return summary;
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

	const diagnostic = new DevContainerDiagnosticTool();

	try {
		await diagnostic.runComprehensiveDiagnostics();

		if (outputFile) {
			// Custom output file specified
			console.log(`\n📄 Report saved to: ${outputFile}`);
		}
	} catch (error: any) {
		console.error('❌ Diagnostic failed:', error.message);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export default DevContainerDiagnosticTool;
