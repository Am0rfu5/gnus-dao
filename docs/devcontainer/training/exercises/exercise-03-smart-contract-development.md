# Exercise 3: Smart Contract Development

**Duration**: 25 minutes  
**Difficulty**: Intermediate  
**Skills**: Solidity development, Hardhat integration, contract deployment

## Objective

Develop, test, and deploy smart contracts using the GNUS-DAO development environment, following security-first principles and diamond architecture patterns.

## Prerequisites

- Completed Exercises 1 & 2
- Basic Solidity knowledge
- Understanding of ERC standards

## Steps

### Step 1: Explore GNUS-DAO Architecture

1. **Examine the diamond structure**:
   ```bash
   # View diamond configuration
   cat diamonds/gnusdaodiamond.config.json

   # List available facets
   ls contracts/gnus-dao/facets/
   ```

2. **Study existing facets**:
   ```bash
   # Look at a sample facet
   head -50 contracts/gnus-dao/facets/MemberFacet.sol

   # Check the diamond implementation
   head -30 contracts/gnus-dao/GNUSDAODiamond.sol
   ```

### Step 2: Create a New Facet

1. **Design a simple voting facet**:
   ```bash
   cat > contracts/gnus-dao/facets/VotingFacet.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { LibDiamond } from "../libraries/LibDiamond.sol";
import { IGovernance } from "../interfaces/IGovernance.sol";

contract VotingFacet is IGovernance {
    // Storage position for voting data
    bytes32 constant VOTING_STORAGE_POSITION = keccak256("gnus.dao.voting.storage");

    struct VotingStorage {
        mapping(bytes32 => Proposal) proposals;
        mapping(bytes32 => mapping(address => bool)) votes;
        uint256 proposalCount;
    }

    struct Proposal {
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    event ProposalCreated(bytes32 indexed proposalId, address indexed proposer, string description);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, bool support);

    modifier onlyMember() {
        // In a real implementation, check membership
        require(msg.sender != address(0), "Not a member");
        _;
    }

    function votingStorage() internal pure returns (VotingStorage storage vs) {
        bytes32 position = VOTING_STORAGE_POSITION;
        assembly {
            vs.slot := position
        }
    }

    function createProposal(string calldata description, uint256 duration) external onlyMember returns (bytes32) {
        VotingStorage storage vs = votingStorage();

        bytes32 proposalId = keccak256(abi.encodePacked(description, block.timestamp, msg.sender));
        require(vs.proposals[proposalId].proposer == address(0), "Proposal already exists");

        vs.proposals[proposalId] = Proposal({
            description: description,
            proposer: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            yesVotes: 0,
            noVotes: 0,
            executed: false
        });

        vs.proposalCount++;

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    function castVote(bytes32 proposalId, bool support) external onlyMember {
        VotingStorage storage vs = votingStorage();

        require(vs.proposals[proposalId].proposer != address(0), "Proposal does not exist");
        require(block.timestamp >= vs.proposals[proposalId].startTime, "Voting not started");
        require(block.timestamp <= vs.proposals[proposalId].endTime, "Voting ended");
        require(!vs.votes[proposalId][msg.sender], "Already voted");

        vs.votes[proposalId][msg.sender] = true;

        if (support) {
            vs.proposals[proposalId].yesVotes++;
        } else {
            vs.proposals[proposalId].noVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    function getProposal(bytes32 proposalId) external view returns (
        string memory description,
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed
    ) {
        VotingStorage storage vs = votingStorage();
        Proposal memory proposal = vs.proposals[proposalId];

        return (
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.executed
        );
    }

    function getProposalCount() external view returns (uint256) {
        return votingStorage().proposalCount;
    }
}
EOF
   ```

2. **Create the interface**:
   ```bash
   cat > contracts/gnus-dao/interfaces/IGovernance.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGovernance {
    function createProposal(string calldata description, uint256 duration) external returns (bytes32);
    function castVote(bytes32 proposalId, bool support) external;
    function getProposal(bytes32 proposalId) external view returns (
        string memory description,
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed
    );
    function getProposalCount() external view returns (uint256);

    event ProposalCreated(bytes32 indexed proposalId, address indexed proposer, string description);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, bool support);
}
EOF
   ```

### Step 3: Write Comprehensive Tests

1. **Create facet tests**:
   ```bash
   cat > test/unit/VotingFacet.test.ts << 'EOF'
import { expect } from "chai";
import { ethers } from "hardhat";
import { VotingFacet } from "../../typechain-types";
import { deployDiamond } from "../utils/deploy-diamond";

describe("VotingFacet", function () {
  let votingFacet: VotingFacet;
  let owner: any;
  let member1: any;
  let member2: any;

  beforeEach(async function () {
    [owner, member1, member2] = await ethers.getSigners();

    // Deploy diamond with VotingFacet
    const diamondAddress = await deployDiamond(["VotingFacet"]);

    // Get VotingFacet instance
    votingFacet = await ethers.getContractAt("VotingFacet", diamondAddress);
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal successfully", async function () {
      const description = "Test proposal for voting";
      const duration = 3600; // 1 hour

      await expect(votingFacet.connect(member1).createProposal(description, duration))
        .to.emit(votingFacet, "ProposalCreated");

      expect(await votingFacet.getProposalCount()).to.equal(1);
    });

    it("Should prevent duplicate proposals", async function () {
      const description = "Duplicate proposal";
      const duration = 3600;

      await votingFacet.connect(member1).createProposal(description, duration);

      await expect(
        votingFacet.connect(member1).createProposal(description, duration)
      ).to.be.revertedWith("Proposal already exists");
    });

    it("Should store proposal data correctly", async function () {
      const description = "Test proposal";
      const duration = 3600;

      const tx = await votingFacet.connect(member1).createProposal(description, duration);
      const receipt = await tx.wait();

      // Extract proposal ID from event
      const event = receipt.logs.find((log: any) => log.eventName === "ProposalCreated");
      const proposalId = event.args.proposalId;

      const proposal = await votingFacet.getProposal(proposalId);

      expect(proposal.description).to.equal(description);
      expect(proposal.proposer).to.equal(member1.address);
      expect(proposal.executed).to.equal(false);
    });
  });

  describe("Voting", function () {
    let proposalId: string;

    beforeEach(async function () {
      const description = "Voting test proposal";
      const duration = 3600;

      const tx = await votingFacet.connect(member1).createProposal(description, duration);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.eventName === "ProposalCreated");
      proposalId = event.args.proposalId;
    });

    it("Should allow voting on active proposals", async function () {
      await expect(votingFacet.connect(member2).castVote(proposalId, true))
        .to.emit(votingFacet, "VoteCast")
        .withArgs(proposalId, member2.address, true);

      const proposal = await votingFacet.getProposal(proposalId);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(0);
    });

    it("Should prevent double voting", async function () {
      await votingFacet.connect(member2).castVote(proposalId, true);

      await expect(
        votingFacet.connect(member2).castVote(proposalId, false)
      ).to.be.revertedWith("Already voted");
    });

    it("Should track yes and no votes separately", async function () {
      await votingFacet.connect(member1).castVote(proposalId, true);
      await votingFacet.connect(member2).castVote(proposalId, false);

      const proposal = await votingFacet.getProposal(proposalId);
      expect(proposal.yesVotes).to.equal(1);
      expect(proposal.noVotes).to.equal(1);
    });
  });

  describe("Security", function () {
    it("Should require valid member for proposal creation", async function () {
      // This would be more comprehensive with actual membership checks
      await expect(
        votingFacet.connect(ethers.ZeroAddress).createProposal("Test", 3600)
      ).to.be.revertedWith("Not a member");
    });

    it("Should validate proposal exists before voting", async function () {
      const fakeProposalId = ethers.keccak256(ethers.toUtf8Bytes("fake"));

      await expect(
        votingFacet.connect(member1).castVote(fakeProposalId, true)
      ).to.be.revertedWith("Proposal does not exist");
    });
  });
});
EOF
   ```

2. **Run the tests**:
   ```bash
   npx hardhat test test/unit/VotingFacet.test.ts
   ```

### Step 4: Deploy and Verify

1. **Update diamond configuration**:
   ```bash
   # Add VotingFacet to diamond config
   cat >> diamonds/gnusdaodiamond.config.json << 'EOF'
   ,
   {
     "name": "VotingFacet",
     "contract": "contracts/gnus-dao/facets/VotingFacet.sol:VotingFacet",
     "initArgs": []
   }
EOF
   ```

2. **Deploy locally**:
   ```bash
   npx hardhat run scripts/deploy/local.ts
   ```

3. **Verify deployment**:
   ```bash
   # Check if facet is available
   npx hardhat run scripts/utils/verify-facets.ts
   ```

## Validation

Run this contract development validation:

```bash
# Create validation script
cat > validate-contract-dev.ts << 'EOF'
import { execSync } from 'child_process';
import * as fs from 'fs';

console.log('🔍 Smart Contract Development Validation\n');

let score = 0;
const total = 6;

// Check contract files exist
if (fs.existsSync('contracts/gnus-dao/facets/VotingFacet.sol')) {
  console.log('✅ VotingFacet contract created');
  score++;
} else {
  console.log('❌ VotingFacet contract missing');
}

if (fs.existsSync('contracts/gnus-dao/interfaces/IGovernance.sol')) {
  console.log('✅ IGovernance interface created');
  score++;
} else {
  console.log('❌ IGovernance interface missing');
}

// Check compilation
try {
  execSync('npx hardhat compile', { stdio: 'pipe' });
  console.log('✅ Contracts compile successfully');
  score++;
} catch (e) {
  console.log('❌ Contract compilation failed');
}

// Check test file
if (fs.existsSync('test/unit/VotingFacet.test.ts')) {
  console.log('✅ Test file created');
  score++;
} else {
  console.log('❌ Test file missing');
}

// Run tests
try {
  const testOutput = execSync('npx hardhat test test/unit/VotingFacet.test.ts', { stdio: 'pipe' }).toString();
  if (testOutput.includes('passing') && !testOutput.includes('failing')) {
    console.log('✅ Tests pass');
    score++;
  } else {
    console.log('❌ Tests failing');
  }
} catch (e) {
  console.log('❌ Test execution failed');
}

// Check diamond config updated
const configContent = fs.readFileSync('diamonds/gnusdaodiamond.config.json', 'utf8');
if (configContent.includes('VotingFacet')) {
  console.log('✅ Diamond configuration updated');
  score++;
} else {
  console.log('❌ Diamond configuration not updated');
}

console.log(`\n📊 Score: ${score}/${total}`);
if (score === total) {
  console.log('🎉 Smart contract development validation complete!');
} else {
  console.log('⚠️  Some validations failed. Review the steps above.');
}
EOF

# Run validation
npx ts-node validate-contract-dev.ts
```

**Expected Output**:
```
🔍 Smart Contract Development Validation

✅ VotingFacet contract created
✅ IGovernance interface created
✅ Contracts compile successfully
✅ Test file created
✅ Tests pass
✅ Diamond configuration updated

📊 Score: 6/6
🎉 Smart contract development validation complete!
```

## Troubleshooting

### Issue: Contract compilation fails
**Symptoms**: Syntax errors or import issues
**Solutions**:
- Check Solidity syntax and version compatibility
- Verify all imports are correct
- Ensure interface methods match implementation

### Issue: Tests fail with deployment errors
**Symptoms**: Diamond deployment issues
**Solutions**:
- Check diamond configuration syntax
- Verify facet contract addresses
- Review deployment script logs

### Issue: Interface mismatches
**Symptoms**: Type errors in tests
**Solutions**:
- Ensure interface methods match facet implementation
- Check function signatures and return types
- Regenerate TypeChain types after changes

### Issue: Gas estimation failures
**Symptoms**: Transaction simulation fails
**Solutions**:
- Review contract logic for infinite loops
- Check for uninitialized variables
- Verify access control modifiers

## Next Steps

With smart contract development skills:

1. **Proceed to Exercise 4**: [Diamond Architecture](./exercise-04-diamond-architecture.md)
2. **Explore existing facets**: Study `contracts/gnus-dao/facets/`
3. **Try upgrading**: Experiment with facet upgrades

## Additional Resources

- [ERC-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [GNUS-DAO Architecture Docs](../architecture/README.md)

---

**Success Criteria**: VotingFacet created and tested, integrates with diamond architecture, all validations pass.