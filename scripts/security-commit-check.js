#!/usr/bin/env node

/**
 * Security Commit Message Validation
 * Validates that security-related commits follow proper patterns
 */

const fs = require("fs");
const path = require("path");

// Get commit message from git
const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error("❌ No commit message file provided");
  process.exit(1);
}

try {
  const commitMsg = fs.readFileSync(commitMsgFile, "utf8").trim();

  // Security-related commit patterns
  const securityPatterns = [
    /^security:/i, // Security type commits
    /security|vulnerability|exploit|cve|audit/i, // Security keywords
    /^fix.*security/i, // Security fixes
    /^feat.*security/i, // Security features
  ];

  const isSecurityCommit = securityPatterns.some((pattern) =>
    pattern.test(commitMsg),
  );

  if (isSecurityCommit) {
    console.log("🔒 Security-related commit detected");

    // Additional validation for security commits
    const securityValidationRules = [
      {
        test: commitMsg.length > 10,
        message:
          "Security commit messages must be descriptive (more than 10 characters)",
      },
      {
        test: /CVE-\d{4}-\d{4,7}/.test(commitMsg) || !/cve/i.test(commitMsg),
        message: "If referencing CVE, use proper format: CVE-YYYY-NNNN",
      },
      {
        test:
          !/fix.*password|fix.*secret|fix.*key/i.test(commitMsg) ||
          /remove|revoke|rotate/i.test(commitMsg),
        message:
          "Security fixes involving credentials must include removal/rotation actions",
      },
    ];

    const failedRules = securityValidationRules.filter((rule) => !rule.test);

    if (failedRules.length > 0) {
      console.error("❌ Security commit validation failed:");
      failedRules.forEach((rule) => {
        console.error(`  - ${rule.message}`);
      });

      // Log security commit for audit trail
      const logEntry = {
        timestamp: new Date().toISOString(),
        commit: commitMsg,
        validation: "FAILED",
        issues: failedRules.map((r) => r.message),
      };

      const logFile = path.join(
        __dirname,
        "..",
        "logs",
        "security-commits.log",
      );
      const logDir = path.dirname(logFile);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
      console.log(`📝 Security commit logged to ${logFile}`);

      process.exit(1);
    }

    // Log successful security commit
    const logEntry = {
      timestamp: new Date().toISOString(),
      commit: commitMsg,
      validation: "PASSED",
    };

    const logFile = path.join(__dirname, "..", "logs", "security-commits.log");
    const logDir = path.dirname(logFile);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
    console.log("✅ Security commit validation passed");
  }
} catch (error) {
  console.error("❌ Error validating security commit:", error.message);
  process.exit(1);
}
