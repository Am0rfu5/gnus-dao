#!/usr/bin/env node

/**
 * Security Commit Message Validation
 * Validates that security-related commits follow proper patterns
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityValidationRule {
	test: boolean;
	message: string;
}

interface SecurityLogEntry {
	timestamp: string;
	commit: string;
	validation: 'PASSED' | 'FAILED';
	issues?: string[];
}

// Get commit message from git
const commitMsgFile: string | undefined = process.argv[2];
if (!commitMsgFile) {
	console.error('❌ No commit message file provided');
	process.exit(1);
}

try {
	const commitMsg: string = fs.readFileSync(commitMsgFile, 'utf8').trim();

	// Security-related commit patterns
	const securityPatterns: RegExp[] = [
		/^security:/i, // Security type commits
		/security|vulnerability|exploit|cve|audit/i, // Security keywords
		/^fix.*security/i, // Security fixes
		/^feat.*security/i, // Security features
	];

	const isSecurityCommit: boolean = securityPatterns.some((pattern: RegExp) =>
		pattern.test(commitMsg),
	);

	if (isSecurityCommit) {
		console.log('🔒 Security-related commit detected');

		// Additional validation for security commits
		const securityValidationRules: SecurityValidationRule[] = [
			{
				test: commitMsg.length > 10,
				message: 'Security commit messages must be descriptive (more than 10 characters)',
			},
			{
				test: /CVE-\d{4}-\d{4,7}/.test(commitMsg) || !/cve/i.test(commitMsg),
				message: 'If referencing CVE, use proper format: CVE-YYYY-NNNN',
			},
			{
				test:
					!/fix.*password|fix.*secret|fix.*key/i.test(commitMsg) ||
					/remove|revoke|rotate/i.test(commitMsg),
				message:
					'Security fixes involving credentials must include removal/rotation actions',
			},
		];

		const failedRules: SecurityValidationRule[] = securityValidationRules.filter(
			(rule: SecurityValidationRule) => !rule.test,
		);

		if (failedRules.length > 0) {
			console.error('❌ Security commit validation failed:');
			failedRules.forEach((rule: SecurityValidationRule) => {
				console.error(`  - ${rule.message}`);
			});

			// Log security commit for audit trail
			const logEntry: SecurityLogEntry = {
				timestamp: new Date().toISOString(),
				commit: commitMsg,
				validation: 'FAILED',
				issues: failedRules.map((r: SecurityValidationRule) => r.message),
			};

			const logFile: string = path.join(
				__dirname,
				'..',
				'..',
				'logs',
				'security-commits.log',
			);
			const logDir: string = path.dirname(logFile);

			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}

			fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
			console.log(`📝 Security commit logged to ${logFile}`);

			process.exit(1);
		}

		// Log successful security commit
		const logEntry: SecurityLogEntry = {
			timestamp: new Date().toISOString(),
			commit: commitMsg,
			validation: 'PASSED',
		};

		const logFile: string = path.join(
			__dirname,
			'..',
			'..',
			'logs',
			'security-commits.log',
		);
		const logDir: string = path.dirname(logFile);

		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}

		fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
		console.log('✅ Security commit validation passed');
	}
} catch (error) {
	console.error('❌ Error validating security commit:', (error as Error).message);
	process.exit(1);
}
