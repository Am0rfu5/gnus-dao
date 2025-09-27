#!/usr/bin/env node

/**
 * GNUS-DAO DevContainer Code Security Results Aggregator
 * Aggregates code security scan results from multiple tools
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeSecurityResult {
tool: string;
timestamp: string;
scan_type: 'full' | 'incremental';
results: CodeIssue[];
summary: {
total_issues: number;
critical_count: number;
high_count: number;
medium_count: number;
low_count: number;
files_scanned: number;
};
metadata: {
scan_duration_ms: number;
changed_files?: number;
};
}

interface CodeIssue {
id: string;
check_id?: string;
severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
title: string;
description: string;
file_path: string;
line_number?: number;
column_number?: number;
code_snippet?: string;
cwe_ids?: string[];
owasp_ids?: string[];
tags?: string[];
fix_available?: boolean;
fix_suggestion?: string;
}

interface SemgrepResult {
results: SemgrepFinding[];
}

interface SemgrepFinding {
check_id: string;
path: string;
line: number;
column: number;
lines?: string;
extra: {
message: string;
severity?: string;
metadata?: {
cwe?: string[];
owasp?: string[];
tags?: string[];
};
};
}

interface DiamondResult {
results: DiamondFinding[];
}

interface DiamondFinding {
check_id: string;
path: string;
line: number;
column: number;
lines?: string;
extra: {
message: string;
severity?: string;
};
}

interface SlitherResult {
results: {
detectors: SlitherDetector[];
};
}

interface SlitherDetector {
check: string;
description: string;
file: string;
line: number;
column?: number;
code?: string;
impact?: string;
cwe_ids?: string[];
}

interface GitSecretsResult {
results: GitSecretsFinding[];
}

interface GitSecretsFinding {
file: string;
line: number;
secret: string;
type: string;
}

class CodeSecurityAggregator {
private readonly projectRoot: string;

constructor() {
this.projectRoot = path.resolve(__dirname, '../../..');
}

private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
switch (severity.toLowerCase()) {
case 'critical':
case 'error':
return 'critical';
case 'high':
case 'warning':
return 'high';
case 'medium':
case 'info':
return 'medium';
case 'low':
return 'low';
default:
return 'info';
}
}

private parseSemgrepResults(results: SemgrepResult): CodeIssue[] {
const issues: CodeIssue[] = [];

if (results.results) {
for (const result of results.results) {
issues.push({
id: result.check_id,
check_id: result.check_id,
severity: this.mapSeverity(result.extra?.severity || 'medium'),
title: result.extra?.message || result.check_id,
description: result.extra?.message || 'Security issue detected',
file_path: result.path,
line_number: result.line,
column_number: result.column,
code_snippet: result.lines,
cwe_ids: result.extra?.metadata?.cwe,
owasp_ids: result.extra?.metadata?.owasp,
tags: result.extra?.metadata?.tags,
});
}
}

return issues;
}

private parseDiamondPatternResults(results: DiamondResult): CodeIssue[] {
const issues: CodeIssue[] = [];

if (results.results) {
for (const result of results.results) {
issues.push({
id: `diamond-${result.check_id}`,
check_id: result.check_id,
severity: this.mapSeverity(result.extra?.severity || 'high'),
title: result.extra?.message || 'Diamond proxy security issue',
description:
result.extra?.message ||
'Potential security issue in Diamond proxy implementation',
file_path: result.path,
line_number: result.line,
column_number: result.column,
code_snippet: result.lines,
tags: ['diamond-proxy', 'security'],
});
}
}

return issues;
}

private parseSlitherResults(results: SlitherResult): CodeIssue[] {
const issues: CodeIssue[] = [];

if (results.results && results.results.detectors) {
for (const detector of results.results.detectors) {
issues.push({
id: detector.check,
check_id: detector.check,
severity: this.mapSeverity(detector.impact || 'medium'),
title: detector.description,
description: detector.description,
file_path: detector.file,
line_number: detector.line,
column_number: detector.column,
code_snippet: detector.code,
cwe_ids: detector.cwe_ids,
tags: ['solidity', 'smart-contract'],
});
}
}

return issues;
}

private parseGitSecretsResults(results: GitSecretsResult): CodeIssue[] {
const issues: CodeIssue[] = [];

if (results.results) {
for (const result of results.results) {
issues.push({
id: `git-secrets-${result.type}`,
severity: 'critical',
title: `Potential secret exposure: ${result.type}`,
description: `Found potential secret in file: ${result.secret}`,
file_path: result.file,
line_number: result.line,
tags: ['secrets', 'security'],
});
}
}

return issues;
}

/**
 * Aggregate code security results from multiple tools
 */
public async aggregateCodeSecurityResults(
toolResults: Record<string, any>,
scanType: 'full' | 'incremental' = 'full'
): Promise<CodeSecurityResult[]> {
const aggregatedResults: CodeSecurityResult[] = [];
const timestamp = new Date().toISOString();

// Process each tool's results
for (const [toolName, results] of Object.entries(toolResults)) {
try {
let issues: CodeIssue[] = [];

switch (toolName) {
case 'semgrep':
issues = this.parseSemgrepResults(results as SemgrepResult);
break;
case 'diamond-patterns':
issues = this.parseDiamondPatternResults(results as DiamondResult);
break;
case 'slither':
issues = this.parseSlitherResults(results as SlitherResult);
break;
case 'git-secrets':
issues = this.parseGitSecretsResults(results as GitSecretsResult);
break;
default:
console.warn(`Unknown tool: ${toolName}`);
continue;
}

// Calculate summary statistics
const summary = this.calculateSummary(issues);

const result: CodeSecurityResult = {
tool: toolName,
timestamp,
scan_type: scanType,
results: issues,
summary,
metadata: {
scan_duration_ms: 0, // Would be calculated from actual scan times
},
};

aggregatedResults.push(result);
} catch (error) {
console.error(`Error processing ${toolName} results:`, error);
}
}

return aggregatedResults;
}

private calculateSummary(issues: CodeIssue[]) {
const counts = {
critical: 0,
high: 0,
medium: 0,
low: 0,
info: 0,
};

for (const issue of issues) {
counts[issue.severity]++;
}

return {
total_issues: issues.length,
critical_count: counts.critical,
high_count: counts.high,
medium_count: counts.medium,
low_count: counts.low,
files_scanned: new Set(issues.map(i => i.file_path)).size,
};
}

/**
 * Save aggregated results to file
 */
public async saveResults(
results: CodeSecurityResult[],
outputPath: string
): Promise<void> {
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
fs.mkdirSync(outputDir, { recursive: true });
}

await fs.promises.writeFile(
outputPath,
JSON.stringify(results, null, 2),
'utf8'
);
}

/**
 * Load results from file
 */
public async loadResults(inputPath: string): Promise<CodeSecurityResult[]> {
const data = await fs.promises.readFile(inputPath, 'utf8');
return JSON.parse(data);
}
}

export { CodeSecurityAggregator };
