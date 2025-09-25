#!/bin/bash

# GNUS-DAO DevContainer Validation Script
# Validates environment parity between native and containerized execution
# Usage: ./validate-devcontainer.sh [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
REPO_NAME="${GITHUB_REPOSITORY:-gnus-dao}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-${GITHUB_REPOSITORY_OWNER:-geniusventures}/gnus-dao-devcontainer}"

# Default values
VALIDATE_NATIVE=true
VALIDATE_CONTAINER=true
COMPARE_RESULTS=true
GENERATE_REPORT=true
CLEANUP=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-native)
      VALIDATE_NATIVE=false
      shift
      ;;
    --no-container)
      VALIDATE_CONTAINER=false
      shift
      ;;
    --no-compare)
      COMPARE_RESULTS=false
      shift
      ;;
    --no-report)
      GENERATE_REPORT=false
      shift
      ;;
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --help|-h)
      echo "GNUS-DAO DevContainer Validation Script"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --no-native     Skip native environment validation"
      echo "  --no-container  Skip container environment validation"
      echo "  --no-compare    Skip results comparison"
      echo "  --no-report     Skip report generation"
      echo "  --no-cleanup    Skip cleanup of temporary files"
      echo "  --help, -h      Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  REGISTRY        Container registry (default: ghcr.io)"
      echo "  IMAGE_NAME      Container image name"
      echo "  GITHUB_REPOSITORY    Repository name"
      echo "  GITHUB_REPOSITORY_OWNER  Repository owner"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

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

# Validation functions
validate_native_environment() {
    log_info "Validating native environment..."

    cd "$PROJECT_ROOT"

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found in native environment"
        return 1
    fi

    NATIVE_NODE_VERSION=$(node --version)
    log_info "Native Node.js version: $NATIVE_NODE_VERSION"

    # Check Yarn version
    if ! command -v yarn &> /dev/null; then
        log_error "Yarn not found in native environment"
        return 1
    fi

    NATIVE_YARN_VERSION=$(yarn --version)
    log_info "Native Yarn version: $NATIVE_YARN_VERSION"

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules not found, installing dependencies..."
        yarn install --frozen-lockfile
    fi

    # Test basic compilation
    log_info "Testing native compilation..."
    if yarn compile > /dev/null 2>&1; then
        log_success "Native compilation successful"
    else
        log_error "Native compilation failed"
        return 1
    fi

    # Test basic test execution
    log_info "Testing native test execution..."
    if timeout 30s yarn test --grep "should deploy" > /dev/null 2>&1; then
        log_success "Native test execution successful"
    else
        log_error "Native test execution failed"
        return 1
    fi

    # Capture native environment info
    cat > native-env.json << EOF
{
  "node_version": "$NATIVE_NODE_VERSION",
  "yarn_version": "$NATIVE_YARN_VERSION",
  "compilation_success": true,
  "test_execution_success": true,
  "timestamp": "$(date -Iseconds)"
}
EOF

    log_success "Native environment validation completed"
    return 0
}

validate_container_environment() {
    log_info "Validating container environment..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found, cannot validate container environment"
        return 1
    fi

    # Pull the container image
    CONTAINER_IMAGE="$REGISTRY/$IMAGE_NAME:latest"
    log_info "Pulling container image: $CONTAINER_IMAGE"

    if ! docker pull "$CONTAINER_IMAGE" > /dev/null 2>&1; then
        log_error "Failed to pull container image: $CONTAINER_IMAGE"
        return 1
    fi

    log_success "Container image pulled successfully"

    # Create temporary directory for container testing
    CONTAINER_TEMP_DIR=$(mktemp -d)
    trap "rm -rf $CONTAINER_TEMP_DIR" EXIT

    # Copy project files to temp directory
    cp -r "$PROJECT_ROOT"/* "$CONTAINER_TEMP_DIR/"

    # Run container validation
    log_info "Running container validation..."

    if docker run --rm -v "$CONTAINER_TEMP_DIR:/workspaces/gnus-dao" -w /workspaces/gnus-dao \
        --env CI=true --env NODE_ENV=test \
        "$CONTAINER_IMAGE" bash -c '
            set -e

            echo "Container Node.js version: $(node --version)"
            echo "Container Yarn version: $(yarn --version)"

            # Install dependencies
            yarn install --frozen-lockfile --prefer-offline > /dev/null 2>&1

            # Test compilation
            if yarn compile > /dev/null 2>&1; then
                echo "Container compilation: SUCCESS"
            else
                echo "Container compilation: FAILED"
                exit 1
            fi

            # Test basic execution
            if timeout 30s yarn test --grep "should deploy" > /dev/null 2>&1; then
                echo "Container test execution: SUCCESS"
            else
                echo "Container test execution: FAILED"
                exit 1
            fi

            # Capture container environment info
            cat > container-env.json << EOF
{
  "node_version": "$(node --version)",
  "yarn_version": "$(yarn --version)",
  "compilation_success": true,
  "test_execution_success": true,
  "timestamp": "'$(date -Iseconds)'"
}
EOF
        '; then

        # Copy results back
        cp "$CONTAINER_TEMP_DIR/container-env.json" ./ 2>/dev/null || true

        log_success "Container environment validation completed"
        return 0
    else
        log_error "Container environment validation failed"
        return 1
    fi
}

compare_environments() {
    log_info "Comparing native vs container environments..."

    if [ ! -f "native-env.json" ] || [ ! -f "container-env.json" ]; then
        log_error "Environment files not found for comparison"
        return 1
    fi

    # Compare Node.js versions
    NATIVE_NODE=$(jq -r '.node_version' native-env.json)
    CONTAINER_NODE=$(jq -r '.node_version' container-env.json)

    if [ "$NATIVE_NODE" = "$CONTAINER_NODE" ]; then
        log_success "Node.js versions match: $NATIVE_NODE"
    else
        log_warning "Node.js versions differ: native=$NATIVE_NODE, container=$CONTAINER_NODE"
    fi

    # Compare Yarn versions
    NATIVE_YARN=$(jq -r '.yarn_version' native-env.json)
    CONTAINER_YARN=$(jq -r '.yarn_version' container-env.json)

    if [ "$NATIVE_YARN" = "$CONTAINER_YARN" ]; then
        log_success "Yarn versions match: $NATIVE_YARN"
    else
        log_warning "Yarn versions differ: native=$NATIVE_YARN, container=$CONTAINER_YARN"
    fi

    # Check compilation success
    NATIVE_COMPILE=$(jq -r '.compilation_success' native-env.json)
    CONTAINER_COMPILE=$(jq -r '.compilation_success' container-env.json)

    if [ "$NATIVE_COMPILE" = "true" ] && [ "$CONTAINER_COMPILE" = "true" ]; then
        log_success "Compilation successful in both environments"
    else
        log_error "Compilation failed in one or both environments"
        return 1
    fi

    # Check test execution success
    NATIVE_TEST=$(jq -r '.test_execution_success' native-env.json)
    CONTAINER_TEST=$(jq -r '.test_execution_success' container-env.json)

    if [ "$NATIVE_TEST" = "true" ] && [ "$CONTAINER_TEST" = "true" ]; then
        log_success "Test execution successful in both environments"
    else
        log_error "Test execution failed in one or both environments"
        return 1
    fi

    log_success "Environment comparison completed"
    return 0
}

generate_report() {
    log_info "Generating validation report..."

    REPORT_FILE="devcontainer-validation-report.json"

    cat > "$REPORT_FILE" << EOF
{
  "validation_timestamp": "$(date -Iseconds)",
  "repository": "$REPO_NAME",
  "container_image": "$REGISTRY/$IMAGE_NAME:latest",
  "validation_results": {
    "native_validation": $VALIDATE_NATIVE,
    "container_validation": $VALIDATE_CONTAINER,
    "comparison_performed": $COMPARE_RESULTS,
    "report_generated": true
  },
  "environment_comparison": {
EOF

    if [ -f "native-env.json" ] && [ -f "container-env.json" ]; then
        cat >> "$REPORT_FILE" << EOF
    "native": $(cat native-env.json),
    "container": $(cat container-env.json),
EOF
    fi

    cat >> "$REPORT_FILE" << EOF
    "parity_achieved": $(compare_environments > /dev/null 2>&1 && echo true || echo false)
  },
  "recommendations": [
    "Ensure Node.js and Yarn versions are synchronized",
    "Verify all security tools are available in container",
    "Test compilation and testing workflows match",
    "Validate artifact generation consistency"
  ]
}
EOF

    log_success "Validation report generated: $REPORT_FILE"
}

cleanup_files() {
    if [ "$CLEANUP" = true ]; then
        log_info "Cleaning up temporary files..."
        rm -f native-env.json container-env.json
        log_success "Cleanup completed"
    fi
}

# Main execution
main() {
    log_info "Starting DevContainer validation for GNUS-DAO"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Container image: $REGISTRY/$IMAGE_NAME:latest"

    cd "$PROJECT_ROOT"

    # Validate native environment
    if [ "$VALIDATE_NATIVE" = true ]; then
        if validate_native_environment; then
            log_success "Native environment validation: PASSED"
        else
            log_error "Native environment validation: FAILED"
            exit 1
        fi
    fi

    # Validate container environment
    if [ "$VALIDATE_CONTAINER" = true ]; then
        if validate_container_environment; then
            log_success "Container environment validation: PASSED"
        else
            log_error "Container environment validation: FAILED"
            exit 1
        fi
    fi

    # Compare environments
    if [ "$COMPARE_RESULTS" = true ] && [ "$VALIDATE_NATIVE" = true ] && [ "$VALIDATE_CONTAINER" = true ]; then
        if compare_environments; then
            log_success "Environment comparison: PASSED"
        else
            log_error "Environment comparison: FAILED"
            exit 1
        fi
    fi

    # Generate report
    if [ "$GENERATE_REPORT" = true ]; then
        generate_report
    fi

    # Cleanup
    cleanup_files

    log_success "DevContainer validation completed successfully! ✅"
}

# Run main function
main "$@"