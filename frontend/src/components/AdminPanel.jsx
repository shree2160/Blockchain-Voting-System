import React, { useState } from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * AdminPanel — Professional slide-over administration drawer
 */
export default function AdminPanel({
  isOpen,
  onClose,
  whitelistWallet,
  batchWhitelistWallets,
  addCandidate,
  removeCandidate,
  updateElectionDeadline,
  resetElection,
  finalizeElection,
  transferAdmin,
  isFinalized,
  txPending,
  candidates,
  electionId
}) {
  const { t } = useLocalization();

  const [walletInput,        setWalletInput]        = useState("");
  const [candName,           setCandName]           = useState("");
  const [candPitch,          setCandPitch]          = useState("");
  const [candImage,          setCandImage]          = useState("");
  const [confirmFinalize,    setConfirmFinalize]    = useState(false);
  const [deadlineMinutes,    setDeadlineMinutes]    = useState("60");
  const [newElectionMinutes, setNewElectionMinutes] = useState("60");
  const [confirmReset,       setConfirmReset]       = useState(false);
  const [newAdminInput,      setNewAdminInput]      = useState("");
  const [confirmTransfer,    setConfirmTransfer]    = useState(false);
  const [feedback,           setFeedback]           = useState(null);

  const showFeedback = (msg, type = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleWhitelist = async () => {
    if (!walletInput.trim()) return;
    const rawAddresses = walletInput.split(/[\s,\n]+/);
    const cleanAddresses = rawAddresses
      .map((addr) => addr.trim())
      .filter((addr) => addr.startsWith("0x") && addr.length === 42);

    if (cleanAddresses.length === 0) {
      showFeedback("No valid Ethereum addresses found.", "error");
      return;
    }

    if (cleanAddresses.length === 1) {
      const res = await whitelistWallet(cleanAddresses[0]);
      if (res.success) {
        showFeedback(`Whitelisted: ${cleanAddresses[0].slice(0, 10)}…`);
        setWalletInput("");
      } else {
        showFeedback(res.error, "error");
      }
    } else {
      const res = await batchWhitelistWallets(cleanAddresses);
      if (res.success) {
        showFeedback(`Batch whitelisted ${cleanAddresses.length} wallets`);
        setWalletInput("");
      } else {
        showFeedback(res.error, "error");
      }
    }
  };

  const handleAddCandidate = async () => {
    if (!candName.trim()) return;
    const res = await addCandidate(candName.trim(), candImage.trim() || "", candPitch.trim());
    if (res.success) {
      showFeedback(`Added: ${candName}`);
      setCandName(""); setCandPitch(""); setCandImage("");
    } else {
      showFeedback(res.error, "error");
    }
  };

  const handleRemoveCandidate = async (cid) => {
    const res = await removeCandidate(cid);
    if (res.success) {
      showFeedback(`Candidate #${cid} deactivated`);
    } else {
      showFeedback(res.error, "error");
    }
  };

  const handleUpdateDeadline = async () => {
    const mins = parseFloat(deadlineMinutes);
    if (isNaN(mins) || mins <= 0) {
      showFeedback("Enter a valid duration.", "error");
      return;
    }
    const res = await updateElectionDeadline(mins);
    if (res.success) {
      showFeedback("Deadline updated");
    } else {
      showFeedback(res.error, "error");
    }
  };

  const handleEndNow = async () => {
    // 0.5 mins = 30 seconds (Accounts for 15s Sepolia block time)
    const res = await updateElectionDeadline(0.5);
    if (res.success) {
      showFeedback("Election ending in ~30s…");
    } else {
      showFeedback(res.error, "error");
    }
  };

  const handleResetElection = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const mins = parseInt(newElectionMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      showFeedback("Enter a valid duration.", "error");
      setConfirmReset(false);
      return;
    }
    const res = await resetElection(mins);
    if (res.success) {
      showFeedback(`Election #${electionId + 2} launched`);
      setConfirmReset(false);
    } else {
      showFeedback(res.error, "error");
      setConfirmReset(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirmFinalize) { setConfirmFinalize(true); return; }
    const res = await finalizeElection();
    if (res.success) {
      showFeedback("Election finalized");
      setConfirmFinalize(false);
    } else {
      showFeedback(res.error, "error");
      setConfirmFinalize(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!newAdminInput.trim()) return;
    if (!confirmTransfer) { setConfirmTransfer(true); return; }
    const res = await transferAdmin(newAdminInput.trim());
    if (res.success) {
      showFeedback("Admin rights transferred");
      setNewAdminInput("");
      setConfirmTransfer(false);
    } else {
      showFeedback(res.error, "error");
      setConfirmTransfer(false);
    }
  };

  if (!isOpen) return null;

  const SectionLabel = ({ children }) => (
    <div style={styles.sectionLabel}>{children}</div>
  );

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={styles.drawer} className="anim-fade-in">
        {/* Header */}
        <div style={styles.drawerHeader}>
          <div>
            <span className="badge badge-orange" style={{ marginBottom: 4, display: "inline-block" }}>
              ELECTION #{electionId + 1}
            </span>
            <h2 style={styles.drawerTitle}>
              Admin Dashboard
            </h2>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
            {t("close")}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`toast ${feedback.type}`} style={{ marginBottom: 12 }}>
            {feedback.msg}
          </div>
        )}

        <div className="divider" />

        {/* ── Whitelist ── */}
        <section style={styles.section}>
          <SectionLabel>Voter Whitelisting</SectionLabel>
          <textarea
            className="input"
            placeholder={"0x…\nSeparate multiple with commas or newlines"}
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            rows={2}
            style={{ resize: "vertical", minHeight: 60, lineHeight: 1.4 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleWhitelist}
            disabled={txPending || !walletInput.trim()}
            style={{ marginTop: 8, width: "100%" }}
          >
            {txPending ? <><span className="spinner" /> Sending…</> : "Whitelist Wallet(s)"}
          </button>
        </section>

        <div className="divider" />

        {/* ── Candidates ── */}
        <section style={styles.section}>
          <SectionLabel>Candidates</SectionLabel>

          {/* Active list */}
          <div style={styles.candidateList}>
            {candidates && candidates.length > 0 ? (
              candidates.map((c) => (
                <div key={c.id} style={{
                  ...styles.candidateRow,
                  opacity: c.isActive ? 1 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={styles.candDot}>{c.name[0]?.toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name} {!c.isActive && <span style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>(removed)</span>}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        {c.voteCount} votes
                      </div>
                    </div>
                  </div>
                  {c.isActive && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveCandidate(c.id)}
                      disabled={txPending}
                      style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: "var(--text-3)", fontSize: "0.82rem" }}>No candidates yet.</p>
            )}
          </div>

          {/* Add candidate form */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={styles.subLabel}>Add New</span>
            <input
              className="input"
              placeholder={t("candidateName")}
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
            />
            <input
              className="input"
              placeholder={t("candidatePitch")}
              value={candPitch}
              onChange={(e) => setCandPitch(e.target.value)}
            />
            <input
              className="input"
              placeholder="Image URI (optional)"
              value={candImage}
              onChange={(e) => setCandImage(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddCandidate}
              disabled={txPending || !candName.trim()}
              style={{ width: "100%", marginTop: 4 }}
            >
              {txPending ? <><span className="spinner" /> Adding…</> : "Add Candidate"}
            </button>
          </div>
        </section>

        <div className="divider" />

        {/* ── Election Timer ── */}
        <section style={styles.section}>
          <SectionLabel>Election Timer</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              className="input"
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(e.target.value)}
              placeholder="Minutes"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleUpdateDeadline}
              disabled={txPending || !deadlineMinutes}
              style={{ whiteSpace: "nowrap" }}
            >
              Extend
            </button>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleEndNow}
            disabled={txPending}
            style={{ width: "100%", marginTop: 8 }}
          >
            End Election Now (30s)
          </button>
        </section>

        <div className="divider" />

        {/* ── New Election ── */}
        <section style={styles.section}>
          <SectionLabel>Launch New Election</SectionLabel>
          <p style={{ color: "var(--text-3)", fontSize: "0.75rem", marginBottom: 8 }}>
            Archives current data and starts a fresh cohort.
          </p>
          <input
            type="number"
            className="input"
            value={newElectionMinutes}
            onChange={(e) => setNewElectionMinutes(e.target.value)}
            placeholder="Duration (minutes)"
          />
          {confirmReset && (
            <p style={{ color: "var(--amber)", fontSize: "0.75rem", margin: "8px 0 0" }}>
              ⚠ This will reset all candidates and votes. Proceed?
            </p>
          )}
          <button
            className="btn btn-danger"
            onClick={handleResetElection}
            disabled={txPending || !newElectionMinutes}
            style={{ width: "100%", marginTop: 8 }}
          >
            {confirmReset ? "Confirm Launch" : "Launch Next Election"}
          </button>
          {confirmReset && (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmReset(false)}
              style={{ width: "100%", marginTop: 6 }}
            >
              Cancel
            </button>
          )}
        </section>

        <div className="divider" />

        {/* ── Transfer Admin ── */}
        <section style={styles.section}>
          <SectionLabel>Transfer Admin</SectionLabel>
          <input
            className="input"
            placeholder="New Admin Address (0x…)"
            value={newAdminInput}
            onChange={(e) => setNewAdminInput(e.target.value)}
          />
          {confirmTransfer && (
            <p style={{ color: "var(--amber)", fontSize: "0.75rem", margin: "8px 0 0" }}>
              ⚠ This is irreversible. Confirm?
            </p>
          )}
          <button
            className="btn btn-danger"
            onClick={handleTransferAdmin}
            disabled={txPending || !newAdminInput.trim()}
            style={{ width: "100%", marginTop: 8 }}
          >
            {confirmTransfer ? "Confirm Transfer" : "Transfer Admin"}
          </button>
          {confirmTransfer && (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmTransfer(false)}
              style={{ width: "100%", marginTop: 6 }}
            >
              Cancel
            </button>
          )}
        </section>

        <div className="divider" />

        {/* ── Finalize ── */}
        <section style={styles.section}>
          <SectionLabel>{t("finalizeElection")}</SectionLabel>
          {!isFinalized ? (
            <>
              {confirmFinalize && (
                <p style={{ color: "var(--amber)", fontSize: "0.78rem", marginBottom: 8 }}>
                  ⚠ {t("confirmFinalize")}
                </p>
              )}
              <button
                className="btn btn-danger"
                onClick={handleFinalize}
                disabled={txPending}
                style={{ width: "100%" }}
              >
                {confirmFinalize ? "Confirm Finalize" : t("finalizeElection")}
              </button>
              {confirmFinalize && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmFinalize(false)}
                  style={{ width: "100%", marginTop: 6 }}
                >
                  {t("cancel")}
                </button>
              )}
            </>
          ) : (
            <span className="badge badge-green">Finalized</span>
          )}
        </section>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: "min(420px, 100vw)",
    background: "var(--bg)",
    borderLeft: "1px solid var(--border)",
    zIndex: 201,
    overflowY: "auto",
    padding: 24,
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  drawerTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-1)",
    margin: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sectionLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    marginBottom: 8,
    fontFamily: "var(--font-mono)",
  },
  subLabel: {
    fontSize: "0.7rem",
    color: "var(--text-3)",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.5px",
  },
  candidateList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 200,
    overflowY: "auto",
    paddingRight: 4,
  },
  candidateRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
  },
  candDot: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: "var(--surface-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--text-2)",
    flexShrink: 0,
  },
};
