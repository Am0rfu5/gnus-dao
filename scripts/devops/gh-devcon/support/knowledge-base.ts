#!/usr/bin/env node

/**
 * DevContainer Knowledge Base Search and Support System
 *
 * Provides searchable knowledge base with automated diagnostic integration,
 * contextual help, and AI-assisted troubleshooting for DevContainer issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

interface KnowledgeBaseEntry {
	id: string;
	title: string;
	category: string;
	severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
	platforms: string[];
	tags: string[];
	problem: string;
	symptoms: string[];
	solutions: Solution[];
	prevention: string[];
	relatedIssues: string[];
	diagnosticCommands: string[];
	verificationCommands: string[];
	lastUpdated: string;
	searchScore?: number;
}

interface Solution {
	title: string;
	steps: string[];
	validation: string[];
	estimatedTime: number; // in minutes
	successRate: number; // percentage
}

interface DiagnosticResult {
	component: string;
	status: 'PASS' | 'FAIL' | 'WARN';
	message: string;
	details?: any;
	recommendation?: string;
}

interface SearchResult {
	entry: KnowledgeBaseEntry;
	relevanceScore: number;
	matchedTerms: string[];
	suggestedActions: string[];
}

class DevContainerKnowledgeBase {
	private knowledgeBase: Map<string, KnowledgeBaseEntry> = new Map();
	private knowledgeBasePath: string;
	private searchIndex: Map<string, string[]> = new Map(); // term -> entry IDs

	constructor() {
		this.knowledgeBasePath = path.join(
			__dirname,
			'../../../docs/devcontainer/support/knowledge-base',
		);
		this.loadKnowledgeBase();
		this.buildSearchIndex();
	}

	private loadKnowledgeBase(): void {
		// Load built-in knowledge base entries
		this.loadBuiltInEntries();

		// Load custom entries from files
		this.loadCustomEntries();
	}

	private loadBuiltInEntries(): void {
		const builtInEntries: KnowledgeBaseEntry[] = [
			{
				id: 'env-docker-not-running',
				title: 'Docker Desktop Not Running',
				category: 'environment',
				severity: 'critical',
				platforms: ['windows', 'macos', 'linux'],
				tags: ['docker', 'environment', 'startup'],
				problem: 'Docker Desktop is not running or not accessible',
				symptoms: [
					'Docker commands fail with connection errors',
					'DevContainer fails to start',
					'Error: "docker daemon is not running"',
				],
				solutions: [
					{
						title: 'Start Docker Desktop',
						steps: [
							'Open Docker Desktop application',
							'Wait for Docker to fully start (may take 1-2 minutes)',
							'Verify Docker is running: docker --version',
							'Try opening project in DevContainer again',
						],
						validation: ['docker --version', 'docker ps'],
						estimatedTime: 2,
						successRate: 95,
					},
					{
						title: 'Restart Docker Service (Linux)',
						steps: [
							'Check Docker service status: sudo systemctl status docker',
							'Start Docker service: sudo systemctl start docker',
							'Enable auto-start: sudo systemctl enable docker',
							'Add user to docker group: sudo usermod -aG docker $USER',
						],
						validation: ['docker --version', 'docker ps'],
						estimatedTime: 3,
						successRate: 90,
					},
				],
				prevention: [
					'Enable Docker Desktop auto-start',
					'Check Docker status before starting DevContainer',
					'Keep Docker Desktop updated',
				],
				relatedIssues: ['env-docker-memory', 'env-docker-resources'],
				diagnosticCommands: ['docker --version', 'docker info'],
				verificationCommands: ['docker ps', 'docker system info'],
				lastUpdated: '2025-01-15',
			},
			{
				id: 'env-insufficient-memory',
				title: 'Insufficient Memory for DevContainer',
				category: 'environment',
				severity: 'high',
				platforms: ['windows', 'macos', 'linux'],
				tags: ['memory', 'resources', 'docker'],
				problem: 'System does not have enough memory allocated to Docker',
				symptoms: [
					'DevContainer fails to build',
					'Build process killed due to out of memory',
					'Docker containers crash unexpectedly',
				],
				solutions: [
					{
						title: 'Increase Docker Memory Allocation',
						steps: [
							'Open Docker Desktop settings',
							'Go to Resources > Advanced',
							'Increase memory allocation to at least 6GB',
							'Apply changes and restart Docker',
							'Rebuild DevContainer',
						],
						validation: ['docker system info | grep "Total Memory"'],
						estimatedTime: 5,
						successRate: 98,
					},
				],
				prevention: [
					'Allocate sufficient memory (8GB+ recommended)',
					'Monitor memory usage during builds',
					'Close unnecessary applications during builds',
				],
				relatedIssues: ['env-docker-not-running', 'perf-high-memory-usage'],
				diagnosticCommands: ['docker system info', 'docker stats'],
				verificationCommands: ['docker build --no-cache .'],
				lastUpdated: '2025-01-15',
			},
			{
				id: 'build-compilation-failed',
				title: 'Solidity Compilation Failed',
				category: 'build',
				severity: 'high',
				platforms: ['windows', 'macos', 'linux', 'containers'],
				tags: ['solidity', 'compilation', 'hardhat'],
				problem: 'Smart contracts fail to compile',
				symptoms: [
					'Hardhat compilation errors',
					'Syntax errors in Solidity files',
					'Import resolution failures',
					'Compiler version mismatches',
				],
				solutions: [
					{
						title: 'Check Solidity Syntax',
						steps: [
							'Review error messages in terminal',
							'Check Solidity syntax in failing files',
							'Verify import paths are correct',
							'Ensure pragma version matches compiler',
						],
						validation: ['npx hardhat compile'],
						estimatedTime: 10,
						successRate: 85,
					},
					{
						title: 'Clear Build Artifacts',
						steps: [
							'Remove artifacts: rm -rf artifacts',
							'Remove cache: rm -rf cache',
							'Remove typechain: rm -rf typechain-types',
							'Recompile: yarn compile',
						],
						validation: ['ls artifacts/', 'yarn compile'],
						estimatedTime: 2,
						successRate: 95,
					},
				],
				prevention: [
					'Use consistent Solidity versions',
					'Run compilation after each change',
					'Use linter for syntax checking',
					'Keep dependencies updated',
				],
				relatedIssues: ['build-dependencies-missing', 'build-hardhat-config'],
				diagnosticCommands: ['npx hardhat compile --verbose'],
				verificationCommands: ['yarn test:unit', 'yarn compile'],
				lastUpdated: '2025-01-15',
			},
			{
				id: 'test-execution-failed',
				title: 'Test Execution Failed',
				category: 'testing',
				severity: 'medium',
				platforms: ['windows', 'macos', 'linux', 'containers'],
				tags: ['testing', 'hardhat', 'mocha'],
				problem: 'Automated tests fail to execute or pass',
				symptoms: [
					'Test suite crashes',
					'Timeout errors during testing',
					'Assertion failures',
					'Network connection issues in tests',
				],
				solutions: [
					{
						title: 'Run Tests with Debug Output',
						steps: [
							'Run single test: yarn test --grep "test name"',
							'Check test output for specific failures',
							'Review test setup and teardown',
							'Verify contract deployments in tests',
						],
						validation: ['yarn test:unit --verbose'],
						estimatedTime: 15,
						successRate: 80,
					},
					{
						title: 'Check Test Configuration',
						steps: [
							'Verify hardhat.config.ts settings',
							'Check test file structure',
							'Ensure test utilities are imported',
							'Validate network configuration',
						],
						validation: ['yarn test:unit --bail'],
						estimatedTime: 5,
						successRate: 90,
					},
				],
				prevention: [
					'Run tests after each code change',
					'Use descriptive test names',
					'Keep test coverage above 90%',
					'Review failing tests immediately',
				],
				relatedIssues: ['build-compilation-failed', 'env-network-issues'],
				diagnosticCommands: ['yarn test:unit --reporter verbose'],
				verificationCommands: ['yarn test:unit', 'yarn test:coverage'],
				lastUpdated: '2025-01-15',
			},
			{
				id: 'security-scan-failed',
				title: 'Security Scan Failed',
				category: 'security',
				severity: 'high',
				platforms: ['windows', 'macos', 'linux', 'containers'],
				tags: ['security', 'slither', 'audit'],
				problem: 'Security scanning tools report vulnerabilities',
				symptoms: [
					'Slither analysis fails',
					'High-severity vulnerabilities detected',
					'Security scan timeout',
					'False positive security alerts',
				],
				solutions: [
					{
						title: 'Review Security Findings',
						steps: [
							'Examine security scan output',
							'Identify false positives vs real issues',
							'Apply security fixes for valid findings',
							'Re-run security scan to verify fixes',
						],
						validation: ['yarn security-check'],
						estimatedTime: 30,
						successRate: 75,
					},
					{
						title: 'Update Security Tools',
						steps: [
							'Update Slither: pip install --upgrade slither-analyzer',
							'Update other security tools',
							'Check for new security rules',
							'Re-run security analysis',
						],
						validation: ['slither --version', 'yarn security-check'],
						estimatedTime: 10,
						successRate: 95,
					},
				],
				prevention: [
					'Run security scans in CI/CD pipeline',
					'Address security findings promptly',
					'Keep security tools updated',
					'Follow secure coding practices',
				],
				relatedIssues: ['build-compilation-failed', 'test-execution-failed'],
				diagnosticCommands: ['yarn security-check --verbose'],
				verificationCommands: ['yarn security-check', 'yarn audit'],
				lastUpdated: '2025-01-15',
			},
		];

		builtInEntries.forEach((entry) => {
			this.knowledgeBase.set(entry.id, entry);
		});
	}

	private loadCustomEntries(): void {
		// Load custom entries from knowledge base directory
		const categoriesPath = path.join(this.knowledgeBasePath, 'categories');

		if (fs.existsSync(categoriesPath)) {
			const categories = fs.readdirSync(categoriesPath);

			for (const category of categories) {
				const categoryPath = path.join(categoriesPath, category);
				if (fs.statSync(categoryPath).isDirectory()) {
					// Load entries from category subdirectories
					const entries = fs.readdirSync(categoryPath);
					for (const entry of entries) {
						if (entry.endsWith('.md')) {
							this.parseMarkdownEntry(path.join(categoryPath, entry));
						}
					}
				}
			}
		}
	}

	private parseMarkdownEntry(filePath: string): void {
		// Basic markdown parsing for custom entries
		// In a full implementation, this would use a proper markdown parser
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			// Parse frontmatter and content - simplified implementation
			const entry: Partial<KnowledgeBaseEntry> = {
				id: path.basename(filePath, '.md'),
				lastUpdated: new Date().toISOString().split('T')[0],
			};

			this.knowledgeBase.set(entry.id!, entry as KnowledgeBaseEntry);
		} catch (error) {
			console.warn(`Failed to parse knowledge base entry: ${filePath}`);
		}
	}

	private buildSearchIndex(): void {
		this.knowledgeBase.forEach((entry, id) => {
			const searchableText = [
				entry.title,
				entry.problem,
				...entry.symptoms,
				...entry.tags,
				entry.category,
				...entry.platforms,
			]
				.join(' ')
				.toLowerCase();

			const words = searchableText.match(/\b\w+\b/g) || [];
			words.forEach((word) => {
				if (!this.searchIndex.has(word)) {
					this.searchIndex.set(word, []);
				}
				this.searchIndex.get(word)!.push(id);
			});
		});
	}

	public search(
		query: string,
		options: {
			category?: string;
			severity?: string;
			platform?: string;
			limit?: number;
		} = {},
	): SearchResult[] {
		const terms = query.toLowerCase().match(/\b\w+\b/g) || [];
		const entryScores = new Map<string, { score: number; matchedTerms: string[] }>();

		// Calculate relevance scores
		terms.forEach((term) => {
			const entryIds = this.searchIndex.get(term) || [];
			entryIds.forEach((entryId) => {
				const entry = this.knowledgeBase.get(entryId);
				if (!entry) return;

				// Apply filters
				if (options.category && entry.category !== options.category) return;
				if (options.severity && entry.severity !== options.severity) return;
				if (options.platform && !entry.platforms.includes(options.platform)) return;

				if (!entryScores.has(entryId)) {
					entryScores.set(entryId, { score: 0, matchedTerms: [] });
				}

				const scoreData = entryScores.get(entryId)!;
				scoreData.score += this.calculateTermScore(term, entry);
				scoreData.matchedTerms.push(term);
			});
		});

		// Convert to results and sort by score
		const results: SearchResult[] = [];
		entryScores.forEach((scoreData, entryId) => {
			const entry = this.knowledgeBase.get(entryId);
			if (entry) {
				results.push({
					entry,
					relevanceScore: scoreData.score,
					matchedTerms: Array.from(new Set(scoreData.matchedTerms)),
					suggestedActions: this.generateSuggestedActions(entry),
				});
			}
		});

		results.sort((a, b) => b.relevanceScore - a.relevanceScore);

		return options.limit ? results.slice(0, options.limit) : results;
	}

	private calculateTermScore(term: string, entry: KnowledgeBaseEntry): number {
		let score = 1;

		// Title matches are most important
		if (entry.title.toLowerCase().includes(term)) score += 10;

		// Problem description matches
		if (entry.problem.toLowerCase().includes(term)) score += 5;

		// Symptom matches
		if (entry.symptoms.some((s) => s.toLowerCase().includes(term))) score += 3;

		// Tag matches
		if (entry.tags.some((t) => t.toLowerCase().includes(term))) score += 2;

		// Category/platform matches
		if (entry.category.toLowerCase().includes(term)) score += 1;
		if (entry.platforms.some((p) => p.toLowerCase().includes(term))) score += 1;

		// Severity weighting
		const severityWeights = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
		score *= severityWeights[entry.severity];

		return score;
	}

	private generateSuggestedActions(entry: KnowledgeBaseEntry): string[] {
		const actions = [];

		// Add diagnostic commands
		if (entry.diagnosticCommands.length > 0) {
			actions.push(`Run diagnostic: ${entry.diagnosticCommands[0]}`);
		}

		// Add primary solution steps
		if (entry.solutions.length > 0) {
			const primarySolution = entry.solutions[0];
			actions.push(`Try solution: ${primarySolution.title}`);
		}

		// Add verification
		if (entry.verificationCommands.length > 0) {
			actions.push(`Verify fix: ${entry.verificationCommands[0]}`);
		}

		return actions;
	}

	public getEntry(id: string): KnowledgeBaseEntry | undefined {
		return this.knowledgeBase.get(id);
	}

	public getRelatedEntries(entryId: string): KnowledgeBaseEntry[] {
		const entry = this.knowledgeBase.get(entryId);
		if (!entry) return [];

		return entry.relatedIssues
			.map((id) => this.knowledgeBase.get(id))
			.filter((entry): entry is KnowledgeBaseEntry => entry !== undefined);
	}

	public analyzeDiagnosticResults(results: DiagnosticResult[]): {
		issues: SearchResult[];
		recommendations: string[];
		priority: 'low' | 'medium' | 'high' | 'critical';
	} {
		const issues: SearchResult[] = [];
		const recommendations: string[] = [];
		let maxSeverity: number = 0;

		results.forEach((result) => {
			if (result.status === 'FAIL' || result.status === 'WARN') {
				// Search for relevant knowledge base entries
				const searchResults = this.search(result.message + ' ' + result.component, {
					limit: 3,
				});

				searchResults.forEach((searchResult) => {
					issues.push(searchResult);

					// Add recommendations
					if (result.recommendation) {
						recommendations.push(result.recommendation);
					}

					searchResult.suggestedActions.forEach((action) => {
						recommendations.push(action);
					});
				});

				// Track severity
				const severityScore = result.status === 'FAIL' ? 3 : 2;
				maxSeverity = Math.max(maxSeverity, severityScore);
			}
		});

		let priority: 'low' | 'medium' | 'high' | 'critical';
		if (maxSeverity >= 3) priority = 'critical';
		else if (maxSeverity >= 2) priority = 'high';
		else if (issues.length > 0) priority = 'medium';
		else priority = 'low';

		return {
			issues: issues.slice(0, 5), // Limit to top 5 issues
			recommendations: Array.from(new Set(recommendations)).slice(0, 10), // Limit to top 10 recommendations
			priority,
		};
	}

	public getStats(): {
		totalEntries: number;
		entriesByCategory: Record<string, number>;
		entriesBySeverity: Record<string, number>;
		lastUpdated: string;
	} {
		const entriesByCategory: Record<string, number> = {};
		const entriesBySeverity: Record<string, number> = {};
		let latestUpdate = '2025-01-01';

		this.knowledgeBase.forEach((entry) => {
			// Count by category
			entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;

			// Count by severity
			entriesBySeverity[entry.severity] = (entriesBySeverity[entry.severity] || 0) + 1;

			// Track latest update
			if (entry.lastUpdated > latestUpdate) {
				latestUpdate = entry.lastUpdated;
			}
		});

		return {
			totalEntries: this.knowledgeBase.size,
			entriesByCategory,
			entriesBySeverity,
			lastUpdated: latestUpdate,
		};
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const knowledgeBase = new DevContainerKnowledgeBase();

	if (args.length === 0) {
		console.log('DevContainer Knowledge Base Search Tool');
		console.log('=======================================\n');
		console.log('Usage:');
		console.log('  search <query> [options]     - Search knowledge base');
		console.log('  help <entry-id>              - Get detailed help for specific issue');
		console.log('  diagnose <report-file>       - Analyze diagnostic report');
		console.log('  stats                        - Show knowledge base statistics');
		console.log('  interactive                  - Start interactive troubleshooting');
		console.log('\nOptions:');
		console.log('  --category <cat>            - Filter by category');
		console.log('  --severity <sev>            - Filter by severity');
		console.log('  --platform <plat>           - Filter by platform');
		console.log('  --limit <num>               - Limit results');
		return;
	}

	const command = args[0];

	try {
		switch (command) {
			case 'search': {
				const query = args[1];
				if (!query) {
					console.error('Please provide a search query');
					process.exit(1);
				}

				const options: any = {};
				for (let i = 2; i < args.length; i += 2) {
					const flag = args[i];
					const value = args[i + 1];
					if (flag === '--category') options.category = value;
					if (flag === '--severity') options.severity = value;
					if (flag === '--platform') options.platform = value;
					if (flag === '--limit') options.limit = parseInt(value);
				}

				const results = knowledgeBase.search(query, options);

				console.log(`Found ${results.length} relevant solutions for: "${query}"\n`);

				results.forEach((result, index) => {
					console.log(`${index + 1}. ${result.entry.title}`);
					console.log(
						`   Category: ${result.entry.category} | Severity: ${result.entry.severity}`,
					);
					console.log(`   Relevance: ${result.relevanceScore.toFixed(1)}`);
					console.log(`   Platforms: ${result.entry.platforms.join(', ')}`);
					console.log(`   Tags: ${result.entry.tags.join(', ')}`);
					console.log(`   Problem: ${result.entry.problem}`);
					console.log('   Suggested Actions:');
					result.suggestedActions.forEach((action) => {
						console.log(`     • ${action}`);
					});
					console.log('');
				});
				break;
			}

			case 'help': {
				const entryId = args[1];
				if (!entryId) {
					console.error('Please provide an entry ID');
					process.exit(1);
				}

				const entry = knowledgeBase.getEntry(entryId);
				if (!entry) {
					console.error(`Entry not found: ${entryId}`);
					process.exit(1);
				}

				console.log(`# ${entry.title}\n`);
				console.log(`**Category:** ${entry.category} | **Severity:** ${entry.severity}`);
				console.log(`**Platforms:** ${entry.platforms.join(', ')}`);
				console.log(`**Tags:** ${entry.tags.join(', ')}\n`);
				console.log(`## Problem\n${entry.problem}\n`);
				console.log(`## Symptoms\n${entry.symptoms.map((s) => `- ${s}`).join('\n')}\n`);

				entry.solutions.forEach((solution, index) => {
					console.log(`## Solution ${index + 1}: ${solution.title}`);
					console.log(`**Estimated Time:** ${solution.estimatedTime} minutes`);
					console.log(`**Success Rate:** ${solution.successRate}%\n`);
					console.log('Steps:');
					solution.steps.forEach((step, stepIndex) => {
						console.log(`${stepIndex + 1}. ${step}`);
					});
					console.log('\nValidation:');
					solution.validation.forEach((cmd) => {
						console.log(`   \`${cmd}\``);
					});
					console.log('');
				});

				if (entry.relatedIssues.length > 0) {
					console.log(
						`## Related Issues\n${entry.relatedIssues.map((id) => `- ${id}`).join('\n')}\n`,
					);
				}
				break;
			}

			case 'diagnose': {
				const reportFile = args[1];
				if (!reportFile || !fs.existsSync(reportFile)) {
					console.error('Please provide a valid diagnostic report file');
					process.exit(1);
				}

				const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
				const analysis = knowledgeBase.analyzeDiagnosticResults(report.results);

				console.log('Diagnostic Analysis Results');
				console.log('===========================\n');
				console.log(`Priority Level: ${analysis.priority.toUpperCase()}\n`);

				if (analysis.issues.length > 0) {
					console.log('Identified Issues:');
					analysis.issues.forEach((result, index) => {
						console.log(
							`${index + 1}. ${result.entry.title} (Relevance: ${result.relevanceScore.toFixed(1)})`,
						);
						console.log(`   ${result.entry.problem}`);
					});
					console.log('');
				}

				if (analysis.recommendations.length > 0) {
					console.log('Recommended Actions:');
					analysis.recommendations.forEach((rec, index) => {
						console.log(`${index + 1}. ${rec}`);
					});
					console.log('');
				}
				break;
			}

			case 'stats': {
				const stats = knowledgeBase.getStats();
				console.log('Knowledge Base Statistics');
				console.log('=========================\n');
				console.log(`Total Entries: ${stats.totalEntries}`);
				console.log(`Last Updated: ${stats.lastUpdated}\n`);
				console.log('Entries by Category:');
				Object.entries(stats.entriesByCategory).forEach(([cat, count]) => {
					console.log(`  ${cat}: ${count}`);
				});
				console.log('\nEntries by Severity:');
				Object.entries(stats.entriesBySeverity).forEach(([sev, count]) => {
					console.log(`  ${sev}: ${count}`);
				});
				break;
			}

			case 'interactive': {
				await runInteractiveMode(knowledgeBase);
				break;
			}

			default:
				console.error(`Unknown command: ${command}`);
				process.exit(1);
		}
	} catch (error: any) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

async function runInteractiveMode(knowledgeBase: DevContainerKnowledgeBase): Promise<void> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log('🤖 DevContainer AI Support Assistant');
	console.log('====================================\n');
	console.log("Describe your issue and I'll help you find solutions.\n");

	const askQuestion = (question: string): Promise<string> => {
		return new Promise((resolve) => {
			rl.question(question, resolve);
		});
	};

	try {
		while (true) {
			const issue = await askQuestion(
				'What issue are you experiencing? (or "quit" to exit): ',
			);

			if (issue.toLowerCase() === 'quit' || issue.toLowerCase() === 'exit') {
				break;
			}

			if (!issue.trim()) {
				console.log('Please describe your issue.\n');
				continue;
			}

			console.log('\n🔍 Searching for solutions...\n');

			const results = knowledgeBase.search(issue, { limit: 3 });

			if (results.length === 0) {
				console.log(
					'No specific solutions found. Let me suggest some general troubleshooting steps:',
				);
				console.log('1. Run diagnostics: yarn devcontainer:diagnose');
				console.log('2. Check the troubleshooting guide');
				console.log('3. Search our community forums');
				console.log('4. Contact support with diagnostic report\n');
				continue;
			}

			results.forEach((result, index) => {
				console.log(`${index + 1}. ${result.entry.title}`);
				console.log(`   ${result.entry.problem}`);
				console.log('   Quick Fix:');
				result.suggestedActions.slice(0, 2).forEach((action) => {
					console.log(`     • ${action}`);
				});
				console.log('');
			});

			const choice = await askQuestion(
				'Which solution would you like to explore? (1-3 or "none"): ',
			);

			if (choice >= '1' && choice <= '3') {
				const selectedResult = results[parseInt(choice) - 1];
				const entry = selectedResult.entry;

				console.log(`\n📋 Detailed Solution: ${entry.title}\n`);
				console.log(`Problem: ${entry.problem}\n`);

				if (entry.solutions.length > 0) {
					const solution = entry.solutions[0];
					console.log(`Recommended Solution: ${solution.title}`);
					console.log('Steps:');
					solution.steps.forEach((step, index) => {
						console.log(`  ${index + 1}. ${step}`);
					});
					console.log('\nValidation:');
					solution.validation.forEach((cmd) => {
						console.log(`  ${cmd}`);
					});
				}

				const help = await askQuestion('\nDid this solve your issue? (y/n): ');
				if (help.toLowerCase() === 'n') {
					console.log('Would you like me to escalate this to human support?');
					const escalate = await askQuestion('(y/N): ');
					if (escalate.toLowerCase() === 'y') {
						console.log('Escalating to human support...');
						// In a real implementation, this would create a support ticket
					}
				}
			}

			console.log('');
		}
	} finally {
		rl.close();
	}

	console.log('Thank you for using DevContainer AI Support! 👋');
}

// Export for programmatic use
export { DevContainerKnowledgeBase, KnowledgeBaseEntry, SearchResult };

// Run CLI if called directly
if (require.main === module) {
	main().catch(console.error);
}
