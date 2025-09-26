#!/bin/bash

# GNUS-DAO Container Performance Benchmarking Script
# Measures build times, cache effectiveness, and runtime performance

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REGISTRY="ghcr.io"
IMAGE_NAME="${GITHUB_REPOSITORY_OWNER:-geniusventures}/gnus-dao-devcontainer"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Measure execution time
measure_time() {
    local start_time=$(date +%s.%3N)
    "$@"
    local end_time=$(date +%s.%3N)
    local duration=$(echo "$end_time - $start_time" | bc)
    echo "$duration"
}

# Benchmark container build performance
benchmark_build() {
    log_info "Starting container build performance benchmark..."
    
    cd "$PROJECT_ROOT/.devcontainer"
    
    # Clean build (no cache)
    log_info "Running clean build (no cache)..."
    CLEAN_BUILD_TIME=$(measure_time docker buildx build --no-cache --progress=plain . 2>/dev/null)
    log_info "Clean build completed in ${CLEAN_BUILD_TIME}s"
    
    # Cached build
    log_info "Running cached build..."
    CACHED_BUILD_TIME=$(measure_time docker buildx build --progress=plain . 2>/dev/null)
    log_info "Cached build completed in ${CACHED_BUILD_TIME}s"
    
    # Calculate cache effectiveness
    if (( $(echo "$CLEAN_BUILD_TIME > 0" | bc -l) )); then
        CACHE_RATIO=$(echo "scale=2; ($CLEAN_BUILD_TIME - $CACHED_BUILD_TIME) / $CLEAN_BUILD_TIME * 100" | bc)
        log_success "Cache effectiveness: ${CACHE_RATIO}% time saved"
    fi
    
    # Check build size
    IMAGE_SIZE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "gnus-dao-devcontainer" | head -1 | awk '{print $2}')
    log_info "Container image size: ${IMAGE_SIZE}"
}

# Benchmark container pull performance
benchmark_pull() {
    log_info "Starting container pull performance benchmark..."
    
    # Clean pull (no cache)
    log_info "Testing cold pull performance..."
    docker rmi "${REGISTRY}/${IMAGE_NAME}:latest" 2>/dev/null || true
    COLD_PULL_TIME=$(measure_time docker pull "${REGISTRY}/${IMAGE_NAME}:latest" 2>/dev/null)
    log_info "Cold pull completed in ${COLD_PULL_TIME}s"
    
    # Warm pull (from cache)
    log_info "Testing warm pull performance..."
    docker rmi "${REGISTRY}/${IMAGE_NAME}:latest" 2>/dev/null || true
    WARM_PULL_TIME=$(measure_time docker pull "${REGISTRY}/${IMAGE_NAME}:latest" 2>/dev/null)
    log_info "Warm pull completed in ${WARM_PULL_TIME}s"
    
    # Calculate pull performance
    if (( $(echo "$COLD_PULL_TIME > 0" | bc -l) )); then
        PULL_IMPROVEMENT=$(echo "scale=2; ($COLD_PULL_TIME - $WARM_PULL_TIME) / $COLD_PULL_TIME * 100" | bc)
        log_success "Pull cache effectiveness: ${PULL_IMPROVEMENT}% faster"
    fi
}

# Benchmark container startup time
benchmark_startup() {
    log_info "Starting container startup performance benchmark..."
    
    # Test container startup time
    STARTUP_TIME=$(measure_time timeout 30s docker run --rm "${REGISTRY}/${IMAGE_NAME}:latest" sleep 1 2>/dev/null)
    log_info "Container startup time: ${STARTUP_TIME}s"
    
    # Test health check
    log_info "Testing health check performance..."
    HEALTH_TIME=$(measure_time timeout 60s docker run --rm "${REGISTRY}/${IMAGE_NAME}:latest" timeout 10s bash -c 'node --version && yarn --version && python3 --version' 2>/dev/null)
    log_info "Health check time: ${HEALTH_TIME}s"
}

# Analyze layer efficiency
analyze_layers() {
    log_info "Analyzing container layer efficiency..."
    
    # Get layer information
    LAYER_INFO=$(docker history "${REGISTRY}/${IMAGE_NAME}:latest" --format "table {{.Size}}\t{{.CreatedBy}}" --no-trunc | tail -n +2)
    
    # Calculate total layers
    LAYER_COUNT=$(echo "$LAYER_INFO" | wc -l)
    log_info "Total layers: $LAYER_COUNT"
    
    # Calculate largest layers
    echo "$LAYER_INFO" | sort -hr | head -5 | while read -r line; do
        log_info "Large layer: $line"
    done
}

# Generate performance report
generate_report() {
    log_info "Generating performance benchmark report..."
    
    cat > "$PROJECT_ROOT/container-performance-report.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "benchmark_version": "1.0",
    "container_image": "${REGISTRY}/${IMAGE_NAME}:latest",
    "build_performance": {
        "clean_build_time_seconds": ${CLEAN_BUILD_TIME:-0},
        "cached_build_time_seconds": ${CACHED_BUILD_TIME:-0},
        "cache_effectiveness_percent": ${CACHE_RATIO:-0}
    },
    "pull_performance": {
        "cold_pull_time_seconds": ${COLD_PULL_TIME:-0},
        "warm_pull_time_seconds": ${WARM_PULL_TIME:-0},
        "pull_improvement_percent": ${PULL_IMPROVEMENT:-0}
    },
    "runtime_performance": {
        "startup_time_seconds": ${STARTUP_TIME:-0},
        "health_check_time_seconds": ${HEALTH_TIME:-0}
    },
    "layer_analysis": {
        "total_layers": ${LAYER_COUNT:-0}
    },
    "targets": {
        "build_time_target_seconds": 300,
        "pull_time_target_seconds": 60,
        "cache_effectiveness_target_percent": 80
    },
    "compliance": {
        "build_time_ok": $(echo "${CACHED_BUILD_TIME:-999} < 300" | bc -l),
        "pull_time_ok": $(echo "${WARM_PULL_TIME:-999} < 60" | bc -l),
        "cache_effectiveness_ok": $(echo "${CACHE_RATIO:-0} > 80" | bc -l)
    }
}
