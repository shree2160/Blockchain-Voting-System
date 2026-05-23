/**
 * useVoting.js — ethers.js v6 Web3 integration hook
 *
 * Responsibilities:
 *  • MetaMask detection + wallet connection
 *  • Network validation (Sepolia or Localhost)
 *  • Contract read: getAllCandidates, voterRecords, timeRemaining
 *  • Contract write: vote()
 *  • Real-time event subscriptions for live tally updates
 *  • State management: candidates, voterRecord, timeLeft, loading, error
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";

import artifact from "../abis/AdvancedVoting.json";

const CONTRACT_ABI = artifact.abi;
const CONTRACT_ADDRESS = artifact.address;

// Supported chain IDs
const SUPPORTED_CHAINS = {
  31337: "Hardhat Localhost",
  11155111: "Sepolia Testnet",
};

// Gasless Relayer endpoint:
// 1. Supports VITE_RELAYER_URL environment variable for deployed environments.
// 2. Automatically resolves to the host's LAN IP when testing on local Wi-Fi.
// 3. Defaults to localhost for single-device local development.
const getRelayerUrl = () => {
  if (import.meta.env.VITE_RELAYER_URL) {
    return import.meta.env.VITE_RELAYER_URL;
  }
  const hostname = window.location.hostname;
  const isLAN = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  if (isLAN) {
    return `http://${hostname}:4000`;
  }
  return "http://localhost:4000";
};
const RELAYER_URL = getRelayerUrl();

// EIP-712 typed data definition for gasless voting
const EIP712_DOMAIN = {
  name: "CryptoVote Campus",
  version: "2",
};
const VOTE_TYPES = {
  Vote: [
    { name: "voter", type: "address" },
    { name: "candidateId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

// Formats giant MetaMask / Ethers action rejection logs into user-friendly messages
function parseMetaMaskError(err) {
  if (!err) return "Transaction failed.";
  const reason = err.reason || err.data?.message || err.message || "";
  
  if (
    err.code === "ACTION_REJECTED" || 
    err.code === 4001 || 
    reason.toLowerCase().includes("rejected") || 
    reason.toLowerCase().includes("user rejected") ||
    reason.toLowerCase().includes("denied")
  ) {
    return "Vote signature request was cancelled in MetaMask.";
  }
  
  return reason || "Transaction failed.";
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useVoting() {
  // Wallet / provider state
  const [account,    setAccount]    = useState(null);
  const [chainId,    setChainId]    = useState(null);
  const [isAdmin,    setIsAdmin]    = useState(false);

  // Contract data
  const [candidates,   setCandidates]   = useState([]);
  const [voterRecord,  setVoterRecord]  = useState({ hasVoted: false, candidateId: 0 });
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [isFinalized,  setIsFinalized]  = useState(false);
  const [winner,       setWinner]       = useState(null); // { id: number, name: string, votes: number }
  const [campusAuthority, setCampusAuthority] = useState(null);
  const [electionId,      setElectionId]      = useState(0);

  // UI state
  const [loading,   setLoading]   = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [error,     setError]     = useState(null);

  // ethers refs
  const providerRef = useRef(null);
  const signerRef   = useRef(null);
  const contractRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const clearError = () => setError(null);

  const getContract = (signerOrProvider) =>
    new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);

  /**
   * Finds MetaMask's EIP-1193 provider specifically.
   *
   * When multiple wallets are installed (e.g. Trust Wallet + MetaMask),
   * each wallet injects itself into window.ethereum.providers[].
   * We pick the one with isMetaMask = true and isTrust = false.
   * Falls back to window.ethereum if it IS MetaMask (single-wallet case).
   */
  const getMetaMaskProvider = () => {
    const { ethereum } = window;
    if (!ethereum) return null;

    // Multi-wallet scenario: providers array exists
    if (Array.isArray(ethereum.providers)) {
      // Prefer MetaMask that is NOT Trust Wallet
      const mm = ethereum.providers.find(
        (p) => p.isMetaMask && !p.isTrust && !p.isTrustWallet
      );
      if (mm) return mm;
      // Fallback: any MetaMask provider
      return ethereum.providers.find((p) => p.isMetaMask) ?? null;
    }

    // Single-wallet: window.ethereum is MetaMask
    if (ethereum.isMetaMask) return ethereum;

    return null;
  };

  // ── Load contract data ──────────────────────────────────────────────────
  const fetchContractData = useCallback(async (addr) => {
    if (!contractRef.current || !CONTRACT_ADDRESS) return;
    setLoading(true);
    try {
      const contract = contractRef.current;

      const [rawCandidates, rawTimeLeft, finalized, rawElectionId] = await Promise.all([
        contract.getAllCandidates(),
        contract.timeRemaining(),
        contract.electionFinalized(),
        contract.electionId(),
      ]);

      const isEnded = Number(rawTimeLeft) === 0 || finalized;
      const currentElectionId = Number(rawElectionId);
      setElectionId(currentElectionId);

      // Normalise BigInt → Number for React state
      setCandidates(
        rawCandidates.map((c, i) => ({
          id:        i,
          name:      c.name,
          imageUri:  c.imageUri,
          pitch:     c.pitch,
          voteCount: Number(c.voteCount),
          isActive:  c.isActive,
        }))
      );

      setTimeLeft(Number(rawTimeLeft));
      setIsFinalized(finalized);

      // Fetch winner if the election is ended
      if (isEnded) {
        try {
          const rawWinner = await contract.getWinner();
          setWinner({
            id:    Number(rawWinner.winnerId),
            name:  rawWinner.winnerName,
            votes: Number(rawWinner.winningVotes),
          });
        } catch (wErr) {
          console.warn("Could not retrieve winner (might have no votes/candidates):", wErr);
          setWinner(null);
        }
      } else {
        setWinner(null);
      }

      if (addr) {
        const [whitelist, record, adminAddr, authorityAddr] = await Promise.all([
          contract.validAnonymousWallets(addr),
          contract.voterRecords(currentElectionId, addr),
          contract.admin(),
          contract.campusAuthority(),
        ]);
        setIsWhitelisted(whitelist);
        setVoterRecord({
          hasVoted:    record.hasVoted,
          candidateId: Number(record.candidateId),
        });
        setIsAdmin(adminAddr.toLowerCase() === addr.toLowerCase());
        setCampusAuthority(authorityAddr);
      }
    } catch (err) {
      console.error("fetchContractData error:", err);
      setError("Failed to load contract data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Connect wallet ──────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    const mmProvider = getMetaMaskProvider();

    if (!mmProvider) {
      setError(
        window.ethereum
          ? "MetaMask not found. Trust Wallet detected — please use the MetaMask extension instead."
          : "MetaMask not detected. Please install the MetaMask browser extension."
      );
      return;
    }

    clearError();
    try {
      // Request accounts from MetaMask specifically
      const accounts = await mmProvider.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(mmProvider);
      const signer   = await provider.getSigner();
      const network  = await provider.getNetwork();
      const cid      = Number(network.chainId);

      providerRef.current  = provider;
      signerRef.current    = signer;
      contractRef.current  = getContract(signer);

      // Store the raw MM provider for event listeners
      providerRef._raw = mmProvider;

      setAccount(accounts[0]);
      setChainId(cid);

      if (!SUPPORTED_CHAINS[cid]) {
        setError(`Unsupported network (chainId ${cid}). Please switch to Hardhat Localhost (31337) or Sepolia (11155111).`);
        return;
      }

      await fetchContractData(accounts[0]);
    } catch (err) {
      console.error("connectWallet error:", err);
      // EIP-1193 user rejection code
      if (err.code === 4001) {
        setError("Connection rejected. Please approve MetaMask to continue.");
      } else {
        setError(err.message || "Wallet connection failed.");
      }
    }
  }, [fetchContractData]);

  // ── Gasless EIP-712 Meta-Transaction Vote ──────────────────────────────
  const castGaslessVote = useCallback(async (candidateId) => {
    if (!account) return { success: false, error: "Wallet not connected" };
    clearError();

    try {
      // 1. Fetch current nonce from relayer
      const nonceRes = await fetch(`${RELAYER_URL}/nonce/${account}`);
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce from relayer");
      const { nonce } = await nonceRes.json();

      // 2. Build EIP-712 typed data
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      const domain = {
        ...EIP712_DOMAIN,
        chainId: Number(network.chainId),
        verifyingContract: CONTRACT_ADDRESS,
      };

      const value = {
        voter: account,
        candidateId: BigInt(candidateId),
        nonce: BigInt(nonce),
      };

      // 3. Sign typed data (free — no gas cost)
      const signature = await signer.signTypedData(domain, VOTE_TYPES, value);

      // 4. Send to relayer
      const relayRes = await fetch(`${RELAYER_URL}/relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter: account,
          candidateId: Number(candidateId),
          nonce: Number(nonce),
          signature,
        }),
      });

      const result = await relayRes.json();

      if (!relayRes.ok || !result.success) {
        throw new Error(result.error || "Relayer rejected the vote");
      }

      // 5. Refresh data after successful relay
      await fetchContractData(account);
      return { success: true, wasOverride: voterRecord.hasVoted, gasless: true, txHash: result.txHash };

    } catch (err) {
      console.error("castGaslessVote error:", err);
      const msg = parseMetaMaskError(err);
      setError(msg);
      return { success: false, error: msg };
    }
  }, [account, voterRecord.hasVoted, fetchContractData]);

  // ── Cast / override vote (always tries EIP-712 gasless path first; falls back to direct if relayer fails) ──
  const castVote = useCallback(async (candidateId) => {
    if (!account) {
      setError("Please connect your wallet first.");
      return { success: false };
    }
    clearError();
    setTxPending(true);
    try {
      // 1. Prioritize Gasless Meta-Transaction EIP-712 Voting for ALL wallets
      try {
        const res = await castGaslessVote(candidateId);
        if (res.success) {
          return res;
        }
        // If relayer returned an explicit error (e.g. not whitelisted), throw it to prevent silent failure
        if (res.error) {
          throw new Error(res.error);
        }
      } catch (err) {
        console.warn("Gasless vote failed, checking fallback to direct path:", err.message);
        const msg = parseMetaMaskError(err);
        setError(msg);
        return { success: false, error: msg };
      }

      // 2. Fallback to Direct Vote if gasless fails or is not applicable
      try {
        if (contractRef.current && signerRef.current) {
          const tx = await contractRef.current.vote(candidateId);
          await tx.wait();
          await fetchContractData(account);
          return { success: true, wasOverride: voterRecord.hasVoted, gasless: false };
        }
      } catch (directErr) {
        console.error("Direct fallback vote error:", directErr);
        const msg = parseMetaMaskError(directErr);
        setError(msg);
        return { success: false, error: msg };
      }
    } finally {
      setTxPending(false);
    }
  }, [account, voterRecord.hasVoted, fetchContractData, castGaslessVote]);

  // ── Admin: whitelist single wallet ──────────────────────────────────────
  const whitelistWallet = useCallback(async (walletAddr) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.whitelistAnonymousWallet(walletAddr);
      await tx.wait();
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Whitelist failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, []);

  // ── Admin: batch whitelist wallets ──────────────────────────────────────
  const batchWhitelistWallets = useCallback(async (wallets) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.batchWhitelistWallets(wallets);
      await tx.wait();
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Batch whitelist failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, []);

  // ── Voter: Self-Register Cryptographically (Gasless Relayer by default; Direct fallback) ──
  const registerVoter = useCallback(async (signature) => {
    if (!account) return { success: false, error: "Please connect your wallet." };
    clearError();
    setTxPending(true);

    // 1. Try EIP-712 Gasless Registration via Relayer first
    try {
      console.log("📝 Attempting gasless student registration via relayer...");
      const relayRes = await fetch(`${RELAYER_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter: account,
          signature,
        }),
      });

      const result = await relayRes.json();
      if (relayRes.ok && result.success) {
        console.log("✅ Gasless registration successful:", result.txHash);
        await fetchContractData(account);
        return { success: true, gasless: true, txHash: result.txHash };
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      console.warn("Gasless registration failed, falling back to direct transaction:", err.message);
    }

    // 2. Direct blockchain registration fallback (requires user gas)
    try {
      if (contractRef.current) {
        console.log("⛽ Falling back to direct blockchain registration...");
        const tx = await contractRef.current.registerVoter(signature);
        await tx.wait();
        await fetchContractData(account);
        return { success: true, gasless: false };
      }
    } catch (err) {
      console.error("Direct registration error:", err);
      const msg = parseMetaMaskError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Mock College Signing Server helper (Offline) ──────────────────────────
  const generateMockSignature = useCallback(async (voterAddr) => {
    try {
      // Use the Sepolia deployer private key (Campus Authority key)
      const mockAuthorityWallet = new ethers.Wallet("0xdb6a5d970880c7e776fe55204841a81ee0ada589a831d318f56ad42424267cd7");
      
      // Hash the voter address matching solidity's keccak256(abi.encodePacked(voter))
      const messageHash = ethers.solidityPackedKeccak256(["address"], [voterAddr]);
      
      // Sign the hash (Ethereum signed message format matching Solidity ecrecover)
      const signature = await mockAuthorityWallet.signMessage(ethers.getBytes(messageHash));
      return signature;
    } catch (err) {
      console.error("Signature generation failed:", err);
      return null;
    }
  }, []);

  // ── Admin: add candidate ────────────────────────────────────────────────
  const addCandidate = useCallback(async (name, imageUri, pitch) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.addCandidate(name, imageUri, pitch);
      await tx.wait();
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Add candidate failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Admin: remove candidate ─────────────────────────────────────────────
  const removeCandidate = useCallback(async (candidateId) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.removeCandidate(candidateId);
      await tx.wait();
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Remove candidate failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Admin: update election deadline ─────────────────────────────────────
  const updateElectionDeadline = useCallback(async (durationInMinutes) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      // Get block details to accurately extend time relative to node epoch
      const provider = providerRef.current || new ethers.BrowserProvider(window.ethereum);
      const currentBlock = await provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;
      const newDeadline = currentTimestamp + Math.floor(durationInMinutes * 60);

      const tx = await contractRef.current.updateElectionDeadline(newDeadline);
      await tx.wait();
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Update deadline failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Admin: reset election ────────────────────────────────────────────────
  const resetElection = useCallback(async (durationInMinutes) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.resetElection(durationInMinutes);
      await tx.wait();
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Reset election failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Admin: finalize election ────────────────────────────────────────────
  const finalizeElection = useCallback(async () => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.finalizeElection();
      await tx.wait();
      setIsFinalized(true);
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Finalize failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── Admin: transfer admin rights ────────────────────────────────────────
  const transferAdmin = useCallback(async (newAdminAddr) => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.transferAdmin(newAdminAddr);
      await tx.wait();
      await fetchContractData(account);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Transfer Admin failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, fetchContractData]);

  // ── MetaMask event listeners ────────────────────────────────────────────
  // Attach to the MetaMask provider specifically, not window.ethereum
  // (which Trust Wallet may have overridden)
  useEffect(() => {
    const mmProvider = getMetaMaskProvider();
    if (!mmProvider) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setIsAdmin(false);
        setIsWhitelisted(false);
        setVoterRecord({ hasVoted: false, candidateId: 0 });
      } else {
        setAccount(accounts[0]);
        if (contractRef.current) {
          signerRef.current = await providerRef.current.getSigner();
          contractRef.current = getContract(signerRef.current);
          await fetchContractData(accounts[0]);
        }
      }
    };

    const handleChainChanged = () => window.location.reload();

    mmProvider.on("accountsChanged", handleAccountsChanged);
    mmProvider.on("chainChanged", handleChainChanged);
    return () => {
      mmProvider.removeListener("accountsChanged", handleAccountsChanged);
      mmProvider.removeListener("chainChanged", handleChainChanged);
    };
  }, [fetchContractData]);

  // ── Real-time event subscription (VoteCast) ─────────────────────────────
  useEffect(() => {
    if (!contractRef.current || !account) return;
    const contract = contractRef.current;

    const handleVoteCast = async () => {
      // Debounce: re-fetch 500ms after any VoteCast event
      await new Promise((r) => setTimeout(r, 500));
      await fetchContractData(account);
    };

    contract.on("VoteCast", handleVoteCast);
    contract.on("GaslessVoteCast", handleVoteCast);
    return () => {
      contract.off("VoteCast", handleVoteCast);
      contract.off("GaslessVoteCast", handleVoteCast);
    };
  }, [account, fetchContractData]);

  // ── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // ── Computed ────────────────────────────────────────────────────────────
  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const isNetworkSupported = chainId ? !!SUPPORTED_CHAINS[chainId] : false;

  return {
    // Wallet
    account,
    chainId,
    isAdmin,
    isNetworkSupported,
    networkName: SUPPORTED_CHAINS[chainId] || "Unknown",
    connectWallet,

    // Contract data
    candidates,
    voterRecord,
    isWhitelisted,
    timeLeft,
    isFinalized,
    totalVotes,
    winner,
    campusAuthority,
    electionId,

    // Actions
    castVote,
    castGaslessVote,
    whitelistWallet,
    batchWhitelistWallets,
    registerVoter,
    generateMockSignature,
    addCandidate,
    removeCandidate,
    updateElectionDeadline,
    resetElection,
    finalizeElection,
    transferAdmin,

    // UI state
    loading,
    txPending,
    error,
    clearError,

    // Contract config (for display)
    contractAddress: CONTRACT_ADDRESS,
  };
}
