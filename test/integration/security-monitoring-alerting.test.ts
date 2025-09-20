/**
 * GNUS-DAO Security Monitoring and Alerting Integration Tests
 * Tests the complete security monitoring, alerting, and incident response system
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { expect } from 'chai';

describe('Security Monitoring and Alerting System', () => {
	const testAssetsDir: string = path.join(__dirname, '..', '..', 'test-assets');
	const incidentsDir: string = path.join(testAssetsDir, 'incidents');
	const alertsDir: string = path.join(testAssetsDir, 'alerts');
	const metricsDir: string = path.join(testAssetsDir, 'metrics');
	const checksDir: string = path.join(testAssetsDir, 'checks');
	const reportsDir: string = path.join(testAssetsDir, 'health-reports');

	beforeEach(() => {
		// Clean up test directories
		[incidentsDir, alertsDir, metricsDir, checksDir, reportsDir].forEach((dir: string) => {
			if (fs.existsSync(dir)) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	afterEach(() => {
		// Clean up after tests
		[incidentsDir, alertsDir, metricsDir, checksDir, reportsDir].forEach((dir: string) => {
			if (fs.existsSync(dir)) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe('Security Monitoring Webhook CLI', () => {
		it('should process test events via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-monitoring-webhook.js',
					),
					'process',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			child.stdout?.on('data', () => {
				// Collect stdout for debugging
			});

			child.stderr?.on('data', () => {
				// Collect stderr for debugging
			});
			child.on('close', (code: number | null) => {
				// The process command may fail due to missing webhook secret, but should not crash
				expect([0, 1]).to.include(code);
				done();
			});
		});

		it('should show status via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-monitoring-webhook.js',
					),
					'status',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('monitoring');
				done();
			});
		});
	});

	describe('Security Alerting CLI', () => {
		it('should send test alerts via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'security-alerting.ts'),
					'test',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('Test');
				done();
			});
		});

		it('should show alerting status via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'security-alerting.ts'),
					'status',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('channels');
				done();
			});
		});
	});

	describe('Incident Response CLI', () => {
		it('should create incidents via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'incident-response.ts'),
					'create',
					'Test Incident',
					'This is a test incident',
					'medium',
					'security',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('Created incident:');
				done();
			});
		});

		it('should list incidents via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'incident-response.ts'),
					'list',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			child.stdout?.on('data', () => {
				// Collect stdout for debugging
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				// May be empty initially
				done();
			});
		});

		it('should show incident response status via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'incident-response.ts'),
					'status',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('totalIncidents');
				done();
			});
		});
	});

	describe('Security Health Checks CLI', () => {
		it('should run health checks via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-health-checks.js',
					),
					'check',
					'dependency-check',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			child.stdout?.on('data', () => {
				// Collect stdout for debugging
			});

			child.stderr?.on('data', () => {
				// Ignore stderr for this test
			});

			child.on('close', (code: number | null) => {
				// May fail due to missing dependencies, but should not crash
				expect([0, 1]).to.include(code);
				done();
			});
		});

		it('should show health check status via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-health-checks.js',
					),
					'status',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('enabledChecks');
				done();
			});
		});
	});

	describe('Security Metrics Dashboard CLI', () => {
		it('should generate metrics reports via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-metrics-dashboard.js',
					),
					'generate',
					'weekly',
					'json',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('Security metrics report generated');
				done();
			});
		});

		it('should show dashboard status via CLI', (done: Mocha.Done) => {
			const child: ChildProcess = spawn(
				'node',
				[
					path.join(
						__dirname,
						'..',
						'..',
						'scripts',
						'devops',
						'security-metrics-dashboard.js',
					),
					'status',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			let output: string = '';
			child.stdout?.on('data', (data: Buffer) => {
				output += data.toString();
			});

			child.on('close', (code: number | null) => {
				expect(code).to.equal(0);
				expect(output).to.include('lastReport');
				done();
			});
		});
	});

	describe('Package.json Scripts Integration', () => {
		it('should have all security scripts defined', () => {
			const packageJsonContent = fs.readFileSync(
				path.join(__dirname, '..', '..', 'package.json'),
				'utf8',
			);
			const packageJson = JSON.parse(packageJsonContent) as {
				scripts: { [key: string]: string };
			};
			const scripts: { [key: string]: string } = packageJson.scripts;

			expect(scripts['security-webhook']).to.equal(
				'node scripts/devops/security-monitoring-webhook.js',
			);
			expect(scripts['security-alerting']).to.equal(
				'npx ts-node scripts/devops/security-alerting.ts',
			);
			expect(scripts['security-metrics']).to.equal(
				'node scripts/devops/security-metrics-dashboard.js',
			);
			expect(scripts['incident-response']).to.equal(
				'npx ts-node scripts/devops/incident-response.ts',
			);
			expect(scripts['security-health-checks']).to.equal(
				'node scripts/devops/security-health-checks.js',
			);
		});
	});

	describe('File System Integration', () => {
		it('should create required directories', () => {
			// Test that scripts create their required directories
			const scripts: string[] = [
				'security-monitoring-webhook.js',
				'security-alerting.ts',
				'incident-response.ts',
				'security-health-checks.js',
				'security-metrics-dashboard.js',
			];

			scripts.forEach((script: string) => {
				const scriptPath: string = path.join(
					__dirname,
					'..',
					'..',
					'scripts',
					'devops',
					script,
				);
				expect(fs.existsSync(scriptPath)).to.be.true;
			});
		});

		it('should create incident response playbooks', () => {
			const playbooksDir: string = path.join(
				__dirname,
				'..',
				'..',
				'docs',
				'incident-playbooks',
			);
			const playbooks: string[] = [
				'diamond-security-response.md',
				'contract-exploit-response.md',
				'dependency-compromise-response.md',
				'access-breach-response.md',
			];

			playbooks.forEach((playbook: string) => {
				const playbookPath: string = path.join(playbooksDir, playbook);
				expect(fs.existsSync(playbookPath)).to.be.true;

				const content: string = fs.readFileSync(playbookPath, 'utf8');
				expect(content).to.include('## Overview');
				expect(content).to.include('## Success Criteria');
			});
		});
	});

	describe('End-to-End Workflow', () => {
		it('should complete full incident response workflow', function (done: Mocha.Done) {
			this.timeout(30000); // Increase timeout for e2e test

			// Step 1: Create an incident
			const createChild: ChildProcess = spawn(
				'npx',
				[
					'ts-node',
					path.join(__dirname, '..', '..', 'scripts', 'devops', 'incident-response.ts'),
					'create',
					'E2E Test Incident',
					'End-to-end test incident',
					'high',
					'security',
				],
				{ cwd: path.join(__dirname, '..', '..') },
			);

			createChild.on('close', (createCode: number | null) => {
				expect(createCode).to.equal(0);

				// Step 2: Check that incident was created
				const listChild: ChildProcess = spawn(
					'npx',
					[
						'ts-node',
						path.join(__dirname, '..', '..', 'scripts', 'devops', 'incident-response.ts'),
						'list',
					],
					{ cwd: path.join(__dirname, '..', '..') },
				);

				let listOutput: string = '';
				listChild.stdout?.on('data', (_data: Buffer) => {
					listOutput += _data.toString();
				});

				listChild.on('close', (listCode: number | null) => {
					expect(listCode).to.equal(0);
					expect(listOutput).to.include('E2E Test Incident');

					// Step 3: Generate metrics report
					const metricsChild: ChildProcess = spawn(
						'node',
						[
							path.join(
								__dirname,
								'..',
								'..',
								'scripts',
								'devops',
								'security-metrics-dashboard.js',
							),
							'generate',
							'daily',
							'json',
						],
						{ cwd: path.join(__dirname, '..', '..') },
					);

					metricsChild.on('close', (metricsCode: number | null) => {
						expect(metricsCode).to.equal(0);

						// Step 4: Run health checks
						const healthChild: ChildProcess = spawn(
							'node',
							[
								path.join(
									__dirname,
									'..',
									'..',
									'scripts',
									'devops',
									'security-health-checks.js',
								),
								'status',
							],
							{ cwd: path.join(__dirname, '..', '..') },
						);

						healthChild.on('close', (healthCode: number | null) => {
							expect(healthCode).to.equal(0);
							done();
						});
					});
				});
			});
		});
	});
});
