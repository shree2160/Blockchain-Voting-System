import React, { useState } from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * AdminPanel — High-Fidelity Institute Administration Dashboard Drawer
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
      showFeedback("✗ No valid Ethereum addresses (0x...) found.", "error");
      return;
    }

    if (cleanAddresses.length === 1) {
      const res = await whitelistWallet(cleanAddresses[0]);
      if (res.success) {
        showFeedback(`✓ Whitelisted: ${cleanAddresses[0].slice(0, 10)}...`);
        setWalletInput("");
      } else {
        showFeedback(`✗ ${res.error}`, "error");
      }
    } else {
      const res = await batchWhitelistWallets(cleanAddresses);
      if (res.success) {
        showFeedback(`✓ Batch whitelisted ${cleanAddresses.length} wallets!`);
        setWalletInput("");
      } else {
        showFeedback(`✗ ${res.error}`, "error");
      }
    }
  };

  const handleAddCandidate = async () => {
    if (!candName.trim()) return;
    const res = await addCandidate(candName.trim(), candImage.trim() || "", candPitch.trim());
    if (res.success) {
      showFeedback(`✓ Added candidate: ${candName}`);
      setCandName(""); setCandPitch(""); setCandImage("");
    } else {
      showFeedback(`✗ ${res.error}`, "error");
    }
  };

  const handleRemoveCandidate = async (cid) => {
    const res = await removeCandidate(cid);
    if (res.success) {
      showFeedback(`✓ Candidate index #${cid} successfully deactivated.`);
    } else {
      showFeedback(`✗ ${res.error}`, "error");
    }
  };

  const handleUpdateDeadline = async () => {
    const mins = parseInt(deadlineMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      showFeedback("✗ Please enter a valid positive duration in minutes.", "error");
      return;
    }
    const res = await updateElectionDeadline(mins);
    if (res.success) {
      showFeedback(`✓ Countdown deadline shifted by ${mins} minutes!`);
    } else {
      showFeedback(`✗ ${res.error}`, "error");
    }
  };

  const handleResetElection = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const mins = parseInt(newElectionMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      showFeedback("✗ Please enter a valid duration for the new election.", "error");
      setConfirmReset(false);
      return;
    }
    const res = await resetElection(mins);
    if (res.success) {
      showFeedback(`🚀 New election Cohort #${electionId + 2} started!`);
      setConfirmReset(false);
    } else {
      showFeedback(`✗ ${res.error}`, "error");
      setConfirmReset(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirmFinalize) { setConfirmFinalize(true); return; }
    const res = await finalizeElection();
    if (res.success) {
      showFeedback("🔒 Election finalized!");
      setConfirmFinalize(false);
    } else {
      showFeedback(`✗ ${res.error}`, "error");
      setConfirmFinalize(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={styles.drawer} className="anim-fade-in">
        <div style={styles.drawerHeader}>
          <div>
            <span className="badge badge-orange" style={{ fontSize: "0.75rem", marginBottom: 4, display: "inline-block" }}>
              🏛️ COHORT ELECTION #{electionId + 1}
            </span>
            <h2 style={styles.drawerTitle}>
              {t("adminPanel") || "Institute Dashboard"}
            </h2>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: "6px 14px" }}>
            {t("close")}
          </button>
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className={`toast ${feedback.type}`} style={{ marginBottom: 16 }}>
            {feedback.msg}
          </div>
        )}

        <div className="divider" />

        {/* ── Whitelist voter ── */}
        <section style={styles.section}>
          <label style={styles.label}>{t("whitelistAddress")}</label>
          <textarea
            className="input"
            placeholder="0x...&#10;For multiple: separate with commas, spaces or newlines."
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            rows={3}
            style={{
              resize: "vertical",
              minHeight: "80px",
              lineHeight: "1.4",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.82rem"
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleWhitelist}
            disabled={txPending || !walletInput.trim()}
            style={{ marginTop: 8 }}
          >
            {txPending ? <><span className="spinner" /> Sending...</> : `🔑 ${t("whitelistBtn")}`}
          </button>
        </section>

        <div className="divider" />

        {/* ── Candidate Management ── */}
        <section style={styles.section}>
          <label style={styles.label}>Manage Candidates</label>
          
          {/* Active List */}
          <div style={styles.candidateGrid}>
            {candidates && candidates.length > 0 ? (
              candidates.map((c) => (
                <div key={c.id} style={{
                  ...styles.candidateCard,
                  opacity: c.isActive ? 1 : 0.45
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {c.imageUri ? (
                      <img src={c.imageUri} alt={c.name} style={styles.candThumb} />
                    ) : (
                      <div style={styles.candThumbPlaceholder}>🗳️</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#f5f5f5" }}>
                        {c.name} {!c.isActive && "(Removed)"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#8a8a8a" }}>
                        Votes: {c.voteCount}
                      </div>
                    </div>
                  </div>
                  {c.isActive && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveCandidate(c.id)}
                      disabled={txPending}
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      title="Remove Candidate"
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: "#777", fontSize: "0.82rem", margin: "4px 0" }}>No candidates registered for this cohort yet.</p>
            )}
          </div>

          {/* Add candidate input form */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: "0.75rem", color: "#8a8a8a", display: "block", marginBottom: 6 }}>
              Add New Candidate
            </label>
            <input
              className="input"
              placeholder={t("candidateName")}
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
              style={{ marginBottom: 8, fontSize: "0.82rem", padding: "8px 10px" }}
            />
            <input
              className="input"
              placeholder={t("candidatePitch")}
              value={candPitch}
              onChange={(e) => setCandPitch(e.target.value)}
              style={{ marginBottom: 8, fontSize: "0.82rem", padding: "8px 10px" }}
            />
            <input
              className="input"
              placeholder="Image URI (optional, IPFS/HTTPS)"
              value={candImage}
              onChange={(e) => setCandImage(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "8px 10px" }}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddCandidate}
              disabled={txPending || !candName.trim()}
              style={{ marginTop: 10, width: "100%" }}
            >
              {txPending ? <><span className="spinner" /> Adding...</> : `➕ Add Candidate`}
            </button>
          </div>
        </section>

        <div className="divider" />

        {/* ── Extend/Shift Deadline ── */}
        <section style={styles.section}>
          <label style={styles.label}>Extend Countdown Timer</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              className="input"
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(e.target.value)}
              placeholder="Minutes"
              style={{ flex: 1, fontSize: "0.85rem", padding: "6px 10px" }}
            />
            <button
              className="btn btn-primary"
              onClick={handleUpdateDeadline}
              disabled={txPending || !deadlineMinutes}
              style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              ⏳ Shift Timer
            </button>
          </div>
        </section>

        <div className="divider" />

        {/* ── Reset & Launch Next Election ── */}
        <section style={styles.section}>
          <label style={styles.label}>Launch New Cohort Election</label>
          <p style={{ color: "#8a8a8a", fontSize: "0.78rem", marginBottom: 8 }}>
            Resets the active candidates list and increments the election cohort. Securely archives former choices.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="number"
              className="input"
              value={newElectionMinutes}
              onChange={(e) => setNewElectionMinutes(e.target.value)}
              placeholder="Duration in Minutes"
              style={{ fontSize: "0.85rem", padding: "8px 10px" }}
            />
            {confirmReset && (
              <p style={{ color: "#ff6b00", fontSize: "0.78rem", margin: "4px 0" }}>
                ⚠️ WARNING: This will immediately archive the current voting logs and reset all candidate entries! Proceed?
              </p>
            )}
            <button
              className="btn btn-danger"
              onClick={handleResetElection}
              disabled={txPending || !newElectionMinutes}
              style={{ width: "100%" }}
            >
              {confirmReset ? "🚀 Confirm Launch!" : "🚀 Launch Next Election"}
            </button>
            {confirmReset && (
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmReset(false)}
                style={{ width: "100%" }}
              >
                Cancel
              </button>
            )}
          </div>
        </section>

        <div className="divider" />

        {/* ── Finalize election ── */}
        <section style={styles.section}>
          <label style={styles.label}>{t("finalizeElection")}</label>
          {!isFinalized ? (
            <>
              {confirmFinalize && (
                <p style={{ color: "#ff6b00", fontSize: "0.85rem", marginBottom: 10 }}>
                  ⚠️ {t("confirmFinalize")}
                </p>
              )}
              <button
                className="btn btn-danger"
                onClick={handleFinalize}
                disabled={txPending}
                style={{ marginTop: 6 }}
              >
                {confirmFinalize ? `🔒 ${t("confirm")}` : `🔒 ${t("finalizeElection")}`}
              </button>
              {confirmFinalize && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmFinalize(false)}
                  style={{ marginTop: 8 }}
                >
                  {t("cancel")}
                </button>
              )}
            </>
          ) : (
            <span className="badge badge-red">Election Finalized</span>
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
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(5px)",
    zIndex: 200,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: "min(460px, 100vw)",
    background: "#0d0d0e",
    borderLeft: "1px solid #1a1a1c",
    zIndex: 201,
    overflowY: "auto",
    padding: 24,
    boxShadow: "-12px 0 64px rgba(0,0,0,0.9)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#f5f5f7",
    margin: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 750,
    color: "#7e7e82",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 8,
    fontFamily: "'JetBrains Mono', monospace",
  },
  candidateGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: "220px",
    overflowY: "auto",
    paddingRight: 4,
    marginBottom: 8,
  },
  candidateCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#161618",
    border: "1px solid #232326",
    borderRadius: 8,
    padding: "8px 12px",
  },
  candThumb: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #ff6b00",
  },
  candThumbPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#2a2a2f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
  }
};
