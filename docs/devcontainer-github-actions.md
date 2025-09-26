# DevContainer GitHub Actions Integration

This document provides comprehensive guidance for the GNUS-DAO DevContainer GitHub Actions integration, enabling consistent, secure, and performant CI/CD execution using containerized environments.

## Overview

The DevContainer integration leverages GitHub Container Registry (ghcr.io) and the `devcontainers/ci` action to provide:

- **Consistent Development Environment**: Identical execution environment across local development and CI/CD
- **Security-First Approach**: Containerized security scanning with vulnerability management
- **Performance Optimization**: Layer caching, parallel execution, and optimized build contexts
- **GitHub CLI Integration**: Streamlined workflow management and validation

## Architecture

### Workflow Structure

```
.github/workflows/
├── devcontainer-ci.yml          # Main DevContainer CI pipeline
└── build-devcontainer.yml       # Dedicated container image building
```

### Key Components

1. **DevContainer CI Workflow** (`devcontainer-ci.yml`)
   - Multi-job architecture with parallel execution
   - Container registry integration
   - Security scanning in containerized environment
   - Environment parity validation

2. **Container Build Workflow** (`build-devcontainer.yml`)
   - Automated image building and publishing
   - Security scanning of container images
   - Package metadata management
   - Automated cleanup of old images

3. **Validation Scripts** (`scripts/devops/gh-devcon/`)
   - Environment parity validation
   - Performance comparison utilities
   - GitHub CLI integration helpers

## Quick Start

### Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Docker CLI available (for local testing)
- Repository access with package write permissions

### Basic Usage

```bash
# Quick validation using helper script
yarn gh-devcontainer-validate

# Manual workflow using GitHub CLI
gh workflow run devcontainer-ci.yml --ref feature/my-branch
gh run watch
gh run view --log
gh pr status
gh pr checks

# Validate environment parity
./scripts/devops/gh-devcon/validate-devcontainer.sh
```

### GitHub CLI Workflow Helper

The project includes a comprehensive GitHub CLI workflow helper script that automates the development process:

```bash
# Show all available commands
yarn gh-devcontainer --help

# Run DevContainer CI workflow
yarn gh-devcontainer-run

# Run specific test suite
yarn gh-devcontainer-run --test-suite unit

# Build DevContainer image
yarn gh-devcontainer-build

# Monitor workflow execution
yarn gh-devcontainer-watch

# View detailed logs
yarn gh-devcontainer-logs

# Check PR status
yarn gh-devcontainer-pr-status

# Full validation workflow (run + watch + logs + pr-status)
yarn gh-devcontainer-validate
```

## GitHub CLI Validation Workflow

The DevContainer integration provides a comprehensive GitHub CLI-based development workflow that enables developers to easily validate changes using containerized environments.

### Step-by-Step Development Process

#### 1. Development Workflow with Validation

```bash
# Start the DevContainer CI workflow on your feature branch
gh workflow run devcontainer-ci.yml --ref feature/my-branch

# Monitor the workflow execution in real-time
gh run watch

# View detailed logs if needed for debugging
gh run view --log
```

#### 2. Pre-Merge Validation

```bash
# Check pull request status
gh pr status

# Validate all PR checks are passing
gh pr checks
```

#### 3. Advanced CLI Usage

```bash
# Run specific test suites
gh workflow run devcontainer-ci.yml --ref feature/my-branch -f test_suite=unit
gh workflow run devcontainer-ci.yml --ref feature/my-branch -f test_suite=security

# Build DevContainer image
gh workflow run build-devcontainer.yml --ref main -f force_rebuild=true

# Monitor specific workflow runs
gh run list --workflow=devcontainer-ci.yml --limit 5
gh run watch --job "Test in DevContainer (unit)"
```

### CLI Workflow Helper Script

For easier usage, the project includes a comprehensive CLI helper script:

#### Available Commands

```bash
# Show help and available commands
./scripts/devops/gh-devcon/devcontainer-workflow.sh help

# Run DevContainer CI workflow
./scripts/devops/gh-devcon/devcontainer-workflow.sh run --test-suite all

# Build DevContainer image
./scripts/devops/gh-devcon/devcontainer-workflow.sh build --force-rebuild

# Monitor workflow execution
./scripts/devops/gh-devcon/devcontainer-workflow.sh watch

# View workflow logs
./scripts/devops/gh-devcon/devcontainer-workflow.sh logs

# Check PR status and checks
./scripts/devops/gh-devcon/devcontainer-workflow.sh pr-status

# Run complete validation workflow
./scripts/devops/gh-devcon/devcontainer-workflow.sh validate
```

#### NPM Script Shortcuts

```bash
# Run DevContainer CI
yarn gh-devcontainer-run

# Monitor execution
yarn gh-devcontainer-watch

# View logs
yarn gh-devcontainer-logs

# Check PR status
yarn gh-devcontainer-pr-status

# Full validation
yarn gh-devcontainer-validate
```

### Workflow Monitoring and Debugging

#### Real-time Monitoring

```bash
# Watch workflow progress
gh run watch

# Watch specific job
gh run watch --job "Build DevContainer"

# Monitor with verbose output
gh run watch --verbose
```

#### Log Analysis

```bash
# View complete workflow logs
gh run view --log

# View logs for specific job
gh run view --log --job "Test in DevContainer (unit)"

# Export logs for analysis
gh run view --log > workflow-logs.txt
```

#### PR Validation

```bash
# Comprehensive PR status check
gh pr status

# Detailed check results
gh pr checks

# Check specific check runs
gh pr checks --required
```

### Troubleshooting CLI Issues

#### Authentication Issues

```bash
# Check GitHub CLI authentication
gh auth status

# Re-authenticate if needed
gh auth login

# Verify repository access
gh repo view
```

#### Workflow Visibility Issues

```bash
# List all workflows
gh workflow list

# Check workflow permissions
gh workflow view devcontainer-ci.yml --yaml

# Verify workflow file exists
ls -la .github/workflows/devcontainer-ci.yml
```

#### Run Monitoring Issues

```bash
# List recent runs
gh run list --workflow=devcontainer-ci.yml --limit 10

# Check run status
gh run view --json status,conclusion

# Debug failed runs
gh run view --log | grep -i "error\|failed"
```

## Detailed Workflow Guide

### Phase 1: Initial Setup and Validation

#### 1.1 Create Feature Branch

```bash
git checkout -b feature/devcontainer-integration
```

#### 1.2 Validate Workflow Syntax

```bash
# Check main DevContainer CI workflow
gh workflow view devcontainer-ci.yml

# Check container build workflow
gh workflow view build-devcontainer.yml

# List all workflows
gh workflow list
```

#### 1.3 Test Workflow Execution

```bash
# Run DevContainer CI workflow
gh workflow run devcontainer-ci.yml --ref feature/devcontainer-integration

# Monitor the run
gh run watch

# View logs if needed
gh run view --log
```

#### 1.4 Validate Container Registry Access

```bash
# Check package permissions
gh api user/packages

# List existing packages
gh api repos/${{ github.repository }}/packages
```

### Phase 2: Container Registry Integration

#### 2.1 Image Tagging Strategy

The integration uses the following tagging strategy:

- `latest` - Latest build from main branch
- `develop` - Latest build from develop branch
- `pr-<number>` - Pull request specific builds
- `sha-<short-hash>` - Commit-specific builds for debugging

#### 2.2 Authentication Setup

The workflows automatically handle authentication using `GITHUB_TOKEN`:

```yaml
- name: Log in to Container Registry
  uses: docker/login-action@v3
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

#### 2.3 Publishing Workflow

```bash
# Trigger container build
gh workflow run build-devcontainer.yml --ref main

# Monitor build progress
gh run watch

# Validate published image
docker pull ghcr.io/geniusventures/gnus-dao-devcontainer:latest
```

### Phase 3: Security Integration Testing

#### 3.1 Security Scanning in Containers

The DevContainer workflow runs all security tools within the containerized environment:

- **Yarn Audit**: Dependency vulnerability scanning
- **Snyk**: Advanced security scanning
- **Socket.dev**: Supply chain security
- **OSV Scanner**: Vulnerability database checks
- **Semgrep**: Static analysis
- **Slither**: Smart contract security analysis
- **git-secrets**: Secrets detection

#### 3.2 Security Testing Workflow

```bash
# Run security-focused workflow
gh workflow run devcontainer-ci.yml --ref feature/devcontainer-integration

# Monitor security job specifically
gh run watch --job security-scan-devcontainer

# View security results
gh run view --log | grep -A 20 -B 5 "security"
```

#### 3.3 Compare with Native Execution

```bash
# Run native CI pipeline
gh workflow run ci.yml --ref feature/devcontainer-integration

# Compare results
gh run list --workflow=devcontainer-ci.yml --limit 1 --json conclusion
gh run list --workflow=ci.yml --limit 1 --json conclusion
```

### Phase 4: Performance Optimization

#### 4.1 Caching Strategies

The integration implements multiple caching layers:

- **Docker Layer Caching**: BuildKit-based layer optimization
- **Yarn Cache**: Dependency caching across runs
- **Hardhat Cache**: Solidity compilation caching
- **GitHub Actions Cache**: Cross-job artifact caching

#### 4.2 Performance Monitoring

```bash
# Monitor workflow performance
gh run list --workflow=devcontainer-ci.yml --limit 5 --json duration_ms

# Check cache effectiveness
gh run view --log | grep -i "cache"
```

#### 4.3 Optimization Validation

```bash
# Run performance comparison
./scripts/devops/gh-devcon/validate-devcontainer.sh --compare-only

# Analyze build times
gh api repos/${{ github.repository }}/actions/runs \
  | jq '.workflow_runs[0:5] | .[].run_duration_ms'
```

### Phase 5: Integration and Validation

#### 5.1 Comprehensive Testing

```bash
# Run all workflow jobs
gh workflow run devcontainer-ci.yml --ref feature/devcontainer-integration

# Validate all job completions
gh run view --log | grep -E "(✅|❌|PASSED|FAILED)"

# Check container registry
gh api repos/${{ github.repository }}/packages
```

#### 5.2 Environment Parity Validation

```bash
# Full environment validation
./scripts/devops/gh-devcon/validate-devcontainer.sh

# Quick validation (skip cleanup)
./scripts/devops/gh-devcon/validate-devcontainer.sh --no-cleanup

# Native-only validation
./scripts/devops/gh-devcon/validate-devcontainer.sh --no-container
```

#### 5.3 Pull Request Integration

```bash
# Create pull request
gh pr create \
  --title "feat: DevContainer GitHub Actions integration" \
  --body "Comprehensive DevContainer CI integration with GHCR"

# Monitor PR checks
gh pr status
gh pr checks

# View PR details
gh pr view
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_VERSION` | Node.js version for DevContainer | `22.19.0` |
| `REGISTRY` | Container registry URL | `ghcr.io` |
| `IMAGE_NAME` | Container image name | `${owner}/gnus-dao-devcontainer` |

### Workflow Triggers

#### DevContainer CI Workflow
- `push` to `main`, `develop` branches
- `pull_request` to `main`, `develop` branches
- `workflow_dispatch` for manual execution

#### Container Build Workflow
- `push` to `main`, `develop` branches
- `pull_request` to `main`, `develop` branches
- `schedule` weekly rebuild (Monday 02:00 UTC)
- `workflow_dispatch` with force rebuild option

### Job Dependencies

```
build-devcontainer
├── test-in-devcontainer
├── security-scan-devcontainer
└── validate-parity
    └── publish-container (main/develop only)
```

## Troubleshooting

### Common Issues

#### 1. Container Build Failures

**Symptoms**: Build job fails with Docker errors

**Solutions**:
```bash
# Check build logs
gh run view --job build-devcontainer --log

# Validate Dockerfile syntax
docker build --no-cache -f .devcontainer/Dockerfile .

# Check available disk space
df -h
```

#### 2. Permission Issues

**Symptoms**: `denied: permission_denied` when pushing to GHCR

**Solutions**:
```bash
# Verify repository permissions
gh repo view --json viewerPermissions

# Check package permissions
gh api user/packages --jq '.[] | select(.name == "gnus-dao-devcontainer")'

# Validate GITHUB_TOKEN permissions
gh auth status
```

#### 3. Environment Parity Issues

**Symptoms**: Different results between native and container execution

**Solutions**:
```bash
# Run detailed validation
./scripts/devops/gh-devcon/validate-devcontainer.sh

# Compare environment variables
docker run --rm ghcr.io/geniusventures/gnus-dao-devcontainer env

# Check Node.js/Yarn versions
docker run --rm ghcr.io/geniusventures/gnus-dao-devcontainer node --version
docker run --rm ghcr.io/geniusventures/gnus-dao-devcontainer yarn --version
```

#### 4. Performance Issues

**Symptoms**: Workflows taking longer than expected

**Solutions**:
```bash
# Check cache effectiveness
gh run view --log | grep -i "cache.*hit"

# Monitor resource usage
gh run view --log | grep -i "time\|duration"

# Validate Docker layer caching
docker history ghcr.io/geniusventures/gnus-dao-devcontainer:latest
```

### Debug Commands

```bash
# View workflow run details
gh run view <run-id> --log

# List recent runs
gh run list --workflow=devcontainer-ci.yml --limit 5

# Check workflow status
gh workflow view devcontainer-ci.yml --yaml

# Validate workflow syntax
gh workflow run devcontainer-ci.yml --dry-run

# Check container registry
gh api repos/${{ github.repository }}/packages/container/gnus-dao-devcontainer/versions
```

## Security Considerations

### Container Security

- **Base Image**: Uses Node.js slim image for minimal attack surface
- **Security Scanning**: Automated vulnerability scanning with Trivy
- **Access Control**: Proper permissions for package registry access
- **Image Signing**: Integration with Sigstore for image signing

### CI/CD Security

- **Secret Management**: No secrets stored in containers
- **Network Security**: Isolated execution environments
- **Dependency Scanning**: Comprehensive supply chain security
- **Access Auditing**: GitHub audit logs for all actions

## Performance Benchmarks

### Target Metrics

- **Container Build Time**: < 5 minutes with caching
- **Container Pull Time**: < 60 seconds in GitHub Actions
- **Total DevContainer Workflow**: < 12 minutes
- **Cache Hit Ratio**: > 70% for dependencies and layers
- **Security Scan Time**: < 3 minutes

### Monitoring Performance

```bash
# Track performance over time
gh api repos/${{ github.repository }}/actions/runs \
  | jq '.workflow_runs[] | select(.name == "DevContainer CI") | .run_duration_ms' \
  | head -10

# Monitor cache effectiveness
gh run view --log | grep -c "cache hit"
gh run view --log | grep -c "cache miss"
```

## Integration with Existing CI

### Parallel Execution

The DevContainer workflow runs in parallel with the existing CI pipeline:

```bash
# Run both workflows simultaneously
gh workflow run ci.yml --ref feature/devcontainer-integration &
gh workflow run devcontainer-ci.yml --ref feature/devcontainer-integration &
wait

# Compare completion times
gh run list --limit 2 --json workflow_name,conclusion,run_duration_ms
```

### Matrix Strategy

Future enhancements may include matrix builds comparing:

- Native vs Container execution
- Different Node.js versions
- Various security tool configurations

## Future Enhancements

### Planned Features

1. **Multi-Platform Builds**: ARM64 and AMD64 support
2. **Advanced Caching**: GitHub Actions cache with fallback
3. **Performance Analytics**: Detailed performance dashboards
4. **Security Dashboards**: Container vulnerability tracking
5. **Automated Updates**: Dependency and security patch automation

### Integration Opportunities

- **GitHub Advanced Security**: CodeQL integration in containers
- **Dependency Review**: Enhanced dependency analysis
- **Security Advisories**: Automated vulnerability alerting
- **Performance Monitoring**: Real-time CI performance tracking

## Support and Resources

### Documentation Links

- [DevContainer CI Action](https://github.com/devcontainers/ci)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub CLI Manual](https://cli.github.com/manual/)

### Getting Help

1. Check workflow logs: `gh run view --log`
2. Validate locally: `./scripts/devops/gh-devcon/validate-devcontainer.sh`
3. Review documentation: This document
4. Check issues: Repository issue tracker

### Contributing

When contributing to the DevContainer integration:

1. Test changes locally first
2. Update documentation for any workflow changes
3. Validate performance impact
4. Ensure security scanning still passes
5. Update validation scripts if needed

---

## Validation Checklist

### ✅ Core Integration
- [ ] DevContainer builds successfully in GitHub Actions
- [ ] GitHub Container Registry authentication works
- [ ] All security tools execute in containerized environment
- [ ] Multi-job workflow architecture implemented
- [x] GitHub CLI validation workflow functional

### ✅ Performance Requirements
- [ ] Container build time < 5 minutes with caching
- [ ] Container pull time < 60 seconds in GitHub Actions
- [ ] Total DevContainer workflow < 12 minutes
- [ ] Cache hit ratio > 70% for dependencies and layers
- [ ] Parallel job execution reduces total pipeline time

### ✅ Security Standards
- [ ] Security scanning tools functional in container
- [ ] Container images scanned for vulnerabilities
- [ ] Security thresholds maintained (zero critical, < 5 high)
- [ ] Supply chain security validated
- [ ] Secret management properly configured

### ✅ GitHub Integration
- [ ] ghcr.io package publishing with proper permissions
- [ ] GitHub CLI workflow management works
- [ ] PR checks integrate DevContainer results
- [ ] Workflow artifacts properly generated
- [ ] Container image tagging strategy implemented

### ✅ Development Workflow
- [ ] Step-by-step development process documented
- [x] GitHub CLI commands work for workflow management
- [ ] Environment parity validation functional
- [ ] Performance comparison utilities work
- [ ] Troubleshooting documentation covers common issues

### ✅ Quality Gates
- [ ] DevContainer workflow passes existing CI requirements
- [ ] Test coverage maintained at 90%+ in container execution
- [ ] Build reproducibility verified across multiple runs
- [ ] Integration doesn't break existing CI/CD functionality
- [ ] Documentation enables team adoption within 2 hours