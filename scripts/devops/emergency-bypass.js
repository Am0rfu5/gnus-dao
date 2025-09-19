#!/usr/bin/env node

/**
 * Emergency Security Bypass Script
 * Allows bypassing security hooks in emergency situations with proper logging
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const command = args[0];

if (command === "--help" || command === "-h" || !command) {
  console.log(`
🔒 GNUS-DAO Emergency Security Bypass Tool

Usage:
  yarn emergency-bypass <action> [options]

Actions:
  commit <message>    - Bypass pre-commit hooks and commit with message
  push                - Bypass pre-push hooks and push changes
  status              - Show current bypass status and recent logs
  disable             - Temporarily disable all security hooks
  enable              - Re-enable all security hooks

Options:
  --reason <text>     - Required reason for bypass (logged)
  --contact <email>   - Contact for follow-up (logged)
  --severity <level>  - Emergency severity: critical, high, medium, low

Examples:
  yarn emergency-bypass commit "fix critical production issue" --reason "Database connection failure" --contact "admin@gnus.ai" --severity critical
  yarn emergency-bypass push --reason "Hotfix deployment" --contact "devops@gnus.ai" --severity high
  yarn emergency-bypass status

⚠️  WARNING: This tool should only be used in genuine emergency situations.
   All bypass actions are logged and require justification.
`);
  process.exit(0);
}

const logDir = path.join(__dirname, "..", "logs");
const bypassLogFile = path.join(logDir, "emergency-bypass.log");

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Parse arguments
const reasonIndex = args.indexOf("--reason");
const contactIndex = args.indexOf("--contact");
const severityIndex = args.indexOf("--severity");

const reason = reasonIndex !== -1 ? args[reasonIndex + 1] : null;
const contact = contactIndex !== -1 ? args[contactIndex + 1] : null;
const severity = severityIndex !== -1 ? args[severityIndex + 1] : "medium";

function logBypassAction(action, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    user: process.env.USER || process.env.USERNAME || "unknown",
    nodeVersion: process.version,
    cwd: process.cwd(),
    reason,
    contact,
    severity,
    bypassId: crypto.randomUUID(),
    ...details,
  };

  fs.appendFileSync(bypassLogFile, JSON.stringify(logEntry) + "\n");

  // Send notification (in real implementation, this would send email/Slack)
  console.log(`🚨 EMERGENCY BYPASS LOGGED: ${action}`);
  console.log(`   ID: ${logEntry.bypassId}`);
  console.log(`   Reason: ${reason || "Not specified"}`);
  console.log(`   Contact: ${contact || "Not specified"}`);
  console.log(`   Severity: ${severity}`);
  console.log(`   Timestamp: ${logEntry.timestamp}`);
  console.log(`   Log: ${bypassLogFile}`);
}

function validateBypassRequest() {
  if (!reason) {
    console.error("❌ --reason is required for emergency bypass");
    process.exit(1);
  }

  if (!contact) {
    console.error("❌ --contact is required for emergency bypass");
    process.exit(1);
  }

  const validSeverities = ["critical", "high", "medium", "low"];
  if (!validSeverities.includes(severity)) {
    console.error(
      `❌ Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
    );
    process.exit(1);
  }

  console.log(`⚠️  EMERGENCY BYPASS REQUESTED`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Contact: ${contact}`);
  console.log(`   Severity: ${severity}`);
  console.log("");

  // Require explicit confirmation for high/critical severity
  if (severity === "critical" || severity === "high") {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      '🔴 HIGH/CRITICAL SEVERITY BYPASS - Type "CONFIRM" to proceed: ',
      (answer) => {
        rl.close();
        if (answer !== "CONFIRM") {
          console.log("❌ Bypass cancelled");
          process.exit(1);
        }
        executeBypass();
      },
    );
  } else {
    executeBypass();
  }
}

function executeBypass() {
  const { execSync } = require("child_process");
  const hooks = ["pre-commit", "commit-msg", "pre-push"];

  try {
    switch (command) {
      case "commit":
        const message = args[1];
        if (!message) {
          console.error("❌ Commit message required");
          process.exit(1);
        }

        logBypassAction("commit", { message });

        // Bypass hooks and commit
        process.env.HUSKY_SKIP_HOOKS = "1";
        execSync(`git add . && git commit -m "${message}"`, {
          stdio: "inherit",
        });

        console.log("✅ Emergency commit completed");
        break;

      case "push":
        logBypassAction("push");

        // Bypass hooks and push
        process.env.HUSKY_SKIP_HOOKS = "1";
        execSync("git push", { stdio: "inherit" });

        console.log("✅ Emergency push completed");
        break;

      case "disable":
        logBypassAction("disable-hooks");

        // Rename hook files to disable them
        hooks.forEach((hook) => {
          const hookPath = path.join(__dirname, "..", ".husky", hook);
          const disabledPath = `${hookPath}.disabled`;

          if (fs.existsSync(hookPath)) {
            fs.renameSync(hookPath, disabledPath);
            console.log(`🔇 Disabled ${hook} hook`);
          }
        });

        console.log("✅ All security hooks disabled temporarily");
        console.log('   Run "yarn emergency-bypass enable" to re-enable');
        break;

      case "enable":
        logBypassAction("enable-hooks");

        // Re-enable hook files
        hooks.forEach((hook) => {
          const hookPath = path.join(__dirname, "..", ".husky", hook);
          const disabledPath = `${hookPath}.disabled`;

          if (fs.existsSync(disabledPath)) {
            fs.renameSync(disabledPath, hookPath);
            console.log(`🔊 Re-enabled ${hook} hook`);
          }
        });

        console.log("✅ All security hooks re-enabled");
        break;

      case "status":
        if (fs.existsSync(bypassLogFile)) {
          const logs = fs
            .readFileSync(bypassLogFile, "utf8")
            .split("\n")
            .filter((line) => line.trim())
            .slice(-10); // Last 10 entries

          console.log("📋 Recent Emergency Bypass Actions:");
          logs.forEach((log, index) => {
            try {
              const entry = JSON.parse(log);
              console.log(
                `${index + 1}. ${entry.timestamp} - ${entry.action} (${entry.severity})`,
              );
              console.log(`   Reason: ${entry.reason || "Not specified"}`);
              console.log(`   User: ${entry.user}`);
              console.log("");
            } catch (e) {
              // Skip malformed lines
            }
          });
        } else {
          console.log("📋 No emergency bypass actions logged yet");
        }

        // Check hook status
        console.log("🔍 Hook Status:");
        hooks.forEach((hook) => {
          const hookPath = path.join(__dirname, "..", ".husky", hook);
          const disabledPath = `${hookPath}.disabled`;

          if (fs.existsSync(disabledPath)) {
            console.log(`   ${hook}: DISABLED`);
          } else if (fs.existsSync(hookPath)) {
            console.log(`   ${hook}: ENABLED`);
          } else {
            console.log(`   ${hook}: MISSING`);
          }
        });
        break;

      default:
        console.error(`❌ Unknown action: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Emergency bypass failed: ${error.message}`);
    process.exit(1);
  }
}

if (command === "status") {
  executeBypass();
} else {
  validateBypassRequest();
}
