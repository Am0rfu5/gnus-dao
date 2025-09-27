#!/usr/bin/env node

/**
 * DevContainer Training Certificate Generator
 *
 * Generates completion certificates for DevContainer training exercises
 * and learning modules. Certificates include verification codes and
 * can be exported as PDF or JSON formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

interface CertificateData {
	certificateId: string;
	recipientName: string;
	recipientEmail: string;
	completionDate: string;
	moduleName: string;
	moduleVersion: string;
	exercisesCompleted: string[];
	totalScore: number;
	timeSpent: number; // in minutes
	verificationCode: string;
	issuer: string;
	issueDate: string;
	expiryDate?: string;
}

interface CertificateTemplate {
	title: string;
	description: string;
	requirements: string[];
	skills: string[];
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	estimatedDuration: number;
}

class CertificateGenerator {
	private templates: Map<string, CertificateTemplate> = new Map();
	private certificatesDir: string;

	constructor() {
		this.certificatesDir = path.join(process.cwd(), 'certificates');
		this.initializeTemplates();
		this.ensureCertificatesDirectory();
	}

	private initializeTemplates(): void {
		this.templates.set('exercise-01-environment-setup', {
			title: 'DevContainer Environment Setup',
			description: 'Mastered basic DevContainer operations and environment validation',
			requirements: ['Environment setup', 'Dependency validation', 'Basic troubleshooting'],
			skills: [
				'DevContainer configuration',
				'Environment validation',
				'Dependency management',
			],
			difficulty: 'beginner',
			estimatedDuration: 15,
		});

		this.templates.set('exercise-02-development-workflow', {
			title: 'Development Workflow Mastery',
			description: 'Demonstrated proficiency in core development workflows',
			requirements: ['Code compilation', 'Testing execution', 'Code quality checks'],
			skills: ['Build processes', 'Test automation', 'Code quality assurance'],
			difficulty: 'beginner',
			estimatedDuration: 20,
		});

		this.templates.set('exercise-03-smart-contract-development', {
			title: 'Smart Contract Development',
			description:
				'Successfully developed and tested smart contracts using GNUS-DAO patterns',
			requirements: ['Contract creation', 'Interface design', 'Comprehensive testing'],
			skills: ['Solidity development', 'Contract testing', 'Diamond architecture'],
			difficulty: 'intermediate',
			estimatedDuration: 25,
		});

		this.templates.set('module-01-fundamentals', {
			title: 'DevContainer Fundamentals',
			description: 'Completed comprehensive foundation training for DevContainer usage',
			requirements: [
				'All fundamental exercises',
				'Knowledge assessment',
				'Practical validation',
			],
			skills: ['Container management', 'Development workflows', 'Troubleshooting'],
			difficulty: 'beginner',
			estimatedDuration: 45,
		});

		this.templates.set('module-02-smart-contracts', {
			title: 'Smart Contract Development Expert',
			description:
				'Advanced smart contract development with security and architecture focus',
			requirements: ['Contract development', 'Security testing', 'Architecture patterns'],
			skills: ['Advanced Solidity', 'Security auditing', 'Diamond patterns'],
			difficulty: 'intermediate',
			estimatedDuration: 90,
		});
	}

	private ensureCertificatesDirectory(): void {
		if (!fs.existsSync(this.certificatesDir)) {
			fs.mkdirSync(this.certificatesDir, { recursive: true });
		}
	}

	public generateCertificate(
		recipientName: string,
		recipientEmail: string,
		moduleId: string,
		exercisesCompleted: string[] = [],
		totalScore: number = 100,
		timeSpent: number = 0,
	): CertificateData {
		const template = this.templates.get(moduleId);
		if (!template) {
			throw new Error(`Unknown module: ${moduleId}`);
		}

		const certificateId = this.generateCertificateId();
		const now = new Date();
		const completionDate = now.toISOString().split('T')[0];

		const certificate: CertificateData = {
			certificateId,
			recipientName,
			recipientEmail,
			completionDate,
			moduleName: template.title,
			moduleVersion: '1.0.0',
			exercisesCompleted,
			totalScore,
			timeSpent: timeSpent || template.estimatedDuration,
			verificationCode: this.generateVerificationCode(certificateId),
			issuer: 'GNUS-DAO DevContainer Training Program',
			issueDate: completionDate,
			expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0], // 1 year expiry
		};

		return certificate;
	}

	public saveCertificate(
		certificate: CertificateData,
		format: 'json' | 'pdf' = 'json',
	): string {
		const filename = `certificate-${certificate.certificateId}`;
		const filePath = path.join(this.certificatesDir, `${filename}.${format}`);

		if (format === 'json') {
			fs.writeFileSync(filePath, JSON.stringify(certificate, null, 2));
		} else if (format === 'pdf') {
			this.generatePDFCertificate(certificate, filePath);
		}

		return filePath;
	}

	public verifyCertificate(certificateId: string, verificationCode: string): boolean {
		const certificatePath = path.join(
			this.certificatesDir,
			`certificate-${certificateId}.json`,
		);

		if (!fs.existsSync(certificatePath)) {
			return false;
		}

		try {
			const certificate: CertificateData = JSON.parse(
				fs.readFileSync(certificatePath, 'utf8'),
			);
			return certificate.verificationCode === verificationCode;
		} catch {
			return false;
		}
	}

	public listCertificates(): CertificateData[] {
		const certificates: CertificateData[] = [];
		const files = fs.readdirSync(this.certificatesDir);

		for (const file of files) {
			if (file.startsWith('certificate-') && file.endsWith('.json')) {
				try {
					const certificate: CertificateData = JSON.parse(
						fs.readFileSync(path.join(this.certificatesDir, file), 'utf8'),
					);
					certificates.push(certificate);
				} catch {
					// Skip invalid files
				}
			}
		}

		return certificates;
	}

	private generateCertificateId(): string {
		return 'CERT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
	}

	private generateVerificationCode(certificateId: string): string {
		const hash = crypto.createHash('sha256');
		hash.update(certificateId + process.env.CERTIFICATE_SECRET || 'gnus-dao-secret');
		return hash.digest('hex').substring(0, 16).toUpperCase();
	}

	private generatePDFCertificate(certificate: CertificateData, filePath: string): void {
		// Simple HTML to PDF generation using a basic template
		const htmlContent = this.generateHTMLCertificate(certificate);

		// In a real implementation, you would use a PDF library like puppeteer
		// For now, we'll create an HTML file that can be manually converted
		const htmlPath = filePath.replace('.pdf', '.html');
		fs.writeFileSync(htmlPath, htmlContent);

		console.log(`HTML certificate generated: ${htmlPath}`);
		console.log(
			'To convert to PDF, use: npm install -g html-pdf-cli && html-pdf-cli certificate.html certificate.pdf',
		);
	}

	private generateHTMLCertificate(certificate: CertificateData): string {
		return `
<!DOCTYPE html>
<html>
<head>
    <title>GNUS-DAO Training Certificate</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .certificate { border: 2px solid #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .title { font-size: 28px; font-weight: bold; color: #2c3e50; }
        .subtitle { font-size: 18px; color: #7f8c8d; margin-top: 10px; }
        .content { margin: 30px 0; }
        .field { margin: 15px 0; }
        .label { font-weight: bold; display: inline-block; width: 150px; }
        .value { display: inline-block; }
        .verification { background: #f8f9fa; padding: 20px; margin-top: 30px; border-left: 4px solid #007bff; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="title">GNUS-DAO Training Certificate</div>
            <div class="subtitle">Certificate of Completion</div>
        </div>

        <div class="content">
            <div class="field">
                <span class="label">Certificate ID:</span>
                <span class="value">${certificate.certificateId}</span>
            </div>

            <div class="field">
                <span class="label">Recipient:</span>
                <span class="value">${certificate.recipientName}</span>
            </div>

            <div class="field">
                <span class="label">Email:</span>
                <span class="value">${certificate.recipientEmail}</span>
            </div>

            <div class="field">
                <span class="label">Module:</span>
                <span class="value">${certificate.moduleName}</span>
            </div>

            <div class="field">
                <span class="label">Completion Date:</span>
                <span class="value">${certificate.completionDate}</span>
            </div>

            <div class="field">
                <span class="label">Score:</span>
                <span class="value">${certificate.totalScore}%</span>
            </div>

            <div class="field">
                <span class="label">Time Spent:</span>
                <span class="value">${certificate.timeSpent} minutes</span>
            </div>
        </div>

        <div class="verification">
            <strong>Verification Code:</strong> ${certificate.verificationCode}<br>
            <strong>Issuer:</strong> ${certificate.issuer}<br>
            <strong>Issue Date:</strong> ${certificate.issueDate}<br>
            ${certificate.expiryDate ? `<strong>Expiry Date:</strong> ${certificate.expiryDate}` : ''}
        </div>

        <div class="footer">
            This certificate verifies completion of GNUS-DAO training requirements.<br>
            Verify at: https://verify.gnus-dao.dev/certificates
        </div>
    </div>
</body>
</html>`;
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const generator = new CertificateGenerator();

	if (args.length === 0) {
		console.log('DevContainer Training Certificate Generator');
		console.log('');
		console.log('Usage:');
		console.log(
			'  generate <name> <email> <module-id> [score] [time]  - Generate certificate',
		);
		console.log('  verify <cert-id> <verification-code>              - Verify certificate');
		console.log(
			'  list                                                  - List all certificates',
		);
		console.log('');
		console.log('Available modules:');
		generator['templates'].forEach((template, id) => {
			console.log(`  ${id} - ${template.title}`);
		});
		return;
	}

	const command = args[0];

	try {
		switch (command) {
			case 'generate': {
				const [_, name, email, moduleId, score = '100', time = '0'] = args;
				const certificate = generator.generateCertificate(
					name,
					email,
					moduleId,
					[], // exercises completed
					parseInt(score),
					parseInt(time),
				);

				const filePath = generator.saveCertificate(certificate, 'json');
				console.log(`Certificate generated: ${filePath}`);
				console.log(`Verification Code: ${certificate.verificationCode}`);

				// Also generate HTML version
				const htmlPath = generator.saveCertificate(certificate, 'pdf'); // This creates HTML
				console.log(`HTML Certificate: ${htmlPath}`);
				break;
			}

			case 'verify': {
				const [_, certId, verificationCode] = args;
				const isValid = generator.verifyCertificate(certId, verificationCode);
				console.log(isValid ? '✅ Certificate is valid' : '❌ Certificate is invalid');
				break;
			}

			case 'list': {
				const certificates = generator.listCertificates();
				console.log(`Found ${certificates.length} certificates:`);
				certificates.forEach((cert) => {
					console.log(
						`  ${cert.certificateId}: ${cert.moduleName} - ${cert.recipientName}`,
					);
				});
				break;
			}

			default:
				console.error(`Unknown command: ${command}`);
		}
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

// Export for programmatic use
export { CertificateGenerator, CertificateData, CertificateTemplate };

// Run CLI if called directly
if (require.main === module) {
	main().catch(console.error);
}
