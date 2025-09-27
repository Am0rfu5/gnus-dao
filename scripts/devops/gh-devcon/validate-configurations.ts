// scripts/devops/gh-devcon/validate-configurations.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

interface ConfigurationFile {
	name: string;
	path: string;
	required: boolean;
	schema?: any;
	checksum?: string;
	last_modified?: string;
	valid: boolean;
	errors: string[];
	warnings: string[];
}

interface ConfigurationValidation {
	timestamp: string;
	overall_valid: boolean;
	files_checked: number;
	valid_files: number;
	invalid_files: number;
	missing_files: number;
	total_errors: number;
	total_warnings: number;
	file_results: ConfigurationFile[];
	critical_issues: string[];
	recommendations: string[];
}

class ConfigurationValidator {
	private configFiles: { [key: string]: any } = {
		// Core project files
		'package.json': {
			required: true,
			schema: {
				required_fields: ['name', 'version', 'scripts'],
				recommended_fields: [
					'description',
					'main',
					'types',
					'repository',
					'author',
					'license',
				],
			},
		},
		'hardhat.config.ts': {
			required: true,
			schema: {
				required_fields: ['networks', 'solidity'],
				recommended_fields: ['etherscan', 'gasReporter'],
			},
		},
		'tsconfig.json': {
			required: true,
			schema: {
				required_fields: ['compilerOptions', 'include'],
				recommended_fields: ['exclude', 'files'],
			},
		},

		// Security configuration files
		'slither.config.json': {
			required: false,
			schema: {
				recommended_fields: [
					'exclude_informational',
					'filter_paths',
					'exclude_dependencies',
				],
			},
		},
		'.eslintrc.js': {
			required: false,
			schema: {
				recommended_fields: ['extends', 'rules', 'parserOptions'],
			},
		},
		'.prettierrc': {
			required: false,
			schema: {
				recommended_fields: [
					'semi',
					'trailingComma',
					'singleQuote',
					'printWidth',
					'tabWidth',
				],
			},
		},

		// CI/CD files
		'.github/workflows/environment-fingerprint.yml': {
			required: false,
			schema: {
				required_fields: ['name', 'on', 'jobs'],
			},
		},
		'.github/workflows/environment-monitoring.yml': {
			required: false,
			schema: {
				required_fields: ['name', 'on', 'jobs'],
			},
		},

		// Docker files
		Dockerfile: {
			required: false,
			schema: {
				required_patterns: ['FROM', 'WORKDIR', 'COPY', 'RUN'],
			},
		},
		'.devcontainer/devcontainer.json': {
			required: false,
			schema: {
				recommended_fields: ['name', 'image', 'features', 'customizations'],
			},
		},
	};

	async validateAllConfigurations(): Promise<ConfigurationValidation> {
		console.log('🔍 Validating configuration files...');

		const result: ConfigurationValidation = {
			timestamp: new Date().toISOString(),
			overall_valid: true,
			files_checked: 0,
			valid_files: 0,
			invalid_files: 0,
			missing_files: 0,
			total_errors: 0,
			total_warnings: 0,
			file_results: [],
			critical_issues: [],
			recommendations: [],
		};

		for (const [fileName, config] of Object.entries(this.configFiles)) {
			const fileResult = await this.validateConfigurationFile(fileName, config);
			result.file_results.push(fileResult);
			result.files_checked++;

			result.total_errors += fileResult.errors.length;
			result.total_warnings += fileResult.warnings.length;

			if (!fileResult.valid) {
				result.invalid_files++;
				if (config.required) {
					result.overall_valid = false;
					result.critical_issues.push(`${fileName} is required but invalid or missing`);
				}
			} else {
				result.valid_files++;
			}

			if (!fs.existsSync(fileName)) {
				result.missing_files++;
				if (config.required) {
					result.critical_issues.push(`${fileName} is required but missing`);
				} else {
					result.recommendations.push(
						`Consider adding ${fileName} for better project configuration`,
					);
				}
			}
		}

		// Add general recommendations
		this.addGeneralRecommendations(result);

		console.log(
			`✅ Configuration validation complete: ${result.valid_files}/${result.files_checked} files valid`,
		);
		return result;
	}

	private async validateConfigurationFile(
		fileName: string,
		config: any,
	): Promise<ConfigurationFile> {
		const result: ConfigurationFile = {
			name: fileName,
			path: fileName,
			required: config.required,
			schema: config.schema,
			valid: true,
			errors: [],
			warnings: [],
		};

		try {
			if (!fs.existsSync(fileName)) {
				result.valid = false;
				result.errors.push('File does not exist');
				return result;
			}

			// Get file stats
			const stats = fs.statSync(fileName);
			result.last_modified = stats.mtime.toISOString();

			// Calculate checksum
			const content = fs.readFileSync(fileName);
			result.checksum = crypto.createHash('sha256').update(content).digest('hex');

			// Validate based on file type
			await this.validateFileContent(fileName, content, config, result);
		} catch (error) {
			result.valid = false;
			result.errors.push(`Validation failed: ${(error as Error).message}`);
		}

		return result;
	}

	private async validateFileContent(
		fileName: string,
		content: Buffer,
		config: any,
		result: ConfigurationFile,
	): Promise<void> {
		const contentStr = content.toString();

		try {
			if (fileName.endsWith('.json')) {
				await this.validateJsonFile(fileName, contentStr, config, result);
			} else if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
				await this.validateJsFile(fileName, contentStr, config, result);
			} else if (fileName === 'Dockerfile') {
				await this.validateDockerfile(fileName, contentStr, config, result);
			} else if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
				await this.validateYamlFile(fileName, contentStr, config, result);
			} else {
				// Generic validation for other files
				this.validateGenericFile(fileName, contentStr, config, result);
			}
		} catch (error) {
			result.errors.push(`Content validation failed: ${(error as Error).message}`);
			result.valid = false;
		}
	}

	private async validateJsonFile(
		fileName: string,
		content: string,
		config: any,
		result: ConfigurationFile,
	): Promise<void> {
		let jsonData: any;

		try {
			jsonData = JSON.parse(content);
		} catch (error) {
			result.errors.push(`Invalid JSON syntax: ${(error as Error).message}`);
			result.valid = false;
			return;
		}

		// Check required fields
		if (config.schema?.required_fields) {
			for (const field of config.schema.required_fields) {
				if (!(field in jsonData)) {
					result.errors.push(`Missing required field: ${field}`);
					result.valid = false;
				}
			}
		}

		// Check recommended fields
		if (config.schema?.recommended_fields) {
			for (const field of config.schema.recommended_fields) {
				if (!(field in jsonData)) {
					result.warnings.push(`Missing recommended field: ${field}`);
				}
			}
		}

		// File-specific validations
		if (fileName === 'package.json') {
			this.validatePackageJson(jsonData, result);
		} else if (fileName === 'tsconfig.json') {
			this.validateTsconfigJson(jsonData, result);
		} else if (fileName === 'hardhat.config.ts') {
			// Note: hardhat.config.ts is actually TypeScript, not JSON
			// This will be handled by the JS validation
		}
	}

	private async validateJsFile(
		fileName: string,
		content: string,
		config: any,
		result: ConfigurationFile,
	): Promise<void> {
		// Basic syntax check by attempting to parse
		try {
			// For TypeScript files, try to compile
			if (fileName.endsWith('.ts')) {
				execSync(`npx tsc --noEmit --skipLibCheck ${fileName}`, {
					timeout: 10000,
					stdio: 'pipe',
				});
			}
		} catch (error) {
			result.errors.push(
				`TypeScript compilation failed: ${(error as any).stdout?.toString() || (error as Error).message}`,
			);
			result.valid = false;
		}

		// Check for required patterns
		if (config.schema?.required_patterns) {
			for (const pattern of config.schema.required_patterns) {
				if (!content.includes(pattern)) {
					result.errors.push(`Missing required pattern: ${pattern}`);
					result.valid = false;
				}
			}
		}

		// File-specific validations
		if (fileName === 'hardhat.config.ts') {
			this.validateHardhatConfig(content, result);
		}
	}

	private async validateDockerfile(
		fileName: string,
		content: string,
		config: any,
		result: ConfigurationFile,
	): Promise<void> {
		const lines = content.split('\n');

		// Check for required instructions
		if (config.schema?.required_patterns) {
			for (const pattern of config.schema.required_patterns) {
				const hasPattern = lines.some((line) => line.trim().startsWith(pattern));
				if (!hasPattern) {
					result.errors.push(`Missing required Dockerfile instruction: ${pattern}`);
					result.valid = false;
				}
			}
		}

		// Check for security issues
		const securityIssues = this.checkDockerfileSecurity(lines);
		result.warnings.push(...securityIssues);
	}

	private async validateYamlFile(
		fileName: string,
		content: string,
		config: any,
		result: ConfigurationFile,
	): Promise<void> {
		// Basic YAML validation (check if it can be parsed)
		try {
			// Try to parse as YAML (basic check)
			const lines = content.split('\n');
			let indentLevel = 0;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (line.startsWith('#') || line === '') continue;

				const currentIndent = lines[i].length - lines[i].trimStart().length;
				if (currentIndent > indentLevel + 2) {
					result.warnings.push(`Line ${i + 1}: Suspicious indentation increase`);
				}
				indentLevel = currentIndent;
			}
		} catch (error) {
			result.errors.push(`YAML validation failed: ${(error as Error).message}`);
			result.valid = false;
		}

		// Check required fields
		if (config.schema?.required_fields) {
			for (const field of config.schema.required_fields) {
				if (!content.includes(`${field}:`)) {
					result.errors.push(`Missing required field: ${field}`);
					result.valid = false;
				}
			}
		}
	}

	private validateGenericFile(
		fileName: string,
		content: string,
		config: any,
		result: ConfigurationFile,
	): void {
		// Basic checks for any file
		if (content.length === 0) {
			result.warnings.push('File is empty');
		}

		// Check file size
		const stats = fs.statSync(fileName);
		if (stats.size > 10 * 1024 * 1024) {
			// 10MB
			result.warnings.push('File is very large (>10MB)');
		}
	}

	private validatePackageJson(data: any, result: ConfigurationFile): void {
		// Check for security-related scripts
		const securityScripts = ['audit', 'security-check', 'lint'];
		const hasSecurityScripts = securityScripts.some(
			(script) => data.scripts && data.scripts[script],
		);

		if (!hasSecurityScripts) {
			result.warnings.push(
				'No security-related scripts found (audit, security-check, lint)',
			);
		}

		// Check dependencies
		if (data.dependencies) {
			const depCount = Object.keys(data.dependencies).length;
			if (depCount > 100) {
				result.warnings.push(`High number of dependencies (${depCount})`);
			}
		}
	}

	private validateTsconfigJson(data: any, result: ConfigurationFile): void {
		// Check TypeScript configuration
		const compilerOptions = data.compilerOptions || {};

		if (!compilerOptions.strict) {
			result.warnings.push('TypeScript strict mode not enabled');
		}

		if (!compilerOptions.esModuleInterop) {
			result.warnings.push('esModuleInterop not enabled');
		}
	}

	private validateHardhatConfig(content: string, result: ConfigurationFile): void {
		// Check for required Hardhat configuration elements
		const requiredPatterns = ['networks:', 'solidity:', 'compilers:'];

		for (const pattern of requiredPatterns) {
			if (!content.includes(pattern)) {
				result.warnings.push(`Missing recommended Hardhat config: ${pattern}`);
			}
		}

		// Check for security configurations
		if (!content.includes('gasPrice') && !content.includes('gasLimit')) {
			result.warnings.push('No gas configuration found in Hardhat config');
		}
	}

	private checkDockerfileSecurity(lines: string[]): string[] {
		const warnings: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].toUpperCase().trim();

			// Check for root user
			if (
				line.startsWith('USER ROOT') ||
				(line.startsWith('USER') && !line.includes('NODE'))
			) {
				warnings.push(`Line ${i + 1}: Running as root user (security risk)`);
			}

			// Check for privileged mode
			if (line.includes('--PRIVILEGED')) {
				warnings.push(`Line ${i + 1}: Using privileged mode (security risk)`);
			}

			// Check for apt-get without cleanup
			if (
				line.startsWith('RUN APT-GET') &&
				!lines.slice(i + 1, i + 5).some((l) => l.includes('rm -rf /var/lib/apt/lists/*'))
			) {
				warnings.push(`Line ${i + 1}: apt-get without cleanup (increases image size)`);
			}
		}

		return warnings;
	}

	private addGeneralRecommendations(result: ConfigurationValidation): void {
		// Add general configuration recommendations
		const recommendations = [
			'Consider adding .gitignore for proper file exclusions',
			'Consider adding LICENSE file for open source compliance',
			'Consider adding CONTRIBUTING.md for contributor guidelines',
			'Consider adding SECURITY.md for security reporting guidelines',
		];

		for (const rec of recommendations) {
			if (!result.recommendations.includes(rec)) {
				result.recommendations.push(rec);
			}
		}
	}

	saveValidationReport(result: ConfigurationValidation, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log(`💾 Validation report saved to ${outputFile}`);
	}

	generateMarkdownReport(result: ConfigurationValidation): string {
		let report = `# Configuration Validation Report\n\n`;
		report += `**Generated:** ${result.timestamp}\n\n`;
		report += `**Overall Status:** ${result.overall_valid ? '✅ Valid' : '❌ Invalid'}\n\n`;

		report += `## Summary\n\n`;
		report += `- **Files Checked:** ${result.files_checked}\n`;
		report += `- **Valid Files:** ${result.valid_files}\n`;
		report += `- **Invalid Files:** ${result.invalid_files}\n`;
		report += `- **Missing Files:** ${result.missing_files}\n`;
		report += `- **Total Errors:** ${result.total_errors}\n`;
		report += `- **Total Warnings:** ${result.total_warnings}\n\n`;

		report += `## File Details\n\n`;
		report += `| File | Required | Valid | Errors | Warnings |\n`;
		report += `|------|----------|-------|--------|----------|\n`;

		for (const file of result.file_results) {
			const status = file.valid ? '✅' : '❌';
			report += `| ${file.name} | ${file.required ? 'Yes' : 'No'} | ${status} | ${file.errors.length} | ${file.warnings.length} |\n`;
		}

		if (result.critical_issues.length > 0) {
			report += `\n## 🚨 Critical Issues\n\n`;
			for (const issue of result.critical_issues) {
				report += `- ${issue}\n`;
			}
		}

		if (result.total_errors > 0) {
			report += `\n## ❌ Errors\n\n`;
			for (const file of result.file_results) {
				if (file.errors.length > 0) {
					report += `### ${file.name}\n`;
					for (const error of file.errors) {
						report += `- ${error}\n`;
					}
					report += '\n';
				}
			}
		}

		if (result.total_warnings > 0) {
			report += `\n## ⚠️ Warnings\n\n`;
			for (const file of result.file_results) {
				if (file.warnings.length > 0) {
					report += `### ${file.name}\n`;
					for (const warning of file.warnings) {
						report += `- ${warning}\n`;
					}
					report += '\n';
				}
			}
		}

		if (result.recommendations.length > 0) {
			report += `\n## 🔧 Recommendations\n\n`;
			for (const rec of result.recommendations) {
				report += `- ${rec}\n`;
			}
		}

		return report;
	}
}

// CLI usage
if (require.main === module) {
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'config-validation-report.json';
	const reportFile = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];
	const verbose = process.argv.includes('--verbose');

	const validator = new ConfigurationValidator();

	validator
		.validateAllConfigurations()
		.then((result) => {
			// Save JSON report
			validator.saveValidationReport(result, outputFile);

			// Generate Markdown report if requested
			if (reportFile) {
				const markdownReport = validator.generateMarkdownReport(result);
				fs.writeFileSync(reportFile, markdownReport);
				console.log(`📄 Markdown report saved to ${reportFile}`);
			}

			// Print summary
			console.log('\n=== CONFIGURATION VALIDATION SUMMARY ===');
			console.log(`Overall Status: ${result.overall_valid ? '✅ VALID' : '❌ INVALID'}`);
			console.log(`Files Checked: ${result.files_checked}`);
			console.log(`Valid: ${result.valid_files}`);
			console.log(`Invalid: ${result.invalid_files}`);
			console.log(`Missing: ${result.missing_files}`);
			console.log(`Total Errors: ${result.total_errors}`);
			console.log(`Total Warnings: ${result.total_warnings}`);

			if (verbose && result.critical_issues.length > 0) {
				console.log('\n🚨 Critical Issues:');
				result.critical_issues.forEach((issue) => console.log(`  - ${issue}`));
			}

			if (verbose && result.recommendations.length > 0) {
				console.log('\n🔧 Recommendations:');
				result.recommendations.forEach((rec) => console.log(`  - ${rec}`));
			}

			// Exit with appropriate code
			process.exit(result.overall_valid ? 0 : 1);
		})
		.catch((error) => {
			console.error('❌ Configuration validation failed:', error);
			process.exit(1);
		});
}

export default ConfigurationValidator;
