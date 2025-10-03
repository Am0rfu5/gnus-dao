# GNUS-DAO CI Pipeline Documentation

## Overview

The GNUS-DAO CI pipeline implements a comprehensive, secure build and test workflow optimized for Diamond proxy smart contract development. The pipeline ensures reproducible builds, comprehensive testing, and secure artifact generation with cryptographic provenance.

## Pipeline Architecture

### Jobs Overview

1. **security-check** - Dependency and security validation
2. **build** - Contract compilation and artifact generation
3. **test-unit** - Parallel unit and integration testing
4. **test-multichain** - Multi-blockchain fork testing
5. **coverage** - Test coverage analysis and validation
6. **benchmark** - Performance monitoring and gas analysis
7. **reproducibility** - Build reproducibility verification
8. **artifacts** - Signed artifact creation with provenance
9. **validate** - Final pipeline validation and reporting

## Key Features

### 🔒 Security-First Design

- **Frozen Lockfile Enforcement**: Prevents dependency tampering
- **Comprehensive Security Scanning**: Integrated with local security tools
- **Cryptographic Signing**: Build artifacts include digital signatures
- **Provenance Tracking**: Complete build chain verification

### ⚡ Performance Optimization

- **Intelligent Caching**: Node.js, Yarn, and Hardhat cache layers
- **Parallel Execution**: Multi-job test execution with 4 parallel workers
- **Incremental Builds**: Only rebuild changed components
- **Resource Optimization**: Memory and timeout optimizations

### 🌐 Multi-Chain Testing

- **Fork Testing**: Test against live network state
- **Network Matrix**: Automated testing across 4+ test networks
- **Gas Estimation**: Real network gas cost validation
- **Deployment Verification**: Cross-network deployment testing

### 📊 Comprehensive Monitoring

- **Test Coverage**: 80%+ minimum threshold enforcement
- **Performance Metrics**: Gas usage, compilation time, contract size
- **Build Reproducibility**: Deterministic build verification
- **Security Thresholds**: Automated security quality gates

## Configuration Files

### .github/workflows/ci.yml

Main CI pipeline workflow with all job definitions and security controls.

### .buildrc

Build optimization settings and performance thresholds.

### .multichain.yml

Multi-chain testing configuration and network settings.

### scripts/devops/ci-perf-monitor.js

CI-specific performance monitoring and metrics collection.

### scripts/sign-artifacts.ts

**TypeScript-based cryptographic signing and provenance generation for build artifacts**

The `sign-artifacts.ts` script implements enterprise-grade artifact signing and provenance tracking for the GNUS-DAO CI/CD pipeline. It provides cryptographic integrity verification, build chain provenance, and tamper-evident artifact management.

#### Core Functionality

**Artifact Signing Process:**
1. **Provenance Generation**: Collects comprehensive build metadata including Git commit, Node.js version, platform details, and dependency information
2. **Cryptographic Signing**: Creates SHA256-based digital signatures with deterministic hashing for reproducible verification
3. **Artifact Integrity**: Calculates directory-level hashes for all build outputs (artifacts, diamond-abi, diamond-typechain-types)
4. **Verification Script Generation**: Automatically creates TypeScript-based verification tools for downstream consumers

**Key Features:**
- **Deterministic Hashing**: Uses sorted file enumeration and consistent hash calculation for reproducible signatures
- **Multi-Artifact Support**: Handles complex artifact structures including nested directories and multiple output types
- **Dependency Tracking**: Records package counts, Yarn lockfile existence, and lockfile hashes for supply chain verification
- **Build Environment Capture**: Logs Node.js version, platform, and architecture for environment reproducibility
- **Tamper Detection**: Enables detection of any modifications to signed artifacts through hash verification

#### Generated Outputs

**Signed Artifacts Directory Structure:**
```
scripts/devops/signed-artifacts/
├── artifacts/                    # Copied contract artifacts
├── diamond-abi/                  # Diamond proxy ABI files
├── diamond-typechain-types/      # TypeScript type definitions
├── typechain-types/              # Standard contract types
├── provenance.json               # Comprehensive build provenance
├── artifacts.sig                 # Cryptographic signature
└── verify.ts                     # TypeScript verification tool
```

**Provenance Data Structure:**
```typescript
interface ProvenanceData {
  project: string;              // Project identifier
  version: string;              // Git commit hash
  timestamp: string;            // ISO 8601 build timestamp
  build: {                      // Build environment details
    node_version: string;
    platform: string;
    arch: string;
  };
  artifacts: {                  // Artifact integrity data
    [artifactName: string]: {
      path: string;
      hash: string;             // SHA256 directory hash
      fileCount: number;
    };
  };
  dependencies: {               // Dependency verification
    package_count: number;
    yarn_lock_exists: boolean;
    yarn_lock_hash: string | null;
  };
}
```

#### Verification Capabilities

**Signature Verification:**
- Recreates provenance hash using identical algorithm and salt
- Compares calculated signature with stored signature
- Validates build environment and artifact integrity

**Integrity Checking:**
- Verifies all artifact files remain unmodified
- Recalculates directory hashes for comparison
- Detects file additions, deletions, or modifications

**Verification Commands:**
```bash
# Verify cryptographic signature
npx ts-node scripts/devops/signed-artifacts/verify.ts verify

# Check artifact integrity
npx ts-node scripts/devops/signed-artifacts/verify.ts integrity
```

#### Security Implementation

**Cryptographic Methods:**
- **Hash Algorithm**: SHA256 for all cryptographic operations
- **Signature Salt**: Project-specific salt ("GNUS-DAO-SIGNATURE-SALT") for additional entropy
- **Deterministic Ordering**: JSON key sorting ensures consistent hashing across environments

**Integrity Protections:**
- **File Filtering**: Excludes irrelevant files (.log, .tmp, .DS_Store, node_modules)
- **Directory Recursion**: Comprehensive scanning of nested artifact structures
- **Hash Verification**: Directory-level hashing prevents undetected modifications

#### Integration with CI/CD Pipeline

**Pipeline Integration:**
- Executed in the `artifacts` job after successful compilation
- Generates signed outputs for deployment verification
- Provides provenance data for audit trails and compliance

**Deployment Verification:**
- Downstream deployment systems can verify artifact integrity
- Enables automated rejection of tampered artifacts
- Supports SLSA (Supply Chain Levels for Software Artifacts) compliance

**Audit Trail:**
- Complete build chain traceability from source to deployment
- Cryptographic proof of build environment and dependencies
- Timestamped signatures for temporal verification

#### Usage in Development Workflow

**Local Development:**
```bash
# Generate signed artifacts locally
npm run sign-artifacts

# Verify signed artifacts
npx ts-node scripts/devops/signed-artifacts/verify.ts verify
```

**CI/CD Integration:**
- Automatic execution in GitHub Actions workflow
- Integration with artifact storage and distribution systems
- Support for automated deployment verification gates

#### Error Handling and Diagnostics

**Common Error Scenarios:**
- **Missing Provenance File**: Indicates signing process failure
- **Signature Mismatch**: Potential tampering or environment differences
- **Hash Verification Failure**: Artifact modification after signing
- **Missing Artifact Directories**: Build process incomplete

**Diagnostic Information:**
- Detailed provenance display including all build metadata
- File-by-file integrity reporting
- Clear error messages with suggested remediation steps

This artifact signing system provides the cryptographic foundation for secure software supply chain management in the GNUS-DAO project, ensuring that deployed smart contracts can be verified from source to execution.

## Environment Variables

### Required Secrets

- `SEPOLIA_RPC` - Sepolia testnet RPC URL
- `SEPOLIA_BLOCK` - Sepolia block number for fork testing
- `POLYGON_AMOY_RPC` - Polygon Amoy testnet RPC URL
- `POLYGON_AMOY_BLOCK` - Polygon Amoy block number
- `ARBITRUM_SEPOLIA_RPC` - Arbitrum Sepolia RPC URL
- `ARBITRUM_SEPOLIA_BLOCK` - Arbitrum Sepolia block number
- `BASE_SEPOLIA_RPC` - Base Sepolia RPC URL
- `BASE_SEPOLIA_BLOCK` - Base Sepolia block number

### Build Configuration

- `NODE_VERSION`: '18.19.0' - Node.js version for consistency
- `HARDHAT_CACHE_DIR`: Cache directory for Hardhat artifacts
- `YARN_CACHE_DIR`: Yarn package cache directory

## Performance Targets

- **Total Pipeline Time**: < 10 minutes
- **Build Time**: < 5 minutes with caching
- **Test Execution**: < 8 minutes with parallelization
- **Security Checks**: < 3 minutes
- **Artifact Generation**: < 2 minutes

## Security Features

### Dependency Security

- Yarn audit with moderate severity threshold
- Frozen lockfile prevents tampering
- Automated dependency updates via Dependabot

### Code Security

- ESLint security rules
- Semgrep static analysis
- CodeQL automated scanning

### Build Security

- Reproducible builds verification
- Cryptographic artifact signing
- SLSA provenance generation

## Multi-Chain Support

### Supported Networks

- **Sepolia**: Ethereum testnet
- **Polygon Amoy**: Polygon testnet
- **Arbitrum Sepolia**: Arbitrum testnet
- **Base Sepolia**: Base testnet

### Testing Strategy

- Unit tests on local Hardhat network
- Integration tests on local network
- Fork tests on live testnet state
- Deployment tests across all supported networks

## Artifact Generation

### Build Artifacts

- `artifacts/` - Compiled contract artifacts
- `diamond-abi/` - Diamond proxy ABI files
- `diamond-typechain-types/` - TypeScript types for Diamond contracts
- `typechain-types/` - Standard contract TypeScript types

### Signed Artifacts

- `signed-artifacts/` - Cryptographically signed build outputs
- `provenance.json` - Build provenance and metadata
- `artifacts.sig` - Cryptographic signature file
- `verify.js` - Artifact verification script

## Monitoring and Reporting

### Performance Metrics

- Contract size analysis
- Compilation time tracking
- Gas usage reporting
- Test execution times

### Coverage Reporting

- Line coverage: 80% minimum
- Function coverage: 80% minimum
- Branch coverage: 75% minimum
- Statement coverage: 80% minimum

### Security Reporting

- Vulnerability counts by severity
- Dependency security status
- Code scanning results
- Compliance status

## Troubleshooting

### Common Issues

#### Pipeline Timeout

- Check test parallelization settings
- Review long-running tests
- Optimize Docker image size

#### Cache Issues

- Clear Hardhat cache: `yarn clean`
- Reset Yarn cache: `yarn cache clean`
- Check cache key conflicts

#### Multi-Chain Failures

- Verify RPC endpoint availability
- Check network-specific gas limits
- Review fork block numbers

#### Coverage Failures

- Run `yarn coverage` locally
- Check uncovered code sections
- Review coverage configuration

### Debug Mode

Enable debug logging by setting:

```bash
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

## Integration with Development Workflow

### Local Testing

```bash
# Run full CI pipeline locally
yarn ci-local

# Run specific CI jobs
yarn test:ci
yarn build:ci
yarn coverage:ci
```

### Pre-commit Integration

The CI pipeline validates the same standards enforced by pre-commit hooks:

- Security scanning
- Code formatting
- Test execution
- Type checking

### Deployment Integration

CI artifacts feed directly into deployment pipelines:

- Signed artifacts for production deployment
- Provenance data for audit trails
- Test reports for release validation

## Maintenance

### Regular Updates

- Review and update Node.js version quarterly
- Update GitHub Actions to latest versions monthly
- Refresh test network configurations as needed

### Performance Monitoring

- Monitor pipeline execution times
- Track cache hit rates
- Review failed job patterns

### Security Updates

- Keep security scanning tools updated
- Review and update security thresholds
- Monitor new vulnerability patterns

## Compliance and Standards

### Security Standards

- OWASP Smart Contract Security Verification
- Ethereum Smart Contract Security Best Practices
- Gas optimization guidelines

### Code Quality

- TypeScript strict mode compliance
- ESLint security rules adherence
- Comprehensive test coverage

### Build Standards

- Reproducible build requirements
- Cryptographic signing standards
- Provenance tracking compliance

This CI pipeline provides enterprise-grade security and reliability for the GNUS-DAO Diamond proxy smart contract development lifecycle.
