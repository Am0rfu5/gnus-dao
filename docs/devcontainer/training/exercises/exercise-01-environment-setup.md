# Exercise 1: Environment Setup

**Duration**: 15 minutes  
**Difficulty**: Beginner  
**Skills**: Basic DevContainer operations, environment validation

## Objective

Initialize and validate your DevContainer environment, ensuring all dependencies are properly installed and configured for GNUS-DAO development.

## Prerequisites

- VS Code with Dev Containers extension installed
- GitHub account with access to GNUS-DAO repository
- Basic familiarity with command line operations

## Steps

### Step 1: Open in DevContainer

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/your-org/gnus-dao.git
   cd gnus-dao
   ```

2. **Open in VS Code**:
   - Launch VS Code
   - Open the cloned `gnus-dao` folder
   - When prompted "Folder contains a Dev Container configuration", click "Reopen in Container"

3. **Wait for container setup**:
   - The DevContainer will build and start (this may take 2-5 minutes)
   - Watch the terminal output for any setup messages

### Step 2: Verify Environment

1. **Check Node.js and Yarn**:
   ```bash
   node --version
   yarn --version
   ```

2. **Verify Hardhat installation**:
   ```bash
   npx hardhat --version
   ```

3. **Check Solidity compiler**:
   ```bash
   npx hardhat compile --help | head -5
   ```

### Step 3: Install Dependencies

1. **Install project dependencies**:
   ```bash
   yarn install
   ```

2. **Verify installation success**:
   ```bash
   yarn list --depth=0 | head -10
   ```

### Step 4: Run Initial Tests

1. **Execute a basic test**:
   ```bash
   yarn test:unit --grep "should deploy"
   ```

2. **Check test results**:
   - Look for "passing" indicators
   - Note any failures for troubleshooting

### Step 5: Validate Configuration

1. **Check Hardhat configuration**:
   ```bash
   npx hardhat run scripts/utils/health-check.ts
   ```

2. **Verify diamond configuration**:
   ```bash
   cat diamonds/gnusdaodiamond.config.json | head -10
   ```

## Validation

Run this comprehensive validation script:

```bash
# Create validation script
cat > validate-setup.ts << 'EOF'
import { execSync } from 'child_process';
import * as fs from 'fs';

console.log('🔍 DevContainer Environment Validation\n');

// Check Node.js
try {
  const nodeVersion = execSync('node --version').toString().trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
} catch (e) {
  console.log('❌ Node.js not found');
}

// Check Yarn
try {
  const yarnVersion = execSync('yarn --version').toString().trim();
  console.log(`✅ Yarn: ${yarnVersion}`);
} catch (e) {
  console.log('❌ Yarn not found');
}

// Check Hardhat
try {
  execSync('npx hardhat --version');
  console.log('✅ Hardhat available');
} catch (e) {
  console.log('❌ Hardhat not available');
}

// Check dependencies
if (fs.existsSync('node_modules')) {
  console.log('✅ Dependencies installed');
} else {
  console.log('❌ Dependencies missing');
}

// Check diamond config
if (fs.existsSync('diamonds/gnusdaodiamond.config.json')) {
  console.log('✅ Diamond configuration present');
} else {
  console.log('❌ Diamond configuration missing');
}

console.log('\n🎉 Environment validation complete!');
EOF

# Run validation
npx ts-node validate-setup.ts
```

**Expected Output**:
```
🔍 DevContainer Environment Validation

✅ Node.js: v18.x.x
✅ Yarn: 1.x.x
✅ Hardhat available
✅ Dependencies installed
✅ Diamond configuration present

🎉 Environment validation complete!
```

## Troubleshooting

### Issue: DevContainer fails to build
**Symptoms**: Container build fails with errors
**Solutions**:
- Check internet connection
- Clear Docker cache: `docker system prune -a`
- Rebuild container: Ctrl+Shift+P → "Dev Containers: Rebuild Container"

### Issue: Dependencies installation fails
**Symptoms**: `yarn install` fails
**Solutions**:
- Clear yarn cache: `yarn cache clean`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `yarn install`

### Issue: Hardhat commands fail
**Symptoms**: `npx hardhat` returns errors
**Solutions**:
- Check if in correct directory: `pwd`
- Verify hardhat.config.ts exists: `ls hardhat.config.ts`
- Check Node.js version compatibility

### Issue: Tests fail to run
**Symptoms**: `yarn test` fails
**Solutions**:
- Ensure dependencies are installed
- Check if Hardhat network is running
- Review test configuration in package.json

## Next Steps

With your environment validated:

1. **Proceed to Exercise 2**: [Development Workflow](./exercise-02-development-workflow.md)
2. **Explore the codebase**: Look at `contracts/gnus-dao/` directory
3. **Run the interactive walkthrough**: `yarn devcontainer:walkthrough`

## Additional Resources

- [Quick Start Guide](../quick-start/README.md)
- [Complete Setup Guide](../setup/complete-setup-guide.md)
- [Troubleshooting Guide](../troubleshooting/common-issues.md)

---

**Success Criteria**: All validation checks pass, dependencies installed, basic tests run successfully.