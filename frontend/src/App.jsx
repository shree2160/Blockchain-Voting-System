import React, { useState } from "react";
import "./index.css";
import { LocalizationProvider, useLocalization } from "./context/LocalizationContext";
import { useVoting } from "./hooks/useVoting";
import Header from "./components/Header";
import CandidateCard from "./components/CandidateCard";
import VoteOverlay from "./components/VoteOverlay";
import AdminPanel from "./components/AdminPanel";

// ── Countdown formatter ───────────────────────────────────────────────────
function formatTime(seconds) {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ── Toast manager ────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

// ── Main app inner (needs localization context) ───────────────────────────
function AppInner() {
  const { t } = useLocalization();
  const voting = useVoting();

  const [pendingVote,    setPendingVote]    = useState(null); // candidate to confirm
  const [adminOpen,      setAdminOpen]      = useState(false);
  const [toasts,         setToasts]         = useState([]);
  const [studentId,        setStudentId]        = useState("");
  const [voucherSignature, setVoucherSignature] = useState("");

  const handleGetVoucher = async () => {
    if (!studentId.trim()) return;
    addToast("🔄 Authenticating student credentials...", "info");
    const sig = await voting.generateMockSignature(voting.account);
    if (sig) {
      setVoucherSignature(sig);
      addToast("🔑 Signature voucher received off-chain!", "success");
    } else {
      addToast("✗ Off-chain registration signature failed.", "error");
    }
  };

  const handleSelfRegister = async () => {
    if (!voucherSignature) return;
    addToast("⏳ Validating voucher on blockchain...", "info");
    const res = await voting.registerVoter(voucherSignature);
    if (res.success) {
      addToast("🎉 Wallet successfully registered and whitelisted on-chain!", "success");
      setVoucherSignature("");
      setStudentId("");
    } else {
      addToast(`✗ Registration rejected: ${res.error}`, "error");
    }
  };

  // ── Toast helper ──────────────────────────────────────────────────────
  const addToast = (msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // ── Kick off vote confirm flow ────────────────────────────────────────
  const handleVoteClick = (candidateId) => {
    const cand = voting.candidates.find((c) => c.id === candidateId);
    setPendingVote(cand);
  };

  // ── Execute confirmed vote ────────────────────────────────────────────
  const handleConfirmVote = async () => {
    if (!pendingVote) return;
    const wasOverride = voting.voterRecord.hasVoted;
    const result = await voting.castVote(pendingVote.id);
    setPendingVote(null);
    if (result.success) {
      addToast(wasOverride ? t("txOverride") : t("txSuccess"), "success");
    } else {
      addToast(result.error || t("txError"), "error");
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const electionActive = voting.timeLeft > 0 && !voting.isFinalized;
  const canVote        = electionActive && voting.isWhitelisted;

  // ── Hero stats ────────────────────────────────────────────────────────
  const StatPill = ({ label, value, accent }) => (
    <div style={{
      background: "#0f0f0f",
      border: "1px solid #1e1e1e",
      borderRadius: 16,
      padding: "16px 24px",
      textAlign: "center",
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{
        fontSize: "2rem",
        fontWeight: 900,
        fontFamily: "'JetBrains Mono', monospace",
        color: accent || "#ff6b00",
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#5a5a5a", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Header */}
      <Header
        account={voting.account}
        chainId={voting.chainId}
        networkName={voting.networkName}
        isAdmin={voting.isAdmin}
        connectWallet={voting.connectWallet}
        txPending={voting.txPending}
      />

      {/* Admin panel */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        whitelistWallet={voting.whitelistWallet}
        batchWhitelistWallets={voting.batchWhitelistWallets}
        addCandidate={voting.addCandidate}
        finalizeElection={voting.finalizeElection}
        isFinalized={voting.isFinalized}
        txPending={voting.txPending}
      />

      {/* Vote confirm overlay */}
      <VoteOverlay
        candidate={pendingVote}
        isOverride={voting.voterRecord.hasVoted}
        onConfirm={handleConfirmVote}
        onCancel={() => setPendingVote(null)}
        txPending={voting.txPending}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />

      <main style={styles.main}>
        {/* ── Hero section ─────────────────────────────────────── */}
        <section style={styles.hero} className="anim-fade-in">
          <div style={styles.heroTag}>
            <span className="dot-pulse" style={{ color: electionActive ? "#00e676" : "#ff1744" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem", color: electionActive ? "#00e676" : "#ff1744" }}>
              {electionActive ? t("electionActive") : t("electionEnded")}
            </span>
          </div>

          <h2 style={styles.heroTitle}>
            <span className="text-gradient">{t("appTitle")}</span>
          </h2>
          <p style={styles.heroSub}>{t("appTagline")}</p>

          {/* Stat pills */}
          <div style={styles.statsRow}>
            <StatPill label={t("totalVotes")} value={voting.totalVotes} />
            <StatPill label={t("candidates")} value={voting.candidates.length} accent="#9a9a9a" />
            <StatPill
              label={electionActive ? t("electionEndsIn") : t("electionEnded")}
              value={electionActive ? formatTime(voting.timeLeft) : "—"}
              accent={electionActive ? "#ff6b00" : "#5a5a5a"}
            />
          </div>

          {/* Privacy / anti-coercion notices */}
          <div style={styles.noticesRow}>
            <div style={styles.notice}>
              <span>🔒</span>
              <span style={{ fontSize: "0.8rem", color: "#9a9a9a" }}>{t("privacyNotice")}</span>
            </div>
            {electionActive && voting.account && (
              <div style={{ ...styles.notice, borderColor: "rgba(255,107,0,0.3)", background: "rgba(255,107,0,0.06)" }}>
                <span>🛡️</span>
                <span style={{ fontSize: "0.8rem", color: "#ff8c35" }}>{t("antiCoercionNotice")}</span>
              </div>
            )}
          </div>

          {/* Error banner */}
          {voting.error && (
            <div style={styles.errorBanner} className="anim-fade-in">
              <span>⚠️ {voting.error}</span>
              <button onClick={voting.clearError} style={{ background: "none", border: "none", color: "#ff1744", cursor: "pointer", fontSize: "1rem" }}>×</button>
            </div>
          )}

          {/* Not connected CTA */}
          {!voting.account && (
            <button className="btn btn-primary" style={{ marginTop: 16, fontSize: "1rem", padding: "14px 36px" }} onClick={voting.connectWallet}>
              🦊 {t("connectWallet")}
            </button>
          )}

          {/* Cryptographic Voter Self-Registration (ECDSA) Portal */}
          {voting.account && !voting.isWhitelisted && (
            <div style={styles.selfRegCard} className="anim-fade-in-up">
              <h3 style={styles.selfRegTitle}>🎓 Student Verification Portal</h3>
              <p style={styles.selfRegSub}>
                To maintain 100% privacy, verify your student status off-chain. 
                The campus registration authority will sign your anonymous wallet address to authorize your vote.
              </p>
              
              <div style={styles.selfRegForm}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", textAlign: "left" }}>
                  <label style={styles.selfRegLabel}>ANONYMOUS WALLET</label>
                  <input 
                    className="input" 
                    readOnly 
                    value={voting.account} 
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", background: "rgba(255,255,255,0.03)" }}
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 12, textAlign: "left" }}>
                  <label style={styles.selfRegLabel}>STUDENT ID (Mock SSO login)</label>
                  <input 
                    className="input" 
                    placeholder="Enter Student ID (e.g. S10245)" 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>

                {!voucherSignature ? (
                  <button 
                    className="btn btn-secondary" 
                    disabled={!studentId.trim() || voting.txPending}
                    onClick={handleGetVoucher}
                    style={{ marginTop: 16, width: "100%", padding: "10px 0" }}
                  >
                    🔒 1. Get Campus Signature Voucher
                  </button>
                ) : (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                    <div style={{ background: "rgba(0, 230, 118, 0.08)", border: "1px solid #00e676", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace", color: "#00e676", fontWeight: "bold" }}>✓ SIGNATURE VOUCHER RECEIVED</span>
                      <span style={{ fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace", color: "#a5d6a7", overflowWrap: "anywhere" }}>
                        {voucherSignature.slice(0, 48)}...
                      </span>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      disabled={voting.txPending}
                      onClick={handleSelfRegister}
                      style={{ width: "100%", padding: "12px 0" }}
                    >
                      🚀 2. Register Wallet on Blockchain
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "4px", marginTop: 4, width: "60px", alignSelf: "center" }}
                      onClick={() => setVoucherSignature("")}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My vote status */}
          {voting.account && voting.isWhitelisted && (
            <div style={styles.myVoteChip}>
              {voting.voterRecord.hasVoted
                ? <>✓ {t("youVotedFor")} <strong style={{ color: "#ff6b00" }}>{voting.candidates[voting.voterRecord.candidateId]?.name}</strong></>
                : <>{t("noVoteYet")}</>}
            </div>
          )}

          {/* Winner announcement celebration banner */}
          {voting.winner && (
            <div className="winner-card anim-fade-in-up">
              <div className="winner-crown">🏆</div>
              <h3 className="winner-title">{t("winner")}</h3>
              <div className="winner-name">{voting.winner.name}</div>
              <p className="winner-tally">
                {voting.winner.votes} {t("votes")} ({voting.totalVotes > 0 ? ((voting.winner.votes / voting.totalVotes) * 100).toFixed(1) : 0}%)
              </p>
              <div className="winner-stripe" />
            </div>
          )}

          {/* Admin button */}
          {voting.isAdmin && (
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setAdminOpen(true)}>
              ⚡ {t("adminPanel")}
            </button>
          )}
        </section>

        {/* ── Candidates grid ─────────────────────────────────── */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t("liveResults")}</h3>

          {voting.loading ? (
            <div style={styles.skeletonGrid}>
              {[1,2,3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 340, borderRadius: 20 }} />
              ))}
            </div>
          ) : voting.candidates.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: "#5a5a5a", fontFamily: "'JetBrains Mono', monospace" }}>
                No candidates added yet.
              </p>
            </div>
          ) : (
            <div style={styles.candidatesGrid}>
              {voting.candidates.map((c, i) => (
                <div key={c.id} className="anim-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <CandidateCard
                    candidate={c}
                    totalVotes={voting.totalVotes}
                    isVotedFor={voting.voterRecord.hasVoted && voting.voterRecord.candidateId === c.id}
                    canVote={canVote}
                    hasVoted={voting.voterRecord.hasVoted}
                    txPending={voting.txPending}
                    onVote={handleVoteClick}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section style={{ ...styles.section, maxWidth: 680, margin: "0 auto 64px" }}>
          <h3 style={styles.sectionTitle}>{t("howItWorks")}</h3>
          <div style={styles.stepsGrid}>
            {[
              { num: "01", key: "step1", icon: "🔐" },
              { num: "02", key: "step2", icon: "✅" },
              { num: "03", key: "step3", icon: "🗳️" },
            ].map((step) => (
              <div key={step.num} style={styles.stepCard}>
                <div style={styles.stepNum}>{step.num}</div>
                <div style={styles.stepIcon}>{step.icon}</div>
                <p style={styles.stepText}>{t(step.key)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <span className="text-mono" style={{ color: "#5a5a5a", fontSize: "0.78rem" }}>
            CryptoVote Campus V2.0 · Built on Ethereum ·{" "}
            {voting.contractAddress
              ? `Contract: ${voting.contractAddress.slice(0, 10)}...`
              : "No contract connected"}
          </span>
        </footer>
      </main>
    </div>
  );
}

// ── Root export ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <LocalizationProvider>
      <AppInner />
    </LocalizationProvider>
  );
}

// ── Inline styles ────────────────────────────────────────────────────────
const styles = {
  main: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "40px 24px",
  },
  hero: {
    textAlign: "center",
    marginBottom: 56,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  heroTag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 999,
    padding: "5px 14px",
  },
  heroTitle: {
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: 900,
    lineHeight: 1.1,
    margin: 0,
  },
  heroSub: {
    fontSize: "1rem",
    color: "#9a9a9a",
    maxWidth: 500,
  },
  statsRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 600,
  },
  noticesRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 600,
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1e1e1e",
    borderRadius: 12,
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "rgba(255,23,68,0.08)",
    border: "1px solid rgba(255,23,68,0.35)",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#ff1744",
    fontSize: "0.88rem",
    width: "100%",
    maxWidth: 600,
  },
  warnBanner: {
    background: "rgba(255,196,0,0.08)",
    border: "1px solid rgba(255,196,0,0.3)",
    borderRadius: 12,
    padding: "12px 20px",
    color: "#ffc400",
    fontSize: "0.88rem",
  },
  myVoteChip: {
    background: "rgba(255,107,0,0.08)",
    border: "1px solid rgba(255,107,0,0.25)",
    borderRadius: 999,
    padding: "8px 20px",
    fontSize: "0.88rem",
    color: "#9a9a9a",
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#f5f5f5",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  candidatesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 24,
  },
  skeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 24,
  },
  emptyState: {
    textAlign: "center",
    padding: "64px 0",
    background: "#0f0f0f",
    borderRadius: 20,
    border: "1px dashed #1e1e1e",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  stepCard: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: "24px 16px",
    textAlign: "center",
    transition: "border-color 0.3s",
  },
  stepNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    color: "#ff6b00",
    letterSpacing: "2px",
    marginBottom: 8,
  },
  stepIcon: {
    fontSize: "1.8rem",
    marginBottom: 10,
  },
  stepText: {
    fontSize: "0.83rem",
    color: "#9a9a9a",
    lineHeight: 1.6,
  },
  footer: {
    textAlign: "center",
    paddingTop: 24,
    borderTop: "1px solid #1e1e1e",
    marginTop: 24,
  },
  selfRegCard: {
    background: "linear-gradient(135deg, rgba(255,107,0,0.06) 0%, rgba(0,0,0,0) 100%)",
    border: "1px solid rgba(255,107,0,0.2)",
    borderRadius: 20,
    padding: 24,
    maxWidth: 500,
    width: "100%",
    marginTop: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  },
  selfRegTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 8px 0",
  },
  selfRegSub: {
    fontSize: "0.82rem",
    color: "#9a9a9a",
    lineHeight: 1.5,
    margin: "0 0 20px 0",
  },
  selfRegForm: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  selfRegLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.68rem",
    letterSpacing: "1.5px",
    color: "#ff6b00",
    fontWeight: "bold",
  },
};
