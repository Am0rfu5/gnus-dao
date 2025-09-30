// scripts/devops/gh-devcon/detect-environment-drift.ts
import * as fs from 'fs';
import * as path from 'path';
import EnvironmentFingerprinter, {
	EnvironmentFingerprint,
} from './fingerprint-environment';
import EnvironmentComparator, { ComparisonResult } from './compare-environments';

export interface DriftAnalysis {
	timestamp: string;
	drift_detected: boolean;
	drift_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
	changes_since_baseline: number;
	critical_changes: number;
	warning_changes: number;
	info_changes: number;
	comparison_result?: ComparisonResult;
	recommendations: string[];
	alert_required: boolean;
	alert_message?: string;
}

class EnvironmentDriftDetector {
	private baselineFile: string;
	private currentFingerprint: EnvironmentFingerprint | null;
	private comparisonResult: ComparisonResult | null;

	constructor(baselineFile: string = 'environment-baseline.json') {
		this.baselineFile = baselineFile;
		this.currentFingerprint = null;
		this.comparisonResult = null;
	}

	async detectDrift(): Promise<DriftAnalysis> {
		console.log('🔍 Detecting environment drift...');

		const analysis: DriftAnalysis = {
			timestamp: new Date().toISOString(),
			drift_detected: false,
			drift_level: 'none',
			changes_since_baseline: 0,
			critical_changes: 0,
			warning_changes: 0,
			info_changes: 0,
			recommendations: [],
			alert_required: false,
		};

		try {
			// Generate current environment fingerprint
			const fingerprinter = new EnvironmentFingerprinter();
			this.currentFingerprint = await fingerprinter.generateFingerprint();

			// Check if baseline exists
			if (!fs.existsSync(this.baselineFile)) {
				console.log('⚠️  No baseline found - creating initial baseline');
				this.createBaseline();
				analysis.drift_detected = false;
				analysis.recommendations.push(
					'Initial baseline created. Monitor for future changes.',
				);
				return analysis;
			}

			// Load baseline
			const baselineFingerprint = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));

			// Save current fingerprint temporarily for comparison
			fs.writeFileSync(
				'temp-current-fingerprint.json',
				JSON.stringify(this.currentFingerprint, null, 2),
			);

			// Compare with baseline
			const comparator = new EnvironmentComparator();
			this.comparisonResult = comparator.compare(
				this.baselineFile,
				'temp-current-fingerprint.json',
			);

			// Analyze comparison results
			analysis.comparison_result = this.comparisonResult;
			analysis.changes_since_baseline =
				this.comparisonResult.critical_differences.length +
				this.comparisonResult.warnings.length +
				this.comparisonResult.info.length;
			analysis.critical_changes = this.comparisonResult.critical_differences.length;
			analysis.warning_changes = this.comparisonResult.warnings.length;
			analysis.info_changes = this.comparisonResult.info.length;

			// Determine drift level
			analysis.drift_level = this.calculateDriftLevel(analysis);
			analysis.drift_detected = analysis.drift_level !== 'none';

			// Generate recommendations
			analysis.recommendations = this.generateRecommendations(analysis);

			// Determine if alert is required
			analysis.alert_required = this.shouldAlert(analysis);
			if (analysis.alert_required) {
				analysis.alert_message = this.generateAlertMessage(analysis);
			}

			// Clean up temporary file
			if (fs.existsSync('temp-current-fingerprint.json')) {
				fs.unlinkSync('temp-current-fingerprint.json');
			}

			console.log(
				`📊 Drift analysis complete: ${analysis.drift_level} level drift detected`,
			);
		} catch (error) {
			console.error('❌ Failed to detect environment drift:', error);
			analysis.recommendations.push(
				`Error during drift detection: ${(error as Error).message}`,
			);
		}

		return analysis;
	}

	private calculateDriftLevel(
		analysis: DriftAnalysis,
	): 'none' | 'low' | 'medium' | 'high' | 'critical' {
		if (analysis.critical_changes > 0) {
			return 'critical';
		} else if (analysis.warning_changes > 5) {
			return 'high';
		} else if (analysis.warning_changes > 2) {
			return 'medium';
		} else if (analysis.changes_since_baseline > 0) {
			return 'low';
		} else {
			return 'none';
		}
	}

	private generateRecommendations(analysis: DriftAnalysis): string[] {
		const recommendations: string[] = [];

		if (analysis.drift_level === 'none') {
			recommendations.push('✅ Environment is stable and matches baseline');
			return recommendations;
		}

		if (analysis.critical_changes > 0) {
			recommendations.push(
				'🚨 Critical environment changes detected - immediate attention required',
			);
			recommendations.push(
				'🔧 Update DevContainer configuration to match production environment',
			);
			recommendations.push('🧪 Re-run test suites to ensure compatibility');
		}

		if (analysis.warning_changes > 0) {
			recommendations.push('⚠️  Environment configuration changes detected');
			recommendations.push('📋 Review and update CI/CD configurations if necessary');
		}

		// Category-specific recommendations
		if (analysis.comparison_result) {
			const criticalCategories = Array.from(
				new Set(analysis.comparison_result.critical_differences.map((d) => d.category)),
			);
			const warningCategories = Array.from(
				new Set(analysis.comparison_result.warnings.map((d) => d.category)),
			);

			if (criticalCategories.includes('tools')) {
				recommendations.push(
					'🔧 Critical tool version mismatch - update DevContainer dependencies',
				);
			}

			if (criticalCategories.includes('runtime')) {
				recommendations.push(
					'⚙️  Runtime version mismatch - update Node.js/npm/yarn versions',
				);
			}

			if (criticalCategories.includes('system')) {
				recommendations.push('🖥️  System configuration mismatch - review container setup');
			}

			if (warningCategories.includes('performance')) {
				recommendations.push('🚀 Performance characteristics changed - monitor for impact');
			}

			if (warningCategories.includes('network')) {
				recommendations.push(
					'🌐 Network configuration changed - verify external service access',
				);
			}
		}

		return recommendations;
	}

	private shouldAlert(analysis: DriftAnalysis): boolean {
		// Alert on critical drift or high drift levels
		return analysis.drift_level === 'critical' || analysis.drift_level === 'high';
	}

	private generateAlertMessage(analysis: DriftAnalysis): string {
		let message = `🚨 Environment Drift Alert: ${analysis.drift_level.toUpperCase()} level drift detected\n\n`;

		message += `Changes since baseline: ${analysis.changes_since_baseline}\n`;
		message += `Critical changes: ${analysis.critical_changes}\n`;
		message += `Warning changes: ${analysis.warning_changes}\n\n`;

		if (analysis.critical_changes > 0 && analysis.comparison_result) {
			message += '🚨 Critical Issues:\n';
			analysis.comparison_result.critical_differences.slice(0, 3).forEach((diff) => {
				message += `  - ${diff.message}\n`;
			});
			if (analysis.comparison_result.critical_differences.length > 3) {
				message += `  ... and ${analysis.comparison_result.critical_differences.length - 3} more\n`;
			}
		}

		message += '\nRecommendations:\n';
		analysis.recommendations.forEach((rec) => {
			message += `  - ${rec}\n`;
		});

		return message;
	}

	private createBaseline(): void {
		const fingerprinter = new EnvironmentFingerprinter();
		fingerprinter
			.generateFingerprint()
			.then((fingerprint) => {
				fingerprinter.saveFingerprint(this.baselineFile);
				console.log(`📋 Initial baseline created: ${this.baselineFile}`);
			})
			.catch((error) => {
				console.error('❌ Failed to create baseline:', error);
			});
	}

	updateBaseline(): void {
		if (this.currentFingerprint) {
			fs.writeFileSync(this.baselineFile, JSON.stringify(this.currentFingerprint, null, 2));
			console.log(`📋 Baseline updated: ${this.baselineFile}`);
		} else {
			console.error('❌ No current fingerprint available to update baseline');
		}
	}

	getBaselineInfo(): EnvironmentFingerprint | null {
		if (fs.existsSync(this.baselineFile)) {
			return JSON.parse(
				fs.readFileSync(this.baselineFile, 'utf8'),
			) as EnvironmentFingerprint;
		}
		return null;
	}

	saveAnalysis(analysis: DriftAnalysis, outputFile: string): void {
		fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
		console.log(`💾 Drift analysis saved to ${outputFile}`);
	}
}

// CLI usage
if (require.main === module) {
	const baselineFile =
		process.argv.find((arg) => arg.startsWith('--baseline='))?.split('=')[1] ||
		'environment-baseline.json';
	const outputFile =
		process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ||
		'drift-analysis.json';
	const updateBaseline = process.argv.includes('--update-baseline');
	const showReport = process.argv.includes('--report');

	const detector = new EnvironmentDriftDetector(baselineFile);

	detector
		.detectDrift()
		.then((analysis) => {
			// Save analysis
			detector.saveAnalysis(analysis, outputFile);

			// Update baseline if requested
			if (updateBaseline) {
				detector.updateBaseline();
			}

			// Show report
			if (showReport) {
				console.log('\n=== DRIFT ANALYSIS REPORT ===');
				console.log(`Drift Level: ${analysis.drift_level.toUpperCase()}`);
				console.log(`Changes Detected: ${analysis.changes_since_baseline}`);
				console.log(`Alert Required: ${analysis.alert_required ? 'YES' : 'NO'}`);

				if (analysis.recommendations.length > 0) {
					console.log('\nRecommendations:');
					analysis.recommendations.forEach((rec) => console.log(`  - ${rec}`));
				}
			}

			// Exit with appropriate code
			const exitCode =
				analysis.drift_level === 'critical'
					? 1
					: analysis.drift_level === 'high'
						? 1
						: analysis.drift_level === 'medium'
							? 0
							: 0;
			process.exit(exitCode);
		})
		.catch((error) => {
			console.error('❌ Drift detection failed:', error);
			process.exit(1);
		});
}

export default EnvironmentDriftDetector;
