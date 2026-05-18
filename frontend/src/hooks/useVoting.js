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

// ABI + address are written here by the deploy script
// Fallback to an empty shell so the app renders without crashing
let CONTRACT_ABI = [];
let CONTRACT_ADDRESS = "";

try {
  const artifact = await import("../abis/AdvancedVoting.json");
  CONTRACT_ABI     = artifact.abi;
  CONTRACT_ADDRESS = artifact.address;
} catch {
  console.warn("AdvancedVoting.json not found — run `npm run deploy:local` first.");
}

// Supported chain IDs
const SUPPORTED_CHAINS = {
  31337: "Hardhat Localhost",
  11155111: "Sepolia Testnet",
};

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

  // ── Load contract data ──────────────────────────────────────────────────
  const fetchContractData = useCallback(async (addr) => {
    if (!contractRef.current || !CONTRACT_ADDRESS) return;
    setLoading(true);
    try {
      const contract = contractRef.current;

      const [rawCandidates, rawTimeLeft, finalized] = await Promise.all([
        contract.getAllCandidates(),
        contract.timeRemaining(),
        contract.electionFinalized(),
      ]);

      // Normalise BigInt → Number for React state
      setCandidates(
        rawCandidates.map((c, i) => ({
          id:        i,
          name:      c.name,
          imageUri:  c.imageUri,
          pitch:     c.pitch,
          voteCount: Number(c.voteCount),
        }))
      );

      setTimeLeft(Number(rawTimeLeft));
      setIsFinalized(finalized);

      if (addr) {
        const [whitelist, record, adminAddr] = await Promise.all([
          contract.validAnonymousWallets(addr),
          contract.voterRecords(addr),
          contract.admin(),
        ]);
        setIsWhitelisted(whitelist);
        setVoterRecord({
          hasVoted:    record.hasVoted,
          candidateId: Number(record.candidateId),
        });
        setIsAdmin(adminAddr.toLowerCase() === addr.toLowerCase());
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
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install it.");
      return;
    }
    clearError();
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer   = await provider.getSigner();
      const network  = await provider.getNetwork();
      const cid      = Number(network.chainId);

      providerRef.current  = provider;
      signerRef.current    = signer;
      contractRef.current  = getContract(signer);

      setAccount(accounts[0]);
      setChainId(cid);

      if (!SUPPORTED_CHAINS[cid]) {
        setError(`Unsupported network. Please switch to Sepolia or Localhost.`);
        return;
      }

      await fetchContractData(accounts[0]);
    } catch (err) {
      console.error("connectWallet error:", err);
      setError(err.message || "Wallet connection failed.");
    }
  }, [fetchContractData]);

  // ── Cast / override vote ────────────────────────────────────────────────
  const castVote = useCallback(async (candidateId) => {
    if (!contractRef.current || !signerRef.current) {
      setError("Please connect your wallet first.");
      return { success: false };
    }
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.vote(candidateId);
      await tx.wait();                        // wait for 1 confirmation
      await fetchContractData(account);       // refresh tallies
      return { success: true, wasOverride: voterRecord.hasVoted };
    } catch (err) {
      console.error("castVote error:", err);
      const msg =
        err?.reason ||
        err?.data?.message ||
        err.message ||
        "Transaction failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, [account, voterRecord.hasVoted, fetchContractData]);

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

  // ── Admin: finalize election ────────────────────────────────────────────
  const finalizeElection = useCallback(async () => {
    if (!contractRef.current) return { success: false };
    clearError();
    setTxPending(true);
    try {
      const tx = await contractRef.current.finalizeElection();
      await tx.wait();
      setIsFinalized(true);
      return { success: true };
    } catch (err) {
      const msg = err?.reason || err.message || "Finalize failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setTxPending(false);
    }
  }, []);

  // ── MetaMask event listeners ────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

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

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
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
    return () => { contract.off("VoteCast", handleVoteCast); };
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

    // Actions
    castVote,
    whitelistWallet,
    addCandidate,
    finalizeElection,

    // UI state
    loading,
    txPending,
    error,
    clearError,

    // Contract config (for display)
    contractAddress: CONTRACT_ADDRESS,
  };
}
