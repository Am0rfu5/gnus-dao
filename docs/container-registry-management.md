# GNUS-DAO Container Registry Management

This document provides comprehensive guidance for managing the GNUS-DAO DevContainer registry, including build optimization, security scanning, automated maintenance, and performance monitoring.

## Table of Contents

1. [Overview](#overview)
2. [Registry Architecture](#registry-architecture)
3. [Build Optimization](#build-optimization)
4. [Security Integration](#security-integration)
5. [Automated Maintenance](#automated-maintenance)
6. [Performance Monitoring](#performance-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

The GNUS-DAO project uses GitHub Container Registry (ghcr.io) for hosting optimized DevContainer images. The registry strategy focuses on:

- **Performance**: Sub-5 minute build times with 80%+ cache hit rates
- **Security**: Zero critical vulnerabilities with automated scanning
- **Automation**: Fully automated lifecycle management
- **Cost Optimization**: Intelligent cleanup and storage management

### Key Components

- **Build Workflow**: `.github/workflows/build-devcontainer.yml`
- **Cleanup Automation**: `.github/workflows/container-cleanup.yml`
- **Base Image Updates**: `.github/workflows/base-image-update.yml`
- **Security Policies**: `.github/security/container-policy.yml`
- **Performance Benchmarking**: `scripts/devops/gh-devcon/benchmark-container-performance.sh`
- **Security Validation**: `scripts/devops/gh-devcon/validate-container-security.sh`

## Registry Architecture

### Image Tagging Strategy

The registry uses a comprehensive tagging strategy for different deployment scenarios:

```bash
# Latest production image
ghcr.io/geniusventures/gnus-dao-devcontainer:latest

# Branch-based images
ghcr.io/geniusventures/gnus-dao-devcontainer:feature/container-optimization
ghcr.io/geniusventures/gnus-dao-devcontainer:develop

# Pull request images
ghcr.io/geniusventures/gnus-dao-devcontainer:pr-123

# Commit SHA images
ghcr.io/geniusventures/gnus-dao-devcontainer:abc123def
```

### Metadata Labels

All images include comprehensive metadata for traceability:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/GeniusVentures/gnus-dao"
LABEL org.opencontainers.image.description="GNUS-DAO Development Container"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${GITHUB_SHA}"
LABEL org.opencontainers.image.version="${GITHUB_REF_NAME}"
```

## Build Optimization

### Docker BuildKit Features

The optimized Dockerfile leverages BuildKit for maximum performance:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:22-bookworm-slim as base

# Cache mounts for package managers
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3-pip git curl jq ca-certificates gnupg
```

### Multi-Stage Build Optimization

The build uses multiple stages for optimal layer caching:

1. **Base Stage**: System dependencies with apt caching
2. **Security Tools Stage**: Security scanning tools with pip caching
3. **Go Tools Stage**: Go-based security tools with module caching
4. **Node Tools Stage**: Node.js security and development tools
5. **Development Stage**: Final development environment

### Cache Configuration

GitHub Actions cache is configured for maximum efficiency:

```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .devcontainer
    cache-from: type=gha
    cache-to: type=gha,mode=max
    build-args: |
      BUILDKIT_INLINE_CACHE=1
```

## Security Integration

### Vulnerability Scanning

Trivy is integrated for comprehensive vulnerability scanning:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    exit-code: 1
    severity: 'CRITICAL,HIGH'
```

### Security Policies

Container security policies define acceptable vulnerability thresholds:

```yaml
vulnerabilities:
  max_critical: 0
  max_high: 5
  max_medium: 20

compliance:
  required_labels:
    - org.opencontainers.image.source
    - org.opencontainers.image.licenses
  security_tools:
    - trivy
    - slither
    - semgrep
```

### Security Validation

The security validation script checks:

- Vulnerability scan results against thresholds
- Container configuration security
- Security policy compliance
- Image provenance and attestation

```bash
# Run security validation
./scripts/devops/gh-devcon/validate-container-security.sh --tag latest
```

## Automated Maintenance

### Cleanup Automation

Automated cleanup removes old and untagged images:

```yaml
name: Container Cleanup
on:
  schedule:
    - cron: '0 1 * * 0'  # Weekly cleanup
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
    - name: Delete old container versions
      uses: actions/delete-package-versions@v4
      with:
        package-name: 'gnus-dao-devcontainer'
        package-type: 'container'
        min-versions-to-keep: 5
        delete-only-untagged-versions: true
```

### Base Image Updates

Automatic detection of base image security updates:

```yaml
name: Base Image Update
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly check
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
    - name: Check for base image updates
      run: |
        # Compare current base image digest with latest
        # Trigger rebuild if updates available
```

## Performance Monitoring

### Benchmarking Script

The performance benchmarking script measures:

- Build time and cache effectiveness
- Pull time and network performance
- Runtime startup time
- Resource utilization

```bash
# Run performance benchmark
./scripts/devops/gh-devcon/benchmark-container-performance.sh

# Output example:
# Build Time: 4.2 minutes
# Cache Hit Rate: 85%
# Pull Time: 45 seconds
# Image Size: 2.1 GB
```

### Performance Metrics

Key performance indicators:

- **Build Time**: Target < 5 minutes
- **Cache Hit Rate**: Target > 80%
- **Pull Time**: Target < 60 seconds
- **Image Size**: Optimized for development workflow
- **Security Scan Time**: < 2 minutes

### Monitoring Integration

Performance metrics are integrated with CI/CD monitoring:

```yaml
- name: Upload performance metrics
  uses: actions/upload-artifact@v4
  with:
    name: container-performance-metrics
    path: reports/container-performance-*.json
```

## Troubleshooting

### Common Issues

#### Build Failures

**Symptom**: Container build fails with cache errors

**Solution**:
```bash
# Clear GitHub Actions cache
gh cache delete --all

# Rebuild without cache
docker buildx build --no-cache .devcontainer
```

#### Security Scan Failures

**Symptom**: Trivy scan fails with high vulnerabilities

**Solution**:
```bash
# Check vulnerability details
trivy image --format json ghcr.io/geniusventures/gnus-dao-devcontainer:latest

# Update base image or security tools
# Modify Dockerfile to use newer base image
```

#### Registry Access Issues

**Symptom**: Unable to push/pull from ghcr.io

**Solution**:
```bash
# Check authentication
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

# Verify permissions
gh api repos/$GITHUB_REPOSITORY | jq '.permissions'
```

### Performance Issues

#### Slow Builds

**Diagnosis**:
```bash
# Check cache effectiveness
docker buildx build --progress=plain .devcontainer 2>&1 | grep -i cache

# Analyze layer sizes
docker history ghcr.io/geniusventures/gnus-dao-devcontainer:latest
```

**Optimization**:
- Reorder Dockerfile instructions for better caching
- Use multi-stage builds to reduce final image size
- Optimize .dockerignore to reduce build context

#### Slow Pulls

**Diagnosis**:
```bash
# Test pull performance
time docker pull ghcr.io/geniusventures/gnus-dao-devcontainer:latest
```

**Solutions**:
- Use registry cache warming
- Optimize image layers for faster pulls
- Consider using different registry regions

## Best Practices

### Development Workflow

1. **Local Testing**: Test builds locally before pushing
2. **Incremental Changes**: Make small, incremental changes to maximize cache hits
3. **Security First**: Always run security scans before deployment
4. **Documentation**: Update this document when making changes

### CI/CD Integration

1. **Automated Triggers**: Use appropriate triggers for different scenarios
2. **Parallel Jobs**: Run security scans in parallel with builds
3. **Failure Handling**: Implement proper error handling and notifications
4. **Metrics Collection**: Collect and monitor performance metrics

### Security Best Practices

1. **Zero Trust**: Validate all dependencies and base images
2. **Regular Updates**: Keep base images and tools updated
3. **Policy Enforcement**: Use security policies to enforce standards
4. **Audit Trail**: Maintain comprehensive audit logs

### Performance Optimization

1. **Cache Strategy**: Implement multi-level caching strategy
2. **Layer Optimization**: Order Dockerfile instructions for optimal caching
3. **Build Context**: Minimize build context with comprehensive .dockerignore
4. **Parallel Builds**: Use buildx for multi-platform builds when needed

## Maintenance Procedures

### Weekly Maintenance

- Review security scan results
- Check for base image updates
- Monitor registry storage usage
- Update security policies as needed

### Monthly Maintenance

- Comprehensive security audit
- Performance benchmark review
- Dependency updates
- Documentation updates

### Emergency Procedures

- **Security Incident**: Immediately quarantine affected images
- **Build Failure**: Rollback to last known good image
- **Registry Issues**: Use backup registry or local builds

## Integration with DevContainer CI

The container registry integrates seamlessly with the DevContainer CI workflow:

1. **Build Trigger**: DevContainer changes trigger optimized builds
2. **Security Gate**: Security scans must pass before deployment
3. **Performance Validation**: Performance benchmarks ensure quality
4. **Automated Deployment**: Successful builds deploy to registry

## Success Metrics

- ✅ Build time < 5 minutes with BuildKit optimization
- ✅ Cache hit ratio > 80% for subsequent builds
- ✅ Zero critical vulnerabilities in published containers
- ✅ Automated cleanup maintains optimal registry size
- ✅ Security scans complete in < 2 minutes
- ✅ Pull time < 60 seconds in GitHub Actions

This comprehensive registry management strategy ensures the GNUS-DAO DevContainer infrastructure is secure, performant, and maintainable.
