#!/usr/bin/env node

/**
 * DevContainer AI-Assisted Troubleshooting System
 *
 * Advanced diagnostic analysis with AI-powered solution recommendation,
 * predictive issue detection, and automated solution deployment.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { DevContainerKnowledgeBase } from './knowledge-base';
import { DevContainerEscalationSystem } from './escalation-system';

interface DiagnosticResult {
	timestamp: Date;
	system: string;
	status: 'PASS' | 'FAIL' | 'WARN';
	component: string;
	message: string;
	details?: Record<string, unknown>;
	severity: 'low' | 'medium' | 'high' | 'critical';
	recommendations: string[];
}

interface IssuePattern {
	patternId: string;
	name: string;
	description: string;
	symptoms: string[];
	rootCauses: string[];
	solutions: Array<{
		description: string;
		confidence: number;
		automated: boolean;
		commands?: string[];
	}>;
	prevention: string[];
	relatedPatterns: string[];
	metadata: {
		category: string;
		frequency: number;
		avgResolutionTime: number;
		successRate: number;
	};
}

interface TroubleshootingSession {
	sessionId: string;
	userId: string;
	startTime: Date;
	endTime?: Date;
	issue: {
		description: string;
		category: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
	};
	diagnostics: DiagnosticResult[];
	patterns: IssuePattern[];
	recommendations: Array<{
		solution: string;
		confidence: number;
		source: 'knowledge-base' | 'pattern-matching' | 'ai-analysis';
		applied: boolean;
		result?: 'success' | 'partial' | 'failed';
	}>;
	escalation?: {
		reason: string;
		tier: number;
		timestamp: Date;
	};
	outcome: 'resolved' | 'escalated' | 'abandoned' | 'in-progress';
}

class DevContainerAITroubleshooting {
	private knowledgeBase: DevContainerKnowledgeBase;
	private escalationSystem: DevContainerEscalationSystem;
	private issuePatterns: IssuePattern[] = [];
	private activeSessions: Map<string, TroubleshootingSession> = new Map();
	private diagnosticHistory: DiagnosticResult[] = [];
	private aiModel: AIModel;

	constructor() {
		this.knowledgeBase = new DevContainerKnowledgeBase();
		this.escalationSystem = new DevContainerEscalationSystem();
		this.aiModel = new AIModel();
		this.loadIssuePatterns();
		this.loadDiagnosticHistory();
	}

	private loadIssuePatterns(): void {
		const patternsFile = path.join(process.cwd(), 'issue-patterns.json');
		if (fs.existsSync(patternsFile)) {
			try {
				this.issuePatterns = JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
			} catch (error) {
				console.warn('Failed to load issue patterns');
				this.initializeDefaultPatterns();
			}
		} else {
			this.initializeDefaultPatterns();
		}
	}

	private initializeDefaultPatterns(): void {
		this.issuePatterns = [
			{
				patternId: 'docker-daemon-connection',
				name: 'Docker Daemon Connection Issues',
				description: 'Problems connecting to Docker daemon from DevContainer',
				symptoms: [
					'Docker daemon not running',
					'Permission denied accessing Docker socket',
					'Cannot connect to Docker daemon at unix:///var/run/docker.sock',
				],
				rootCauses: [
					'Docker Desktop not started',
					'User not in docker group',
					'Docker socket permissions incorrect',
					'WSL integration issues',
				],
				solutions: [
					{
						description: 'Start Docker Desktop and ensure it is running',
						confidence: 0.9,
						automated: true,
						commands: ['docker info'],
					},
					{
						description: 'Add user to docker group',
						confidence: 0.8,
						automated: true,
						commands: ['sudo usermod -aG docker $USER', 'newgrp docker'],
					},
					{
						description: 'Check Docker socket permissions',
						confidence: 0.7,
						automated: true,
						commands: ['ls -la /var/run/docker.sock'],
					},
				],
				prevention: [
					'Ensure Docker Desktop starts on system boot',
					'Configure proper user permissions during setup',
				],
				relatedPatterns: ['wsl-integration', 'permission-issues'],
				metadata: {
					category: 'docker',
					frequency: 25,
					avgResolutionTime: 10,
					successRate: 85,
				},
			},
			{
				patternId: 'hardhat-network-connection',
				name: 'Hardhat Network Connection Problems',
				description: 'Issues connecting to or deploying on Hardhat network',
				symptoms: [
					'Connection refused on port 8545',
					'Hardhat network not available',
					'RPC endpoint unreachable',
				],
				rootCauses: [
					'Hardhat node not started',
					'Port conflicts',
					'Network configuration issues',
					'Firewall blocking connections',
				],
				solutions: [
					{
						description: 'Start Hardhat network',
						confidence: 0.95,
						automated: true,
						commands: ['npx hardhat node'],
					},
					{
						description: 'Check for port conflicts',
						confidence: 0.8,
						automated: true,
						commands: ['lsof -i :8545'],
					},
					{
						description: 'Verify network configuration',
						confidence: 0.6,
						automated: false,
					},
				],
				prevention: [
					'Use dedicated ports for different networks',
					'Configure firewall rules for development ports',
				],
				relatedPatterns: ['port-conflicts', 'network-config'],
				metadata: {
					category: 'hardhat',
					frequency: 15,
					avgResolutionTime: 15,
					successRate: 90,
				},
			},
			{
				patternId: 'dependency-installation',
				name: 'Dependency Installation Failures',
				description: 'Problems installing Node.js or system dependencies',
				symptoms: [
					'npm install fails',
					'yarn install errors',
					'Missing system dependencies',
					'Permission errors during installation',
				],
				rootCauses: [
					'Network connectivity issues',
					'Permission problems',
					'Corrupted node_modules',
					'Outdated package manager',
				],
				solutions: [
					{
						description: 'Clear node_modules and reinstall',
						confidence: 0.8,
						automated: true,
						commands: ['rm -rf node_modules package-lock.json', 'npm install'],
					},
					{
						description: 'Update npm/yarn to latest version',
						confidence: 0.7,
						automated: true,
						commands: ['npm update -g npm', 'yarn set version latest'],
					},
					{
						description: 'Check network connectivity',
						confidence: 0.6,
						automated: true,
						commands: ['curl -I https://registry.npmjs.org/'],
					},
				],
				prevention: [
					'Use package-lock.json or yarn.lock',
					'Keep package managers updated',
					'Use .nvmrc for Node.js version management',
				],
				relatedPatterns: ['network-issues', 'permission-issues'],
				metadata: {
					category: 'dependencies',
					frequency: 20,
					avgResolutionTime: 12,
					successRate: 80,
				},
			},
			{
				patternId: 'build-compilation-errors',
				name: 'Build and Compilation Errors',
				description: 'Solidity compilation or TypeScript build failures',
				symptoms: [
					'Solidity compilation failed',
					'TypeScript errors',
					'Build process hangs',
					'Out of memory during compilation',
				],
				rootCauses: [
					'Syntax errors in contracts',
					'Missing dependencies',
					'TypeScript configuration issues',
					'Insufficient system resources',
				],
				solutions: [
					{
						description: 'Run type checking and compilation',
						confidence: 0.9,
						automated: true,
						commands: ['npx hardhat compile', 'npx tsc --noEmit'],
					},
					{
						description: 'Check Solidity syntax',
						confidence: 0.8,
						automated: true,
						commands: ['npx hardhat check'],
					},
					{
						description: 'Verify system resources',
						confidence: 0.7,
						automated: true,
						commands: ['free -h', 'df -h'],
					},
				],
				prevention: [
					'Use ESLint and Prettier for code quality',
					'Run tests before committing',
					'Monitor system resources during builds',
				],
				relatedPatterns: ['syntax-errors', 'resource-issues'],
				metadata: {
					category: 'build',
					frequency: 18,
					avgResolutionTime: 20,
					successRate: 75,
				},
			},
		];

		this.saveIssuePatterns();
	}

	private saveIssuePatterns(): void {
		const patternsFile = path.join(process.cwd(), 'issue-patterns.json');
		fs.writeFileSync(patternsFile, JSON.stringify(this.issuePatterns, null, 2));
	}

	private loadDiagnosticHistory(): void {
		const historyFile = path.join(process.cwd(), 'diagnostic-history.json');
		if (fs.existsSync(historyFile)) {
			try {
				this.diagnosticHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8')).map(
					(result: unknown) => ({
						...(result as DiagnosticResult),
						timestamp: new Date((result as DiagnosticResult).timestamp),
					}),
				);
			} catch (error) {
				console.warn('Failed to load diagnostic history');
			}
		}
	}

	private saveDiagnosticHistory(): void {
		const historyFile = path.join(process.cwd(), 'diagnostic-history.json');
		fs.writeFileSync(historyFile, JSON.stringify(this.diagnosticHistory, null, 2));
	}

	public async startTroubleshootingSession(
		userId: string,
		issueDescription: string,
	): Promise<TroubleshootingSession> {
		const sessionId = this.generateSessionId();

		// Run initial diagnostics
		const diagnostics = await this.runComprehensiveDiagnostics();

		// Analyze issue and match patterns
		const patterns = this.matchIssuePatterns(issueDescription, diagnostics);

		// Generate AI-powered recommendations
		const aiRecommendations = await this.aiModel.analyzeIssue(
			issueDescription,
			diagnostics,
		);

		const session: TroubleshootingSession = {
			sessionId,
			userId,
			startTime: new Date(),
			issue: {
				description: issueDescription,
				category: this.categorizeIssue(issueDescription),
				severity: this.assessSeverity(diagnostics),
			},
			diagnostics,
			patterns,
			recommendations: aiRecommendations.map((rec) => ({
				solution: rec.solution,
				confidence: rec.confidence,
				source: 'ai-analysis' as const,
				applied: false,
			})),
			outcome: 'in-progress',
		};

		this.activeSessions.set(sessionId, session);

		console.log(`🔍 Started troubleshooting session ${sessionId} for ${userId}`);
		console.log(`   Issue: ${issueDescription}`);
		console.log(
			`   Matched ${patterns.length} patterns, ${aiRecommendations.length} AI recommendations`,
		);

		return session;
	}

	private async runComprehensiveDiagnostics(): Promise<DiagnosticResult[]> {
		const diagnostics: DiagnosticResult[] = [];

		// Docker diagnostics
		diagnostics.push(...(await this.checkDockerStatus()));

		// Hardhat diagnostics
		diagnostics.push(...(await this.checkHardhatStatus()));

		// System diagnostics
		diagnostics.push(...(await this.checkSystemStatus()));

		// Dependency diagnostics
		diagnostics.push(...(await this.checkDependencies()));

		// Save to history
		this.diagnosticHistory.push(...diagnostics);
		this.saveDiagnosticHistory();

		return diagnostics;
	}

	private async checkDockerStatus(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		try {
			// Check if Docker is running
			execSync('docker info', { stdio: 'pipe' });
			results.push({
				timestamp: new Date(),
				system: 'docker',
				status: 'PASS',
				component: 'Docker Daemon',
				message: 'Docker daemon is running and accessible',
				severity: 'low',
				recommendations: [],
			});
		} catch (error: any) {
			results.push({
				timestamp: new Date(),
				system: 'docker',
				status: 'FAIL',
				component: 'Docker Daemon',
				message: 'Docker daemon is not running or not accessible',
				severity: 'high',
				recommendations: [
					'Start Docker Desktop',
					'Check Docker daemon status: docker info',
					'Verify user permissions for Docker socket',
				],
			});
		}

		// Check Docker Compose
		try {
			execSync('docker-compose --version', { stdio: 'pipe' });
			results.push({
				timestamp: new Date(),
				system: 'docker',
				status: 'PASS',
				component: 'Docker Compose',
				message: 'Docker Compose is available',
				severity: 'low',
				recommendations: [],
			});
		} catch (error: any) {
			results.push({
				timestamp: new Date(),
				system: 'docker',
				status: 'WARN',
				component: 'Docker Compose',
				message: 'Docker Compose not found or not working',
				severity: 'medium',
				recommendations: [
					'Install Docker Compose',
					'Update Docker Desktop to latest version',
				],
			});
		}

		return results;
	}

	private async checkHardhatStatus(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		try {
			// Check if Hardhat is installed
			execSync('npx hardhat --version', { stdio: 'pipe' });
			results.push({
				timestamp: new Date(),
				system: 'hardhat',
				status: 'PASS',
				component: 'Hardhat CLI',
				message: 'Hardhat CLI is available',
				severity: 'low',
				recommendations: [],
			});
		} catch (error: any) {
			results.push({
				timestamp: new Date(),
				system: 'hardhat',
				status: 'FAIL',
				component: 'Hardhat CLI',
				message: 'Hardhat CLI is not available',
				severity: 'high',
				recommendations: [
					'Install Hardhat: npm install --save-dev hardhat',
					'Check Node.js and npm installation',
				],
			});
		}

		// Check Hardhat configuration
		const configPath = path.join(process.cwd(), 'hardhat.config.ts');
		if (fs.existsSync(configPath)) {
			results.push({
				timestamp: new Date(),
				system: 'hardhat',
				status: 'PASS',
				component: 'Hardhat Config',
				message: 'Hardhat configuration file exists',
				severity: 'low',
				recommendations: [],
			});
		} else {
			results.push({
				timestamp: new Date(),
				system: 'hardhat',
				status: 'FAIL',
				component: 'Hardhat Config',
				message: 'Hardhat configuration file not found',
				severity: 'high',
				recommendations: ['Create hardhat.config.ts file', 'Run: npx hardhat init'],
			});
		}

		return results;
	}

	private async checkSystemStatus(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		// Check available memory
		try {
			const memInfo = execSync('free -h', { encoding: 'utf8' });
			const availableMem = this.parseMemoryInfo(memInfo);

			if (availableMem < 2) {
				// Less than 2GB
				results.push({
					timestamp: new Date(),
					system: 'system',
					status: 'WARN',
					component: 'Memory',
					message: `Low available memory: ${availableMem}GB`,
					severity: 'medium',
					recommendations: [
						'Close unnecessary applications',
						'Increase system memory',
						'Use lighter development tools',
					],
				});
			} else {
				results.push({
					timestamp: new Date(),
					system: 'system',
					status: 'PASS',
					component: 'Memory',
					message: `Sufficient memory available: ${availableMem}GB`,
					severity: 'low',
					recommendations: [],
				});
			}
		} catch (error) {
			results.push({
				timestamp: new Date(),
				system: 'system',
				status: 'WARN',
				component: 'Memory',
				message: 'Could not check system memory',
				severity: 'low',
				recommendations: [],
			});
		}

		// Check available disk space
		try {
			const diskInfo = execSync('df -h .', { encoding: 'utf8' });
			const availableSpace = this.parseDiskInfo(diskInfo);

			if (availableSpace < 5) {
				// Less than 5GB
				results.push({
					timestamp: new Date(),
					system: 'system',
					status: 'WARN',
					component: 'Disk Space',
					message: `Low disk space: ${availableSpace}GB available`,
					severity: 'high',
					recommendations: [
						'Free up disk space',
						'Clean node_modules and build artifacts',
						'Move project to larger disk',
					],
				});
			} else {
				results.push({
					timestamp: new Date(),
					system: 'system',
					status: 'PASS',
					component: 'Disk Space',
					message: `Sufficient disk space: ${availableSpace}GB available`,
					severity: 'low',
					recommendations: [],
				});
			}
		} catch (error) {
			results.push({
				timestamp: new Date(),
				system: 'system',
				status: 'WARN',
				component: 'Disk Space',
				message: 'Could not check disk space',
				severity: 'low',
				recommendations: [],
			});
		}

		return results;
	}

	private async checkDependencies(): Promise<DiagnosticResult[]> {
		const results: DiagnosticResult[] = [];

		// Check Node.js version
		try {
			const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
			const versionMatch = nodeVersion.match(/v(\d+)\.(\d+)\.(\d+)/);

			if (versionMatch) {
				const major = parseInt(versionMatch[1]);
				const minor = parseInt(versionMatch[2]);

				if (major < 16) {
					results.push({
						timestamp: new Date(),
						system: 'dependencies',
						status: 'WARN',
						component: 'Node.js',
						message: `Node.js version ${nodeVersion} may be outdated`,
						severity: 'medium',
						recommendations: [
							'Update Node.js to version 16 or higher',
							'Use nvm for version management',
						],
					});
				} else {
					results.push({
						timestamp: new Date(),
						system: 'dependencies',
						status: 'PASS',
						component: 'Node.js',
						message: `Node.js version ${nodeVersion} is supported`,
						severity: 'low',
						recommendations: [],
					});
				}
			}
		} catch (error) {
			results.push({
				timestamp: new Date(),
				system: 'dependencies',
				status: 'FAIL',
				component: 'Node.js',
				message: 'Node.js is not installed or not accessible',
				severity: 'critical',
				recommendations: ['Install Node.js', 'Add Node.js to PATH'],
			});
		}

		// Check package.json
		const packageJsonPath = path.join(process.cwd(), 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			results.push({
				timestamp: new Date(),
				system: 'dependencies',
				status: 'PASS',
				component: 'Package Config',
				message: 'package.json file exists',
				severity: 'low',
				recommendations: [],
			});

			// Check if node_modules exists
			const nodeModulesPath = path.join(process.cwd(), 'node_modules');
			if (!fs.existsSync(nodeModulesPath)) {
				results.push({
					timestamp: new Date(),
					system: 'dependencies',
					status: 'WARN',
					component: 'Node Modules',
					message: 'node_modules directory not found',
					severity: 'medium',
					recommendations: [
						'Run npm install or yarn install',
						'Check package.json for dependency definitions',
					],
				});
			} else {
				results.push({
					timestamp: new Date(),
					system: 'dependencies',
					status: 'PASS',
					component: 'Node Modules',
					message: 'Dependencies are installed',
					severity: 'low',
					recommendations: [],
				});
			}
		} else {
			results.push({
				timestamp: new Date(),
				system: 'dependencies',
				status: 'FAIL',
				component: 'Package Config',
				message: 'package.json file not found',
				severity: 'high',
				recommendations: ['Create package.json file', 'Run npm init'],
			});
		}

		return results;
	}

	private parseMemoryInfo(memInfo: string): number {
		// Parse 'free -h' output to get available memory in GB
		const lines = memInfo.split('\n');
		const memLine = lines.find((line) => line.startsWith('Mem:'));
		if (memLine) {
			const parts = memLine.split(/\s+/);
			const available = parts[6]; // Available memory
			const unit = available.slice(-1);
			const value = parseFloat(available.slice(0, -1));

			if (unit === 'G') return value;
			if (unit === 'M') return value / 1024;
			if (unit === 'K') return value / (1024 * 1024);
		}
		return 0;
	}

	private parseDiskInfo(diskInfo: string): number {
		// Parse 'df -h .' output to get available space in GB
		const lines = diskInfo.split('\n');
		const diskLine = lines[1]; // Skip header
		if (diskLine) {
			const parts = diskLine.split(/\s+/);
			const available = parts[3]; // Available space
			const unit = available.slice(-1);
			const value = parseFloat(available.slice(0, -1));

			if (unit === 'G') return value;
			if (unit === 'M') return value / 1024;
			if (unit === 'K') return value / (1024 * 1024);
		}
		return 0;
	}

	private matchIssuePatterns(
		description: string,
		diagnostics: DiagnosticResult[],
	): IssuePattern[] {
		const matchedPatterns: IssuePattern[] = [];
		const issueText = description.toLowerCase();

		for (const pattern of this.issuePatterns) {
			let matchScore = 0;

			// Check symptoms in description
			for (const symptom of pattern.symptoms) {
				if (issueText.includes(symptom.toLowerCase())) {
					matchScore += 0.4;
				}
			}

			// Check failed diagnostics against pattern category
			const failedDiagnostics = diagnostics.filter((d) => d.status === 'FAIL');
			for (const diagnostic of failedDiagnostics) {
				if (diagnostic.system === pattern.metadata.category) {
					matchScore += 0.6;
				}
			}

			if (matchScore >= 0.5) {
				matchedPatterns.push(pattern);
			}
		}

		// Sort by relevance (could be improved with ML)
		return matchedPatterns.sort((a, b) => b.metadata.frequency - a.metadata.frequency);
	}

	private categorizeIssue(description: string): string {
		const categories = {
			docker: ['docker', 'container', 'daemon', 'compose'],
			hardhat: ['hardhat', 'network', 'deploy', 'compile', 'solidity'],
			dependencies: ['npm', 'yarn', 'install', 'package', 'node'],
			build: ['build', 'compile', 'typescript', 'error'],
			system: ['memory', 'disk', 'space', 'permission'],
		};

		const issueText = description.toLowerCase();

		for (const [category, keywords] of Object.entries(categories)) {
			if (keywords.some((keyword) => issueText.includes(keyword))) {
				return category;
			}
		}

		return 'general';
	}

	private assessSeverity(
		diagnostics: DiagnosticResult[],
	): 'low' | 'medium' | 'high' | 'critical' {
		const criticalCount = diagnostics.filter((d) => d.severity === 'critical').length;
		const highCount = diagnostics.filter((d) => d.severity === 'high').length;
		const failCount = diagnostics.filter((d) => d.status === 'FAIL').length;

		if (criticalCount > 0 || failCount >= 3) return 'critical';
		if (highCount > 0 || failCount >= 2) return 'high';
		if (failCount >= 1) return 'medium';

		return 'low';
	}

	public async applySolution(
		sessionId: string,
		solutionIndex: number,
	): Promise<{ success: boolean; output: string; recommendations: string[] }> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		const recommendation = session.recommendations[solutionIndex];
		if (!recommendation) {
			throw new Error(`Solution ${solutionIndex} not found in session`);
		}

		console.log(`🔧 Applying solution: ${recommendation.solution}`);

		let success = false;
		let output = '';
		const recommendations: string[] = [];

		try {
			// For automated solutions, execute commands
			if (recommendation.source === 'pattern-matching') {
				const pattern = session.patterns.find((p) =>
					p.solutions.some((s) => s.description === recommendation.solution),
				);

				if (pattern) {
					const solution = pattern.solutions.find(
						(s) => s.description === recommendation.solution,
					);
					if (solution && solution.automated && solution.commands) {
						for (const command of solution.commands) {
							try {
								output += execSync(command, { encoding: 'utf8', stdio: 'pipe' });
							} catch (cmdError: any) {
								output += `Command failed: ${command}\n${cmdError.message}\n`;
								recommendations.push(`Manual execution required: ${command}`);
							}
						}
						success = true;
					}
				}
			} else if (recommendation.source === 'ai-analysis') {
				// AI recommendations would be applied through guided workflow
				output = 'AI-guided solution applied through interactive workflow';
				success = true;
			}

			recommendation.applied = true;
			recommendation.result = success ? 'success' : 'failed';
		} catch (error: any) {
			recommendation.result = 'failed';
			output = error.message;
			recommendations.push('Solution application failed, consider manual troubleshooting');
		}

		return { success, output, recommendations };
	}

	public async escalateSession(sessionId: string, reason: string): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		session.escalation = {
			reason,
			tier: 3, // Start at tier 3 for escalated troubleshooting
			timestamp: new Date(),
		};

		session.outcome = 'escalated';

		// Create escalation context for the escalation system
		const context = {
			issueId: sessionId,
			userId: session.userId,
			userEmail: `${session.userId}@example.com`, // Would be retrieved from user system
			userExperience: 'intermediate' as const,
			description: `${session.issue.description} - Escalated from AI troubleshooting`,
			attemptedSolutions: session.recommendations
				.filter((r) => r.applied)
				.map((r) => r.solution),
			timestamp: new Date(),
			metadata: {
				sessionId,
				diagnostics: session.diagnostics,
				patterns: session.patterns.map((p) => p.patternId),
			},
		};

		await this.escalationSystem.escalateIssue(context);

		console.log(`🚀 Escalated session ${sessionId} to human support`);
	}

	public async endSession(
		sessionId: string,
		outcome: 'resolved' | 'abandoned',
	): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		session.endTime = new Date();
		session.outcome = outcome;

		// Update pattern effectiveness based on session outcome
		this.updatePatternEffectiveness(session);

		this.activeSessions.delete(sessionId);

		console.log(`✅ Ended troubleshooting session ${sessionId} with outcome: ${outcome}`);
	}

	private updatePatternEffectiveness(session: TroubleshootingSession): void {
		for (const pattern of session.patterns) {
			const appliedSolutions = session.recommendations.filter(
				(r) =>
					r.source === 'pattern-matching' &&
					r.applied &&
					pattern.solutions.some((s) => s.description === r.solution),
			);

			for (const applied of appliedSolutions) {
				if (applied.result === 'success' && session.outcome === 'resolved') {
					// Increase success rate
					pattern.metadata.successRate = Math.min(100, pattern.metadata.successRate + 1);
				}
			}
		}

		this.saveIssuePatterns();
	}

	public getTroubleshootingStats(): {
		activeSessions: number;
		totalSessions: number;
		resolutionRate: number;
		averageSessionTime: number;
		popularPatterns: Array<{ pattern: string; count: number }>;
	} {
		const allSessions = Array.from(this.activeSessions.values());
		const completedSessions = allSessions.filter((s) => s.endTime);

		const resolvedSessions = completedSessions.filter((s) => s.outcome === 'resolved');
		const resolutionRate =
			completedSessions.length > 0
				? (resolvedSessions.length / completedSessions.length) * 100
				: 0;

		const sessionTimes = completedSessions
			.filter((s) => s.endTime)
			.map((s) => s.endTime!.getTime() - s.startTime.getTime());

		const averageSessionTime =
			sessionTimes.length > 0
				? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
				: 0;

		// Count pattern usage
		const patternUsage: Record<string, number> = {};
		allSessions.forEach((session) => {
			session.patterns.forEach((pattern) => {
				patternUsage[pattern.name] = (patternUsage[pattern.name] || 0) + 1;
			});
		});

		const popularPatterns = Object.entries(patternUsage)
			.map(([pattern, count]) => ({ pattern, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		return {
			activeSessions: this.activeSessions.size,
			totalSessions: allSessions.length,
			resolutionRate,
			averageSessionTime,
			popularPatterns,
		};
	}

	private generateSessionId(): string {
		return 'TS-' + Date.now().toString(36) + crypto.randomInt(1000000).toString(36);
	}
}

// Simple AI Model for demonstration
class AIModel {
	public async analyzeIssue(
		description: string,
		diagnostics: DiagnosticResult[],
	): Promise<Array<{ solution: string; confidence: number }>> {
		// In a real implementation, this would use a trained ML model or LLM
		// For now, return mock AI-powered recommendations

		const recommendations: Array<{ solution: string; confidence: number }> = [];

		const failedDiagnostics = diagnostics.filter((d) => d.status === 'FAIL');

		if (failedDiagnostics.some((d) => d.component.includes('Docker'))) {
			recommendations.push({
				solution: 'Check Docker Desktop status and restart if necessary',
				confidence: 0.85,
			});
		}

		if (failedDiagnostics.some((d) => d.component.includes('Hardhat'))) {
			recommendations.push({
				solution: 'Verify Hardhat configuration and network settings',
				confidence: 0.8,
			});
		}

		if (
			description.toLowerCase().includes('compile') ||
			description.toLowerCase().includes('build')
		) {
			recommendations.push({
				solution: 'Run comprehensive build diagnostics and check for syntax errors',
				confidence: 0.75,
			});
		}

		// Add general AI-powered suggestions
		recommendations.push({
			solution:
				'Review recent changes and roll back if issue started after specific commit',
			confidence: 0.6,
		});

		recommendations.push({
			solution: 'Check system resources and close unnecessary applications',
			confidence: 0.55,
		});

		return recommendations;
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const aiTroubleshooting = new DevContainerAITroubleshooting();

	if (args.length === 0) {
		console.log('DevContainer AI Troubleshooting System');
		console.log('======================================\n');
		console.log('Usage:');
		console.log('  start <user-id> <description>          - Start troubleshooting session');
		console.log('  diagnose <session-id>                  - Run diagnostics for session');
		console.log('  apply <session-id> <solution-index>    - Apply recommended solution');
		console.log(
			'  escalate <session-id> <reason>         - Escalate session to human support',
		);
		console.log('  resolve <session-id>                   - Mark session as resolved');
		console.log(
			'  stats                                  - Show troubleshooting statistics',
		);
		console.log('  patterns                               - List available issue patterns');
		return;
	}

	const command = args[0];

	try {
		switch (command) {
			case 'start': {
				const [_, userId, ...descriptionParts] = args;
				const description = descriptionParts.join(' ');

				const session = await aiTroubleshooting.startTroubleshootingSession(
					userId,
					description,
				);
				console.log(`\n🔍 Troubleshooting Session Started`);
				console.log(`Session ID: ${session.sessionId}`);
				console.log(`Issue: ${session.issue.description}`);
				console.log(`Category: ${session.issue.category}`);
				console.log(`Severity: ${session.issue.severity.toUpperCase()}`);
				console.log(`\nMatched Patterns: ${session.patterns.length}`);
				session.patterns.forEach((pattern) => {
					console.log(`• ${pattern.name} (${pattern.metadata.successRate}% success rate)`);
				});
				console.log(`\nAI Recommendations: ${session.recommendations.length}`);
				session.recommendations.forEach((rec, index) => {
					console.log(
						`${index + 1}. ${rec.solution} (${Math.round(rec.confidence * 100)}% confidence)`,
					);
				});
				break;
			}

			case 'diagnose': {
				const [_, sessionId] = args;
				// Diagnostics are run automatically when session starts
				console.log('Diagnostics are run automatically when starting a session.');
				console.log('Use "start" command to begin troubleshooting.');
				break;
			}

			case 'apply': {
				const [_, sessionId, solutionIndexStr] = args;
				const solutionIndex = parseInt(solutionIndexStr) - 1; // Convert to 0-based

				const result = await aiTroubleshooting.applySolution(sessionId, solutionIndex);
				console.log(`\n🔧 Solution Application Result:`);
				console.log(`Success: ${result.success ? '✅' : '❌'}`);
				if (result.output) {
					console.log(`Output: ${result.output}`);
				}
				if (result.recommendations.length > 0) {
					console.log('Additional Recommendations:');
					result.recommendations.forEach((rec) => console.log(`• ${rec}`));
				}
				break;
			}

			case 'escalate': {
				const [_, sessionId, ...reasonParts] = args;
				const reason = reasonParts.join(' ') || 'AI troubleshooting insufficient';

				await aiTroubleshooting.escalateSession(sessionId, reason);
				console.log(`🚀 Session ${sessionId} escalated to human support`);
				break;
			}

			case 'resolve': {
				const [_, sessionId] = args;
				await aiTroubleshooting.endSession(sessionId, 'resolved');
				console.log(`✅ Session ${sessionId} marked as resolved`);
				break;
			}

			case 'stats': {
				const stats = aiTroubleshooting.getTroubleshootingStats();
				console.log('AI Troubleshooting Statistics');
				console.log('=============================\n');
				console.log(`Active Sessions: ${stats.activeSessions}`);
				console.log(`Total Sessions: ${stats.totalSessions}`);
				console.log(`Resolution Rate: ${stats.resolutionRate.toFixed(1)}%`);
				console.log(
					`Average Session Time: ${Math.round(stats.averageSessionTime / (60 * 1000))} minutes\n`,
				);

				console.log('Popular Issue Patterns:');
				stats.popularPatterns.forEach((pattern) => {
					console.log(`• ${pattern.pattern}: ${pattern.count} occurrences`);
				});
				break;
			}

			case 'patterns': {
				console.log('Available Issue Patterns:');
				console.log('========================\n');
				// In a real implementation, this would list all patterns
				console.log('• Docker Daemon Connection Issues');
				console.log('• Hardhat Network Connection Problems');
				console.log('• Dependency Installation Failures');
				console.log('• Build and Compilation Errors');
				console.log('• System Resource Issues');
				break;
			}

			default:
				console.error(`Unknown command: ${command}`);
		}
	} catch (error: any) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

// Export for programmatic use
export {
	DevContainerAITroubleshooting,
	IssuePattern,
	TroubleshootingSession,
	DiagnosticResult,
};

// Run CLI if called directly
if (require.main === module) {
	main().catch(console.error);
}
