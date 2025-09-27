# DevContainer Hands-On Exercises

This directory contains interactive exercises designed to build practical DevContainer skills through guided, hands-on learning experiences.

## Exercise Structure

Each exercise follows a consistent format:
- **Objective**: What you'll accomplish
- **Prerequisites**: Required knowledge/setup
- **Steps**: Detailed instructions with validation
- **Validation**: Commands to verify success
- **Troubleshooting**: Common issues and solutions
- **Next Steps**: What to explore next

## Available Exercises

### [Exercise 1: Environment Setup](./exercise-01-environment-setup.md)
**Duration**: 15 minutes
**Difficulty**: Beginner
**Skills**: Basic DevContainer operations, environment validation

Learn to initialize and validate your DevContainer environment, including dependency installation and basic configuration.

### [Exercise 2: Development Workflow](./exercise-02-development-workflow.md)
**Duration**: 20 minutes
**Difficulty**: Beginner
**Skills**: Code editing, compilation, testing

Master the core development workflow: editing code, running builds, executing tests, and debugging issues.

### [Exercise 3: Smart Contract Development](./exercise-03-smart-contract-development.md)
**Duration**: 25 minutes
**Difficulty**: Intermediate
**Skills**: Solidity development, Hardhat integration, contract deployment

Develop, test, and deploy smart contracts using the GNUS-DAO development environment.

### [Exercise 4: Diamond Architecture](./exercise-04-diamond-architecture.md)
**Duration**: 30 minutes
**Difficulty**: Intermediate
**Skills**: ERC-2535 Diamond pattern, facet management, upgrade mechanisms

Explore the diamond architecture used in GNUS-DAO, including facet deployment and upgrade procedures.

### [Exercise 5: Security Testing](./exercise-05-security-testing.md)
**Duration**: 35 minutes
**Difficulty**: Advanced
**Skills**: Security testing, vulnerability assessment, audit preparation

Conduct comprehensive security testing including static analysis, fuzzing, and invariant testing.

### [Exercise 6: Performance Optimization](./exercise-06-performance-optimization.md)
**Duration**: 25 minutes
**Difficulty**: Advanced
**Skills**: Gas optimization, performance benchmarking, monitoring

Optimize smart contract performance and monitor system metrics for production readiness.

### [Exercise 7: Troubleshooting Scenarios](./exercise-07-troubleshooting-scenarios.md)
**Duration**: 20 minutes
**Difficulty**: Intermediate
**Skills**: Problem diagnosis, log analysis, issue resolution

Practice diagnosing and resolving common DevContainer and development issues.

### [Exercise 8: Team Collaboration](./exercise-08-team-collaboration.md)
**Duration**: 15 minutes
**Difficulty**: Beginner
**Skills**: Git workflows, code review, CI/CD integration

Learn collaborative development practices within the DevContainer environment.

## Getting Started

1. **Choose Your Starting Point**:
   - New to DevContainer? Start with Exercise 1
   - Familiar with containers? Skip to Exercise 2
   - Smart contract experience? Jump to Exercise 3

2. **Setup Validation**:
   ```bash
   # Verify your environment is ready
   ./scripts/devops/gh-devcon/diagnose-devcontainer-issues.ts
   ```

3. **Progress Tracking**:
   - Each exercise includes validation commands
   - Track your progress in the adoption dashboard
   - Certificate available after completing all exercises

## Learning Outcomes

By completing these exercises, you will be able to:

- ✅ Set up and maintain DevContainer environments
- ✅ Execute full development workflows autonomously
- ✅ Develop secure smart contracts following GNUS-DAO patterns
- ✅ Implement and test diamond architecture components
- ✅ Conduct comprehensive security assessments
- ✅ Optimize performance and monitor system health
- ✅ Troubleshoot issues independently
- ✅ Collaborate effectively in team environments

## Support Resources

- **Quick Reference**: [DevContainer Quick Start](../quick-start/README.md)
- **Troubleshooting Guide**: [Common Issues](../troubleshooting/common-issues.md)
- **Interactive Walkthrough**: `yarn devcontainer:walkthrough`
- **Community Support**: [GitHub Discussions](../../.github/DISCUSSIONS.md)

## Completion Certificate

Upon finishing all exercises, you'll receive a completion certificate demonstrating your DevContainer proficiency. This certificate can be shared with your team and included in your professional development records.

---

*These exercises are designed for progressive learning. Take your time, experiment, and don't hesitate to ask questions in our community channels.*