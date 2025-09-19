# Security Incident Response Runbooks

## Overview

This document provides clear, actionable procedures for responding to security incidents in the GNUS-DAO project. Each runbook includes immediate actions, escalation procedures, and recovery steps. All incidents must be documented and reviewed for prevention.

## Incident Classification

### Severity Levels

- **Critical**: Active exploit, fund loss, or system compromise
- **High**: Security vulnerability with exploitation potential
- **Medium**: Configuration issues or policy violations
- **Low**: Potential security concerns without immediate risk

### Response Time Objectives

- **Critical**: Response within 15 minutes, resolution within 1 hour
- **High**: Response within 1 hour, resolution within 4 hours
- **Medium**: Response within 4 hours, resolution within 24 hours
- **Low**: Response within 24 hours, investigation within 1 week

## 🔴 Critical Incidents

### Runbook: Active Smart Contract Exploit

**Trigger**: Detection of unauthorized fund movement, unexpected contract behavior, or exploit indicators

#### Immediate Actions (0-15 minutes)

1. **Stop All Operations**

   ```bash
   # Pause all contracts immediately
   npx hardhat run scripts/emergency/pause-all.ts --network mainnet
   ```

2. **Isolate Affected Systems**

   ```bash
   # Block affected addresses
   npx hardhat run scripts/emergency/block-address.ts --address $EXPLOIT_ADDRESS --network mainnet
   ```

3. **Alert Response Team**
   - Call emergency conference bridge
   - Notify all security team members via SMS/phone
   - Alert legal counsel if funds involved

4. **Preserve Evidence**

   ```bash
   # Capture blockchain state
   npx hardhat run scripts/forensics/capture-state.ts --network mainnet --block $EXPLOIT_BLOCK
   ```

#### Investigation Phase (15-60 minutes)

1. **Analyze Exploit**

   ```bash
   # Run forensic analysis
   npx hardhat run scripts/forensics/analyze-exploit.ts --tx $EXPLOIT_TX
   ```

2. **Assess Impact**
   - Calculate fund loss
   - Identify affected users
   - Determine exploit scope

3. **Contain Damage**

   ```bash
   # Implement temporary fixes
   npx hardhat run scripts/emergency/temporary-patch.ts --network mainnet
   ```

#### Recovery Phase (1-4 hours)

1. **Deploy Fix**

   ```bash
   # Deploy patched contracts
   npx hardhat run scripts/deploy/emergency-fix.ts --network mainnet
   ```

2. **Verify Fix**

   ```bash
   # Run comprehensive tests
   npm run test:security -- --grep "exploit"
   ```

3. **Resume Operations**

   ```bash
   # Gradually unpause contracts
   npx hardhat run scripts/emergency/unpause-staged.ts --network mainnet
   ```

#### Post-Incident (4-24 hours)

1. **User Communication**
   - Notify affected users
   - Provide compensation details
   - Update status transparently

2. **Root Cause Analysis**
   - Document findings
   - Update security procedures
   - Implement preventive measures

3. **Regulatory Reporting**
   - Report to relevant authorities if required
   - Document for compliance

### Runbook: Private Key Compromise

**Trigger**: Suspected or confirmed private key exposure

#### Immediate Actions (0-15 minutes)

1. **Revoke Compromised Keys**

   ```bash
   # Rotate all affected keys
   npx hardhat run scripts/key-management/rotate-keys.ts --compromised $KEY_ID
   ```

2. **Secure Assets**

   ```bash
   # Move funds to cold storage
   npx hardhat run scripts/emergency/cold-storage.ts --network mainnet
   ```

3. **Change Access Credentials**
   - Rotate all API keys
   - Update CI/CD secrets
   - Revoke developer access tokens

4. **Monitor for Unauthorized Access**

   ```bash
   # Enable enhanced monitoring
   npx hardhat run scripts/monitoring/enhanced-watch.ts --network mainnet
   ```

#### Investigation Phase (15-60 minutes)

1. **Determine Exposure Scope**
   - Identify which keys were compromised
   - Check access logs for suspicious activity
   - Review recent transactions

2. **Assess Risk**
   - Evaluate potential fund loss
   - Check for lateral movement
   - Assess reputation impact

#### Recovery Phase (1-4 hours)

1. **Rebuild Infrastructure**

   ```bash
   # Deploy new contracts with new keys
   npm run deploy:secure
   ```

2. **Update Security Measures**

   ```bash
   # Implement additional security controls
   npm run security:harden
   ```

3. **Verify Security**

   ```bash
   # Run security audit
   npm run audit:comprehensive
   ```

## 🟠 High Severity Incidents

### Runbook: Diamond Proxy Vulnerability

**Trigger**: Detection of Diamond proxy security issues (selector collision, facet isolation breach, etc.)

#### Immediate Actions (0-60 minutes)

1. **Assess Vulnerability**

   ```bash
   # Run Diamond security checks
   npx hardhat run scripts/diamond/audit.ts --network mainnet
   ```

2. **Implement Safeguards**

   ```bash
   # Enable emergency mode
   npx hardhat run scripts/diamond/emergency-mode.ts --network mainnet
   ```

3. **Alert Stakeholders**
   - Notify development team
   - Inform security researchers
   - Prepare user communication

#### Investigation Phase (1-4 hours)

1. **Technical Analysis**

   ```bash
   # Analyze Diamond configuration
   npx hardhat run scripts/diamond/forensics.ts
   ```

2. **Impact Assessment**
   - Check for unauthorized facet access
   - Verify selector integrity
   - Assess upgrade mechanism security

#### Recovery Phase (4-24 hours)

1. **Deploy Security Patches**

   ```bash
   # Update Diamond configuration
   npx hardhat run scripts/diamond/secure-upgrade.ts --network mainnet
   ```

2. **Enhanced Monitoring**

   ```bash
   # Implement Diamond-specific monitoring
   npx hardhat run scripts/monitoring/diamond-watch.ts --network mainnet
   ```

### Runbook: Supply Chain Attack

**Trigger**: Detection of compromised dependencies or malicious packages

#### Immediate Actions (0-60 minutes)

1. **Isolate Affected Systems**

   ```bash
   # Disconnect compromised systems
   kubectl cordon compromised-nodes
   ```

2. **Stop Deployments**

   ```bash
   # Halt all CI/CD pipelines
   gh workflow run cancel-all
   ```

3. **Audit Dependencies**

   ```bash
   # Comprehensive dependency check
   npm audit --audit-level=critical
   yarn audit --groups dependencies
   ```

#### Investigation Phase (1-4 hours)

1. **Identify Compromised Components**

   ```bash
   # Trace dependency usage
   npx hardhat run scripts/audit/dependency-trace.ts
   ```

2. **Assess Impact**
   - Check for data exfiltration
   - Verify contract integrity
   - Assess user data exposure

#### Recovery Phase (4-24 hours)

1. **Update Dependencies**

   ```bash
   # Replace compromised packages
   yarn upgrade compromised-package@secure-version
   ```

2. **Rebuild and Redeploy**

   ```bash
   # Clean rebuild
   rm -rf node_modules yarn.lock
   yarn install --frozen-lockfile
   npm run build:secure
   ```

3. **Enhanced Verification**

   ```bash
   # Implement dependency signing
   npm run security:verify-integrity
   ```

## 🟡 Medium Severity Incidents

### Runbook: Configuration Security Issue

**Trigger**: Detection of insecure configurations or misconfigurations

#### Immediate Actions (0-4 hours)

1. **Audit Configuration**

   ```bash
   # Check all security configurations
   npm run audit:config
   ```

2. **Apply Secure Defaults**

   ```bash
   # Reset to secure configurations
   npm run config:secure-reset
   ```

3. **Log Analysis**

   ```bash
   # Review configuration changes
   git log --oneline --grep="config" -n 20
   ```

#### Investigation Phase (4-24 hours)

1. **Root Cause Analysis**
   - Identify configuration source
   - Check change history
   - Review approval processes

2. **Impact Assessment**
   - Determine exposure window
   - Assess risk level
   - Check for exploitation

#### Recovery Phase (24-72 hours)

1. **Implement Fixes**

   ```bash
   # Apply configuration hardening
   npm run config:harden
   ```

2. **Process Improvements**
   - Update configuration management
   - Enhance review processes
   - Implement automated checks

### Runbook: Access Control Violation

**Trigger**: Unauthorized access attempts or privilege escalation

#### Immediate Actions (0-4 hours)

1. **Review Access Logs**

   ```bash
   # Analyze access patterns
   npm run audit:access-logs
   ```

2. **Revoke Suspicious Access**

   ```bash
   # Remove unauthorized access
   npm run access:revoke --user suspicious-user
   ```

3. **Enable Enhanced Monitoring**

   ```bash
   # Increase logging and alerting
   npm run monitoring:enhance
   ```

#### Investigation Phase (4-24 hours)

1. **Access Pattern Analysis**

   ```bash
   # Detailed access review
   npx hardhat run scripts/audit/access-analysis.ts
   ```

2. **Compromise Assessment**
   - Check for data access
   - Verify system integrity
   - Assess lateral movement

#### Recovery Phase (24-72 hours)

1. **Access Control Updates**

   ```bash
   # Implement stricter controls
   npm run access:harden
   ```

2. **Security Training**
   - Update access policies
   - Train team on security practices
   - Implement MFA requirements

## 🟢 Low Severity Incidents

### Runbook: Security Tool Failure

**Trigger**: Security scanning tools failing or producing false results

#### Immediate Actions (0-24 hours)

1. **Assess Tool Status**

   ```bash
   # Check tool health
   npm run tools:health-check
   ```

2. **Manual Verification**

   ```bash
   # Perform manual security checks
   npm run security:manual-audit
   ```

3. **Alternative Scanning**

   ```bash
   # Use backup security tools
   npm run security:backup-scan
   ```

#### Investigation Phase (24-72 hours)

1. **Tool Analysis**

   ```bash
   # Debug tool configuration
   npm run tools:diagnose
   ```

2. **False Positive Review**
   - Verify flagged issues
   - Update tool configurations
   - Document exceptions

#### Recovery Phase (72 hours+)

1. **Tool Updates**

   ```bash
   # Update to latest versions
   npm run tools:update
   ```

2. **Configuration Optimization**

   ```bash
   # Fine-tune tool settings
   npm run tools:optimize
   ```

## 📋 General Response Procedures

### Communication Protocol

1. **Internal Communication**
   - Use dedicated incident channel
   - Document all actions and decisions
   - Maintain incident timeline

2. **External Communication**
   - Prepare user notifications
   - Coordinate with legal counsel
   - Follow regulatory requirements

3. **Stakeholder Updates**
   - Regular status updates
   - Transparent information sharing
   - Post-incident reports

### Evidence Preservation

1. **Blockchain Evidence**

   ```bash
   # Capture transaction data
   npx hardhat run scripts/forensics/blockchain-capture.ts --from $START_BLOCK --to $END_BLOCK
   ```

2. **System Logs**

   ```bash
   # Preserve all logs
   npm run logs:archive --incident $INCIDENT_ID
   ```

3. **Configuration Snapshots**

   ```bash
   # Save configuration state
   npm run config:snapshot --incident $INCIDENT_ID
   ```

### Post-Incident Activities

1. **Incident Review**
   - Conduct post-mortem meeting
   - Document lessons learned
   - Update incident response procedures

2. **Process Improvements**
   - Implement preventive measures
   - Update security controls
   - Enhance monitoring capabilities

3. **Training Updates**
   - Update security training
   - Share incident insights
   - Improve team preparedness

## 🚨 Emergency Contacts

- **Security Team Lead**: [security-lead@gnus.ai](mailto:security-lead@gnus.ai) | +1-XXX-XXX-XXXX
- **DevOps Lead**: [devops-lead@gnus.ai](mailto:devops-lead@gnus.ai) | +1-XXX-XXX-XXXX
- **Legal Counsel**: [legal@gnus.ai](mailto:legal@gnus.ai) | +1-XXX-XXX-XXXX
- **Emergency Hotline**: +1-XXX-XXX-XXXX (24/7)

## 📊 Incident Metrics

Track these metrics for continuous improvement:

- **Mean Time to Detect (MTTD)**
- **Mean Time to Respond (MTTR)**
- **False Positive Rate**
- **Incident Resolution Rate**
- **Recovery Time Objective Achievement**

---

**Remember**: Security incidents are learning opportunities. Focus on rapid response, thorough investigation, and prevention of future occurrences.
