#!/bin/bash

# GNUS-DAO DevContainer GitHub CLI Workflow Helper
# Provides step-by-step development process using GitHub CLI
# Usage: ./gh-devcontainer-workflow.sh [command] [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
WORKFLOW_FILE="devcontainer-ci.yml"
BUILD_WORKFLOW_FILE="build-devcontainer.yml"

# Default values
BRANCH="${BRANCH:-$(git branch --show-current)}"
REPO="${GITHUB_REPOSITORY:-gnus-dao}"
TEST_SUITE="${TEST_SUITE:-all}"

# Helper functions
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_command() {
    echo -e "${CYAN}[CMD]${NC} $1"
}

check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed or not in PATH"
        log_info "Install from: https://cli.github.com/"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_info "Run: gh auth login"
        exit 1
    fi
}

get_workflow_id() {
    local workflow_file="$1"
    gh workflow list --json name,path | jq -r ".[] | select(.path == \".github/workflows/$workflow_file\") | .name"
}

run_workflow() {
    local workflow_file="$1"
    local branch="$2"
    shift 2

    log_step "Running workflow: $workflow_file on branch: $branch"

    local cmd="gh workflow run \"$workflow_file\" --ref \"$branch\""
    while [[ $# -gt 0 ]]; do
        cmd="$cmd -f \"$1=$2\""
        shift 2
    done

    log_command "$cmd"
    eval "$cmd"
}

watch_run() {
    log_step "Monitoring workflow run..."
    log_command "gh run watch"
    gh run watch
}

view_logs() {
    log_step "Viewing workflow logs..."
    log_command "gh run view --log"
    gh run view --log
}

check_pr_status() {
    log_step "Checking PR status..."
    log_command "gh pr status"
    gh pr status

    log_step "Checking PR checks..."
    log_command "gh pr checks"
    gh pr checks
}

show_usage() {
    cat << EOF
GNUS-DAO DevContainer GitHub CLI Workflow Helper

USAGE:
    $0 [command] [options]

COMMANDS:
    run [options]          Run DevContainer CI workflow
    build [options]        Run DevContainer build workflow
    watch                  Monitor the latest workflow run
    logs                   View logs of the latest workflow run
    pr-status              Check PR status and checks
    validate               Run full validation workflow
    help                   Show this help message

OPTIONS:
    -b, --branch BRANCH    Target branch (default: current branch)
    -t, --test-suite SUITE Test suite to run: all, unit, integration, security, multichain
    -f, --force-rebuild    Force container rebuild (build command only)
    -h, --help             Show this help message

EXAMPLES:
    # Run full DevContainer CI on current branch
    $0 run

    # Run only unit tests on specific branch
    $0 run --branch feature/my-feature --test-suite unit

    # Build DevContainer image with force rebuild
    $0 build --force-rebuild

    # Monitor workflow and view logs
    $0 run && $0 watch && $0 logs

    # Check PR status before merge
    $0 pr-status

    # Full development workflow
    $0 validate

DEVELOPMENT WORKFLOW:
    1. Make changes to your feature branch
    2. Run: $0 run
    3. Monitor: $0 watch
    4. Check logs: $0 logs
    5. Validate PR: $0 pr-status
    6. Merge when ready

EOF
}

# Command implementations
cmd_run() {
    local test_suite="$TEST_SUITE"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--test-suite)
                test_suite="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "Starting DevContainer CI workflow"
    log_info "Branch: $BRANCH"
    log_info "Test Suite: $test_suite"

    run_workflow "$WORKFLOW_FILE" "$BRANCH" "test_suite" "$test_suite"
}

cmd_build() {
    local force_rebuild="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force-rebuild)
                force_rebuild="true"
                shift
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "Starting DevContainer build workflow"
    log_info "Branch: $BRANCH"
    log_info "Force rebuild: $force_rebuild"

    run_workflow "$BUILD_WORKFLOW_FILE" "$BRANCH" "force_rebuild" "$force_rebuild"
}

cmd_watch() {
    watch_run
}

cmd_logs() {
    view_logs
}

cmd_pr_status() {
    check_pr_status
}

cmd_validate() {
    log_info "Running full DevContainer validation workflow"

    # Run DevContainer CI
    log_step "Step 1: Running DevContainer CI workflow"
    run_workflow "$WORKFLOW_FILE" "$BRANCH" "test_suite" "all"

    # Watch the run
    log_step "Step 2: Monitoring workflow execution"
    watch_run

    # View logs
    log_step "Step 3: Reviewing detailed logs"
    view_logs

    # Check PR status
    log_step "Step 4: Validating PR checks"
    check_pr_status

    log_success "DevContainer validation workflow completed!"
    log_info "Review the results above and ensure all checks pass before merging."
}

# Main command dispatcher
main() {
    local command="${1:-help}"

    # Check prerequisites
    check_gh_cli

    case "$command" in
        run)
            shift
            cmd_run "$@"
            ;;
        build)
            shift
            cmd_build "$@"
            ;;
        watch)
            cmd_watch
            ;;
        logs)
            cmd_logs
            ;;
        pr-status)
            cmd_pr_status
            ;;
        validate)
            cmd_validate
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"