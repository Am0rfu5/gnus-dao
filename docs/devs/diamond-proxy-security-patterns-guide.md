# Diamond Proxy Security Patterns Guide

## Overview

This guide covers security patterns and best practices specific to ERC-2535 Diamond Proxy implementation in GNUS-DAO. Diamond proxies introduce unique security considerations that differ from traditional smart contract development.

## 🔷 Diamond Architecture Fundamentals

### Understanding Diamond Storage

**Diamond Storage Pattern:**
```solidity
// ✅ Correct: Use diamond storage pattern
contract GNUSDAODiamondStorage {
    struct DiamondStorage {
        address owner;
        mapping(bytes4 => address) facets;
        mapping(address => bytes4[]) facetSelectors;
        mapping(bytes4 => bool) supportedInterfaces;
    }

    function ds() internal pure returns (DiamondStorage storage diamondStorage) {
        bytes32 position = keccak256("gnus.dao.diamond.storage");
        assembly {
            diamondStorage.slot := position
        }
    }
}
```

**Storage Collision Prevention:**
```solidity
// ❌ Dangerous: Direct state variables can collide
contract VulnerableFacet {
    address public owner; // Collides with diamond storage!
}

// ✅ Safe: Use diamond storage pattern
contract SecureFacet is GNUSDAODiamondStorage {
    function getOwner() external view returns (address) {
        return ds().owner;
    }
}
```

### Facet Isolation

**Facet Responsibility Separation:**
```solidity
// ✅ Good: Single responsibility facets
contract GNUSDAOAccessControlFacet {
    // Only access control functions
    function grantRole(bytes32 role, address account) external { /* ... */ }
    function revokeRole(bytes32 role, address account) external { /* ... */ }
}

contract GNUSDAOTreasuryFacet {
    // Only treasury functions
    function deposit(uint256 amount) external payable { /* ... */ }
    function withdraw(uint256 amount) external { /* ... */ }
}
```

## 🛡️ Selector Collision Security

### Understanding Selector Collisions

**What is a Selector Collision?**
A selector collision occurs when two different functions have the same 4-byte function selector, causing one function to override another.

**Detection:**
```typescript
// Check for selector collisions before adding facets
const selectors = await diamondLoupeFacet.facets();
const newSelectors = getSelectors(newFacet);

for (const newSelector of newSelectors) {
    const existing = selectors.find(f =>
        f.functionSelectors.includes(newSelector)
    );
    if (existing) {
        throw new Error(`Selector collision: ${newSelector} in ${existing.facetAddress}`);
    }
}
```

### Prevention Strategies

**1. Function Naming Conventions:**
```solidity
// ✅ Good: Use descriptive, unique function names
contract GNUSDAOAccessControlFacet {
    function gnusDAOGrantRole(bytes32 role, address account) external;
    function gnusDAORevokeRole(bytes32 role, address account) external;
    function gnusDAOHasRole(bytes32 role, address account) external view returns (bool);
}

contract GNUSDAOTreasuryFacet {
    function gnusDAODeposit(uint256 amount) external payable;
    function gnusDAOWithdraw(uint256 amount) external;
    function gnusDAOGetBalance() external view returns (uint256);
}
```

**2. Namespace Prefixes:**
```solidity
// Use consistent prefixes for all functions
contract GNUSDAOGovernanceFacet {
    function gnusDAOPropose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) external returns (uint256);
    function gnusDAOExecute(uint256 proposalId) external payable;
    function gnusDAOGetProposal(uint256 proposalId) external view returns (Proposal memory);
}
```

## 🔄 Upgrade Security

### Safe Upgrade Patterns

**Upgrade Validation:**
```typescript
// Validate upgrade before execution
async function validateUpgrade(diamondAddress: string, newFacet: string, selectors: string[]) {
    // 1. Check facet code is not empty
    const code = await ethers.provider.getCode(newFacet);
    if (code === '0x') throw new Error('Facet has no code');

    // 2. Check selectors don't collide
    const diamondLoupe = await ethers.getContractAt('IDiamondLoupe', diamondAddress);
    const facets = await diamondLoupe.facets();

    for (const selector of selectors) {
        const existing = facets.find(f => f.functionSelectors.includes(selector));
        if (existing && existing.facetAddress !== ethers.ZeroAddress) {
            throw new Error(`Selector collision: ${selector}`);
        }
    }

    // 3. Test upgrade in isolated environment
    console.log('✅ Upgrade validation passed');
}
```

**Timelock for Critical Upgrades:**
```solidity
contract GNUSDAOTimelockFacet is GNUSDAODiamondStorage {
    struct UpgradeRequest {
        address facet;
        bytes4[] selectors;
        uint256 eta; // Execution time
        bool executed;
    }

    mapping(bytes32 => UpgradeRequest) public upgradeRequests;

    function scheduleUpgrade(address facet, bytes4[] memory selectors, uint256 delay) external {
        require(ds().admin == msg.sender, "Unauthorized");

        bytes32 upgradeId = keccak256(abi.encode(facet, selectors, block.timestamp));
        upgradeRequests[upgradeId] = UpgradeRequest({
            facet: facet,
            selectors: selectors,
            eta: block.timestamp + delay,
            executed: false
        });

        emit UpgradeScheduled(upgradeId, facet, selectors, block.timestamp + delay);
    }

    function executeUpgrade(bytes32 upgradeId) external {
        UpgradeRequest storage request = upgradeRequests[upgradeId];
        require(block.timestamp >= request.eta, "Timelock not expired");
        require(!request.executed, "Already executed");

        // Execute upgrade via diamond cut
        IDiamondCut(address(this)).diamondCut(
            request.selectors.map(s => FacetCut({
                facetAddress: request.facet,
                action: FacetCutAction.Add,
                functionSelectors: [s]
            })),
            address(0),
            ""
        );

        request.executed = true;
        emit UpgradeExecuted(upgradeId);
    }
}
```

### Rollback Mechanisms

**Emergency Pause:**
```solidity
contract GNUSDAOEmergencyFacet is GNUSDAODiamondStorage {
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    function emergencyPause() external {
        require(ds().admin == msg.sender || ds().emergencyAdmin == msg.sender, "Unauthorized");
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    function emergencyUnpause() external {
        require(ds().admin == msg.sender, "Unauthorized");
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }
}
```

## 🔐 Access Control in Diamonds

### Multi-Role Access Control

**Role-Based Permissions:**
```solidity
contract GNUSDAOAccessControlFacet is GNUSDAODiamondStorage {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    function grantRole(bytes32 role, address account) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "AccessControl: sender must be admin");
        ds().roles[role].members[account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return ds().roles[role].members[account];
    }
}
```

### Function-Level Permissions

**Selector-Based Access Control:**
```solidity
contract GNUSDAOSecurityFacet is GNUSDAODiamondStorage {
    mapping(bytes4 => bytes32) public functionRoles;

    function setFunctionRole(bytes4 selector, bytes32 role) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Unauthorized");
        functionRoles[selector] = role;
    }

    modifier authorized() {
        bytes32 requiredRole = functionRoles[msg.sig];
        if (requiredRole != bytes32(0)) {
            require(hasRole(requiredRole, msg.sender), "Unauthorized function access");
        }
        _;
    }

    function secureFunction() external authorized {
        // Function body
    }
}
```

## 💰 Treasury Security

### Multi-Signature Requirements

**Treasury Operations:**
```solidity
contract GNUSDAOTreasuryFacet is GNUSDAODiamondStorage {
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
        mapping(address => bool) confirmations;
    }

    mapping(uint256 => Transaction) public transactions;
    address[] public signers;
    uint256 public requiredConfirmations;

    function submitTransaction(address to, uint256 value, bytes memory data) external {
        require(isSigner(msg.sender), "Not a signer");

        uint256 txId = ++ds().transactionCount;
        transactions[txId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            numConfirmations: 0
        });

        emit TransactionSubmitted(txId, msg.sender, to, value, data);
    }

    function confirmTransaction(uint256 txId) external {
        require(isSigner(msg.sender), "Not a signer");
        require(!transactions[txId].executed, "Already executed");
        require(!transactions[txId].confirmations[msg.sender], "Already confirmed");

        transactions[txId].confirmations[msg.sender] = true;
        transactions[txId].numConfirmations++;

        emit TransactionConfirmed(txId, msg.sender);
    }

    function executeTransaction(uint256 txId) external {
        Transaction storage transaction = transactions[txId];
        require(transaction.numConfirmations >= requiredConfirmations, "Not enough confirmations");
        require(!transaction.executed, "Already executed");

        transaction.executed = true;

        (bool success,) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");

        emit TransactionExecuted(txId);
    }
}
```

## 🔍 Diamond Loupe Security

### Interface Detection

**Supported Interface Validation:**
```solidity
contract GNUSDAOLoupeFacet is GNUSDAODiamondStorage {
    function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
        return ds().supportedInterfaces[interfaceId];
    }

    function addSupportedInterface(bytes4 interfaceId) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Unauthorized");
        ds().supportedInterfaces[interfaceId] = true;
        emit InterfaceAdded(interfaceId);
    }
}
```

### Facet Inspection

**Secure Facet Queries:**
```typescript
// Validate facet addresses before use
async function validateFacet(diamondAddress: string, facetAddress: string) {
    // Check facet has code
    const code = await ethers.provider.getCode(facetAddress);
    if (code === '0x') throw new Error('Facet has no code');

    // Check facet is registered in diamond
    const diamondLoupe = await ethers.getContractAt('IDiamondLoupe', diamondAddress);
    const facets = await diamondLoupe.facets();

    const facet = facets.find(f => f.facetAddress === facetAddress);
    if (!facet) throw new Error('Facet not registered in diamond');

    // Validate selectors
    for (const selector of facet.functionSelectors) {
        try {
            // Test if selector exists on facet
            await ethers.provider.call({
                to: facetAddress,
                data: selector
            });
        } catch (error) {
            throw new Error(`Invalid selector ${selector} on facet ${facetAddress}`);
        }
    }

    console.log('✅ Facet validation passed');
}
```

## 🧪 Testing Diamond Security

### Upgrade Testing

**Upgrade Safety Tests:**
```typescript
describe("Diamond Upgrade Security", () => {
    it("should prevent selector collisions", async () => {
        const newFacet = await deployFacet("ConflictingFacet");

        // Attempt to add conflicting selectors should fail
        await expect(
            diamondCutFacet.diamondCut([{
                facetAddress: newFacet.address,
                action: FacetCutAction.Add,
                functionSelectors: ["0x12345678"] // Conflicting selector
            }], ethers.ZeroAddress, "0x")
        ).to.be.revertedWith("SelectorCollision");
    });

    it("should validate facet code exists", async () => {
        const zeroAddress = ethers.ZeroAddress;

        await expect(
            diamondCutFacet.diamondCut([{
                facetAddress: zeroAddress,
                action: FacetCutAction.Add,
                functionSelectors: ["0x12345678"]
            }], ethers.ZeroAddress, "0x")
        ).to.be.revertedWith("InvalidFacet");
    });

    it("should maintain state consistency during upgrades", async () => {
        // Test state preservation across upgrades
        const initialState = await getDiamondState();

        await performUpgrade();

        const finalState = await getDiamondState();
        expect(finalState).to.deep.equal(initialState);
    });
});
```

### Access Control Testing

**Role-Based Security Tests:**
```typescript
describe("Diamond Access Control", () => {
    it("should enforce function-level permissions", async () => {
        // Set function role requirement
        await securityFacet.setFunctionRole(
            treasuryFacet.interface.getSighash("withdraw"),
            TREASURER_ROLE
        );

        // Non-treasurer should be rejected
        await expect(
            treasuryFacet.connect(nonTreasurer).withdraw(100)
        ).to.be.revertedWith("Unauthorized");
    });

    it("should prevent cross-facet privilege escalation", async () => {
        // Ensure facets can't access each other's storage
        const accessFacet = await ethers.getContractAt("GNUSDAOAccessControlFacet", diamond.address);
        const treasuryFacet = await ethers.getContractAt("GNUSDAOTreasuryFacet", diamond.address);

        // Treasury facet should not be able to modify access control
        await expect(
            treasuryFacet.connect(treasurer).grantRole(ADMIN_ROLE, attacker.address)
        ).to.be.revertedWith("Unauthorized");
    });
});
```

## 🚨 Security Monitoring

### Diamond-Specific Alerts

**Monitor for Suspicious Activity:**
```typescript
// Monitor diamond cuts
diamond.on("DiamondCut", (facetCuts, init, data) => {
    console.log("🚨 Diamond upgrade detected:", {
        facetCuts: facetCuts.map(cut => ({
            facet: cut.facetAddress,
            action: cut.action,
            selectors: cut.functionSelectors
        })),
        init,
        data
    });

    // Alert security team
    alertSecurityTeam("Diamond upgrade executed", {
        facetCuts,
        init,
        data,
        timestamp: Date.now()
    });
});

// Monitor access control changes
accessControl.on("RoleGranted", (role, account, sender) => {
    if (role === ADMIN_ROLE) {
        console.log("🚨 Admin role granted:", { role, account, sender });
        alertSecurityTeam("Admin role granted", { role, account, sender });
    }
});
```

## 📋 Security Checklist

### Pre-Upgrade Checklist

- [ ] **Selector Collision Check**: Verified no function selector conflicts
- [ ] **Facet Validation**: All new facets have valid code and interfaces
- [ ] **Access Control**: Upgrade maintains proper authorization
- [ ] **State Consistency**: Upgrade preserves critical state variables
- [ ] **Timelock**: Critical upgrades use appropriate delays
- [ ] **Testing**: Upgrade tested in staging environment
- [ ] **Rollback Plan**: Emergency rollback procedure documented

### Ongoing Security Monitoring

- [ ] **Facet Health**: Regular checks that all facets are functional
- [ ] **Access Logs**: Monitor privileged operations
- [ ] **Storage Integrity**: Verify diamond storage consistency
- [ ] **Interface Compliance**: Ensure supported interfaces remain valid
- [ ] **Performance**: Monitor for gas inefficiencies or DoS vectors

## 🔧 Best Practices Summary

### 1. Storage Management
- Always use diamond storage pattern
- Avoid direct state variables in facets
- Implement storage migration carefully

### 2. Function Design
- Use unique, descriptive function names
- Implement proper access controls
- Validate all inputs and outputs

### 3. Upgrade Safety
- Test upgrades thoroughly before deployment
- Implement timelocks for critical changes
- Have rollback mechanisms ready

### 4. Access Control
- Use role-based permissions
- Implement function-level authorization
- Regularly audit permission assignments

### 5. Monitoring & Testing
- Monitor diamond operations continuously
- Test all upgrade scenarios
- Validate facet interactions regularly

---

**Remember**: Diamond proxies offer powerful upgradeability but require careful security consideration. Always follow the principle of "secure by default" and implement defense-in-depth measures.

**Security Contact**: Report diamond-specific security issues to security@gnus.ai