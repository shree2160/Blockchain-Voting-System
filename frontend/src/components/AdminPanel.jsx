import React, { useState } from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * AdminPanel — slide-in drawer for election admin operations
 *
 * Features:
 *  • Whitelist a single wallet address
 *  • Add a new candidate (name + pitch)
 *  • Finalize election (irreversible)
 */
export default function AdminPanel({ isOpen, onClose, whitelistWallet, batchWhitelistWallets, addCandidate, finalizeElection, isFinalized, txPending }) {
  const { t } = useLocalization();

  const [walletInput,    setWalletInput]    = useState("");
  const [candName,       setCandName]       = useState("");
  const [candPitch,      setCandPitch]      = useState("");
  const [candImage,      setCandImage]      = useState("");
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [feedback,       setFeedback]       = useState(null);

  const showFeedback = (msg, type = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleWhitelist = async () => {
    if (!walletInput.trim()) return;

    // Split by commas, spaces, or newlines
    const rawAddresses = walletInput.split(/[\s,\n]+/);
    const cleanAddresses = rawAddresses
      .map((addr) => addr.trim())
      .filter((addr) => addr.startsWith("0x") && addr.length === 42);

    if (cleanAddresses.length === 0) {
      showFeedback("✗ No valid Ethereum addresses (0x...) found.", "error");
      return;
    }

    if (cleanAddresses.length === 1) {
      // Single address flow
      const res = await whitelistWallet(cleanAddresses[0]);
      if (res.success) {
        showFeedback(`✓ Whitelisted: ${cleanAddresses[0].slice(0, 10)}...`);
        setWalletInput("");
      } else {
        showFeedback(`✗ ${res.error}`, "error");
      }
    } else {
      // Batch address flow
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
          <h2 style={styles.drawerTitle}>
            <span style={{ color: "#ff6b00" }}>⚡</span> {t("adminPanel")}
          </h2>
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
            rows={4}
            style={{
              resize: "vertical",
              minHeight: "100px",
              lineHeight: "1.4",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.82rem"
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleWhitelist}
            disabled={txPending || !walletInput.trim()}
            style={{ marginTop: 10 }}
          >
            {txPending ? <><span className="spinner" /> Sending...</> : `🔑 ${t("whitelistBtn")}`}
          </button>
        </section>

        <div className="divider" />

        {/* ── Add candidate ── */}
        <section style={styles.section}>
          <label style={styles.label}>{t("addCandidate")}</label>
          <input
            className="input"
            placeholder={t("candidateName")}
            value={candName}
            onChange={(e) => setCandName(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <input
            className="input"
            placeholder={t("candidatePitch")}
            value={candPitch}
            onChange={(e) => setCandPitch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <input
            className="input"
            placeholder="Image URI (optional, IPFS/HTTPS)"
            value={candImage}
            onChange={(e) => setCandImage(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleAddCandidate}
            disabled={txPending || !candName.trim()}
            style={{ marginTop: 10 }}
          >
            {txPending ? <><span className="spinner" /> Sending...</> : `➕ ${t("addCandidate")}`}
          </button>
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
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: "min(420px, 100vw)",
    background: "#0f0f0f",
    borderLeft: "1px solid #1e1e1e",
    zIndex: 201,
    overflowY: "auto",
    padding: 28,
    boxShadow: "-8px 0 48px rgba(0,0,0,0.8)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#f5f5f5",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#9a9a9a",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 8,
    fontFamily: "'JetBrains Mono', monospace",
  },
};
