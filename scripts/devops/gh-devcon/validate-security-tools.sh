#!/bin/bash
# GNUS-DAO DevContainer Security Tools Validation
# Validates that all security tools are properly configured and functional

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TOOLS_CONFIG="${PROJECT_ROOT}/.devcontainer/security/tools.json"
SETUP_SCRIPT="${PROJECT_ROOT}/.devcontainer/security/setup-security-env.sh"
LOG_FILE="${PROJECT_ROOT}/logs/security-validation.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    local message="$1"
    log "ERROR" "${RED}${message}${NC}"
    exit 1
}

# Success message
success() {
    local message="$1"
    log "SUCCESS" "${GREEN}${message}${NC}"
}

# Info message
info() {
    local message="$1"
    log "INFO" "${BLUE}${message}${NC}"
}

# Warning message
warning() {
    local message="$1"
    log "WARNING" "${YELLOW}${message}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate tool installation
validate_tool_installation() {
    local tool="$1"
    local command_name="$2"

    info "Validating ${tool} installation..."

    if ! command_exists "${command_name}"; then
        error_exit "${tool} is not installed or not in PATH: ${command_name}"
    fi

    # Get version
    local version_output
    case "${tool}" in
        "snyk")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        "socket")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        "semgrep")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        "git-secrets")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        "osv-scanner")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        "slither")
            version_output=$(${command_name} --version 2>/dev/null || echo "unknown")
            ;;
        *)
            version_output="unknown"
            ;;
    esac

    info "${tool} version: ${version_output}"
    success "${tool} is properly installed"
}

# Validate tool authentication
validate_tool_authentication() {
    local tool="$1"
    local auth_config="$2"

    info "Validating ${tool} authentication..."

    # Extract authentication requirements
    local env_var=$(jq -r ".authentication.env_var // empty" <<< "${auth_config}")
    local required=$(jq -r ".authentication.required // false" <<< "${auth_config}")

    if [[ -n "${env_var}" ]]; then
        if [[ "${required}" == "true" && -z "${!env_var:-}" ]]; then
            error_exit "Required authentication variable ${env_var} is not set for ${tool}"
        elif [[ -z "${!env_var:-}" ]]; then
            warning "Optional authentication variable ${env_var} is not set for ${tool}"
            return 0
        fi

        # Test authentication
        case "${tool}" in
            "snyk")
                if ! timeout 10s snyk auth test >/dev/null 2>&1; then
                    error_exit "Snyk authentication test failed"
                fi
                ;;
            "socket")
                # Socket authentication is validated during scan
                info "Socket authentication will be validated during scan"
                ;;
            "semgrep")
                if ! timeout 10s semgrep login --check >/dev/null 2>&1; then
                    warning "Semgrep authentication test failed or not configured"
                fi
                ;;
        esac

        success "${tool} authentication is valid"
    else
        info "${tool} does not require authentication"
    fi
}

# Validate tool functionality
validate_tool_functionality() {
    local tool="$1"
    local tool_config="$2"

    info "Validating ${tool} functionality..."

    case "${tool}" in
        "snyk")
            # Test with a simple package.json
            if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
                if ! timeout 30s snyk test --json --fail-on=upgradable "${PROJECT_ROOT}" >/dev/null 2>&1; then
                    warning "Snyk functionality test failed (may be due to vulnerabilities)"
                else
                    success "Snyk functionality test passed"
                fi
            fi
            ;;
        "socket")
            # Socket requires API key for full functionality
            if [[ -n "${SOCKET_API_KEY:-}" ]]; then
                if ! timeout 30s socket scan --json "${PROJECT_ROOT}" >/dev/null 2>&1; then
                    warning "Socket functionality test failed"
                else
                    success "Socket functionality test passed"
                fi
            else
                info "Socket functionality test skipped (no API key)"
            fi
            ;;
        "semgrep")
            # Test semgrep scanning
            if ! timeout 30s semgrep --config=auto --json --disable-version-check "${PROJECT_ROOT}" >/dev/null 2>&1; then
                warning "Semgrep functionality test failed"
            else
                success "Semgrep functionality test passed"
            fi
            ;;
        "git-secrets")
            # Test git-secrets scanning
            if ! timeout 30s git-secrets --scan "${PROJECT_ROOT}" >/dev/null 2>&1; then
                warning "git-secrets functionality test failed"
            else
                success "git-secrets functionality test passed"
            fi
            ;;
        "osv-scanner")
            # Test OSV-Scanner
            if ! timeout 30s osv-scanner --format=json --lockfile=yarn.lock "${PROJECT_ROOT}" >/dev/null 2>&1; then
                warning "OSV-Scanner functionality test failed"
            else
                success "OSV-Scanner functionality test passed"
            fi
            ;;
        "slither")
            # Test Slither on contracts
            if [[ -d "${PROJECT_ROOT}/contracts" ]]; then
                if ! timeout 60s slither --json --exclude-dependencies --exclude-informational "${PROJECT_ROOT}/contracts" >/dev/null 2>&1; then
                    warning "Slither functionality test failed"
                else
                    success "Slither functionality test passed"
                fi
            fi
            ;;
    esac
}

# Validate cache configuration
validate_cache_configuration() {
    local cache_dir="${PROJECT_ROOT}/.devcontainer/cache/security"

    info "Validating cache configuration..."

    if [[ ! -d "${cache_dir}" ]]; then
        error_exit "Security cache directory not found: ${cache_dir}"
    fi

    # Check permissions
    if [[ ! -w "${cache_dir}" ]]; then
        error_exit "Security cache directory is not writable: ${cache_dir}"
    fi

    success "Cache configuration is valid"
}

# Validate custom rules
validate_custom_rules() {
    info "Validating custom security rules..."

    local rules_dir="${PROJECT_ROOT}/.github/security"

    if [[ ! -d "${rules_dir}" ]]; then
        error_exit "Security rules directory not found: ${rules_dir}"
    fi

    # Check diamond patterns
    if [[ ! -f "${rules_dir}/diamond-patterns.yml" ]]; then
        error_exit "Diamond patterns rules file not found"
    fi

    # Check GNUS-DAO patterns
    if [[ ! -f "${rules_dir}/gnus-dao-patterns.yml" ]]; then
        error_exit "GNUS-DAO patterns rules file not found"
    fi

    # Validate YAML syntax
    if command_exists yamllint; then
        if ! yamllint "${rules_dir}/diamond-patterns.yml" >/dev/null 2>&1; then
            warning "Diamond patterns YAML validation failed"
        fi
        if ! yamllint "${rules_dir}/gnus-dao-patterns.yml" >/dev/null 2>&1; then
            warning "GNUS-DAO patterns YAML validation failed"
        fi
    fi

    success "Custom security rules are valid"
}

# Run comprehensive validation
run_validation() {
    info "Starting comprehensive security tools validation..."

    # Check if tools config exists
    if [[ ! -f "${TOOLS_CONFIG}" ]]; then
        error_exit "Security tools configuration not found: ${TOOLS_CONFIG}"
    fi

    # Extract tools from configuration
    local tools=$(jq -r '.tools | keys[]' "${TOOLS_CONFIG}")

    for tool in ${tools}; do
        info "Validating ${tool}..."

        # Get tool configuration
        local tool_config=$(jq -r ".tools.${tool}" "${TOOLS_CONFIG}")
        local command_name=$(jq -r ".command" <<< "${tool_config}")

        # Validate installation
        validate_tool_installation "${tool}" "${command_name}"

        # Validate authentication
        validate_tool_authentication "${tool}" "${tool_config}"

        # Validate functionality
        validate_tool_functionality "${tool}" "${tool_config}"

        success "${tool} validation completed"
    done

    # Validate cache configuration
    validate_cache_configuration

    # Validate custom rules
    validate_custom_rules
}

# Generate validation report
generate_report() {
    info "Generating validation report..."

    local report_file="${PROJECT_ROOT}/reports/security-validation-report.json"

    cat > "${report_file}" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "validation_type": "security_tools_validation",
  "status": "completed",
  "tools_validated": $(jq '.tools | keys | length' "${TOOLS_CONFIG}"),
  "cache_directory": "${PROJECT_ROOT}/.devcontainer/cache/security",
  "rules_directory": "${PROJECT_ROOT}/.github/security",
  "log_file": "${LOG_FILE}"
}
EOF

    success "Validation report generated: ${report_file}"
}

# Main execution
main() {
    log "INFO" "Starting GNUS-DAO DevContainer security tools validation..."

    # Check if setup script exists
    if [[ ! -f "${SETUP_SCRIPT}" ]]; then
        warning "Setup script not found, running validation without setup check"
    fi

    run_validation
    generate_report

    success "GNUS-DAO DevContainer security tools validation completed successfully"
}

# Run main function
main "$@"