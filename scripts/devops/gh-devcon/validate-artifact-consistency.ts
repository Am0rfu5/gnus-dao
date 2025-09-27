// scripts/devops/gh-devcon/validate-artifact-consistency.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ArtifactValidationResult {
	timestamp: string;
	validation_type: string;
	artifacts_directory: string;
	total_files: number;
	consistent_files: number;
	inconsistent_files: number;
	missing_files: string[];
	extra_files: string[];
	file_consistencies: FileConsistency[];
	overall_consistent: boolean;
	consistency_percentage: number;
	recommendations: string[];
}

interface FileConsistency {
	file_path: string;
	consistent: boolean;
	hash?: string;
	expected_hash?: string;
	status: 'consistent' | 'inconsistent' | 'missing' | 'extra';
}

class ArtifactConsistencyValidator {
	private results: ArtifactValidationResult;

	constructor() {
		this.results = {
			timestamp: new Date().toISOString(),
			validation_type: 'artifact-consistency',
			artifacts_directory: '',
			total_files: 0,
			consistent_files: 0,
			inconsistent_files: 0,
			missing_files: [],
			extra_files: [],
			file_consistencies: [],
			overall_consistent: false,
			consistency_percentage: 0,
			recommendations: [],
		};
	}

	async validateArtifactConsistency(options: any = {}): Promise<ArtifactValidationResult> {
		const artifactsDir = options.directory || path.join(process.cwd(), 'artifacts');
		const baselineFile = options.baseline;
		const outputFile = options.output || 'artifact-consistency-results.json';

		console.log(`Validating artifact consistency in ${artifactsDir}...`);

		this.results.artifacts_directory = artifactsDir;

		if (!fs.existsSync(artifactsDir)) {
			console.error(`Artifacts directory does not exist: ${artifactsDir}`);
			this.results.recommendations.push(
				`❌ Artifacts directory not found: ${artifactsDir}`,
			);
			this.saveResults(outputFile);
			return this.results;
		}

		// Load baseline if provided
		let baselineHashes: any = {};
		if (baselineFile && fs.existsSync(baselineFile)) {
			baselineHashes = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
			console.log(`Loaded baseline from ${baselineFile}`);
		} else {
			// Generate baseline from current artifacts
			console.log('Generating baseline from current artifacts...');
			baselineHashes = this.generateBaselineHashes(artifactsDir);
		}

		// Validate current artifacts against baseline
		await this.validateArtifacts(artifactsDir, baselineHashes);

		// Analyze results
		this.analyzeResults();

		// Save results
		this.saveResults(outputFile);

		return this.results;
	}

	generateBaselineHashes(artifactsDir: string): any {
		const hashes: any = {};

		try {
			const files = this.getAllArtifactFiles(artifactsDir);

			for (const file of files) {
				const relativePath = path.relative(artifactsDir, file);
				hashes[relativePath] = this.hashFile(file);
			}

			console.log(`Generated baseline with ${files.length} files`);
		} catch (error: any) {
			console.error('Error generating baseline:', error.message);
		}

		return hashes;
	}

	async validateArtifacts(artifactsDir: string, baselineHashes: any): Promise<void> {
		const currentFiles = this.getAllArtifactFiles(artifactsDir);
		const baselineFilePaths = Object.keys(baselineHashes);

		// Check for missing files
		for (const baselineFile of baselineFilePaths) {
			const fullPath = path.join(artifactsDir, baselineFile);
			if (!fs.existsSync(fullPath)) {
				this.results.missing_files.push(baselineFile);
				this.results.file_consistencies.push({
					file_path: baselineFile,
					consistent: false,
					expected_hash: baselineHashes[baselineFile],
					status: 'missing',
				});
			}
		}

		// Check current files
		for (const currentFile of currentFiles) {
			const relativePath = path.relative(artifactsDir, currentFile);
			const currentHash = this.hashFile(currentFile);
			const expectedHash = baselineHashes[relativePath];

			if (expectedHash) {
				// File exists in baseline
				const consistent = currentHash === expectedHash;
				this.results.file_consistencies.push({
					file_path: relativePath,
					consistent,
					hash: currentHash || undefined,
					expected_hash: expectedHash,
					status: consistent ? 'consistent' : 'inconsistent',
				});

				if (consistent) {
					this.results.consistent_files++;
				} else {
					this.results.inconsistent_files++;
				}
			} else {
				// Extra file not in baseline
				this.results.extra_files.push(relativePath);
				this.results.file_consistencies.push({
					file_path: relativePath,
					consistent: false,
					hash: currentHash || undefined,
					status: 'extra',
				});
			}
		}

		this.results.total_files = this.results.file_consistencies.length;
	}

	getAllArtifactFiles(artifactsDir: string): string[] {
		const files: string[] = [];

		const traverse = (currentPath: string) => {
			if (!fs.existsSync(currentPath)) return;

			const items = fs.readdirSync(currentPath);

			for (const item of items) {
				const fullPath = path.join(currentPath, item);
				const stat = fs.statSync(fullPath);

				if (stat.isDirectory()) {
					// Skip certain directories
					if (!['build-info', 'cache'].includes(item)) {
						traverse(fullPath);
					}
				} else if (stat.isFile()) {
					// Only include relevant artifact files
					if (this.isArtifactFile(fullPath)) {
						files.push(fullPath);
					}
				}
			}
		};

		traverse(artifactsDir);
		return files;
	}

	isArtifactFile(filePath: string): boolean {
		const ext = path.extname(filePath).toLowerCase();
		const fileName = path.basename(filePath).toLowerCase();

		// Include contract artifacts, typechain files, etc.
		return (
			['.json', '.ts', '.js'].includes(ext) &&
			!fileName.includes('cache') &&
			!fileName.includes('build-info')
		);
	}

	hashFile(filePath: string): string | null {
		try {
			const content = fs.readFileSync(filePath);
			return crypto.createHash('sha256').update(content).digest('hex');
		} catch (error) {
			return null;
		}
	}

	analyzeResults(): void {
		if (this.results.total_files === 0) {
			this.results.overall_consistent = false;
			this.results.consistency_percentage = 0;
			this.results.recommendations.push('❌ No artifact files found to validate');
			return;
		}

		this.results.consistency_percentage =
			(this.results.consistent_files / this.results.total_files) * 100;
		this.results.overall_consistent =
			this.results.consistency_percentage >= 95 && // 95% consistency threshold
			this.results.missing_files.length === 0 &&
			this.results.inconsistent_files === 0;

		// Generate recommendations
		this.generateRecommendations();
	}

	generateRecommendations(): void {
		if (this.results.overall_consistent) {
			this.results.recommendations.push('✅ Artifacts are highly consistent');
			return;
		}

		if (this.results.missing_files.length > 0) {
			this.results.recommendations.push(
				`❌ ${this.results.missing_files.length} files missing from artifacts`,
			);
			this.results.recommendations.push(
				'🔨 Rebuild contracts to generate missing artifacts',
			);
		}

		if (this.results.inconsistent_files > 0) {
			this.results.recommendations.push(
				`⚠️ ${this.results.inconsistent_files} files have changed`,
			);
			this.results.recommendations.push(
				'🔍 Review contract changes that may affect artifacts',
			);
		}

		if (this.results.extra_files.length > 0) {
			this.results.recommendations.push(
				`ℹ️ ${this.results.extra_files.length} extra files found`,
			);
			this.results.recommendations.push('🧹 Clean build artifacts if necessary');
		}

		if (this.results.consistency_percentage < 80) {
			this.results.recommendations.push(
				'🚨 Low artifact consistency - investigate build process',
			);
		}

		this.results.recommendations.push(
			`📊 Artifact consistency: ${this.results.consistency_percentage.toFixed(1)}%`,
		);
	}

	saveResults(outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));
		console.log(`Artifact consistency results saved to ${outputFile}`);
	}

	generateReport(outputFile: string): string {
		const report = `# Artifact Consistency Validation Report

## 📋 Summary

**Validation Type**: ${this.results.validation_type}  
**Artifacts Directory**: ${this.results.artifacts_directory}  
**Generated**: ${this.results.timestamp}

**Overall Status**: ${this.results.overall_consistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}  
**Consistency Percentage**: ${this.results.consistency_percentage.toFixed(1)}%  
**Total Files**: ${this.results.total_files}  
**Consistent Files**: ${this.results.consistent_files}  
**Inconsistent Files**: ${this.results.inconsistent_files}

## 📁 Missing Files

${
	this.results.missing_files.length === 0
		? 'No missing files ✅'
		: this.results.missing_files.map((file) => `- ${file}`).join('\n')
}

## ⚠️ Inconsistent Files

${
	this.results.inconsistent_files === 0
		? 'No inconsistent files ✅'
		: `Found ${this.results.inconsistent_files} inconsistent files`
}

## ➕ Extra Files

${
	this.results.extra_files.length === 0
		? 'No extra files ✅'
		: this.results.extra_files.map((file) => `- ${file}`).join('\n')
}

## 🔧 Recommendations

${this.results.recommendations.map((rec) => `- ${rec}`).join('\n')}

---
*Artifact Consistency Validation Report*
`;

		if (outputFile) {
			fs.writeFileSync(outputFile, report);
			console.log(`Artifact consistency report saved to ${outputFile}`);
		}

		return report;
	}
}

// CLI usage
if (require.main === module) {
	const directory = process.argv
		.find((arg) => arg.startsWith('--directory='))
		?.split('=')[1];
	const baseline = process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1];
	const output =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'artifact-consistency-results.json';
	const report = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];
	const validate = process.argv.find((arg) => arg.startsWith('--validate='))?.split('=')[1];

	const validator = new ArtifactConsistencyValidator();

	if (validate) {
		// Validate against a directory of artifacts
		console.log(`Validating artifacts in ${validate}...`);
		validator
			.validateArtifactConsistency({ directory: validate, output })
			.then((results) => {
				if (report) {
					validator.generateReport(report);
				}

				console.log('\n=== ARTIFACT CONSISTENCY SUMMARY ===');
				console.log(`Consistent: ${results.overall_consistent ? '✅ YES' : '❌ NO'}`);
				console.log(`Consistency: ${results.consistency_percentage.toFixed(1)}%`);
				console.log(`Total files: ${results.total_files}`);
				console.log(`Missing files: ${results.missing_files.length}`);
				console.log(`Extra files: ${results.extra_files.length}`);

				process.exit(results.overall_consistent ? 0 : 1);
			})
			.catch((error) => {
				console.error('Artifact validation failed:', error);
				process.exit(1);
			});
	} else {
		// Generate baseline
		validator
			.validateArtifactConsistency({ directory, baseline, output })
			.then((results) => {
				if (report) {
					validator.generateReport(report);
				}

				console.log('\n=== BASELINE GENERATION SUMMARY ===');
				console.log(`Generated baseline with ${results.total_files} files`);
			})
			.catch((error) => {
				console.error('Baseline generation failed:', error);
				process.exit(1);
			});
	}
}

module.exports = ArtifactConsistencyValidator;
