#!/bin/bash

# scripts/devops/gh-devcon/analyze-reproducibility-issues.sh
# Analyze reproducibility test results for non-deterministic behavior

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REPRODUCIBILITY_FILE="${PROJECT_ROOT}/reproducibility-results.json"
OUTPUT_FILE="${PROJECT_ROOT}/reproducibility-analysis.md"
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --input=*)
      REPRODUCIBILITY_FILE="${1#*=}"
      shift
      ;;
    --output=*)
      OUTPUT_FILE="${1#*=}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--input=file.json] [--output=file.md] [--verbose]"
      echo ""
      echo "Analyze reproducibility test results for non-deterministic behavior"
      echo ""
      echo "Options:"
      echo "  --input=file.json    Path to reproducibility results JSON file"
      echo "  --output=file.md     Path to output analysis markdown file"
      echo "  --verbose           Enable verbose output"
      echo "  --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if reproducibility file exists
if [[ ! -f "$REPRODUCIBILITY_FILE" ]]; then
  echo -e "${RED}Error: Reproducibility results file not found: $REPRODUCIBILITY_FILE${NC}"
  exit 1
fi

echo "Analyzing reproducibility results from: $REPRODUCIBILITY_FILE"

# Function to extract JSON values
extract_json() {
  local key="$1"
  jq -r "$key" "$REPRODUCIBILITY_FILE" 2>/dev/null || echo ""
}

# Function to check if value is numeric
is_numeric() {
  [[ "$1" =~ ^[0-9]*\.?[0-9]+$ ]]
}

# Extract basic information
TIMESTAMP=$(extract_json '.timestamp')
ITERATIONS=$(extract_json '.test_iterations')
OVERALL_REPRODUCIBLE=$(extract_json '.overall_reproducible')
REPRODUCIBILITY_PERCENTAGE=$(extract_json '.reproducibility_percentage')

echo "Found $ITERATIONS test iterations from $TIMESTAMP"

# Analyze environment fingerprints
echo "Analyzing environment fingerprints..."
ENVIRONMENT_HASHES=$(jq -r '.iterations[].environment_fingerprint.hash // empty' "$REPRODUCIBILITY_FILE" | grep -v '^$')
UNIQUE_ENV_HASHES=$(echo "$ENVIRONMENT_HASHES" | sort | uniq | wc -l)
TOTAL_ENV_HASHES=$(echo "$ENVIRONMENT_HASHES" | wc -l)

# Analyze build artifacts
echo "Analyzing build artifacts..."
ARTIFACT_COMPILE_TIMES=$(jq -r '.iterations[].build_artifacts.compile_time // empty' "$REPRODUCIBILITY_FILE" | grep -v '^$')
UNIQUE_COMPILE_TIMES=$(echo "$ARTIFACT_COMPILE_TIMES" | sort | uniq | wc -l)
TOTAL_COMPILE_TIMES=$(echo "$ARTIFACT_COMPILE_TIMES" | wc -l)

# Analyze performance metrics
echo "Analyzing performance metrics..."
CPU_PERFORMANCES=$(jq -r '.iterations[].performance_metrics.cpu_iterations_per_ms // empty' "$REPRODUCIBILITY_FILE" | grep -v '^$')
MEMORY_USAGES=$(jq -r '.iterations[].performance_metrics.memory_heap_used // empty' "$REPRODUCIBILITY_FILE" | grep -v '^$')
IO_PERFORMANCES=$(jq -r '.iterations[].performance_metrics.io_time_ns // empty' "$REPRODUCIBILITY_FILE" | grep -v '^$')

# Calculate performance variations
calculate_variation() {
  local values="$1"
  local count=$(echo "$values" | wc -l)

  if [[ $count -lt 2 ]]; then
    echo "N/A"
    return
  fi

  local sum=0
  local valid_count=0

  while IFS= read -r value; do
    if is_numeric "$value"; then
      sum=$(echo "$sum + $value" | bc -l 2>/dev/null || echo "$sum")
      ((valid_count++))
    fi
  done <<< "$values"

  if [[ $valid_count -lt 2 ]]; then
    echo "N/A"
    return
  fi

  local avg=$(echo "scale=2; $sum / $valid_count" | bc -l 2>/dev/null || echo "0")

  local variance_sum=0
  while IFS= read -r value; do
    if is_numeric "$value"; then
      local diff=$(echo "$value - $avg" | bc -l 2>/dev/null || echo "0")
      local squared=$(echo "$diff * $diff" | bc -l 2>/dev/null || echo "0")
      variance_sum=$(echo "$variance_sum + $squared" | bc -l 2>/dev/null || echo "$variance_sum")
    fi
  done <<< "$values"

  local variance=$(echo "scale=2; $variance_sum / $valid_count" | bc -l 2>/dev/null || echo "0")
  local stddev=$(echo "scale=2; sqrt($variance)" | bc -l 2>/dev/null || echo "0")

  # Calculate coefficient of variation (CV)
  if [[ $(echo "$avg > 0" | bc -l 2>/dev/null) -eq 1 ]]; then
    local cv=$(echo "scale=2; ($stddev / $avg) * 100" | bc -l 2>/dev/null || echo "0")
    echo "${cv}%"
  else
    echo "N/A"
  fi
}

CPU_VARIATION=$(calculate_variation "$CPU_PERFORMANCES")
MEMORY_VARIATION=$(calculate_variation "$MEMORY_USAGES")
IO_VARIATION=$(calculate_variation "$IO_PERFORMANCES")

# Analyze errors
ERROR_COUNT=$(jq '.iterations[] | select(.errors | length > 0) | .errors | length' "$REPRODUCIBILITY_FILE" | awk '{sum += $1} END {print sum+0}')

# Generate analysis report
cat > "$OUTPUT_FILE" << EOF
# Reproducibility Analysis Report

## 📊 Summary

**Analysis Date**: $(date -Iseconds)  
**Source File**: $(basename "$REPRODUCIBILITY_FILE")  
**Test Iterations**: $ITERATIONS  
**Overall Reproducible**: $([[ "$OVERALL_REPRODUCIBLE" == "true" ]] && echo "✅ YES" || echo "❌ NO")  
**Reproducibility Score**: ${REPRODUCIBILITY_PERCENTAGE}%

## 🔍 Detailed Analysis

### Environment Consistency
- **Environment Fingerprints**: $UNIQUE_ENV_HASHES unique out of $TOTAL_ENV_HASHES total
EOF

if [[ $UNIQUE_ENV_HASHES -eq 1 ]]; then
  echo "- **Status**: ✅ Environment is consistent across all iterations" >> "$OUTPUT_FILE"
elif [[ $UNIQUE_ENV_HASHES -eq $TOTAL_ENV_HASHES ]]; then
  echo "- **Status**: ❌ Environment varies in every iteration" >> "$OUTPUT_FILE"
else
  echo "- **Status**: ⚠️ Environment varies between some iterations" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

### Build Artifact Consistency
- **Compile Times**: $UNIQUE_COMPILE_TIMES unique out of $TOTAL_COMPILE_TIMES total
EOF

if [[ $UNIQUE_COMPILE_TIMES -eq 1 ]]; then
  echo "- **Status**: ✅ Build times are consistent" >> "$OUTPUT_FILE"
else
  echo "- **Status**: ⚠️ Build times vary between iterations" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

### Performance Consistency
- **CPU Performance Variation**: $CPU_VARIATION
- **Memory Usage Variation**: $MEMORY_VARIATION
- **I/O Performance Variation**: $IO_VARIATION
EOF

# Analyze performance variations
if [[ "$CPU_VARIATION" != "N/A" && $(echo "$CPU_VARIATION < 10" | bc -l 2>/dev/null || echo "1") -eq 1 ]]; then
  echo "- **CPU Status**: ✅ CPU performance is stable" >> "$OUTPUT_FILE"
else
  echo "- **CPU Status**: ⚠️ CPU performance varies significantly" >> "$OUTPUT_FILE"
fi

if [[ "$MEMORY_VARIATION" != "N/A" && $(echo "$MEMORY_VARIATION < 5" | bc -l 2>/dev/null || echo "1") -eq 1 ]]; then
  echo "- **Memory Status**: ✅ Memory usage is stable" >> "$OUTPUT_FILE"
else
  echo "- **Memory Status**: ⚠️ Memory usage varies significantly" >> "$OUTPUT_FILE"
fi

if [[ "$IO_VARIATION" != "N/A" && $(echo "$IO_VARIATION < 20" | bc -l 2>/dev/null || echo "1") -eq 1 ]]; then
  echo "- **I/O Status**: ✅ I/O performance is stable" >> "$OUTPUT_FILE"
else
  echo "- **I/O Status**: ⚠️ I/O performance varies significantly" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

### Error Analysis
- **Total Errors**: $ERROR_COUNT
EOF

if [[ $ERROR_COUNT -eq 0 ]]; then
  echo "- **Status**: ✅ No errors occurred during testing" >> "$OUTPUT_FILE"
else
  echo "- **Status**: ❌ Errors occurred during testing" >> "$OUTPUT_FILE"
fi

# Extract non-deterministic factors
NON_DETERMINISTIC_FACTORS=$(extract_json '.non_deterministic_factors[] // empty' | grep -v '^$')

cat >> "$OUTPUT_FILE" << EOF

## 🚨 Non-Deterministic Factors

EOF

if [[ -z "$NON_DETERMINISTIC_FACTORS" ]]; then
  echo "✅ No non-deterministic factors detected" >> "$OUTPUT_FILE"
else
  echo "$NON_DETERMINISTIC_FACTORS" | while IFS= read -r factor; do
    echo "- $factor" >> "$OUTPUT_FILE"
  done
fi

# Extract recommendations
RECOMMENDATIONS=$(extract_json '.recommendations[] // empty' | grep -v '^$')

cat >> "$OUTPUT_FILE" << EOF

## 🔧 Recommendations

EOF

if [[ -z "$RECOMMENDATIONS" ]]; then
  echo "✅ No specific recommendations" >> "$OUTPUT_FILE"
else
  echo "$RECOMMENDATIONS" | while IFS= read -r rec; do
    echo "- $rec" >> "$OUTPUT_FILE"
  done
fi

# Additional analysis based on findings
cat >> "$OUTPUT_FILE" << EOF

## 📈 Additional Analysis

EOF

# Environment analysis
if [[ $UNIQUE_ENV_HASHES -gt 1 ]]; then
  cat >> "$OUTPUT_FILE" << EOF
### Environment Drift
The environment fingerprint varies between test iterations. This could indicate:
- System resource contention affecting performance measurements
- Time-based variations in system state
- Network connectivity fluctuations
- Background processes affecting system metrics

**Recommendation**: Run tests in a more controlled environment with minimal background activity.

EOF
fi

# Performance analysis
if [[ "$CPU_VARIATION" != "N/A" && $(echo "$CPU_VARIATION > 15" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
  cat >> "$OUTPUT_FILE" << EOF
### CPU Performance Variation
High CPU performance variation detected. This could indicate:
- CPU frequency scaling or thermal throttling
- Competing processes on the system
- Inconsistent test timing
- Hardware-level variations

**Recommendation**: Pin CPU frequency, run tests with high priority, or use dedicated test hardware.

EOF
fi

if [[ "$MEMORY_VARIATION" != "N/A" && $(echo "$MEMORY_VARIATION > 10" | bc -l 2>/dev/null || echo "0") -eq 1 ]]; then
  cat >> "$OUTPUT_FILE" << EOF
### Memory Usage Variation
High memory usage variation detected. This could indicate:
- Garbage collection timing variations
- Memory fragmentation differences
- Different allocation patterns between runs
- System memory pressure

**Recommendation**: Pre-warm the application, stabilize garbage collection, or increase available memory.

EOF
fi

# Build time analysis
if [[ $UNIQUE_COMPILE_TIMES -gt 1 ]]; then
  cat >> "$OUTPUT_FILE" << EOF
### Build Time Variation
Build times vary between iterations. This could indicate:
- File system caching effects
- Network dependency resolution variations
- CPU/memory contention during builds
- Non-deterministic build processes

**Recommendation**: Use deterministic build tools, pre-cache dependencies, or isolate build processes.

EOF
fi

cat >> "$OUTPUT_FILE" << EOF
## ✅ Conclusion

EOF

if [[ "$OVERALL_REPRODUCIBLE" == "true" ]]; then
  cat >> "$OUTPUT_FILE" << EOF
The build process demonstrates good reproducibility with a score of ${REPRODUCIBILITY_PERCENTAGE}%. The system is suitable for production use with the noted minor variations.

EOF
else
  cat >> "$OUTPUT_FILE" << EOF
The build process shows reproducibility issues with a score of ${REPRODUCIBILITY_PERCENTAGE}%. Address the identified non-deterministic factors before production deployment.

EOF
fi

cat >> "$OUTPUT_FILE" << EOF
**Analysis completed**: $(date -Iseconds)
**Analysis script**: $(basename "$0")

---
*Reproducibility Analysis Report - Generated by GNUS-DAO DevOps*
EOF

echo -e "${GREEN}Reproducibility analysis completed${NC}"
echo "Report saved to: $OUTPUT_FILE"

# Print summary to console
echo ""
echo "=== REPRODUCIBILITY ANALYSIS SUMMARY ==="
echo "Overall Reproducible: $([[ "$OVERALL_REPRODUCIBLE" == "true" ]] && echo "✅ YES" || echo "❌ NO")"
echo "Reproducibility Score: ${REPRODUCIBILITY_PERCENTAGE}%"
echo "Environment Consistency: $UNIQUE_ENV_HASHES/$TOTAL_ENV_HASHES unique fingerprints"
echo "Build Consistency: $UNIQUE_COMPILE_TIMES/$TOTAL_COMPILE_TIMES unique compile times"
echo "Errors: $ERROR_COUNT"
echo ""
echo "Detailed report: $OUTPUT_FILE"

# Exit with appropriate code
if [[ "$OVERALL_REPRODUCIBLE" == "true" ]]; then
  exit 0
else
  exit 1
fi