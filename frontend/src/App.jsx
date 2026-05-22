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

// ── Main app inner ───────────────────────────────────────────────────────
function AppInner() {
  const { t } = useLocalization();
  const voting = useVoting();

  const [pendingVote,      setPendingVote]      = useState(null);
  const [adminOpen,        setAdminOpen]        = useState(false);
  const [toasts,           setToasts]           = useState([]);
  const [studentId,        setStudentId]        = useState("");
  const [voucherSignature, setVoucherSignature] = useState("");

  const handleGetVoucher = async () => {
    if (!studentId.trim()) return;
    addToast("Authenticating credentials…", "info");
    const sig = await voting.generateMockSignature(voting.account);
    if (sig) {
      setVoucherSignature(sig);
      addToast("Signature voucher received", "success");
    } else {
      addToast("Signature generation failed", "error");
    }
  };

  const handleSelfRegister = async () => {
    if (!voucherSignature) return;
    addToast("Validating on blockchain…", "info");
    const res = await voting.registerVoter(voucherSignature);
    if (res.success) {
      addToast("Wallet registered and whitelisted!", "success");
      setVoucherSignature("");
      setStudentId("");
    } else {
      addToast(`Registration failed: ${res.error}`, "error");
    }
  };

  const addToast = (msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const handleVoteClick = (candidateId) => {
    const cand = voting.candidates.find((c) => c.id === candidateId);
    setPendingVote(cand);
  };

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

  const electionActive = voting.timeLeft > 0 && !voting.isFinalized;
  const canVote = electionActive && voting.isWhitelisted;
  const activeCandidates = voting.candidates.filter(c => c.isActive);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <Header
        account={voting.account}
        chainId={voting.chainId}
        networkName={voting.networkName}
        isAdmin={voting.isAdmin}
        connectWallet={voting.connectWallet}
        txPending={voting.txPending}
      />

      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        whitelistWallet={voting.whitelistWallet}
        batchWhitelistWallets={voting.batchWhitelistWallets}
        addCandidate={voting.addCandidate}
        removeCandidate={voting.removeCandidate}
        updateElectionDeadline={voting.updateElectionDeadline}
        resetElection={voting.resetElection}
        finalizeElection={voting.finalizeElection}
        transferAdmin={voting.transferAdmin}
        isFinalized={voting.isFinalized}
        txPending={voting.txPending}
        candidates={voting.candidates}
        electionId={voting.electionId}
      />

      <VoteOverlay
        candidate={pendingVote}
        isOverride={voting.voterRecord.hasVoted}
        onConfirm={handleConfirmVote}
        onCancel={() => setPendingVote(null)}
        txPending={voting.txPending}
      />

      <ToastContainer toasts={toasts} />

      <main style={styles.main}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section style={styles.hero} className="anim-fade-in">
          {/* Status pill */}
          <div style={styles.statusPill}>
            <span className="dot-pulse" style={{ color: electionActive ? "var(--green)" : "var(--red)" }} />
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              color: electionActive ? "var(--green)" : "var(--red)",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}>
              {electionActive ? t("electionActive").toUpperCase() : t("electionEnded").toUpperCase()}
            </span>
          </div>

          <h2 style={styles.heroTitle}>
            <span className="text-gradient">{t("appTitle")}</span>
          </h2>
          <p style={styles.heroSub}>{t("appTagline")}</p>

          {/* Stats */}
          <div style={styles.statsRow}>
            <Stat label={t("totalVotes")} value={voting.totalVotes} />
            <Stat label={t("candidates")} value={activeCandidates.length} />
            <Stat
              label={electionActive ? t("electionEndsIn") : t("electionEnded")}
              value={electionActive ? formatTime(voting.timeLeft) : "—"}
              mono
            />
          </div>

          {/* Notices */}
          <div style={styles.noticeRow}>
            <div style={styles.notice}>
              <span style={{ fontSize: "0.85rem" }}>🔒</span>
              <span>{t("privacyNotice")}</span>
            </div>
            {electionActive && voting.account && (
              <div style={{ ...styles.notice, background: "var(--accent-soft)", borderColor: "rgba(232,89,12,0.1)" }}>
                <span style={{ fontSize: "0.85rem" }}>🛡️</span>
                <span style={{ color: "var(--text-2)" }}>{t("antiCoercionNotice")}</span>
              </div>
            )}
          </div>

          {/* Error */}
          {voting.error && (
            <div style={styles.errorBanner} className="anim-fade-in">
              <span>⚠ {voting.error}</span>
              <button onClick={voting.clearError} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Connect CTA */}
          {!voting.account && (
            <button className="btn btn-primary" style={{ marginTop: 20, padding: "12px 32px" }} onClick={voting.connectWallet}>
              {t("connectWallet")}
            </button>
          )}

          {/* Self Registration Portal */}
          {voting.account && !voting.isWhitelisted && (
            <div style={styles.regCard} className="anim-fade-in-up">
              <h3 style={styles.regTitle}>Student Verification</h3>
              <p style={styles.regSub}>
                Verify your student status off-chain. The campus authority will sign your anonymous wallet to authorize your vote.
              </p>

              <div style={styles.regForm}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>WALLET</label>
                  <input
                    className="input"
                    readOnly
                    value={voting.account}
                    style={{ background: "var(--surface-3)", fontSize: "0.78rem" }}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>STUDENT ID</label>
                  <input
                    className="input"
                    placeholder="e.g. S10245"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>

                {!voucherSignature ? (
                  <button
                    className="btn btn-secondary"
                    disabled={!studentId.trim() || voting.txPending}
                    onClick={handleGetVoucher}
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    1. Get Campus Signature
                  </button>
                ) : (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    <div style={styles.voucherBox}>
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 600 }}>✓ VOUCHER RECEIVED</span>
                      <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-3)", overflowWrap: "anywhere" }}>
                        {voucherSignature.slice(0, 48)}…
                      </span>
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={voting.txPending}
                      onClick={handleSelfRegister}
                      style={{ width: "100%" }}
                    >
                      2. Register on Blockchain
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.72rem", padding: "4px 8px", width: "fit-content", alignSelf: "center" }}
                      onClick={() => setVoucherSignature("")}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vote status chip */}
          {voting.account && voting.isWhitelisted && (
            <div style={styles.voteChip}>
              {voting.voterRecord.hasVoted
                ? <>✓ {t("youVotedFor")} <strong style={{ color: "var(--accent)" }}>{voting.candidates[voting.voterRecord.candidateId]?.name}</strong></>
                : <>{t("noVoteYet")}</>}
            </div>
          )}

          {/* Winner */}
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
              {t("adminPanel")}
            </button>
          )}
        </section>

        {/* ── Candidates grid ──────────────────────────────────── */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span>{t("liveResults")}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 400 }}>
              {activeCandidates.length} active
            </span>
          </h3>

          {voting.loading ? (
            <div style={styles.grid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 300, borderRadius: 16 }} />
              ))}
            </div>
          ) : activeCandidates.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                No active candidates registered.
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {activeCandidates.map((c, i) => (
                <div key={c.id} className="anim-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
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
        <section style={{ ...styles.section, maxWidth: 640, margin: "0 auto 64px" }}>
          <h3 style={styles.sectionTitle}>
            <span>{t("howItWorks")}</span>
          </h3>
          <div style={styles.stepsGrid} className="steps-grid">
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
          <span className="text-mono" style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>
            CryptoVote Campus V2.0 · Ethereum ·{" "}
            {voting.contractAddress
              ? `${voting.contractAddress.slice(0, 10)}…`
              : "No contract"}
          </span>
        </footer>
      </main>
    </div>
  );
}

// ── Stat component ──────────────────────────────────────────────────────
function Stat({ label, value, mono }) {
  return (
    <div style={styles.stat}>
      <div style={{
        fontSize: "1.6rem",
        fontWeight: 800,
        fontFamily: mono ? "var(--font-mono)" : "var(--font)",
        color: "var(--text-1)",
        lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: "0.68rem",
        color: "var(--text-3)",
        marginTop: 4,
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        fontFamily: "var(--font-mono)",
      }}>
        {label}
      </div>
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

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  main: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "48px 24px",
  },
  hero: {
    textAlign: "center",
    marginBottom: 64,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "4px 12px",
  },
  heroTitle: {
    fontSize: "clamp(2rem, 5vw, 3rem)",
    fontWeight: 800,
    lineHeight: 1.1,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  heroSub: {
    fontSize: "0.95rem",
    color: "var(--text-3)",
    maxWidth: 400,
    lineHeight: 1.5,
  },
  statsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 520,
    marginTop: 8,
  },
  stat: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 20px",
    textAlign: "center",
    flex: 1,
    minWidth: 110,
  },
  noticeRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
    maxWidth: 520,
    marginTop: 4,
  },
  notice: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: "0.78rem",
    color: "var(--text-3)",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "rgba(239,68,68,0.06)",
    border: "1px solid rgba(239,68,68,0.15)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "var(--red)",
    fontSize: "0.82rem",
    width: "100%",
    maxWidth: 520,
  },
  voteChip: {
    background: "var(--accent-soft)",
    border: "1px solid rgba(232,89,12,0.12)",
    borderRadius: 8,
    padding: "6px 16px",
    fontSize: "0.82rem",
    color: "var(--text-2)",
  },
  regCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24,
    maxWidth: 440,
    width: "100%",
    marginTop: 12,
  },
  regTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--text-1)",
    margin: "0 0 6px 0",
  },
  regSub: {
    fontSize: "0.78rem",
    color: "var(--text-3)",
    lineHeight: 1.5,
    margin: "0 0 16px 0",
  },
  regForm: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    width: "100%",
    textAlign: "left",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.62rem",
    letterSpacing: "1.5px",
    color: "var(--text-3)",
    fontWeight: 600,
  },
  voucherBox: {
    background: "rgba(34,197,94,0.06)",
    border: "1px solid rgba(34,197,94,0.15)",
    borderRadius: 8,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textAlign: "left",
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: 20,
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  empty: {
    textAlign: "center",
    padding: "56px 0",
    background: "var(--surface)",
    borderRadius: 16,
    border: "1px dashed var(--border)",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  stepCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "20px 14px",
    textAlign: "center",
    transition: "border-color 0.2s",
  },
  stepNum: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--accent)",
    letterSpacing: "2px",
    marginBottom: 6,
  },
  stepIcon: {
    fontSize: "1.4rem",
    marginBottom: 8,
  },
  stepText: {
    fontSize: "0.78rem",
    color: "var(--text-3)",
    lineHeight: 1.5,
  },
  footer: {
    textAlign: "center",
    paddingTop: 20,
    borderTop: "1px solid var(--border)",
    marginTop: 20,
  },
};
