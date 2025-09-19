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

### scripts/ci-perf-monitor.js

CI-specific performance monitoring and metrics collection.

### scripts/sign-artifacts.js

Cryptographic signing and provenance generation for build artifacts.

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
