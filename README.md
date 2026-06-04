<p align="center">
  <strong>🗳️ CryptoVote Campus V2.0</strong><br/>
  <em>Advanced Governance Edition</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-^0.8.19-363636?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Hardhat-^2.22-FFF100?logo=hardhat&logoColor=black" alt="Hardhat" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Ethers.js-v6-7B3FE4?logo=ethereum" alt="Ethers.js" />
  <img src="https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="MIT License" />
</p>

---

A decentralized voting dApp for campus student governance built on Ethereum, featuring **complete voter identity privacy**, an **anti-coercion override protocol**, and **gasless EIP-712 meta-transactions** so students never need ETH to vote.

> **Why is this different?** Standard blockchain voting systems have two fatal flaws: *coercion* (forced votes are immutable) and *zero privacy* (wallet addresses expose voting history). CryptoVote Campus V2.0 solves both — voters use fresh anonymous wallets (no on-chain identity link) and can secretly override coerced votes before the deadline.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **🔐 Off-Chain Identity Verification** | Real student identities never touch the blockchain. Admin verifies IDs off-chain and whitelists anonymous wallets via ECDSA signatures from a campus authority. |
| **🛡️ Anti-Coercion Override Protocol** | Voters can re-vote unlimited times before the election deadline. Each new vote atomically reverses the previous one — making coerced votes meaningless. |
| **⛽ Gasless Voting (EIP-712)** | Students sign typed EIP-712 ballots off-chain (free). A trusted relayer server submits the transaction and pays gas — students need zero ETH. |
| **⏱️ Time-Locked Elections** | Smart contract enforces `electionDeadline`. After expiry, all vote-changing logic is frozen and results are permanent. |
| **📊 Gas-Optimized Tallying** | Live results via read-only view functions — no gas fees to check vote counts. Real-time updates via on-chain event subscriptions. |
| **🌐 Bilingual UI** | Full English & Marathi (मराठी) localization with one-click language toggle. |
| **🏛️ Admin Dashboard** | Slide-over panel for candidate management, voter whitelisting, election timer control, election reset, and admin transfer. |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                 │
│  MetaMask ←→ Ethers.js v6 ←→ useVoting Hook ←→ React Components│
│                          ↓ (EIP-712 signature)                  │
├─────────────────────────────────────────────────────────────────┤
│                    RELAYER SERVER (Express.js)                   │
│  POST /relay → verify signature → castGaslessVote() on-chain    │
│  POST /register → registerVoterFor() on-chain                   │
│  GET  /nonce/:addr → fetch replay-protection nonce              │
├─────────────────────────────────────────────────────────────────┤
│                  SMART CONTRACT (Solidity on EVM)                │
│  AdvancedVoting.sol → Sepolia Testnet / Hardhat Localhost        │
│  • EIP-712 Domain Separator   • ECDSA voter registration        │
│  • Anti-coercion vote logic   • Election lifecycle management   │
└─────────────────────────────────────────────────────────────────┘
```

### The "Two-Step" Privacy Flow

1. **Registration** — Student shows University ID to the Election Admin *off-chain*. Student generates a brand-new, anonymous MetaMask wallet and provides the public address.
2. **Whitelisting** — Admin whitelists the anonymous address on the smart contract (or via cryptographic ECDSA self-registration). *No database links the student's name to this wallet.*
3. **Voting** — Student connects their anonymous wallet and votes. If coerced earlier, they simply override their vote later — the final choice before the deadline is what counts.

---

## 📁 Project Structure

```
Blockchain-Voting-System/
├── contracts/
│   └── AdvancedVoting.sol          # Core smart contract (406 lines)
├── scripts/
│   └── deploy.js                   # Deployment script + ABI export
├── test/
│   └── AdvancedVoting.test.js      # 14 automated test cases (Chai + Hardhat)
├── backend/
│   └── relayer.js                  # Gasless meta-transaction relayer (Express)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main application shell
│   │   ├── index.css               # Design system & global styles
│   │   ├── main.jsx                # React entry point
│   │   ├── localization.json       # EN/MR translation strings
│   │   ├── hooks/
│   │   │   └── useVoting.js        # Web3 integration hook (ethers.js v6)
│   │   ├── components/
│   │   │   ├── Header.jsx          # Sticky nav with wallet connection
│   │   │   ├── CandidateCard.jsx   # Voting card with live progress bar
│   │   │   ├── VoteOverlay.jsx     # Vote confirmation modal
│   │   │   └── AdminPanel.jsx      # Slide-over admin dashboard
│   │   ├── context/
│   │   │   └── LocalizationContext.jsx  # i18n provider (EN/MR)
│   │   └── abis/
│   │       └── AdvancedVoting.json # Auto-generated ABI + deployed address
│   ├── index.html                  # Entry HTML with Google Fonts
│   ├── vite.config.js              # Vite dev server configuration
│   └── package.json                # Frontend dependencies
├── hardhat.config.js               # Hardhat network & compiler config
├── package.json                    # Root dependencies & npm scripts
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── manual_test_cases.md            # 15 manual QA test cases
└── PRD.md                          # Product Requirements Document
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Smart Contract | Solidity ^0.8.19 | On-chain voting logic, access control, EIP-712 |
| Development | Hardhat ^2.22 | Compilation, testing, local node, Sepolia deployment |
| Frontend | React 18 + Vite 5 | Responsive SPA with dark theme |
| Web3 | Ethers.js v6 | MetaMask integration, contract interaction, EIP-712 signing |
| Relayer | Express.js 5 + CORS | Gasless meta-transaction relay server |
| Testing | Chai + Hardhat Toolbox | 14 automated contract tests |
| Styling | Vanilla CSS (custom properties) | Dark glassmorphism design system |
| Typography | Outfit + JetBrains Mono | Google Fonts for UI and monospace |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MetaMask** browser extension

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/Blockchain-Voting-System.git
cd Blockchain-Voting-System
```

```bash
# Install backend (Hardhat + Relayer) dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
# Alchemy/Infura Sepolia RPC URL
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"

# Development-only MetaMask private key (NEVER use a mainnet key)
DEPLOYER_PRIVATE_KEY="your_dev_private_key_here"

# Etherscan API key (optional, for contract verification)
ETHERSCAN_API_KEY="your_etherscan_key"

# Election duration in minutes (default: 60)
ELECTION_DURATION_MINUTES=60
```

### 3. Local Development

Open **three terminals**:

```bash
# Terminal 1 — Start local Hardhat blockchain
npm run node
```

```bash
# Terminal 2 — Compile & deploy contract
npm run compile
npm run deploy:local
```

```bash
# Terminal 3 — Start the gasless relayer
npm run relayer
```

```bash
# Terminal 4 — Start the frontend dev server
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

> **MetaMask Setup:** Add the Hardhat network (RPC: `http://127.0.0.1:8545`, Chain ID: `31337`) and import a Hardhat test account using its private key.

### 4. Deploy to Sepolia Testnet

```bash
npm run deploy:sepolia
```

Optionally verify the contract on Etherscan:

```bash
npm run verify -- <DEPLOYED_CONTRACT_ADDRESS> <DURATION_MINUTES> <CAMPUS_AUTHORITY_ADDRESS>
```

---

## 📜 Smart Contract API

### Core Functions

| Function | Access | Description |
|---|---|---|
| `vote(candidateId)` | Whitelisted voter | Cast or override a vote (voter pays gas) |
| `castGaslessVote(voter, candidateId, nonce, v, r, s)` | Anyone (Relayer) | Submit an EIP-712 signed vote on behalf of a voter |
| `registerVoter(signature)` | Anyone | Self-register with a campus authority ECDSA signature |
| `registerVoterFor(voter, signature)` | Anyone (Relayer) | Gasless voter registration via relayer |

### Admin Functions

| Function | Description |
|---|---|
| `addCandidate(name, imageUri, pitch)` | Register a new candidate |
| `removeCandidate(candidateId)` | Deactivate a candidate |
| `whitelistAnonymousWallet(wallet)` | Whitelist a single voter wallet |
| `batchWhitelistWallets(wallets[])` | Batch whitelist multiple wallets |
| `updateElectionDeadline(newDeadline)` | Extend or shorten election timer |
| `resetElection(durationInMinutes)` | Launch a new election cycle (clears candidates) |
| `finalizeElection()` | Lock results after deadline |
| `transferAdmin(newAdmin)` | Transfer admin privileges |

### Read-Only (Free — No Gas)

| Function | Returns |
|---|---|
| `getAllCandidates()` | Full candidate list with live vote counts |
| `getCandidateCount()` | Number of registered candidates |
| `getWinner()` | Winner ID, name, and vote count (after election ends) |
| `timeRemaining()` | Seconds until election deadline |

### Events

| Event | Emitted When |
|---|---|
| `VoteCast(voter, candidateId, wasOverride, timestamp)` | Direct vote cast |
| `GaslessVoteCast(voter, candidateId, relayer, wasOverride, timestamp)` | Gasless meta-transaction vote |
| `WalletWhitelisted(wallet, timestamp)` | Voter wallet authorized |
| `CandidateAdded(id, name)` | New candidate registered |
| `CandidateRemoved(id)` | Candidate deactivated |
| `ElectionFinalized(timestamp, finalTallies[])` | Election officially locked |
| `ElectionReset(electionId, newDeadline)` | New election cycle started |

---

## ⛽ Gasless Voting (EIP-712 Meta-Transactions)

The gasless flow ensures students with **zero ETH** can still vote:

```
Student (MetaMask)                    Relayer Server                  Smart Contract
       │                                    │                               │
       │  1. Request nonce                  │                               │
       │ ─────────────────────────────────→ │                               │
       │  ← nonce                           │                               │
       │                                    │                               │
       │  2. Sign EIP-712 typed data        │                               │
       │  (free, off-chain only)            │                               │
       │                                    │                               │
       │  3. Send {voter, candidateId,      │                               │
       │     nonce, signature}              │                               │
       │ ─────────────────────────────────→ │                               │
       │                                    │  4. Verify signature          │
       │                                    │     off-chain (fast reject)   │
       │                                    │                               │
       │                                    │  5. castGaslessVote()         │
       │                                    │ ────────────────────────────→ │
       │                                    │                               │
       │                                    │  6. ecrecover → verify        │
       │                                    │     nonce++ → execute vote    │
       │                                    │  ← tx receipt                 │
       │  ← success + txHash                │                               │
```

### Relayer API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — relayer wallet & contract info |
| `GET` | `/nonce/:address` | Get voter's current meta-transaction nonce |
| `POST` | `/relay` | Submit a signed gasless vote |
| `POST` | `/register` | Submit a gasless voter registration |

---

## 🧪 Testing

### Automated Tests (14 test cases)

```bash
npm test
```

Tests cover:
- ✅ Admin access control & guard modifiers
- ✅ Single & batch wallet whitelisting
- ✅ ECDSA cryptographic self-registration
- ✅ Relayed voter registration (`registerVoterFor`)
- ✅ Invalid signature rejection
- ✅ Standard voting (cast + tally update)
- ✅ Non-whitelisted voter rejection
- ✅ Anti-coercion vote override (decrement + increment)
- ✅ Vote record state verification after override
- ✅ Time-lock enforcement (post-deadline rejection)
- ✅ Winner calculation after election ends
- ✅ Candidate removal + inactive vote blocking
- ✅ Election deadline extension
- ✅ Election reset (new cohort lifecycle)
- ✅ EIP-712 gasless vote (valid signature → success)
- ✅ EIP-712 signer mismatch rejection
- ✅ EIP-712 nonce replay attack prevention

### Manual Test Cases

See [`manual_test_cases.md`](manual_test_cases.md) for 15 step-by-step QA scenarios covering the full user flow including candidate management, voter whitelisting, gasless voting, election lifecycle, and admin operations.

---

## 📝 NPM Scripts

| Script | Description |
|---|---|
| `npm run compile` | Compile Solidity contracts via Hardhat |
| `npm test` | Run automated test suite |
| `npm run node` | Start local Hardhat blockchain node |
| `npm run deploy:local` | Deploy contract to localhost |
| `npm run deploy:sepolia` | Deploy contract to Sepolia testnet |
| `npm run verify` | Verify contract on Etherscan |
| `npm run relayer` | Start the gasless meta-transaction relayer |

### Frontend Scripts (run from `frontend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

---

## 🔒 Security Considerations

- **Private keys** are stored in `.env` (git-ignored). Never commit real keys.
- **Campus Authority** signs voter wallets via ECDSA — compromised authority key = unauthorized voter registration.
- **Relayer** pays gas but cannot forge votes (EIP-712 signatures are verified on-chain via `ecrecover`).
- **Replay protection** via incrementing nonces prevents signature reuse.
- **No ETH accepted** — `receive()` function reverts to prevent accidental deposits.
- **Admin transfer** is a one-way, irreversible operation — use with caution.

---

## 🗺️ Roadmap

- [ ] IPFS-hosted frontend for full decentralization
- [ ] Multi-election dashboard with historical results
- [ ] Zero-knowledge proof voter registration (zkSNARKs)
- [ ] Mobile-responsive PWA with QR-code wallet linking
- [ ] On-chain election result attestation (EAS)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built with ❤️ for campus democracy on Ethereum</sub>
</p>
