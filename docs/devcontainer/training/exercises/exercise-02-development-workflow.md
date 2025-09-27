# Exercise 2: Development Workflow

**Duration**: 20 minutes  
**Difficulty**: Beginner  
**Skills**: Code editing, compilation, testing, debugging

## Objective

Master the core development workflow: editing code, running builds, executing tests, and debugging issues within the DevContainer environment.

## Prerequisites

- Completed Exercise 1: Environment Setup
- Basic understanding of TypeScript/JavaScript
- Familiarity with VS Code interface

## Steps

### Step 1: Explore Project Structure

1. **Navigate the codebase**:
   ```bash
   # View main directories
   ls -la

   # Explore contracts
   ls contracts/gnus-dao/

   # Check test structure
   ls test/ | head -10
   ```

2. **Open key files in VS Code**:
   - `hardhat.config.ts` - Hardhat configuration
   - `contracts/gnus-dao/facets/MemberFacet.sol` - Sample contract
   - `test/unit/MemberFacet.test.ts` - Corresponding tests

### Step 2: Code Editing and Compilation

1. **Create a simple test contract**:
   ```bash
   # Create test contract directory
   mkdir -p contracts/test

   # Create a basic contract
   cat > contracts/test/SimpleStorage.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(uint256 newValue);

    function setValue(uint256 value) external {
        _value = value;
        emit ValueChanged(value);
    }

    function getValue() external view returns (uint256) {
        return _value;
    }
}
EOF
   ```

2. **Compile the contract**:
   ```bash
   npx hardhat compile
   ```

3. **Verify compilation artifacts**:
   ```bash
   ls artifacts/contracts/test/
   ```

### Step 3: Writing and Running Tests

1. **Create a test file**:
   ```bash
   cat > test/unit/SimpleStorage.test.ts << 'EOF'
import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleStorage } from "../../typechain-types";

describe("SimpleStorage", function () {
  let simpleStorage: SimpleStorage;

  beforeEach(async function () {
    const SimpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorageFactory.deploy();
    await simpleStorage.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await simpleStorage.getAddress()).to.be.properAddress;
    });

    it("Should initialize with zero value", async function () {
      expect(await simpleStorage.getValue()).to.equal(0);
    });
  });

  describe("Value Management", function () {
    it("Should set and get values correctly", async function () {
      await simpleStorage.setValue(42);
      expect(await simpleStorage.getValue()).to.equal(42);
    });

    it("Should emit ValueChanged event", async function () {
      await expect(simpleStorage.setValue(100))
        .to.emit(simpleStorage, "ValueChanged")
        .withArgs(100);
    });
  });
});
EOF
   ```

2. **Run the tests**:
   ```bash
   npx hardhat test test/unit/SimpleStorage.test.ts
   ```

3. **Run all tests**:
   ```bash
   yarn test:unit
   ```

### Step 4: Debugging and Troubleshooting

1. **Introduce a bug** (for learning purposes):
   ```bash
   # Edit the contract to add a bug
   sed -i 's/_value = value;/_value = value * 2;/' contracts/test/SimpleStorage.sol
   ```

2. **Recompile and test**:
   ```bash
   npx hardhat compile
   npx hardhat test test/unit/SimpleStorage.test.ts
   ```

3. **Debug the failing test**:
   - Look at test output for failure details
   - Check contract logic vs test expectations
   - Use VS Code debugger if needed

4. **Fix the bug**:
   ```bash
   # Restore correct logic
   sed -i 's/_value = value * 2;/_value = value;/' contracts/test/SimpleStorage.sol
   ```

5. **Verify fix**:
   ```bash
   npx hardhat compile
   npx hardhat test test/unit/SimpleStorage.test.ts
   ```

### Step 5: Code Quality Checks

1. **Run linting**:
   ```bash
   yarn lint
   ```

2. **Check code formatting**:
   ```bash
   yarn format:check
   ```

3. **Run security checks** (if available):
   ```bash
   yarn security-check
   ```

## Validation

Run this workflow validation script:

```bash
# Create validation script
cat > validate-workflow.ts << 'EOF'
import { execSync } from 'child_process';
import * as fs from 'fs';

console.log('🔍 Development Workflow Validation\n');

let score = 0;
const total = 5;

// Check contract compilation
try {
  execSync('npx hardhat compile', { stdio: 'pipe' });
  console.log('✅ Contract compilation successful');
  score++;
} catch (e) {
  console.log('❌ Contract compilation failed');
}

// Check test file exists
if (fs.existsSync('test/unit/SimpleStorage.test.ts')) {
  console.log('✅ Test file created');
  score++;
} else {
  console.log('❌ Test file missing');
}

// Run tests
try {
  const testOutput = execSync('npx hardhat test test/unit/SimpleStorage.test.ts --grep "SimpleStorage"', { stdio: 'pipe' }).toString();
  if (testOutput.includes('passing')) {
    console.log('✅ Tests passing');
    score++;
  } else {
    console.log('❌ Tests failing');
  }
} catch (e) {
  console.log('❌ Test execution failed');
}

// Check linting
try {
  execSync('yarn lint --quiet', { stdio: 'pipe' });
  console.log('✅ Code linting passed');
  score++;
} catch (e) {
  console.log('❌ Code linting failed');
}

// Check artifacts
if (fs.existsSync('artifacts/contracts/test/SimpleStorage.sol/SimpleStorage.json')) {
  console.log('✅ Compilation artifacts generated');
  score++;
} else {
  console.log('❌ Compilation artifacts missing');
}

console.log(`\n📊 Score: ${score}/${total}`);
if (score === total) {
  console.log('🎉 Development workflow validation complete!');
} else {
  console.log('⚠️  Some validations failed. Review the steps above.');
}
EOF

# Run validation
npx ts-node validate-workflow.ts
```

**Expected Output**:
```
🔍 Development Workflow Validation

✅ Contract compilation successful
✅ Test file created
✅ Tests passing
✅ Code linting passed
✅ Compilation artifacts generated

📊 Score: 5/5
🎉 Development workflow validation complete!
```

## Troubleshooting

### Issue: Compilation fails
**Symptoms**: `npx hardhat compile` returns errors
**Solutions**:
- Check Solidity syntax in contract files
- Verify pragma version compatibility
- Look for missing imports or dependencies

### Issue: Tests fail unexpectedly
**Symptoms**: Tests pass locally but fail in CI
**Solutions**:
- Check test setup and teardown
- Verify contract deployment in tests
- Review async/await usage
- Check for race conditions

### Issue: Linting errors
**Symptoms**: `yarn lint` shows style violations
**Solutions**:
- Run `yarn format` to auto-fix formatting
- Review ESLint rules in `.eslintrc.js`
- Check for unused imports or variables

### Issue: Security check failures
**Symptoms**: `yarn security-check` reports issues
**Solutions**:
- Review Slither output for vulnerabilities
- Check contract patterns against best practices
- Address any high-severity findings

## Next Steps

With the development workflow mastered:

1. **Proceed to Exercise 3**: [Smart Contract Development](./exercise-03-smart-contract-development.md)
2. **Explore advanced testing**: Look at `test/integration/` directory
3. **Try debugging**: Use VS Code debugger with Hardhat

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Chai Testing Library](https://www.chaijs.com/)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)

---

**Success Criteria**: All workflow validations pass, contract compiles successfully, tests run and pass, code quality checks pass.