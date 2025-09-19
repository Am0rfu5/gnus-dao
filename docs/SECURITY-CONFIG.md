# Repository Security Configuration

This document outlines the security configuration and settings for the GNUS-DAO repository, including branch protection rules, security features, and compliance requirements.

## 🔒 Branch Protection Rules

### Main Branch Protection

The `main` branch requires the following protections:

#### Required Status Checks
All of the following must pass before merging:
- `test` - Complete test suite execution
- `lint` - Code quality and security linting
- `security-check` - Dependency and code security scanning
- `build` - Successful compilation and artifact generation
- `codeql-analysis` - CodeQL security analysis
- `ossf-scorecard` - OSSF Scorecard security assessment

#### Branch Protection Settings
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in branch protection rules
- ✅ Restrict pushes that create matching branches
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

#### Review Requirements
- **Required approving reviews**: 2
- **Dismiss stale pull request approvals**: Enabled
- **Require review from Code Owners**: Enabled
- **Restrict who can dismiss pull request reviews**: Enabled (only repository administrators)

### Develop Branch Protection

The `develop` branch has similar protections but with relaxed requirements for development workflow:

#### Required Status Checks
- `test` - Complete test suite execution
- `lint` - Code quality and security linting
- `security-check` - Dependency and code security scanning
- `build` - Successful compilation and artifact generation

#### Branch Protection Settings
- ✅ Require pull request reviews before merging (1 reviewer required)
- ✅ Require status checks to pass before merging
- ✅ Include administrators in branch protection rules
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

## 🛡️ Security Features

### GitHub Advanced Security

#### Code Scanning
- **CodeQL Analysis**: Enabled for TypeScript/JavaScript
- **Schedule**: Weekly (Monday 6:00 UTC) + on pushes/PRs
- **Languages**: JavaScript, TypeScript
- **Configuration**: Custom rules excluding generated files

#### Secret Scanning
- **Status**: Enabled
- **Push Protection**: Enabled
- **Custom Patterns**: Blockchain private key detection
- **Alert Notifications**: Security team and repository administrators

#### Dependency Graph
- **Status**: Enabled
- **Vulnerable Dependencies**: Automatic alerts
- **Security Updates**: Automated PR creation

### Dependabot Configuration

#### Security Updates
- **Schedule**: Daily security updates
- **PR Creation**: Within 24 hours of vulnerability detection
- **Reviewers**: Security team
- **Labels**: `security`, `dependencies`, `automated`

#### Version Updates
- **Schedule**: Weekly (Monday 9:00 UTC)
- **Grouping**: Compatible updates grouped together
- **Ignore Rules**: Major version updates for critical dependencies
- **Custom Rules**: Hardhat plugin compatibility considerations

### OSSF Scorecard Integration

#### Monitoring Schedule
- **Manual**: On-demand via workflow dispatch
- **Scheduled**: Weekly (Monday 12:00 UTC)
- **Event-based**: On pushes and pull requests to main/develop

#### Score Thresholds
- **Minimum Score**: 5/10 (blocking)
- **Target Score**: 7/10 (recommended)
- **Excellent Score**: 9/10+ (goal)

#### Integration Features
- **Security Tab**: Results published to GitHub Security tab
- **PR Comments**: Automated scorecard results on pull requests
- **Badge Generation**: Dynamic badge based on current score
- **Artifact Archival**: SARIF results retained for 30 days

## 🚨 Security Policies

### Vulnerability Reporting

#### Reporting Channels
- **Primary**: security@gnus.ai (confidential)
- **Secondary**: GitHub Security Advisories (public coordination)
- **Response Time**: 48 hours acknowledgment, 7 days detailed response

#### Disclosure Process
1. **Report Received**: Automatic acknowledgment
2. **Triage**: Severity assessment within 48 hours
3. **Investigation**: Technical analysis and fix development
4. **Fix Deployment**: Coordinated release with user notification
5. **Public Disclosure**: After fix deployment and user migration

### Security Advisory Handling

#### Advisory Creation
- **Trigger**: Confirmed security vulnerabilities
- **Review**: Security team + maintainers
- **Publication**: Coordinated with fix deployment
- **Credit**: Researcher attribution (if requested)

#### Advisory Types
- **Security**: Vulnerabilities with security impact
- **Maintenance**: Important updates without security impact
- **Informational**: General security guidance

## 🔐 Access Control

### Repository Permissions

#### Repository Administrators
- Full administrative access
- Security configuration management
- Emergency response capabilities

#### Security Team
- Security advisory management
- Code scanning alert management
- Dependabot configuration
- Branch protection rule management

#### Maintainers
- Code review and merge permissions
- Release management
- Documentation updates
- CI/CD pipeline management

#### Contributors
- Pull request creation
- Issue reporting
- Documentation contributions
- Limited repository access

### Protected Actions

#### Automated Systems
- **Dependabot**: Automated dependency updates
- **CodeQL**: Automated security scanning
- **OSSF Scorecard**: Automated security assessment
- **CI/CD Pipelines**: Automated testing and deployment

#### Manual Reviews Required
- **Security Policy Changes**: Security team approval
- **Branch Protection Modifications**: Administrator approval
- **Security Feature Disabling**: Security team approval
- **Emergency Access**: Dual authorization required

## 📊 Monitoring and Alerting

### Security Metrics

#### Code Quality Metrics
- **Test Coverage**: Minimum 80% line coverage
- **Linting**: Zero critical security issues
- **CodeQL**: Regular security scanning results
- **OSSF Scorecard**: Security posture tracking

#### Vulnerability Metrics
- **Open Vulnerabilities**: Tracked and prioritized
- **Response Time**: Average time to vulnerability resolution
- **Prevention Rate**: Vulnerabilities caught by automated scanning
- **False Positive Rate**: Accuracy of security tools

### Alert Configuration

#### Critical Alerts
- **Recipients**: Security team + on-call engineer
- **Channels**: Email, Slack, GitHub notifications
- **Response Time**: Within 1 hour
- **Escalation**: Automatic escalation after 30 minutes

#### High Alerts
- **Recipients**: Security team
- **Channels**: Email, GitHub notifications
- **Response Time**: Within 4 hours
- **Escalation**: Manual escalation if needed

#### Medium/Low Alerts
- **Recipients**: Development team
- **Channels**: GitHub notifications
- **Response Time**: Within 24 hours
- **Escalation**: Weekly review

## 🔄 Compliance and Auditing

### Security Audits

#### Regular Audits
- **Frequency**: Quarterly security assessments
- **Scope**: Code review, configuration review, process review
- **Report**: Executive summary and detailed findings
- **Action Items**: Prioritized remediation plan

#### Compliance Checks
- **Standards**: Industry best practices for smart contract security
- **Frameworks**: OWASP, NIST, ISO 27001 principles
- **Documentation**: Security control evidence
- **Certification**: Annual compliance verification

### Change Management

#### Security Changes
- **Approval**: Security team review required
- **Testing**: Security impact assessment
- **Documentation**: Updated security documentation
- **Communication**: Team notification of changes

#### Emergency Changes
- **Authorization**: Dual security team approval
- **Documentation**: Post-incident security review
- **Rollback Plan**: Emergency rollback procedures
- **Lessons Learned**: Process improvement recommendations

## 📚 Related Documentation

- [Security Policy](SECURITY.md) - Vulnerability reporting and disclosure
- [Contributing Guidelines](CONTRIBUTING.md) - Development and contribution process
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards and behavior
- [OSSF Scorecard Results](https://github.com/GeniusVentures/gnus-dao/security/code-scanning) - Current security assessment

## 📞 Contact Information

- **Security Team**: security@gnus.ai
- **Repository Administrators**: admin@gnus.ai
- **Development Team**: dev@gnus.ai

---

*This document is reviewed and updated quarterly or when significant security changes occur.*