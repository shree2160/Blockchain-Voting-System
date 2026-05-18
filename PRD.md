
---

# 📄 PRD: CryptoVote Campus v2.0 (Advanced Governance Edition)

**Project Owner:** [Your Name] | **Status:** V2.0 | **Tech Stack:** Solidity + Hardhat + React.js + Ethers.js

### 1. Objective & Problem Statement

* **The Problem:** Standard blockchain voting systems suffer from two fatal real-world flaws:
1. **Coercion:** A bad actor can physically force a student to vote for them on their phone. Because the blockchain is immutable, that forced vote cannot be undone.
2. **Zero Privacy:** If an admin whitelists a student's public wallet address (`0x71C...`), the student's entire voting history is permanently exposed to the public.


* **The Solution:** An advanced dApp that completely divorces real-world identity from on-chain voting wallets (ensuring total privacy), while implementing an "Override Protocol" allowing users to re-vote securely to escape coercion.

### 2. Technical Stack

* **Smart Contract:** Solidity (Backend logic)
* **Environment:** Hardhat (Compilation, testing, deployment to Sepolia Testnet)
* **Frontend:** React.js / Next.js with Ethers.js (Web3 integration)
* **Off-Chain Auth:** A simple admin interface (or Node.js script) to verify student IDs and issue voting rights to newly generated, blank wallets.

### 3. Functional Requirements (Features)

| Feature ID | Feature Name | Description |
| --- | --- | --- |
| **FR-01** | **Off-Chain Identity Verification** | Admin verifies a student's ID card *off-chain*. The student provides a brand new, empty wallet address. The admin whitelists this anonymous address. |
| **FR-02** | **Anti-Coercion Protocol** | A whitelisted wallet can vote multiple times before the election deadline. The contract mathematically reverses the previous vote and applies the new one. |
| **FR-03** | **Time-Locked Elections** | The smart contract strictly enforces an `electionDeadline` (timestamp). After this time, the "override" logic is locked, and the final state is permanent. |
| **FR-04** | **Gas-Optimized Tallying** | Read-only functions allow the frontend to fetch real-time tallies without spending gas fees. |
| **FR-05** | **Decentralized UI** | A React frontend where anonymous wallets can connect via MetaMask to cast or override their vote. |

### 4. System Architecture: The "Two-Step" Privacy Flow

To explain this to judges, use this specific flow:

1. **The Registration Phase:** Student shows their University ID to the Election Admin. The student generates a completely new, anonymous MetaMask wallet and gives the public address to the Admin.
2. **The Whitelisting:** Admin adds this anonymous address to the smart contract's `validVoters` mapping and sends it a tiny amount of Test ETH to cover gas fees. *No database links the student's name to this wallet.*
3. **The Voting Phase:** The student goes home, connects their anonymous wallet, and votes. If someone forces them to vote earlier in the day, they simply log back in and overwrite their choice.

### 5. Core Smart Contract Logic (The Brain)

Here is the blueprint for your advanced `Voting.sol` contract incorporating both features:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AdvancedVoting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    struct VoteRecord {
        uint256 candidateId;
        bool hasVoted;
    }

    address public admin;
    uint256 public electionDeadline;
    
    // Privacy: Only anonymous wallets are added here, never real names
    mapping(address => bool) public validAnonymousWallets;
    
    // Anti-Coercion: Tracks what a wallet voted for, so it can be overwritten
    mapping(address => VoteRecord) public voterRecords;
    
    Candidate[] public candidates;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    modifier electionActive() {
        require(block.timestamp < electionDeadline, "Election has ended!");
        _;
    }

    constructor(uint256 _durationInMinutes) {
        admin = msg.sender;
        electionDeadline = block.timestamp + (_durationInMinutes * 1 minutes);
    }

    // FR-01: Admin whitelists the newly generated, anonymous wallet
    function whitelistAnonymousWallet(address _wallet) public onlyAdmin {
        validAnonymousWallets[_wallet] = true;
    }

    // FR-02 & FR-03: The Anti-Coercion Voting Logic
    function vote(uint256 _candidateId) public electionActive {
        require(validAnonymousWallets[msg.sender], "Wallet not authorized to vote.");
        require(_candidateId < candidates.length, "Invalid candidate.");

        // If they already voted, remove their previous vote (Override Logic)
        if (voterRecords[msg.sender].hasVoted) {
            uint256 oldChoice = voterRecords[msg.sender].candidateId;
            candidates[oldChoice].voteCount--; 
        }

        // Record the new vote and increment the new candidate
        voterRecords[msg.sender] = VoteRecord(_candidateId, true);
        candidates[_candidateId].voteCount++;
    }
}

```
