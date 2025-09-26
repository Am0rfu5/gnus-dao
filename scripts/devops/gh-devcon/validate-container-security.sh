#!/bin/bash

# GNUS-DAO Container Security Validation Script
# Validates container security posture, vulnerability scanning, and compliance

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-geniusventures}/gnus-dao-devcontainer}"
TAG="${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Security thresholds
MAX_CRITICAL_VULNS=0
MAX_HIGH_VULNS=5
MAX_MEDIUM_VULNS=20

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    local missing_tools=()
    
    if ! command -v trivy &> /dev/null; then
        missing_tools+=("trivy")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi
}

# Validate container image exists
validate_image() {
    local image_ref="${REGISTRY}/${IMAGE_NAME}:${TAG}"
    
    log_info "Validating container image: ${image_ref}"
    
    if ! docker manifest inspect "${image_ref}" &> /dev/null; then
        log_error "Container image not found: ${image_ref}"
        return 1
    fi
    
    log_success "Container image found and accessible"
    return 0
}

# Run Trivy vulnerability scan
run_trivy_scan() {
    local image_ref="${REGISTRY}/${IMAGE_NAME}:${TAG}"
    local scan_file="/tmp/trivy-scan-${TAG}.json"
    
    log_info "Running Trivy vulnerability scan on ${image_ref}"
    
    if ! trivy image --format json --output "${scan_file}" "${image_ref}"; then
        log_error "Trivy scan failed"
        return 1
    fi
    
    log_success "Trivy scan completed successfully"
    echo "${scan_file}"
}

# Analyze scan results
analyze_scan_results() {
    local scan_file="$1"
    
    log_info "Analyzing vulnerability scan results"
    
    # Count vulnerabilities by severity
    local critical_count=$(jq '.Results[].Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' "${scan_file}" | wc -l)
    local high_count=$(jq '.Results[].Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID' "${scan_file}" | wc -l)
    local medium_count=$(jq '.Results[].Vulnerabilities[]? | select(.Severity == "MEDIUM") | .VulnerabilityID' "${scan_file}" | wc -l)
    
    log_info "Vulnerability counts:"
    log_info "  Critical: ${critical_count}"
    log_info "  High: ${high_count}"
    log_info "  Medium: ${medium_count}"
    
    # Check against thresholds
    local passed=true
    
    if [ "${critical_count}" -gt "${MAX_CRITICAL_VULNS}" ]; then
        log_error "Critical vulnerabilities (${critical_count}) exceed threshold (${MAX_CRITICAL_VULNS})"
        passed=false
    fi
    
    if [ "${high_count}" -gt "${MAX_HIGH_VULNS}" ]; then
        log_error "High vulnerabilities (${high_count}) exceed threshold (${MAX_HIGH_VULNS})"
        passed=false
    fi
    
    if [ "${medium_count}" -gt "${MAX_MEDIUM_VULNS}" ]; then
        log_warning "Medium vulnerabilities (${medium_count}) exceed threshold (${MAX_MEDIUM_VULNS})"
    fi
    
    if [ "${passed}" = true ]; then
        log_success "All vulnerability thresholds met"
    fi
    
    return $([ "${passed}" = true ] && echo 0 || echo 1)
}

# Check container security configuration
check_container_security() {
    local image_ref="${REGISTRY}/${IMAGE_NAME}:${TAG}"
    
    log_info "Checking container security configuration"
    
    # Run Docker inspect to get image details
    local inspect_output
    inspect_output=$(docker inspect "${image_ref}" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to inspect container image"
        return 1
    fi
    
    # Check if running as non-root user
    local user
    user=$(echo "${inspect_output}" | jq -r '.[0].Config.User // empty')
    
    if [ -z "${user}" ] || [ "${user}" = "root" ] || [ "${user}" = "0" ]; then
        log_warning "Container runs as root user - consider using non-root user"
    else
        log_success "Container runs as non-root user: ${user}"
    fi
    
    # Check for security-related labels
    local labels
    labels=$(echo "${inspect_output}" | jq -r '.[0].Config.Labels // {}')
    
    if echo "${labels}" | jq -e '.["org.opencontainers.image.source"]' > /dev/null 2>&1; then
        log_success "Image has source label for provenance tracking"
    else
        log_warning "Image missing source label"
    fi
    
    return 0
}

# Validate security policies
validate_security_policies() {
    local policy_file="${PROJECT_ROOT}/.github/security/container-policy.yml"
    
    log_info "Validating security policies"
    
    if [ ! -f "${policy_file}" ]; then
        log_error "Security policy file not found: ${policy_file}"
        return 1
    fi
    
    # Parse policy file and validate format
    if ! yq eval '.' "${policy_file}" > /dev/null 2>&1; then
        log_error "Invalid security policy file format"
        return 1
    fi
    
    log_success "Security policy file is valid"
    
    # Check policy thresholds
    local max_critical
    max_critical=$(yq eval '.vulnerabilities.max_critical // 0' "${policy_file}")
    
    if [ "${max_critical}" -gt 0 ]; then
        log_warning "Policy allows critical vulnerabilities (threshold: ${max_critical})"
    else
        log_success "Policy enforces zero critical vulnerabilities"
    fi
    
    return 0
}

# Generate security report
generate_security_report() {
    local scan_file="$1"
    local report_file="${PROJECT_ROOT}/reports/container-security-report-${TAG}.json"
    
    log_info "Generating security report: ${report_file}"
    
    mkdir -p "${PROJECT_ROOT}/reports"
    
    # Create comprehensive report
    jq -n \
        --arg image "${REGISTRY}/${IMAGE_NAME}:${TAG}" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --argjson scan "$(cat "${scan_file}")" \
        '{
            image: $image,
            timestamp: $timestamp,
            scan_results: $scan,
            summary: {
                critical_vulnerabilities: ($scan | .Results[].Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID) | length,
                high_vulnerabilities: ($scan | .Results[].Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID) | length,
                medium_vulnerabilities: ($scan | .Results[].Vulnerabilities[]? | select(.Severity == "MEDIUM") | .VulnerabilityID) | length,
                low_vulnerabilities: ($scan | .Results[].Vulnerabilities[]? | select(.Severity == "LOW") | .VulnerabilityID) | length
            },
            thresholds: {
                max_critical: '"${MAX_CRITICAL_VULNS}"',
                max_high: '"${MAX_HIGH_VULNS}"',
                max_medium: '"${MAX_MEDIUM_VULNS}"'
            }
        }' > "${report_file}"
    
    log_success "Security report generated: ${report_file}"
}

# Main validation function
main() {
    log_info "Starting GNUS-DAO container security validation"
    log_info "Image: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
    
    # Check dependencies
    check_dependencies
    
    # Validate image exists
    if ! validate_image; then
        exit 1
    fi
    
    # Validate security policies
    if ! validate_security_policies; then
        exit 1
    fi
    
    # Check container security configuration
    check_container_security
    
    # Run vulnerability scan
    local scan_file
    if ! scan_file=$(run_trivy_scan); then
        exit 1
    fi
    
    # Analyze scan results
    if ! analyze_scan_results "${scan_file}"; then
        log_error "Security validation failed - vulnerabilities exceed thresholds"
        generate_security_report "${scan_file}"
        exit 1
    fi
    
    # Generate final report
    generate_security_report "${scan_file}"
    
    log_success "Container security validation completed successfully"
    
    # Cleanup
    rm -f "${scan_file}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --tag TAG          Container tag to validate (default: latest)"
            echo "  --registry REGISTRY Container registry (default: ghcr.io)"
            echo "  --image IMAGE       Image name (default: auto-detected)"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main validation
main
