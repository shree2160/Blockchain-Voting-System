/**
 * Gasless Vote Relayer — CryptoVote Campus V2.0
 *
 * This Express server acts as a meta-transaction relayer:
 *  1. Receives EIP-712 signed vote ballots from the frontend.
 *  2. Verifies the signature off-chain for fast rejection of bad requests.
 *  3. Submits castGaslessVote() to the smart contract, paying gas from the admin wallet.
 *
 * The student's MetaMask never pays gas — they only sign a typed message (free).
 */

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.RELAYER_PORT || 4000;
const RPC_URL = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

// Load ABI + address from frontend build artifact
const artifact = require("../frontend/src/abis/AdvancedVoting.json");
const CONTRACT_ABI = artifact.abi;
const CONTRACT_ADDRESS = artifact.address;

if (!RELAYER_PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not set");
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error("❌ Contract address not found in ABI artifact");
  process.exit(1);
}

// ── Ethers Setup ────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, relayerWallet);

// ── EIP-712 Domain (must match the contract's DOMAIN_SEPARATOR exactly) ─────
let DOMAIN;

async function initDomain() {
  const network = await provider.getNetwork();
  DOMAIN = {
    name: "CryptoVote Campus",
    version: "2",
    chainId: Number(network.chainId),
    verifyingContract: CONTRACT_ADDRESS,
  };
  console.log(`📋 EIP-712 Domain initialized for chain ${DOMAIN.chainId}`);
}

const VOTE_TYPES = {
  Vote: [
    { name: "voter", type: "address" },
    { name: "candidateId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

// ── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", relayer: relayerWallet.address, contract: CONTRACT_ADDRESS });
});

// Get voter's current nonce (frontend needs this to build the EIP-712 message)
app.get("/nonce/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    if (!ethers.isAddress(addr)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    const nonce = await contract.metaTxNonces(addr);
    res.json({ nonce: Number(nonce) });
  } catch (err) {
    console.error("Nonce fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch nonce" });
  }
});

// Submit a gasless vote
app.post("/relay", async (req, res) => {
  try {
    const { voter, candidateId, nonce, signature } = req.body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!voter || candidateId === undefined || nonce === undefined || !signature) {
      return res.status(400).json({ error: "Missing required fields: voter, candidateId, nonce, signature" });
    }

    if (!ethers.isAddress(voter)) {
      return res.status(400).json({ error: "Invalid voter address" });
    }

    // ── Off-chain signature verification (fast reject bad signatures) ─────
    const message = {
      voter: voter,
      candidateId: BigInt(candidateId),
      nonce: BigInt(nonce),
    };

    const recoveredAddr = ethers.verifyTypedData(DOMAIN, VOTE_TYPES, message, signature);

    if (recoveredAddr.toLowerCase() !== voter.toLowerCase()) {
      return res.status(403).json({ error: "Signature does not match voter address" });
    }

    // ── On-chain nonce check ──────────────────────────────────────────────
    const onChainNonce = await contract.metaTxNonces(voter);
    if (Number(onChainNonce) !== Number(nonce)) {
      return res.status(400).json({
        error: `Nonce mismatch. Expected ${Number(onChainNonce)}, got ${nonce}`,
      });
    }

    // ── Whitelist check ───────────────────────────────────────────────────
    const isWhitelisted = await contract.validAnonymousWallets(voter);
    if (!isWhitelisted) {
      return res.status(403).json({ error: "Voter wallet is not whitelisted" });
    }

    // ── Split signature into v, r, s ──────────────────────────────────────
    const sig = ethers.Signature.from(signature);

    // ── Submit to blockchain ──────────────────────────────────────────────
    console.log(`🗳️  Relaying gasless vote: voter=${voter}, candidate=${candidateId}, nonce=${nonce}`);
    const tx = await contract.castGaslessVote(
      voter,
      candidateId,
      nonce,
      sig.v,
      sig.r,
      sig.s
    );

    console.log(`⏳ TX submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ TX confirmed in block ${receipt.blockNumber}`);

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber),
    });

  } catch (err) {
    console.error("Relay error:", err);

    // Extract revert reason if available
    const reason = err?.reason || err?.data?.message || err?.message || "Relay transaction failed";
    res.status(500).json({ error: reason });
  }
});

// Submit a gasless student registration
app.post("/register", async (req, res) => {
  try {
    const { voter, signature } = req.body;

    if (!voter || !signature) {
      return res.status(400).json({ error: "Missing required fields: voter, signature" });
    }

    if (!ethers.isAddress(voter)) {
      return res.status(400).json({ error: "Invalid voter address" });
    }

    // Submit to blockchain
    console.log(`📝 Relaying gasless registration: voter=${voter}`);
    const tx = await contract.registerVoterFor(voter, signature);

    console.log(`⏳ TX submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Registration confirmed in block ${receipt.blockNumber}`);

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber),
    });

  } catch (err) {
    console.error("Registration relay error:", err);
    const reason = err?.reason || err?.data?.message || err?.message || "Registration transaction failed";
    res.status(500).json({ error: reason });
  }
});

// ── Start Server ────────────────────────────────────────────────────────────
async function start() {
  await initDomain();

  const balance = await provider.getBalance(relayerWallet.address);
  console.log(`\n🚀 Gasless Relayer starting...`);
  console.log(`   Relayer wallet: ${relayerWallet.address}`);
  console.log(`   Relayer balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   RPC: ${RPC_URL}\n`);

  app.listen(PORT, () => {
    console.log(`✅ Relayer API listening on http://localhost:${PORT}`);
    console.log(`   POST /relay   — Submit a signed gasless vote`);
    console.log(`   GET  /nonce/:addr — Get voter's current nonce`);
    console.log(`   GET  /health  — Health check\n`);
  });
}

start().catch((err) => {
  console.error("Failed to start relayer:", err);
  process.exit(1);
});
