#!/usr/bin/env node

/**
 * Performance Monitoring for Security Hooks
 * Tracks execution times and provides optimization insights
 */

const fs = require("fs");
const path = require("path");

class PerformanceMonitor {
  constructor() {
    this.logDir = path.join(__dirname, "..", "logs");
    this.perfLogFile = path.join(this.logDir, "hook-performance.log");
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startTiming(hookName) {
    this.startTime = Date.now();
    this.hookName = hookName;
    console.log(`⏱️  Starting ${hookName} performance monitoring...`);
  }

  endTiming(success = true) {
    if (!this.startTime || !this.hookName) return;

    const duration = Date.now() - this.startTime;
    const status = success ? "SUCCESS" : "FAILED";

    const logEntry = {
      timestamp: new Date().toISOString(),
      hook: this.hookName,
      duration: duration,
      status: status,
      user: process.env.USER || process.env.USERNAME || "unknown",
    };

    fs.appendFileSync(this.perfLogFile, JSON.stringify(logEntry) + "\n");

    console.log(`⏱️  ${this.hookName} completed in ${duration}ms (${status})`);

    // Performance warnings
    if (duration > 30000) {
      // 30 seconds
      console.warn(
        `⚠️  WARNING: ${this.hookName} took longer than 30 seconds (${duration}ms)`,
      );
      console.warn(
        `   Consider optimizing the hook or using emergency bypass if needed`,
      );
    }

    this.startTime = null;
    this.hookName = null;
  }

  getPerformanceStats() {
    if (!fs.existsSync(this.perfLogFile)) {
      return { message: "No performance data available" };
    }

    const logs = fs
      .readFileSync(this.perfLogFile, "utf8")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter((entry) => entry !== null);

    const stats = {
      totalRuns: logs.length,
      hooks: {},
      averageDuration: 0,
      slowestHook: null,
      fastestHook: null,
    };

    let totalDuration = 0;

    logs.forEach((entry) => {
      if (!stats.hooks[entry.hook]) {
        stats.hooks[entry.hook] = {
          runs: 0,
          totalDuration: 0,
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          successRate: 0,
          successes: 0,
          failures: 0,
        };
      }

      const hookStats = stats.hooks[entry.hook];
      hookStats.runs++;
      hookStats.totalDuration += entry.duration;
      hookStats.minDuration = Math.min(hookStats.minDuration, entry.duration);
      hookStats.maxDuration = Math.max(hookStats.maxDuration, entry.duration);

      if (entry.status === "SUCCESS") {
        hookStats.successes++;
      } else {
        hookStats.failures++;
      }

      hookStats.successRate = (hookStats.successes / hookStats.runs) * 100;
      hookStats.averageDuration = hookStats.totalDuration / hookStats.runs;

      totalDuration += entry.duration;
    });

    stats.averageDuration = totalDuration / logs.length;

    // Find slowest and fastest hooks
    Object.entries(stats.hooks).forEach(([hookName, hookStats]) => {
      if (
        !stats.slowestHook ||
        hookStats.maxDuration > stats.hooks[stats.slowestHook].maxDuration
      ) {
        stats.slowestHook = hookName;
      }
      if (
        !stats.fastestHook ||
        hookStats.minDuration < stats.hooks[stats.fastestHook].minDuration
      ) {
        stats.fastestHook = hookName;
      }
    });

    return stats;
  }

  displayStats() {
    const stats = this.getPerformanceStats();

    if (stats.message) {
      console.log(stats.message);
      return;
    }

    console.log("📊 Security Hook Performance Statistics");
    console.log("=====================================");
    console.log(`Total Hook Runs: ${stats.totalRuns}`);
    console.log(`Average Duration: ${Math.round(stats.averageDuration)}ms`);
    console.log("");

    Object.entries(stats.hooks).forEach(([hookName, hookStats]) => {
      console.log(`🔗 ${hookName}:`);
      console.log(`   Runs: ${hookStats.runs}`);
      console.log(`   Average: ${Math.round(hookStats.averageDuration)}ms`);
      console.log(
        `   Range: ${hookStats.minDuration}ms - ${hookStats.maxDuration}ms`,
      );
      console.log(`   Success Rate: ${hookStats.successRate.toFixed(1)}%`);
      console.log("");
    });

    if (stats.slowestHook) {
      console.log(
        `🐌 Slowest Hook: ${stats.slowestHook} (${Math.round(stats.hooks[stats.slowestHook].maxDuration)}ms)`,
      );
    }

    if (stats.fastestHook) {
      console.log(
        `🚀 Fastest Hook: ${stats.fastestHook} (${Math.round(stats.hooks[stats.fastestHook].minDuration)}ms)`,
      );
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

const monitor = new PerformanceMonitor();

switch (command) {
  case "start":
    const hookName = args[1];
    if (!hookName) {
      console.error(
        "❌ Hook name required: yarn perf-monitor start <hook-name>",
      );
      process.exit(1);
    }
    monitor.startTiming(hookName);
    break;

  case "end":
    const success = args[1] !== "false";
    monitor.endTiming(success);
    break;

  case "stats":
  default:
    monitor.displayStats();
    break;
}
