# GNUS-DAO Security Guidelines

## Local Security Checks

The GNUS-DAO project implements comprehensive security scanning for dependencies and code. All security checks are integrated into the development workflow.

### Running Security Checks

To run all security checks locally, use the unified security script:

```bash
yarn security-check
```

This command executes the following tools in sequence:

- **Yarn Audit**: Scans for known vulnerabilities in dependencies (no auth required)
- **Snyk**: Advanced dependency vulnerability scanning (**requires API token**)
- **Socket.dev**: Supply chain security analysis (**requires API token**)
- **OSV-Scanner**: Open Source Vulnerability database scanning (no auth required)
- **Semgrep**: Static code analysis for security issues (requires separate installation)

### Individual Security Tools

You can run individual security tools as needed:

```bash
# Dependency vulnerability scanning
yarn audit

# Snyk vulnerability scanning
yarn snyk:test

# Socket supply chain security
yarn socket:scan

# OSV vulnerability database
yarn osv:scan

# Semgrep code analysis (requires installation)
yarn semgrep:scan
```

### Authentication Requirements

Some security tools require API tokens for full functionality:

#### Snyk Setup

```bash
# Install Snyk CLI globally or authenticate
npm install -g snyk
snyk auth
# Or set SNYK_TOKEN environment variable
```

#### Socket.dev Setup

```bash
# Login to Socket.dev
socket login
# Or set SOCKET_SECURITY_API_TOKEN environment variable
```

#### Semgrep Setup

Semgrep requires separate installation. Install via:

```bash
# Via pip
pip install semgrep

# Or via Docker
docker run --rm -v "${PWD}:/src" semgrep/semgrep semgrep --config=auto
```

### Secure Dependency Installation

To ensure reproducible builds and prevent dependency tampering, always use the frozen lockfile installation:

```bash
yarn install:frozen
```

This enforces that the `yarn.lock` file matches exactly with installed dependencies.

### Pre-commit Security

Security checks are automatically run during the pre-commit hook via Husky. The pre-commit process includes:

- Linting and formatting
- Dependency auditing
- Test execution

### Security Tool Configuration

- **Yarn**: Configured with checksum validation and immutable installs (`.yarnrc.yml`)
- **Snyk**: Scans all dependencies including dev dependencies
- **Socket.dev**: Monitors for supply chain attacks and malicious packages
- **OSV-Scanner**: Checks against the Open Source Vulnerability database
- **Semgrep**: Uses auto-configuration for TypeScript and Solidity analysis

### Handling Security Issues

If a security check fails:

1. **Review the output** to identify the specific vulnerability or issue
2. **Check if it's a false positive** related to Diamond proxy dependencies
3. **Update dependencies** if a fix is available
4. **Contact the security team** for critical vulnerabilities
5. **Document exceptions** in the security log if necessary

### Security Workflow Integration

Security checks are integrated into:

- Local development (`yarn security-check`)
- Pre-commit hooks (via Husky)
- CI/CD pipeline (GitHub Actions)
- Dependency management (frozen lockfile enforcement)

### Emergency Bypass

In rare cases where security checks block critical development:

- Use `git commit --no-verify` for emergency commits
- Document the bypass reason in the commit message
- Address the security issue immediately after

### Security Contacts

For security-related issues or questions:

- Report vulnerabilities via GitHub Security tab
- Contact the development team for implementation questions

### Compliance Notes

- All security tools are configured to work with TypeScript, Hardhat, and Diamond proxy architecture
- False positives from Diamond proxy patterns are minimized through tool configuration
- Security checks maintain compatibility with the existing development workflow
