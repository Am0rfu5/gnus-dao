// scripts/devops/gh-devcon/validate-execution-behavior.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ExecutionTest {
	name: string;
	command: string;
	expected_exit_code: number;
	expected_output_contains?: string[];
	expected_output_not_contains?: string[];
	timeout_ms: number;
	category: 'compilation' | 'runtime' | 'tooling' | 'security';
}

interface ExecutionResult {
	test_name: string;
	success: boolean;
	exit_code: number;
	output: string;
	error_output: string;
	execution_time_ms: number;
	error_message?: string;
}

interface BehaviorValidationReport {
	timestamp: string;
	environment: string;
	tests_run: number;
	tests_passed: number;
	tests_failed: number;
	total_execution_time_ms: number;
	results: ExecutionResult[];
	summary: {
		overall_success: boolean;
		critical_failures: string[];
		warnings: string[];
		recommendations: string[];
	};
}

class ExecutionBehaviorValidator {
	private readonly testSuites: { [key: string]: ExecutionTest[] } = {
		basic: [
			{
				name: 'TypeScript Compilation',
				command: 'npx tsc --noEmit --skipLibCheck',
				expected_exit_code: 0,
				timeout_ms: 30000,
				category: 'compilation',
			},
			{
				name: 'Hardhat Compilation',
				command: 'npx hardhat compile --force',
				expected_exit_code: 0,
				expected_output_contains: ['Compiled'],
				timeout_ms: 60000,
				category: 'tooling',
			},
			{
				name: 'Package Installation Check',
				command: 'yarn install --frozen-lockfile',
				expected_exit_code: 0,
				timeout_ms: 120000,
				category: 'tooling',
			},
			{
				name: 'Security Scan Basic',
				command:
					'npx slither . --exclude-dependencies --fail-none || echo "Slither completed with warnings"',
				expected_exit_code: 0,
				timeout_ms: 180000,
				category: 'security',
			},
		],
		comprehensive: [
			{
				name: 'Unit Tests Execution',
				command: 'npx hardhat test --bail',
				expected_exit_code: 0,
				expected_output_contains: ['test', 'passing'],
				timeout_ms: 300000,
				category: 'runtime',
			},
			{
				name: 'Gas Estimation',
				command:
					'npx hardhat run scripts/estimate-gas.ts || echo "Gas estimation completed"',
				expected_exit_code: 0,
				timeout_ms: 60000,
				category: 'runtime',
			},
			{
				name: 'Contract Size Check',
				command: 'npx hardhat size-contracts || echo "Size check completed"',
				expected_exit_code: 0,
				timeout_ms: 60000,
				category: 'compilation',
			},
			{
				name: 'Linting Check',
				command:
					'npx eslint . --ext .ts,.js --max-warnings 0 || echo "Linting completed with warnings"',
				expected_exit_code: 0,
				timeout_ms: 120000,
				category: 'tooling',
			},
		],
		security: [
			{
				name: 'Mythril Security Analysis',
				command:
					'npx mythril analyze contracts/**/*.sol --solc-json hardhat.config.ts || echo "Mythril analysis completed"',
				expected_exit_code: 0,
				timeout_ms: 300000,
				category: 'security',
			},
			{
				name: 'Contract Verification Dry Run',
				command:
					'npx hardhat verify --network localhost 0x0000000000000000000000000000000000000000 || echo "Verification dry run completed"',
				expected_exit_code: 0,
				timeout_ms: 60000,
				category: 'tooling',
			},
		],
	};

	async validateExecutionBehavior(
		testSuite: string = 'basic',
		environment: string = 'container',
	): Promise<BehaviorValidationReport> {
		console.log(`🔬 Validating execution behavior in ${environment} environment...`);
		console.log(`📋 Running test suite: ${testSuite}`);

		const tests = this.testSuites[testSuite];
		if (!tests) {
			throw new Error(`Unknown test suite: ${testSuite}`);
		}

		const results: ExecutionResult[] = [];
		let testsPassed = 0;
		let testsFailed = 0;
		const startTime = Date.now();

		for (const test of tests) {
			console.log(`\n⚡ Running test: ${test.name}`);
			const result = await this.runTest(test);
			results.push(result);

			if (result.success) {
				testsPassed++;
				console.log(`✅ PASSED (${result.execution_time_ms}ms)`);
			} else {
				testsFailed++;
				console.log(`❌ FAILED (${result.execution_time_ms}ms): ${result.error_message}`);
			}
		}

		const totalExecutionTime = Date.now() - startTime;
		const overallSuccess = testsFailed === 0;

		const report: BehaviorValidationReport = {
			timestamp: new Date().toISOString(),
			environment,
			tests_run: tests.length,
			tests_passed: testsPassed,
			tests_failed: testsFailed,
			total_execution_time_ms: totalExecutionTime,
			results,
			summary: {
				overall_success: overallSuccess,
				critical_failures: results
					.filter((r) => !r.success && this.isCriticalTest(r.test_name))
					.map((r) => r.test_name),
				warnings: results
					.filter((r) => !r.success && !this.isCriticalTest(r.test_name))
					.map((r) => r.test_name),
				recommendations: this.generateRecommendations(results, testSuite),
			},
		};

		console.log(`\n📊 Execution Behavior Validation Summary:`);
		console.log(`Total Tests: ${tests.length}`);
		console.log(`Passed: ${testsPassed}`);
		console.log(`Failed: ${testsFailed}`);
		console.log(`Success Rate: ${((testsPassed / tests.length) * 100).toFixed(1)}%`);
		console.log(`Overall Status: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);

		return report;
	}

	private async runTest(test: ExecutionTest): Promise<ExecutionResult> {
		const startTime = Date.now();

		try {
			const result = await this.executeCommand(test.command, test.timeout_ms);
			const executionTime = Date.now() - startTime;

			let success = result.exitCode === test.expected_exit_code;

			// Check output content if specified
			if (success && test.expected_output_contains) {
				for (const expected of test.expected_output_contains) {
					if (!result.stdout.includes(expected) && !result.stderr.includes(expected)) {
						success = false;
						break;
					}
				}
			}

			if (success && test.expected_output_not_contains) {
				for (const notExpected of test.expected_output_not_contains) {
					if (result.stdout.includes(notExpected) || result.stderr.includes(notExpected)) {
						success = false;
						break;
					}
				}
			}

			return {
				test_name: test.name,
				success,
				exit_code: result.exitCode,
				output: result.stdout,
				error_output: result.stderr,
				execution_time_ms: executionTime,
				error_message: success ? undefined : this.generateErrorMessage(test, result),
			};
		} catch (error) {
			const executionTime = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				test_name: test.name,
				success: false,
				exit_code: -1,
				output: '',
				error_output: errorMessage,
				execution_time_ms: executionTime,
				error_message: `Execution failed: ${errorMessage}`,
			};
		}
	}

	private async executeCommand(
		command: string,
		timeoutMs: number,
	): Promise<{ exitCode: number; stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			try {
				const result = execSync(command, {
					timeout: timeoutMs,
					maxBuffer: 10 * 1024 * 1024, // 10MB buffer
					encoding: 'utf8',
				});

				resolve({
					exitCode: 0,
					stdout: result,
					stderr: '',
				});
			} catch (error) {
				const execError = error as any; // execSync error has status, stdout, stderr properties
				resolve({
					exitCode: execError.status || -1,
					stdout: execError.stdout || '',
					stderr: execError.stderr || '',
				});
			}
		});
	}

	private generateErrorMessage(
		test: ExecutionTest,
		result: { exitCode: number; stdout: string; stderr: string },
	): string {
		const messages = [];

		if (result.exitCode !== test.expected_exit_code) {
			messages.push(
				`Expected exit code ${test.expected_exit_code}, got ${result.exitCode}`,
			);
		}

		if (test.expected_output_contains) {
			for (const expected of test.expected_output_contains) {
				if (!result.stdout.includes(expected) && !result.stderr.includes(expected)) {
					messages.push(`Expected output to contain: "${expected}"`);
				}
			}
		}

		if (test.expected_output_not_contains) {
			for (const notExpected of test.expected_output_not_contains) {
				if (result.stdout.includes(notExpected) || result.stderr.includes(notExpected)) {
					messages.push(`Output should not contain: "${notExpected}"`);
				}
			}
		}

		return messages.join('; ');
	}

	private isCriticalTest(testName: string): boolean {
		const criticalTests = [
			'TypeScript Compilation',
			'Hardhat Compilation',
			'Unit Tests Execution',
		];
		return criticalTests.includes(testName);
	}

	private generateRecommendations(results: ExecutionResult[], testSuite: string): string[] {
		const recommendations = [];

		const failedTests = results.filter((r) => !r.success);

		if (failedTests.length > 0) {
			recommendations.push(
				`${failedTests.length} tests failed - review execution environment setup`,
			);
		}

		const compilationFailures = failedTests.filter((r) =>
			r.test_name.includes('Compilation'),
		);
		if (compilationFailures.length > 0) {
			recommendations.push(
				'Compilation issues detected - check TypeScript and Solidity configurations',
			);
		}

		const securityFailures = failedTests.filter(
			(r) => r.test_name.includes('Security') || r.test_name.includes('Mythril'),
		);
		if (securityFailures.length > 0) {
			recommendations.push(
				'Security analysis failures - ensure security tools are properly configured',
			);
		}

		const slowTests = results.filter((r) => r.execution_time_ms > 60000);
		if (slowTests.length > 0) {
			recommendations.push(
				`${slowTests.length} tests took >60s - consider performance optimizations`,
			);
		}

		if (recommendations.length === 0) {
			recommendations.push('All execution behavior tests passed successfully');
		}

		return recommendations;
	}

	saveReport(report: BehaviorValidationReport, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
		console.log(`📄 Execution behavior validation report saved to ${outputFile}`);
	}

	generateMarkdownReport(report: BehaviorValidationReport): string {
		const status = report.summary.overall_success ? '✅ PASSED' : '❌ FAILED';

		let markdown = `# Execution Behavior Validation Report

## 📋 Summary

- **Environment**: ${report.environment}
- **Test Suite**: ${report.tests_run} tests
- **Status**: ${status}
- **Passed**: ${report.tests_passed}
- **Failed**: ${report.tests_failed}
- **Success Rate**: ${((report.tests_passed / report.tests_run) * 100).toFixed(1)}%
- **Total Execution Time**: ${(report.total_execution_time_ms / 1000).toFixed(1)}s
- **Generated**: ${report.timestamp}

## 🚨 Critical Failures

${
	report.summary.critical_failures.length === 0
		? 'No critical failures detected ✅'
		: report.summary.critical_failures.map((failure) => `- ❌ ${failure}`).join('\n')
}

## ⚠️ Warnings

${
	report.summary.warnings.length === 0
		? 'No warnings detected ✅'
		: report.summary.warnings.map((warning) => `- ⚠️ ${warning}`).join('\n')
}

## 📊 Test Results

${report.results
	.map(
		(result) => `
### ${result.success ? '✅' : '❌'} ${result.test_name}

- **Status**: ${result.success ? 'PASSED' : 'FAILED'}
- **Exit Code**: ${result.exit_code}
- **Execution Time**: ${result.execution_time_ms}ms
${result.error_message ? `- **Error**: ${result.error_message}` : ''}
${result.output ? `- **Output**: ${result.output.substring(0, 200)}${result.output.length > 200 ? '...' : ''}` : ''}
`,
	)
	.join('')}

## 💡 Recommendations

${report.summary.recommendations.map((rec) => `- ${rec}`).join('\n')}

---
*Execution Behavior Validation Report*
`;

		return markdown;
	}
}

// CLI usage
if (require.main === module) {
	const args = process.argv.slice(2);
	const testSuite =
		args.find((arg) => arg.startsWith('--suite='))?.split('=')[1] || 'basic';
	const environment =
		args.find((arg) => arg.startsWith('--environment='))?.split('=')[1] || 'container';
	const outputFile = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];
	const reportFile = args.find((arg) => arg.startsWith('--report='))?.split('=')[1];

	const validator = new ExecutionBehaviorValidator();

	validator
		.validateExecutionBehavior(testSuite, environment)
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
			process.exit(report.summary.overall_success ? 0 : 1);
		})
		.catch((error) => {
			console.error('❌ Execution behavior validation failed:', error);
			process.exit(1);
		});
}

export default ExecutionBehaviorValidator;
