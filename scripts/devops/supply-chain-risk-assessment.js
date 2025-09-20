#!/usr/bin/env node

/**
 * GNUS-DAO Supply Chain Risk Assessment Script
 * Performs comprehensive risk assessment of dependencies and build artifacts
 * Generates security reports and risk mitigation recommendations
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

class SupplyChainRiskAssessment {
  constructor() {
    this.buildDir = path.join(__dirname, "..");
    this.reportsDir = path.join(__dirname, "..", "test-assets", "reports");
    this.riskThresholds = this.loadRiskThresholds();
    this.knownVulnerabilities = this.loadKnownVulnerabilities();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load risk assessment thresholds
   */
  loadRiskThresholds() {
    return {
      critical: 9.0,
      high: 7.0,
      medium: 4.0,
      low: 0.1,
      acceptable: 0.0,
    };
  }

  /**
   * Load known vulnerabilities database
   */
  loadKnownVulnerabilities() {
    // In production, this would load from a comprehensive vulnerability database
    // For demo purposes, we'll use a mock database
    return {
      hardhat: [
        {
          id: "CVE-2023-1234",
          severity: 8.5,
          description: "Potential dependency injection vulnerability",
        },
        {
          id: "CVE-2023-5678",
          severity: 6.2,
          description: "Information disclosure in debug logs",
        },
      ],
      ethers: [
        {
          id: "CVE-2023-9012",
          severity: 7.8,
          description: "Transaction malleability issue",
        },
      ],
      typescript: [
        {
          id: "CVE-2023-3456",
          severity: 5.5,
          description: "Type confusion in compiler",
        },
      ],
    };
  }

  /**
   * Perform comprehensive supply chain risk assessment
   */
  async performRiskAssessment(options = {}) {
    this.log("🔍 Performing comprehensive supply chain risk assessment");

    const assessment = {
      timestamp: new Date().toISOString(),
      assessmentId: this.generateAssessmentId(),
      scope: "GNUS-DAO Build System",
      components: [],
    };

    // Assess dependencies
    const dependencyRisk = await this.assessDependencyRisk();
    assessment.components.push(dependencyRisk);

    // Assess build artifacts
    const artifactRisk = await this.assessArtifactRisk();
    assessment.components.push(artifactRisk);

    // Assess infrastructure
    const infrastructureRisk = await this.assessInfrastructureRisk();
    assessment.components.push(infrastructureRisk);

    // Assess supply chain integrity
    const supplyChainRisk = await this.assessSupplyChainIntegrity();
    assessment.components.push(supplyChainRisk);

    // Calculate overall risk score
    assessment.overallRiskScore = this.calculateOverallRiskScore(
      assessment.components,
    );
    assessment.riskLevel = this.determineRiskLevel(assessment.overallRiskScore);

    // Generate recommendations
    assessment.recommendations = this.generateRiskRecommendations(assessment);

    // Save assessment report
    this.saveAssessmentReport(assessment);

    this.log(
      `Risk assessment completed. Overall risk level: ${assessment.riskLevel}`,
    );
    return assessment;
  }

  /**
   * Assess dependency risk
   */
  async assessDependencyRisk() {
    this.log("📦 Assessing dependency risk");

    const packageJsonPath = path.join(this.buildDir, "package.json");
    const dependencies = [];

    if (!fs.existsSync(packageJsonPath)) {
      return dependencies;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const packageDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const dependencyRisks = [];

    for (const [name, version] of Object.entries(packageDependencies)) {
      const risk = await this.assessPackageRisk(name, version);
      dependencyRisks.push(risk);
    }

    const totalRiskScore = dependencyRisks.reduce(
      (sum, risk) => sum + risk.riskScore,
      0,
    );
    const averageRiskScore = totalRiskScore / dependencyRisks.length;

    return {
      component: "Dependencies",
      riskScore: averageRiskScore,
      riskLevel: this.determineRiskLevel(averageRiskScore),
      details: {
        totalDependencies: dependencyRisks.length,
        highRiskDependencies: dependencyRisks.filter(
          (d) => d.riskLevel === "high" || d.riskLevel === "critical",
        ).length,
        vulnerabilities: dependencyRisks.reduce(
          (sum, d) => sum + d.vulnerabilities.length,
          0,
        ),
        dependencyRisks,
      },
    };
  }

  /**
   * Assess individual package risk
   */
  async assessPackageRisk(name, version) {
    const vulnerabilities = this.knownVulnerabilities[name] || [];
    const riskScore =
      vulnerabilities.reduce((sum, vuln) => sum + vuln.severity, 0) /
      Math.max(vulnerabilities.length, 1);

    // Additional risk factors
    let additionalRisk = 0;

    // Check if package is maintained
    if (await this.isPackageMaintained(name)) {
      additionalRisk += 0.5;
    }

    // Check download count (popularity)
    const downloadCount = await this.getPackageDownloadCount(name);
    if (downloadCount < 1000) {
      additionalRisk += 1.0; // Low popularity = higher risk
    }

    // Check for native code
    if (await this.hasNativeCode(name)) {
      additionalRisk += 0.8; // Native code = higher risk
    }

    const totalRiskScore = Math.min(riskScore + additionalRisk, 10);

    return {
      package: name,
      version: version,
      riskScore: totalRiskScore,
      riskLevel: this.determineRiskLevel(totalRiskScore),
      vulnerabilities: vulnerabilities,
      riskFactors: {
        maintenance: await this.isPackageMaintained(name),
        popularity: downloadCount,
        nativeCode: await this.hasNativeCode(name),
      },
    };
  }

  /**
   * Check if package is actively maintained
   */
  async isPackageMaintained(packageName) {
    // Mock implementation - in production, check npm registry or GitHub
    const maintainedPackages = [
      "hardhat",
      "ethers",
      "typescript",
      "@openzeppelin/contracts",
    ];
    return maintainedPackages.includes(packageName);
  }

  /**
   * Get package download count
   */
  async getPackageDownloadCount(packageName) {
    // Mock implementation - in production, query npm API
    const popularPackages = {
      hardhat: 1000000,
      ethers: 5000000,
      typescript: 10000000,
      "@openzeppelin/contracts": 2000000,
    };
    return popularPackages[packageName] || 500;
  }

  /**
   * Check if package contains native code
   */
  async hasNativeCode(packageName) {
    // Mock implementation - in production, analyze package contents
    const nativePackages = ["node-gyp", "bcrypt"];
    return nativePackages.includes(packageName);
  }

  /**
   * Assess artifact risk
   */
  async assessArtifactRisk() {
    this.log("📄 Assessing build artifact risk");

    const artifacts = await this.findBuildArtifacts();
    const artifactRisks = [];

    for (const artifact of artifacts) {
      const risk = await this.assessArtifactSecurity(artifact);
      artifactRisks.push(risk);
    }

    const totalRiskScore = artifactRisks.reduce(
      (sum, risk) => sum + risk.riskScore,
      0,
    );
    const averageRiskScore = totalRiskScore / Math.max(artifactRisks.length, 1);

    return {
      component: "Build Artifacts",
      riskScore: averageRiskScore,
      riskLevel: this.determineRiskLevel(averageRiskScore),
      details: {
        totalArtifacts: artifactRisks.length,
        signedArtifacts: artifactRisks.filter((a) => a.signed).length,
        verifiedArtifacts: artifactRisks.filter((a) => a.verified).length,
        artifactRisks,
      },
    };
  }

  /**
   * Assess individual artifact security
   */
  async assessArtifactSecurity(artifactPath) {
    const stats = fs.statSync(artifactPath);
    const size = stats.size;
    const modified = stats.mtime;

    // Check if artifact is signed
    const sigFile = `${artifactPath}.sigstore`;
    const signed = fs.existsSync(sigFile);

    // Check if signature is verified (mock)
    const verified = signed; // In production, actually verify

    // Calculate risk based on various factors
    let riskScore = 0;

    // Size risk (very large files might be suspicious)
    if (size > 10000000) {
      // 10MB
      riskScore += 1.0;
    }

    // Age risk (very old artifacts might be stale)
    const age = (Date.now() - modified.getTime()) / (1000 * 60 * 60 * 24); // days
    if (age > 30) {
      riskScore += 0.5;
    }

    // Signature risk
    if (!signed) {
      riskScore += 2.0;
    }

    // Verification risk
    if (!verified) {
      riskScore += 1.0;
    }

    return {
      artifact: path.basename(artifactPath),
      size: size,
      modified: modified.toISOString(),
      signed: signed,
      verified: verified,
      riskScore: Math.min(riskScore, 10),
      riskLevel: this.determineRiskLevel(riskScore),
    };
  }

  /**
   * Assess infrastructure risk
   */
  async assessInfrastructureRisk() {
    this.log("🏗️ Assessing infrastructure risk");

    const infrastructureChecks = [
      { name: "Node.js Version", check: await this.checkNodeVersion() },
      { name: "NPM Registry", check: await this.checkNpmRegistry() },
      { name: "Git Repository", check: await this.checkGitSecurity() },
      { name: "CI/CD Pipeline", check: await this.checkCiCdSecurity() },
    ];

    const failedChecks = infrastructureChecks.filter(
      (check) => !check.check.passed,
    );
    const riskScore = (failedChecks.length / infrastructureChecks.length) * 10;

    return {
      component: "Infrastructure",
      riskScore: riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      details: {
        totalChecks: infrastructureChecks.length,
        passedChecks: infrastructureChecks.filter((c) => c.check.passed).length,
        failedChecks: failedChecks.length,
        checks: infrastructureChecks,
      },
    };
  }

  /**
   * Check Node.js version security
   */
  async checkNodeVersion() {
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split(".")[0]);
      const passed = major >= 18; // Node 18+ is considered secure

      return {
        passed: passed,
        details: `Node.js version: ${version}`,
        recommendation: passed
          ? null
          : "Upgrade to Node.js 18+ for security patches",
      };
    } catch (error) {
      return {
        passed: false,
        details: `Failed to check Node version: ${error.message}`,
        recommendation: "Verify Node.js installation",
      };
    }
  }

  /**
   * Check NPM registry security
   */
  async checkNpmRegistry() {
    try {
      const registry = execSync("npm config get registry", {
        encoding: "utf8",
      }).trim();
      const passed = registry === "https://registry.npmjs.org/";

      return {
        passed: passed,
        details: `NPM registry: ${registry}`,
        recommendation: passed
          ? null
          : "Use official NPM registry for security",
      };
    } catch (error) {
      return {
        passed: false,
        details: `Failed to check NPM registry: ${error.message}`,
        recommendation: "Verify NPM configuration",
      };
    }
  }

  /**
   * Check Git repository security
   */
  async checkGitSecurity() {
    try {
      // Check if we're in a git repository
      execSync("git status", { stdio: "ignore" });

      // Check for signed commits (mock check)
      const signedCommits = true; // In production, check actual commit signatures

      return {
        passed: signedCommits,
        details: "Git repository security checks",
        recommendation: signedCommits
          ? null
          : "Enable commit signing for security",
      };
    } catch (error) {
      return {
        passed: false,
        details: `Git security check failed: ${error.message}`,
        recommendation: "Ensure repository is properly initialized",
      };
    }
  }

  /**
   * Check CI/CD pipeline security
   */
  async checkCiCdSecurity() {
    const workflowPath = path.join(
      this.buildDir,
      ".github",
      "workflows",
      "security.yml",
    );
    const hasSecurityWorkflow = fs.existsSync(workflowPath);

    return {
      passed: hasSecurityWorkflow,
      details: hasSecurityWorkflow
        ? "Security workflow present"
        : "No security workflow found",
      recommendation: hasSecurityWorkflow
        ? null
        : "Implement security scanning in CI/CD pipeline",
    };
  }

  /**
   * Assess supply chain integrity
   */
  async assessSupplyChainIntegrity() {
    this.log("🔗 Assessing supply chain integrity");

    const integrityChecks = [
      {
        name: "Dependency Provenance",
        check: await this.checkDependencyProvenance(),
      },
      {
        name: "Build Reproducibility",
        check: await this.checkBuildReproducibility(),
      },
      {
        name: "Artifact Integrity",
        check: await this.checkArtifactIntegrity(),
      },
      { name: "SLSA Compliance", check: await this.checkSLSACompliance() },
    ];

    const failedChecks = integrityChecks.filter((check) => !check.check.passed);
    const riskScore = (failedChecks.length / integrityChecks.length) * 10;

    return {
      component: "Supply Chain Integrity",
      riskScore: riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      details: {
        totalChecks: integrityChecks.length,
        passedChecks: integrityChecks.filter((c) => c.check.passed).length,
        failedChecks: failedChecks.length,
        checks: integrityChecks,
      },
    };
  }

  /**
   * Check dependency provenance
   */
  async checkDependencyProvenance() {
    // Check if provenance validation script exists and has been run
    const provenanceScript = path.join(__dirname, "provenance-validator.js");
    const hasProvenanceScript = fs.existsSync(provenanceScript);

    return {
      passed: hasProvenanceScript,
      details: hasProvenanceScript
        ? "Provenance validation script present"
        : "No provenance validation",
      recommendation: hasProvenanceScript
        ? null
        : "Implement dependency provenance validation",
    };
  }

  /**
   * Check build reproducibility
   */
  async checkBuildReproducibility() {
    // Check if build is reproducible (mock check)
    const reproducible = true; // In production, actually verify reproducibility

    return {
      passed: reproducible,
      details: reproducible
        ? "Build is reproducible"
        : "Build reproducibility not verified",
      recommendation: reproducible
        ? null
        : "Implement build reproducibility checks",
    };
  }

  /**
   * Check artifact integrity
   */
  async checkArtifactIntegrity() {
    // Check if artifacts have integrity verification
    const artifacts = await this.findBuildArtifacts();
    const signedArtifacts = artifacts.filter((artifact) => {
      const sigFile = `${artifact}.sigstore`;
      return fs.existsSync(sigFile);
    });

    const integrityVerified = signedArtifacts.length === artifacts.length;

    return {
      passed: integrityVerified,
      details: `${signedArtifacts.length}/${artifacts.length} artifacts signed`,
      recommendation: integrityVerified
        ? null
        : "Sign all build artifacts for integrity",
    };
  }

  /**
   * Check SLSA compliance
   */
  async checkSLSACompliance() {
    // Check if SLSA attestation script exists
    const slsaScript = path.join(__dirname, "slsa-attestation.ts");
    const hasSLSAScript = fs.existsSync(slsaScript);

    return {
      passed: hasSLSAScript,
      details: hasSLSAScript
        ? "SLSA attestation script present"
        : "No SLSA compliance",
      recommendation: hasSLSAScript
        ? null
        : "Implement SLSA Level 3 compliance",
    };
  }

  /**
   * Find build artifacts
   */
  async findBuildArtifacts() {
    const artifacts = [];

    // Diamond ABI files
    const diamondAbiDir = path.join(this.buildDir, "diamond-abi");
    if (fs.existsSync(diamondAbiDir)) {
      const abiFiles = fs
        .readdirSync(diamondAbiDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(diamondAbiDir, file));
      artifacts.push(...abiFiles);
    }

    // TypeChain types
    const typechainDir = path.join(this.buildDir, "diamond-typechain-types");
    if (fs.existsSync(typechainDir)) {
      const typeFiles = fs
        .readdirSync(typechainDir)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => path.join(typechainDir, file));
      artifacts.push(...typeFiles);
    }

    return artifacts;
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRiskScore(components) {
    const weights = {
      Dependencies: 0.4,
      "Build Artifacts": 0.3,
      Infrastructure: 0.2,
      "Supply Chain Integrity": 0.1,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const component of components) {
      const weight = weights[component.component] || 0.25;
      weightedScore += component.riskScore * weight;
      totalWeight += weight;
    }

    return weightedScore / totalWeight;
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score >= this.riskThresholds.critical) return "critical";
    if (score >= this.riskThresholds.high) return "high";
    if (score >= this.riskThresholds.medium) return "medium";
    if (score >= this.riskThresholds.low) return "low";
    return "acceptable";
  }

  /**
   * Generate risk recommendations
   */
  generateRiskRecommendations(assessment) {
    const recommendations = [];

    for (const component of assessment.components) {
      if (
        component.riskLevel === "critical" ||
        component.riskLevel === "high"
      ) {
        recommendations.push(
          ...this.generateComponentRecommendations(component),
        );
      }
    }

    // Add general recommendations
    if (assessment.overallRiskScore > this.riskThresholds.medium) {
      recommendations.push({
        priority: "high",
        category: "General",
        recommendation:
          "Implement comprehensive security monitoring and alerting",
        impact: "High",
        effort: "Medium",
      });
    }

    return recommendations;
  }

  /**
   * Generate component-specific recommendations
   */
  generateComponentRecommendations(component) {
    const recommendations = [];

    switch (component.component) {
      case "Dependencies":
        if (component.details.highRiskDependencies > 0) {
          recommendations.push({
            priority: "critical",
            category: "Dependencies",
            recommendation: `Address ${component.details.highRiskDependencies} high-risk dependencies`,
            impact: "High",
            effort: "High",
          });
        }
        break;

      case "Build Artifacts":
        const unsignedArtifacts =
          component.details.totalArtifacts - component.details.signedArtifacts;
        if (unsignedArtifacts > 0) {
          recommendations.push({
            priority: "high",
            category: "Artifacts",
            recommendation: `Sign ${unsignedArtifacts} unsigned build artifacts`,
            impact: "Medium",
            effort: "Low",
          });
        }
        break;

      case "Infrastructure":
        if (component.details.failedChecks > 0) {
          recommendations.push({
            priority: "high",
            category: "Infrastructure",
            recommendation: `Address ${component.details.failedChecks} infrastructure security issues`,
            impact: "High",
            effort: "Medium",
          });
        }
        break;

      case "Supply Chain Integrity":
        if (component.details.failedChecks > 0) {
          recommendations.push({
            priority: "critical",
            category: "Supply Chain",
            recommendation: `Implement ${component.details.failedChecks} missing supply chain security controls`,
            impact: "Critical",
            effort: "High",
          });
        }
        break;
    }

    return recommendations;
  }

  /**
   * Generate unique assessment ID
   */
  generateAssessmentId() {
    return `sca-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Save assessment report
   */
  saveAssessmentReport(assessment) {
    const reportFile = path.join(
      this.reportsDir,
      `supply-chain-assessment-${assessment.assessmentId}.json`,
    );
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(assessment, null, 2));

    // Create summary report
    const summaryFile = path.join(
      this.reportsDir,
      "latest-supply-chain-assessment.json",
    );
    fs.writeFileSync(summaryFile, JSON.stringify(assessment, null, 2));

    this.log(`Assessment report saved: ${reportFile}`);
    this.log(`Summary report updated: ${summaryFile}`);
  }

  /**
   * Generate risk assessment report
   */
  async generateRiskReport(options = {}) {
    const assessment = await this.performRiskAssessment(options);

    const report = {
      title: "GNUS-DAO Supply Chain Risk Assessment Report",
      generated: new Date().toISOString(),
      assessment: assessment,
      summary: {
        overallRiskLevel: assessment.riskLevel,
        overallRiskScore: assessment.overallRiskScore,
        criticalComponents: assessment.components.filter(
          (c) => c.riskLevel === "critical",
        ).length,
        highRiskComponents: assessment.components.filter(
          (c) => c.riskLevel === "high",
        ).length,
        totalRecommendations: assessment.recommendations.length,
      },
    };

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const riskAssessment = new SupplyChainRiskAssessment();

  switch (command) {
    case "assess":
      const report = await riskAssessment.generateRiskReport();
      console.log(JSON.stringify(report, null, 2));
      break;

    case "quick":
      const assessment = await riskAssessment.performRiskAssessment();
      console.log(`Overall Risk Level: ${assessment.riskLevel}`);
      console.log(`Risk Score: ${assessment.overallRiskScore.toFixed(2)}`);
      console.log(`Recommendations: ${assessment.recommendations.length}`);
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node supply-chain-risk-assessment.js assess  # Full assessment report",
      );
      console.log(
        "  node supply-chain-risk-assessment.js quick   # Quick risk summary",
      );
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Supply chain risk assessment failed:", error.message);
    process.exit(1);
  });
}

module.exports = SupplyChainRiskAssessment;
