# Manual Test Cases: CryptoVote Campus V2.0

This document contains step-by-step test cases for manually testing the Advanced Governance Edition of the CryptoVote Campus V2.0 application. It covers off-chain identity verification, anti-coercion features, and admin functionalities.

## Prerequisites
- A running local blockchain (e.g., Hardhat Node) or Testnet (e.g., Sepolia).
- The `AdvancedVoting` smart contract deployed.
- MetaMask installed and configured with multiple test accounts (e.g., Admin, Voter A, Voter B, Unregistered Voter).
- The decentralized frontend running locally (`npm run dev` or equivalent) and connected to the contract.

---

## 1. Candidate Management (Admin)

### TC-1.1: Add a New Candidate
- **Precondition:** Logged in as Admin. Election is active.
- **Steps:**
  1. Open the Admin Panel.
  2. Enter Candidate Name (e.g., "Alice Smith").
  3. Enter Image URI (e.g., "https://example.com/alice.png").
  4. Enter Pitch (e.g., "Vote for transparency!").
  5. Click "Add Candidate" and confirm the MetaMask transaction.
- **Expected Result:** Transaction succeeds. "Alice Smith" appears in the active candidate list.
- **Verification:** Call `getCandidateCount()` off-chain and verify it increased.

### TC-1.2: Remove a Candidate (Deactivate)
- **Precondition:** Logged in as Admin. At least one active candidate exists (e.g., Candidate ID 0).
- **Steps:**
  1. Open the Admin Panel.
  2. Select Candidate ID 0 and click "Remove/Deactivate".
  3. Confirm the MetaMask transaction.
- **Expected Result:** Transaction succeeds. The candidate is no longer marked as active or shown as votable on the frontend.
- **Verification:** Users attempting to vote for this candidate should fail (covered in TC-3.4).

---

## 2. Voter Whitelisting

### TC-2.1: Single Anonymous Wallet Whitelisting (Admin)
- **Precondition:** Logged in as Admin.
- **Steps:**
  1. Switch to a brand new MetaMask account (Voter A) and copy its address.
  2. Switch back to Admin account.
  3. In the Admin Panel, input Voter A's address and click "Whitelist Wallet".
  4. Confirm the transaction.
- **Expected Result:** Transaction succeeds. Voter A's address is stored in `validAnonymousWallets`.

### TC-2.2: Batch Whitelisting (Admin)
- **Precondition:** Logged in as Admin.
- **Steps:**
  1. Input a list of 2 or more new wallet addresses separated by commas.
  2. Click "Batch Whitelist" and confirm the transaction.
- **Expected Result:** Transaction succeeds. All provided wallets are successfully whitelisted.

### TC-2.3: Cryptographic Self-Registration (ECDSA)
- **Precondition:** The system has an off-chain backend generating signatures from the `campusAuthority`.
- **Steps:**
  1. Login as Voter B (not yet whitelisted).
  2. Provide valid student ID to the off-chain portal to receive a signature.
  3. Click "Self Register" on the dApp, which submits the `registerVoter(signature)` transaction.
- **Expected Result:** Transaction succeeds. Voter B is now whitelisted without the admin doing it manually.

---

## 3. Voting & Anti-Coercion Protocol

### TC-3.1: Cast Initial Vote (Happy Path)
- **Precondition:** Logged in as Voter A (whitelisted). Election is active. Candidate 0 and Candidate 1 exist.
- **Steps:**
  1. Select Candidate 0.
  2. Click "Vote" and confirm the transaction.
- **Expected Result:** Transaction succeeds. Candidate 0's vote count increases by 1.

### TC-3.2: Anti-Coercion Override (Change Vote)
- **Precondition:** Voter A has already voted for Candidate 0.
- **Steps:**
  1. Still logged in as Voter A, select Candidate 1.
  2. Click "Vote" (or "Override Vote") and confirm the transaction.
- **Expected Result:** Transaction succeeds. Candidate 0's vote count DECREASES by 1. Candidate 1's vote count INCREASES by 1.

### TC-3.3: Gasless Meta-Transaction Voting (EIP-712)
- **Precondition:** Logged in as Voter A (whitelisted). Voter A's wallet contains 0 ETH (completely empty). The Relayer server is running.
- **Steps:**
  1. Select Candidate 0.
  2. Click "Vote Now".
  3. MetaMask will prompt a free cryptographic signature request (EIP-712 Typed Structured Data) rather than a gas transaction.
  4. Sign the message (0 ETH cost).
  5. The Relayer intercepts the signature, submits it to the contract, and pays the transaction fee.
- **Expected Result:** Vote is cast successfully! Candidate 0's vote count increases by 1. A success toast notifications says "Vote cast gaslessly! University Relayer covered the fee."

### TC-3.4: Attempt to Vote with Unregistered Wallet
- **Precondition:** Logged in as an Unregistered Voter (not whitelisted).
- **Steps:**
  1. Select Candidate 1.
  2. Click "Vote Now" and sign the signature/confirm transaction.
- **Expected Result:** Relayer rejects the vote with "Voter wallet is not whitelisted" or contract reverts with `"AV: wallet not authorized"`.

### TC-3.5: Attempt to Vote for Inactive Candidate
- **Precondition:** Logged in as Voter B (whitelisted). Candidate 0 has been removed/deactivated by admin.
- **Steps:**
  1. Attempt to vote for Candidate 0.
- **Expected Result:** Relayer or contract rejects the vote with error `"AV: candidate is inactive"`.

---

## 4. Election Lifecycle & Finalization

### TC-4.1: Attempt to Vote After Deadline
- **Precondition:** The `electionDeadline` has passed (can be simulated by the admin updating the deadline to a past time or waiting).
- **Steps:**
  1. Logged in as Voter A.
  2. Attempt to cast a vote.
- **Expected Result:** Transaction reverts with error: `"AV: election period has ended"`.

### TC-4.2: Get Winner (During Active Election)
- **Precondition:** Election is still active.
- **Steps:**
  1. Trigger the `getWinner()` function directly or via frontend.
- **Expected Result:** Call reverts with error: `"AV: election still active"`. The winner cannot be officially declared until the election ends.

### TC-4.3: Finalize Election (Admin)
- **Precondition:** Logged in as Admin. `electionDeadline` has passed.
- **Steps:**
  1. In the Admin Panel, click "Finalize Election".
  2. Confirm the transaction.
- **Expected Result:** Transaction succeeds. `electionFinalized` is set to true. No further votes can be cast.

### TC-4.4: Get Winner (After Election Ended)
- **Precondition:** `electionDeadline` has passed or election is finalized.
- **Steps:**
  1. Trigger the `getWinner()` function.
- **Expected Result:** Call succeeds, returning the Candidate ID, Name, and Total Votes of the candidate with the highest count.

---

## 5. System Reset & Maintenance

### TC-5.1: Extend/Update Election Deadline
- **Precondition:** Logged in as Admin.
- **Steps:**
  1. Input a new timestamp (further in the future).
  2. Click "Update Deadline" and confirm the transaction.
- **Expected Result:** Transaction succeeds. Users can continue voting until the new deadline.

### TC-5.2: Reset Election for New Cohort (Institute Dashboard)
- **Precondition:** Logged in as Admin. Election has concluded.
- **Steps:**
  1. Enter a new duration in minutes (e.g., 60).
  2. Click "Reset Election" and confirm.
- **Expected Result:** Transaction succeeds. `electionId` increments. `candidates` list is wiped clean. `electionFinalized` becomes false. A fresh election cycle is initiated.

### TC-5.3: Transfer Admin Rights
- **Precondition:** Logged in as Admin.
- **Steps:**
  1. Enter a new trusted wallet address.
  2. Click "Transfer Admin".
- **Expected Result:** The old Admin loses admin privileges. The new address can now perform all onlyAdmin functions.
