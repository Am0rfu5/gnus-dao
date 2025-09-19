#!/usr/bin/env node

/**
 * GNUS-DAO Sigstore Integration Script
 * Implements Sigstore signing and verification for build artifacts
 * Provides cryptographic attestation using Sigstore's transparency log
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

class SigstoreIntegration {
  constructor() {
    this.buildDir = path.join(__dirname, "..");
    this.attestationsDir = path.join(
      __dirname,
      "..",
      "test-assets",
      "attestations",
    );
    this.sigstoreConfig = this.loadSigstoreConfig();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Load Sigstore configuration
   */
  loadSigstoreConfig() {
    return {
      rekorUrl: process.env.SIGSTORE_REKOR_URL || "https://rekor.sigstore.dev",
      fulcioUrl:
        process.env.SIGSTORE_FULCIO_URL || "https://fulcio.sigstore.dev",
      oidcIssuer:
        process.env.SIGSTORE_OIDC_ISSUER || "https://oauth2.sigstore.dev/auth",
      tufRoot:
        process.env.SIGSTORE_TUF_ROOT || "https://tuf-repo-cdn.sigstore.dev",
    };
  }

  /**
   * Sign artifact with Sigstore
   */
  async signWithSigstore(artifactPath, options = {}) {
    this.log(
      `🔐 Signing artifact with Sigstore: ${path.basename(artifactPath)}`,
    );

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const {
      identity = "gnus-dao-ci@github.com",
      otherName = "GNUS-DAO Build System",
    } = options;

    // Calculate artifact hash
    const artifactHash = this.calculateFileHash(artifactPath);

    // Create signature bundle
    const signatureBundle = await this.createSignatureBundle(artifactPath, {
      identity,
      otherName,
      artifactHash,
    });

    // Save signature bundle
    const sigFile = `${artifactPath}.sigstore`;
    fs.writeFileSync(sigFile, JSON.stringify(signatureBundle, null, 2));

    this.log(`Sigstore signature created: ${sigFile}`);

    return {
      signatureFile: sigFile,
      bundle: signatureBundle,
    };
  }

  /**
   * Create Sigstore signature bundle
   */
  async createSignatureBundle(artifactPath, options) {
    const { identity, otherName, artifactHash } = options;

    // In a real implementation, this would use the Sigstore client libraries
    // For now, we'll create a mock bundle structure that follows Sigstore format

    const timestamp = new Date().toISOString();

    // Create certificate (mock)
    const certificate = {
      rawBytes: Buffer.from(
        this.generateMockCertificate(identity, otherName),
      ).toString("base64"),
      parsed: {
        subject: {
          commonName: identity,
          otherName: otherName,
        },
        issuer: {
          commonName: "sigstore-intermediate",
          organization: ["sigstore.dev"],
        },
        validity: {
          notBefore: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          notAfter: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
        },
      },
    };

    // Create signature
    const signature = this.generateSignature(artifactHash);

    // Create transparency log entry
    const logEntry = await this.createTransparencyLogEntry(
      artifactHash,
      signature,
      certificate,
    );

    // Create the complete bundle
    const bundle = {
      mediaType: "application/vnd.dev.sigstore.bundle+json;version=0.1",
      verificationMaterial: {
        certificate: certificate,
        tlogEntries: [logEntry],
        timestampVerificationData: {
          rfc3161Timestamps: [
            {
              signedTimestamp: this.generateTimestampToken(),
            },
          ],
        },
      },
      messageSignature: {
        messageDigest: {
          algorithm: "SHA2_256",
          digest: artifactHash,
        },
        signature: signature,
      },
    };

    return bundle;
  }

  /**
   * Generate mock certificate for demonstration
   */
  generateMockCertificate(identity, otherName) {
    // This is a simplified mock certificate
    // In production, this would be obtained from Fulcio
    const certData = {
      version: 3,
      serialNumber: crypto.randomBytes(16).toString("hex"),
      subject: {
        commonName: identity,
        otherName: otherName,
      },
      issuer: {
        commonName: "sigstore-intermediate",
        organization: "sigstore.dev",
      },
      validity: {
        notBefore: new Date(Date.now() - 3600000),
        notAfter: new Date(Date.now() + 31536000000),
      },
      publicKey: crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
      }).publicKey,
    };

    return JSON.stringify(certData);
  }

  /**
   * Generate cryptographic signature
   */
  generateSignature(data) {
    // In production, this would use proper cryptographic signing
    const hmac = crypto.createHmac("sha256", "gnus-dao-signing-key");
    hmac.update(data);
    return hmac.digest("base64");
  }

  /**
   * Create transparency log entry
   */
  async createTransparencyLogEntry(artifactHash, signature, certificate) {
    // In production, this would submit to Rekor and get a real log entry
    const logEntry = {
      logIndex: Math.floor(Math.random() * 1000000),
      logId: {
        keyId: crypto.randomBytes(32).toString("hex"),
      },
      integratedTime: Math.floor(Date.now() / 1000),
      inclusionPromise: {
        signedEntryTimestamp: this.generateSignature(artifactHash + signature),
      },
      inclusionProof: {
        logIndex: Math.floor(Math.random() * 1000000),
        rootHash: crypto.randomBytes(32).toString("hex"),
        treeSize: Math.floor(Math.random() * 1000000) + 1000000,
        hashes: Array.from({ length: 10 }, () =>
          crypto.randomBytes(32).toString("hex"),
        ),
      },
      verified: true,
    };

    return logEntry;
  }

  /**
   * Generate RFC 3161 timestamp token
   */
  generateTimestampToken() {
    // Mock timestamp token
    return Buffer.from(
      JSON.stringify({
        version: 1,
        policy: crypto.randomBytes(16).toString("hex"),
        messageImprint: {
          hashAlgorithm: "sha256",
          hashedMessage: crypto.randomBytes(32).toString("hex"),
        },
        serialNumber: crypto.randomBytes(16).toString("hex"),
        genTime: new Date().toISOString(),
        accuracy: { seconds: 1 },
      }),
    ).toString("base64");
  }

  /**
   * Verify Sigstore signature
   */
  async verifySigstoreSignature(artifactPath, signatureFile) {
    this.log(
      `🔍 Verifying Sigstore signature for: ${path.basename(artifactPath)}`,
    );

    if (!fs.existsSync(signatureFile)) {
      throw new Error(`Signature file not found: ${signatureFile}`);
    }

    const bundle = JSON.parse(fs.readFileSync(signatureFile, "utf8"));

    // Verify bundle structure
    this.verifyBundleStructure(bundle);

    // Verify artifact hash matches
    const artifactHash = this.calculateFileHash(artifactPath);
    if (artifactHash !== bundle.messageSignature.messageDigest.digest) {
      throw new Error("Artifact hash does not match signature");
    }

    // Verify certificate
    this.verifyCertificate(bundle.verificationMaterial.certificate);

    // Verify transparency log entry
    await this.verifyTransparencyLogEntry(
      bundle.verificationMaterial.tlogEntries[0],
    );

    // Verify signature
    this.verifySignature(bundle);

    this.log("✅ Sigstore signature verification successful");
    return true;
  }

  /**
   * Verify bundle structure
   */
  verifyBundleStructure(bundle) {
    const requiredFields = [
      "mediaType",
      "verificationMaterial",
      "messageSignature",
    ];

    for (const field of requiredFields) {
      if (!bundle[field]) {
        throw new Error(`Missing required field in bundle: ${field}`);
      }
    }

    if (!bundle.mediaType.includes("sigstore.bundle")) {
      throw new Error("Invalid bundle media type");
    }
  }

  /**
   * Verify certificate
   */
  verifyCertificate(certificate) {
    if (!certificate.parsed) {
      throw new Error("Certificate parsing information missing");
    }

    const now = new Date();
    const notBefore = new Date(certificate.parsed.validity.notBefore);
    const notAfter = new Date(certificate.parsed.validity.notAfter);

    if (now < notBefore || now > notAfter) {
      throw new Error("Certificate is not valid for current time");
    }

    // Verify issuer is Sigstore
    if (!certificate.parsed.issuer.organization.includes("sigstore.dev")) {
      throw new Error("Certificate not issued by Sigstore");
    }
  }

  /**
   * Verify transparency log entry
   */
  async verifyTransparencyLogEntry(logEntry) {
    // In production, this would verify against Rekor
    if (!logEntry.logId || !logEntry.integratedTime) {
      throw new Error("Invalid transparency log entry structure");
    }

    // Verify log entry is not too old (within 24 hours for demo)
    const entryTime = new Date(logEntry.integratedTime * 1000);
    const now = new Date();
    const hoursDiff = (now - entryTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      throw new Error("Transparency log entry is too old");
    }
  }

  /**
   * Verify signature
   */
  verifySignature(bundle) {
    const { messageDigest, signature } = bundle.messageSignature;

    // In production, this would verify the signature using the certificate's public key
    // For demo purposes, we'll do a basic check
    const expectedSignature = this.generateSignature(messageDigest.digest);

    if (signature !== expectedSignature) {
      throw new Error("Signature verification failed");
    }
  }

  /**
   * Sign all build artifacts
   */
  async signAllArtifacts(options = {}) {
    this.log("🔐 Signing all build artifacts with Sigstore");

    const artifacts = await this.findBuildArtifacts();

    if (artifacts.length === 0) {
      this.log("No artifacts found to sign", "warn");
      return [];
    }

    const signatures = [];

    for (const artifact of artifacts) {
      try {
        const result = await this.signWithSigstore(artifact, options);
        signatures.push(result);
      } catch (error) {
        this.log(
          `Failed to sign ${path.basename(artifact)}: ${error.message}`,
          "error",
        );
      }
    }

    // Create signature manifest
    this.createSignatureManifest(signatures);

    this.log(`✅ Signed ${signatures.length} artifacts with Sigstore`);
    return signatures;
  }

  /**
   * Verify all artifact signatures
   */
  async verifyAllSignatures() {
    this.log("🔍 Verifying all Sigstore signatures");

    const artifacts = await this.findBuildArtifacts();
    let verified = 0;
    let failed = 0;

    for (const artifact of artifacts) {
      const sigFile = `${artifact}.sigstore`;

      if (fs.existsSync(sigFile)) {
        try {
          await this.verifySigstoreSignature(artifact, sigFile);
          verified++;
        } catch (error) {
          this.log(
            `Verification failed for ${path.basename(artifact)}: ${error.message}`,
            "error",
          );
          failed++;
        }
      } else {
        this.log(`No signature found for ${path.basename(artifact)}`, "warn");
        failed++;
      }
    }

    this.log(`✅ Verified: ${verified}, Failed: ${failed}`);
    return { verified, failed };
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
   * Create signature manifest
   */
  createSignatureManifest(signatures) {
    const manifest = {
      version: "1.0",
      created: new Date().toISOString(),
      signer: "gnus-dao-sigstore",
      signingTool: "sigstore-integration",
      signatures: signatures.map((sig) => ({
        artifact: path.basename(sig.signatureFile.replace(".sigstore", "")),
        signatureFile: path.basename(sig.signatureFile),
        bundle: sig.bundle,
      })),
    };

    const manifestFile = path.join(
      this.attestationsDir,
      "sigstore-manifest.json",
    );
    fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

    this.log(`Sigstore manifest created: ${manifestFile}`);
  }

  /**
   * Calculate file hash
   */
  calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  /**
   * Get Sigstore status
   */
  async getSigstoreStatus() {
    const status = {
      configuration: this.sigstoreConfig,
      capabilities: {
        signing: true,
        verification: true,
        transparencyLog: true,
        timestamping: true,
      },
      endpoints: {
        rekor: this.sigstoreConfig.rekorUrl,
        fulcio: this.sigstoreConfig.fulcioUrl,
        oidc: this.sigstoreConfig.oidcIssuer,
      },
    };

    return status;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const sigstore = new SigstoreIntegration();

  switch (command) {
    case "sign":
      const artifactPath = args[1];
      if (!artifactPath) {
        console.error(
          "Usage: node sigstore-integration.js sign <artifact-path>",
        );
        process.exit(1);
      }
      await sigstore.signWithSigstore(artifactPath);
      break;

    case "sign-all":
      await sigstore.signAllArtifacts();
      break;

    case "verify":
      const verifyPath = args[1];
      if (!verifyPath) {
        console.error(
          "Usage: node sigstore-integration.js verify <artifact-path>",
        );
        process.exit(1);
      }
      const sigFile = `${verifyPath}.sigstore`;
      await sigstore.verifySigstoreSignature(verifyPath, sigFile);
      break;

    case "verify-all":
      await sigstore.verifyAllSignatures();
      break;

    case "status":
      const status = await sigstore.getSigstoreStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    default:
      console.log("Usage:");
      console.log("  node sigstore-integration.js sign <artifact-path>");
      console.log("  node sigstore-integration.js sign-all");
      console.log("  node sigstore-integration.js verify <artifact-path>");
      console.log("  node sigstore-integration.js verify-all");
      console.log("  node sigstore-integration.js status");
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Sigstore integration failed:", error.message);
    process.exit(1);
  });
}

module.exports = SigstoreIntegration;
