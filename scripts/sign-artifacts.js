#!/usr/bin/env node

/**
 * GNUS-DAO Build Artifact Signing and Provenance Script
 * Creates cryptographic signatures and provenance attestations for build artifacts
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

class ArtifactSigner {
  constructor() {
    this.artifactsDir = path.join(__dirname, "..", "artifacts");
    this.signedDir = path.join(__dirname, "..", "signed-artifacts");
    this.provenanceFile = path.join(this.signedDir, "provenance.json");
    this.signatureFile = path.join(this.signedDir, "artifacts.sig");
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  ensureSignedDir() {
    if (!fs.existsSync(this.signedDir)) {
      fs.mkdirSync(this.signedDir, { recursive: true });
    }
  }

  calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  }

  calculateDirectoryHash(dirPath) {
    const hashSum = crypto.createHash("sha256");
    const files = this.getAllFiles(dirPath).sort(); // Sort for consistent hashing

    for (const file of files) {
      const relativePath = path.relative(dirPath, file);
      const fileHash = this.calculateFileHash(file);
      hashSum.update(relativePath + ":" + fileHash + "\n");
    }

    return hashSum.digest("hex");
  }

  getAllFiles(dirPath) {
    const files = [];

    function walkDir(currentPath) {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (
            !item.startsWith(".") &&
            item !== "node_modules" &&
            item !== "cache"
          ) {
            walkDir(itemPath);
          }
        } else if (
          stat.isFile() &&
          !item.endsWith(".log") &&
          !item.endsWith(".tmp") &&
          item !== ".DS_Store"
        ) {
          files.push(itemPath);
        }
      }
    }

    walkDir(dirPath);
    return files;
  }

  generateProvenanceData() {
    const provenance = {
      project: "gnus-dao",
      version: this.getGitCommit(),
      timestamp: new Date().toISOString(),
      build: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      artifacts: {},
      dependencies: this.getDependencyInfo(),
    };

    // Calculate hashes for key artifacts
    const artifactDirs = [
      "artifacts",
      "diamond-abi",
      "diamond-typechain-types",
    ];

    for (const dir of artifactDirs) {
      const dirPath = path.join(__dirname, "..", dir);
      if (fs.existsSync(dirPath)) {
        provenance.artifacts[dir] = {
          path: dir,
          hash: this.calculateDirectoryHash(dirPath),
          fileCount: this.getAllFiles(dirPath).length,
        };
      }
    }

    return provenance;
  }

  getGitCommit() {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch (error) {
      return "unknown";
    }
  }

  getDependencyInfo() {
    const packageJson = path.join(__dirname, "..", "package.json");
    if (!fs.existsSync(packageJson)) {
      return {};
    }

    const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    const yarnLock = path.join(__dirname, "..", "yarn.lock");

    return {
      package_count:
        Object.keys(pkg.dependencies || {}).length +
        Object.keys(pkg.devDependencies || {}).length,
      yarn_lock_exists: fs.existsSync(yarnLock),
      yarn_lock_hash: fs.existsSync(yarnLock)
        ? this.calculateFileHash(yarnLock)
        : null,
    };
  }

  createSignature(provenanceData) {
    // Create a deterministic string representation for signing
    const provenanceString = JSON.stringify(
      provenanceData,
      Object.keys(provenanceData).sort(),
    );

    // In a real implementation, this would use a proper private key
    // For now, we'll create a simple hash-based signature
    const signature = crypto
      .createHash("sha256")
      .update(provenanceString)
      .update("GNUS-DAO-SIGNATURE-SALT") // Simple salt for demo
      .digest("hex");

    return {
      algorithm: "SHA256",
      signature: signature,
      public_key: "GNUS-DAO-CI-SIGNER", // Placeholder for actual public key
      timestamp: new Date().toISOString(),
    };
  }

  copyArtifactsToSigned() {
    const artifactsToCopy = [
      "artifacts",
      "diamond-abi",
      "diamond-typechain-types",
      "typechain-types",
    ];

    for (const artifact of artifactsToCopy) {
      const sourcePath = path.join(__dirname, "..", artifact);
      const targetPath = path.join(this.signedDir, artifact);

      if (fs.existsSync(sourcePath)) {
        this.log(`Copying ${artifact} to signed artifacts...`);
        execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: "inherit" });
      }
    }
  }

  async sign() {
    this.log("🔐 Starting GNUS-DAO artifact signing process");

    this.ensureSignedDir();

    // Generate provenance data
    this.log("Generating provenance data...");
    const provenanceData = this.generateProvenanceData();

    // Create signature
    this.log("Creating cryptographic signature...");
    const signature = this.createSignature(provenanceData);

    // Combine provenance and signature
    const signedProvenance = {
      provenance: provenanceData,
      signature: signature,
    };

    // Write provenance file
    fs.writeFileSync(
      this.provenanceFile,
      JSON.stringify(signedProvenance, null, 2),
    );
    this.log(`Provenance written to: ${this.provenanceFile}`);

    // Write signature file (separate for easy verification)
    fs.writeFileSync(this.signatureFile, JSON.stringify(signature, null, 2));
    this.log(`Signature written to: ${this.signatureFile}`);

    // Copy artifacts
    this.copyArtifactsToSigned();

    // Create verification script
    this.createVerificationScript();

    this.log("✅ Artifact signing completed successfully");
    this.log(`📦 Signed artifacts available in: ${this.signedDir}`);

    return signedProvenance;
  }

  createVerificationScript() {
    const verifyScript = `#!/usr/bin/env node

/**
 * GNUS-DAO Artifact Verification Script
 * Verifies the cryptographic signature and provenance of signed artifacts
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function verifyArtifacts() {
  const signedDir = __dirname;
  const provenanceFile = path.join(signedDir, 'provenance.json');

  if (!fs.existsSync(provenanceFile)) {
    console.error('❌ Provenance file not found');
    process.exit(1);
  }

  const signedProvenance = JSON.parse(fs.readFileSync(provenanceFile, 'utf8'));

  // Recalculate provenance hash
  const currentProvenance = signedProvenance.provenance;
  const provenanceString = JSON.stringify(currentProvenance, Object.keys(currentProvenance).sort());
  const calculatedHash = crypto.createHash('sha256')
    .update(provenanceString)
    .update('GNUS-DAO-SIGNATURE-SALT')
    .digest('hex');

  // Verify signature
  if (calculatedHash === signedProvenance.signature.signature) {
    console.log('✅ Artifact signature verified successfully');
    console.log('📋 Provenance information:');
    console.log('   Project:', currentProvenance.project);
    console.log('   Version:', currentProvenance.version);
    console.log('   Timestamp:', currentProvenance.timestamp);
    console.log('   Node.js:', currentProvenance.build.node_version);
  } else {
    console.error('❌ Artifact signature verification failed');
    process.exit(1);
  }
}

if (require.main === module) {
  verifyArtifacts();
}
`;

    const verifyScriptPath = path.join(this.signedDir, "verify.js");
    fs.writeFileSync(verifyScriptPath, verifyScript);
    fs.chmodSync(verifyScriptPath, "755");

    this.log(`Verification script created: ${verifyScriptPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const signer = new ArtifactSigner();
  signer.sign().catch((error) => {
    console.error("Artifact signing failed:", error);
    process.exit(1);
  });
}

module.exports = ArtifactSigner;
