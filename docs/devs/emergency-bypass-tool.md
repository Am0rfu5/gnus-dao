# Emergency Security Bypass Tool

## Overview

The Emergency Security Bypass Tool provides a controlled mechanism for bypassing security hooks and processes in genuine emergency situations. This tool ensures that all bypass actions are properly logged, require justification, and maintain audit trails for security compliance.

## Purpose

In rare emergency situations where security processes might prevent critical fixes or deployments, this tool allows authorized personnel to temporarily bypass security controls while maintaining full accountability and logging.

## Security Principles

- **Zero-Trust Design**: Every bypass action requires explicit justification and approval
- **Complete Audit Trail**: All actions are logged with timestamps, user information, and reasons
- **Severity-Based Controls**: Critical and high-severity bypasses require additional confirmation
- **Temporary Nature**: Bypasses are designed to be temporary and reversible
- **Accountability**: All bypass actions require contact information for follow-up

## Usage

### Basic Syntax

```bash
yarn emergency-bypass <action> [options]
```

### Available Actions

#### `commit <message>`

Bypasses pre-commit hooks and commits changes with the specified message.

```bash
yarn emergency-bypass commit "fix critical production issue" \
  --reason "Database connection failure" \
  --contact "admin@gnus.ai" \
  --severity critical
```

#### `push`

Bypasses pre-push hooks and pushes changes to the remote repository.

```bash
yarn emergency-bypass push \
  --reason "Hotfix deployment" \
  --contact "devops@gnus.ai" \
  --severity high
```

#### `status`

Shows the current status of security hooks and recent bypass actions.

```bash
yarn emergency-bypass status
```

#### `disable`

Temporarily disables all security hooks (pre-commit, commit-msg, pre-push).

```bash
yarn emergency-bypass disable \
  --reason "Bulk refactoring requiring multiple commits" \
  --contact "lead-dev@gnus.ai" \
  --severity medium
```

#### `enable`

Re-enables all previously disabled security hooks.

```bash
yarn emergency-bypass enable \
  --reason "Refactoring completed" \
  --contact "lead-dev@gnus.ai" \
  --severity low
```

## Required Options

### `--reason <text>`

**Required for all bypass actions except `status`**

A detailed explanation of why the bypass is necessary. This should include:
- The specific problem being solved
- Why normal processes cannot be followed
- Expected impact of the bypass

### `--contact <email>`

**Required for all bypass actions except `status`**

Contact information for the person responsible for the bypass. This ensures accountability and enables follow-up if needed.

### `--severity <level>`

**Optional (defaults to `medium`)**

The severity level of the emergency:
- `critical`: Active system compromise, fund loss, or immediate safety risk
- `high`: Significant system issues requiring immediate action
- `medium`: Important fixes that cannot wait for normal processes
- `low`: Minor issues where bypass provides convenience

## Confirmation Requirements

### Critical and High Severity

For `critical` and `high` severity bypasses, the tool requires explicit confirmation:

```
🔴 HIGH/CRITICAL SEVERITY BYPASS - Type "CONFIRM" to proceed:
```

You must type `CONFIRM` exactly to proceed with the bypass.

### Medium and Low Severity

These bypasses proceed immediately after validation of required options.

## Logging and Audit Trail

### Log Location

All bypass actions are logged to: `scripts/logs/emergency-bypass.log`

### Log Entry Format

Each log entry contains:
- Timestamp (ISO 8601 format)
- Action performed
- User information
- Node.js version
- Current working directory
- Reason for bypass
- Contact information
- Severity level
- Unique bypass ID for tracking

### Example Log Entry

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "action": "commit",
  "user": "johndoe",
  "nodeVersion": "v22.19.0",
  "cwd": "/path/to/project",
  "reason": "Critical database connection failure",
  "contact": "admin@gnus.ai",
  "severity": "critical",
  "bypassId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "fix critical production issue"
}
```

## Hook Management

### Supported Hooks

The tool manages the following Git hooks:
- `pre-commit`: Runs before commits are created
- `commit-msg`: Validates commit messages
- `pre-push`: Runs before changes are pushed

### Hook Status

Use `yarn emergency-bypass status` to check hook status:

```
🔍 Hook Status:
   pre-commit: ENABLED
   commit-msg: ENABLED
   pre-push: ENABLED
```

### Temporary Disabling

When hooks are disabled using the `disable` action:
- Original hook files are renamed with `.disabled` extension
- Hooks can be re-enabled with the `enable` action
- Status shows `DISABLED` for affected hooks

## Security Considerations

### When to Use

**Appropriate Use Cases:**
- Critical production issues requiring immediate fixes
- Emergency security patches
- Infrastructure failures preventing normal deployment
- Time-sensitive compliance requirements

**Inappropriate Use Cases:**
- Convenience or to save time
- Regular development workflow
- Avoiding code reviews or testing
- Personal preference for different processes

### Accountability

- All bypass actions are logged and cannot be deleted
- Contact information ensures follow-up is possible
- Unique bypass IDs enable tracking and correlation
- Logs should be regularly reviewed for security compliance

### Emergency Response Integration

This tool integrates with the broader incident response framework:

1. **Detection**: Security monitoring identifies issues
2. **Assessment**: Determine if bypass is necessary
3. **Authorization**: Use this tool for controlled bypass
4. **Execution**: Apply emergency fixes
5. **Recovery**: Restore normal security controls
6. **Review**: Analyze bypass usage and improve processes

## Best Practices

### Before Using Bypass

1. **Exhaust Normal Processes**: Ensure all standard procedures have been attempted
2. **Document Alternatives**: Note why normal processes cannot be used
3. **Assess Risk**: Evaluate the security impact of the bypass
4. **Plan Recovery**: Know how to restore normal controls

### During Bypass

1. **Minimize Scope**: Only bypass what's absolutely necessary
2. **Monitor Closely**: Watch for unexpected side effects
3. **Communicate**: Inform relevant team members
4. **Document Actions**: Keep detailed notes of what was done

### After Bypass

1. **Restore Controls**: Re-enable security measures immediately
2. **Review Logs**: Analyze what happened during the bypass
3. **Update Processes**: Identify why the bypass was needed
4. **Report Findings**: Share lessons learned with the team

## Troubleshooting

### Common Issues

#### "Command not found"
Ensure you're in the project root directory and using `yarn emergency-bypass`.

#### "Invalid severity"
Use only: `critical`, `high`, `medium`, `low`.

#### "Reason required"
All bypass actions (except `status`) require the `--reason` option.

#### "Contact required"
All bypass actions (except `status`) require the `--contact` option.

### Hook Issues

#### Hooks not found
The `.husky` directory or hook files may not exist. Check:
```bash
ls -la .husky/
```

#### Hooks not working after enable
Ensure you're running the `enable` command from the project root.

## Integration with CI/CD

### Automated Monitoring

The bypass logs can be integrated with monitoring systems to:
- Alert on bypass usage
- Track bypass frequency
- Generate compliance reports
- Identify process improvement opportunities

### Pipeline Integration

In CI/CD pipelines, the tool can be used for:
- Emergency deployments
- Hotfix releases
- Security patch application
- Infrastructure recovery

## Compliance and Audit

### Regulatory Considerations

- **SOX Compliance**: All bypass actions are logged for audit trails
- **GDPR**: Contact information handling follows privacy requirements
- **Industry Standards**: Meets requirements for controlled emergency procedures

### Audit Procedures

1. **Regular Review**: Security team reviews bypass logs monthly
2. **Anomaly Detection**: Automated monitoring for unusual bypass patterns
3. **Follow-up**: Contact information used to verify bypass justification
4. **Process Improvement**: Analysis of bypass reasons to improve normal processes

## Related Documentation

- [Security Incident Response Runbooks](../incident-response-runbooks.md)
- [Security Configuration](../SECURITY-CONFIG.md)
- [Developer Onboarding Checklist](developer-onboarding-checklist.md)
- [Security Tools Troubleshooting](security-tools-troubleshooting-guide.md)

---

## Quick Reference

```bash
# Check status
yarn emergency-bypass status

# Emergency commit
yarn emergency-bypass commit "message" --reason "justification" --contact "email" --severity critical

# Emergency push
yarn emergency-bypass push --reason "justification" --contact "email" --severity high

# Temporarily disable hooks
yarn emergency-bypass disable --reason "justification" --contact "email" --severity medium

# Re-enable hooks
yarn emergency-bypass enable --reason "justification" --contact "email" --severity low
```

**Remember**: This tool should only be used in genuine emergencies. All bypass actions are logged and monitored.