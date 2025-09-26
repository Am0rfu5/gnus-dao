#!/bin/bash
# GNUS-DAO DevContainer Security Environment Setup
# This script configures the security scanning environment for containerized workflows

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
CACHE_DIR="${PROJECT_ROOT}/.devcontainer/cache/security"
TOOLS_CONFIG="${SCRIPT_DIR}/tools.json"
LOG_FILE="${PROJECT_ROOT}/logs/security-setup.log"

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

# Setup cache directory
setup_cache_directory() {
    info "Setting up security cache directory..."

    if [[ ! -d "${CACHE_DIR}" ]]; then
        mkdir -p "${CACHE_DIR}" || error_exit "Failed to create cache directory: ${CACHE_DIR}"
        success "Created cache directory: ${CACHE_DIR}"
    else
        info "Cache directory already exists: ${CACHE_DIR}"
    fi

    # Set proper permissions
    chmod 755 "${CACHE_DIR}" || warning "Failed to set cache directory permissions"
}

# Validate security tools configuration
validate_tools_config() {
    info "Validating security tools configuration..."

    if [[ ! -f "${TOOLS_CONFIG}" ]]; then
        error_exit "Security tools configuration not found: ${TOOLS_CONFIG}"
    fi

    # Validate JSON syntax
    if ! jq empty "${TOOLS_CONFIG}" 2>/dev/null; then
        error_exit "Invalid JSON in tools configuration: ${TOOLS_CONFIG}"
    fi

    success "Security tools configuration is valid"
}

# Setup tool authentication
setup_authentication() {
    local tool="$1"
    local auth_config="$2"

    info "Setting up authentication for ${tool}..."

    # Extract authentication requirements
    local env_var=$(jq -r ".tools.${tool}.authentication.env_var // empty" "${TOOLS_CONFIG}")
    local required=$(jq -r ".tools.${tool}.authentication.required // false" "${TOOLS_CONFIG}")

    if [[ -n "${env_var}" ]]; then
        if [[ "${required}" == "true" && -z "${!env_var:-}" ]]; then
            error_exit "Required authentication variable ${env_var} is not set for ${tool}"
        elif [[ -z "${!env_var:-}" ]]; then
            warning "Optional authentication variable ${env_var} is not set for ${tool}"
        else
            info "Authentication configured for ${tool}"
        fi
    fi
}

# Install and configure security tools
setup_security_tools() {
    info "Setting up security tools..."

    # Extract tools from configuration
    local tools=$(jq -r '.tools | keys[]' "${TOOLS_CONFIG}")

    for tool in ${tools}; do
        info "Configuring ${tool}..."

        # Setup authentication if required
        setup_authentication "${tool}" "$(jq -r ".tools.${tool}" "${TOOLS_CONFIG}")"

        # Tool-specific setup
        case "${tool}" in
            "snyk")
                setup_snyk
                ;;
            "socket")
                setup_socket
                ;;
            "semgrep")
                setup_semgrep
                ;;
            "git-secrets")
                setup_git_secrets
                ;;
            "osv-scanner")
                setup_osv_scanner
                ;;
            "slither")
                setup_slither
                ;;
            *)
                warning "Unknown tool: ${tool}"
                ;;
        esac
    done
}

# Setup Snyk
setup_snyk() {
    if ! command_exists snyk; then
        info "Installing Snyk..."
        npm install -g snyk || error_exit "Failed to install Snyk"
    fi

    # Configure Snyk
    if [[ -n "${SNYK_TOKEN:-}" ]]; then
        snyk auth "${SNYK_TOKEN}" || error_exit "Failed to authenticate Snyk"
        success "Snyk authentication configured"
    fi
}

# Setup Socket.dev
setup_socket() {
    if ! command_exists socket; then
        info "Installing Socket.dev..."
        npm install -g @socketsecurity/cli || error_exit "Failed to install Socket.dev"
    fi

    if [[ -n "${SOCKET_API_KEY:-}" ]]; then
        success "Socket.dev authentication configured via environment"
    fi
}

# Setup Semgrep
setup_semgrep() {
    if ! command_exists semgrep; then
        info "Installing Semgrep..."
        pip3 install semgrep || error_exit "Failed to install Semgrep"
    fi

    if [[ -n "${SEMGREP_APP_TOKEN:-}" ]]; then
        success "Semgrep authentication configured via environment"
    fi
}

# Setup git-secrets
setup_git_secrets() {
    if ! command_exists git-secrets; then
        info "Installing git-secrets..."
        if command_exists apt-get; then
            apt-get update && apt-get install -y git-secrets || error_exit "Failed to install git-secrets"
        else
            error_exit "git-secrets installation not supported on this system"
        fi
    fi

    success "git-secrets is available"
}

# Setup OSV-Scanner
setup_osv_scanner() {
    if ! command_exists osv-scanner; then
        info "Installing OSV-Scanner..."
        # Download latest release
        local temp_dir=$(mktemp -d)
        local arch=$(uname -m)
        local os=$(uname -s | tr '[:upper:]' '[:lower:]')

        curl -L "https://github.com/google/osv-scanner/releases/latest/download/osv-scanner_${os}_${arch}" \
            -o "${temp_dir}/osv-scanner" || error_exit "Failed to download OSV-Scanner"

        chmod +x "${temp_dir}/osv-scanner"
        mv "${temp_dir}/osv-scanner" /usr/local/bin/ || error_exit "Failed to install OSV-Scanner"
        rm -rf "${temp_dir}"
    fi

    success "OSV-Scanner is available"
}

# Setup Slither
setup_slither() {
    if ! command_exists slither; then
        info "Installing Slither..."
        pip3 install slither-analyzer || error_exit "Failed to install Slither"
    fi

    success "Slither is available"
}

# Setup custom rules
setup_custom_rules() {
    info "Setting up custom security rules..."

    # Create custom rules directories if they don't exist
    local rules_dir="${PROJECT_ROOT}/.github/security"
    mkdir -p "${rules_dir}" || error_exit "Failed to create rules directory"

    # Diamond patterns
    local diamond_patterns="${rules_dir}/diamond-patterns.yml"
    if [[ ! -f "${diamond_patterns}" ]]; then
        cat > "${diamond_patterns}" << 'EOF'
rules:
  - id: diamond-storage-collision
    patterns:
      - pattern: $STORAGE = ...
      - pattern-inside: |
          contract ... {
            ...
          }
    message: "Potential diamond storage collision detected"
    severity: ERROR

  - id: unsafe-diamond-cut
    patterns:
      - pattern: diamondCut(...)
      - pattern-not-inside: |
          modifier onlyOwner() {
            ...
          }
    message: "Diamond cut operation without proper access control"
    severity: ERROR
EOF
        success "Created diamond patterns rules"
    fi

    # GNUS-DAO patterns
    local gnus_dao_patterns="${rules_dir}/gnus-dao-patterns.yml"
    if [[ ! -f "${gnus_dao_patterns}" ]]; then
        cat > "${gnus_dao_patterns}" << 'EOF'
rules:
  - id: missing-access-control
    patterns:
      - pattern: function $FUNC(...) external
      - pattern-not: modifier onlyAuthorized
      - pattern-not-inside: |
          contract ...Facet {
            ...
          }
    message: "External function missing access control modifier"
    severity: WARNING

  - id: unsafe-transfer
    patterns:
      - pattern: $TOKEN.transfer(...)
      - pattern-not-inside: |
          function withdraw(...) {
            ...
            require(...);
            ...
          }
    message: "Token transfer without proper validation"
    severity: WARNING
EOF
        success "Created GNUS-DAO patterns rules"
    fi
}

# Setup environment variables
setup_environment_variables() {
    info "Setting up environment variables..."

    # Export cache directory
    export SECURITY_CACHE_DIR="${CACHE_DIR}"
    export SECURITY_TEMP_DIR="/tmp/security-scan"
    export SECURITY_LOG_LEVEL="info"

    # Create temp directory
    mkdir -p "${SECURITY_TEMP_DIR}" || error_exit "Failed to create temp directory"

    success "Environment variables configured"
}

# Validate setup
validate_setup() {
    info "Validating security environment setup..."

    # Check cache directory
    [[ -d "${CACHE_DIR}" ]] || error_exit "Cache directory not found"

    # Check temp directory
    [[ -d "${SECURITY_TEMP_DIR}" ]] || error_exit "Temp directory not found"

    # Check essential tools
    local essential_tools=("snyk" "semgrep" "git-secrets" "osv-scanner" "slither")
    for tool in "${essential_tools[@]}"; do
        command_exists "${tool}" || error_exit "Essential tool not found: ${tool}"
    done

    # Check custom rules
    [[ -f "${PROJECT_ROOT}/.github/security/diamond-patterns.yml" ]] || error_exit "Diamond patterns rules not found"
    [[ -f "${PROJECT_ROOT}/.github/security/gnus-dao-patterns.yml" ]] || error_exit "GNUS-DAO patterns rules not found"

    success "Security environment setup validation passed"
}

# Main execution
main() {
    log "INFO" "Starting GNUS-DAO DevContainer security environment setup..."

    setup_cache_directory
    validate_tools_config
    setup_environment_variables
    setup_security_tools
    setup_custom_rules
    validate_setup

    success "GNUS-DAO DevContainer security environment setup completed successfully"
}

# Run main function
main "$@"