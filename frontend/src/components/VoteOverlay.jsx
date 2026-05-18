import React from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * VoteOverlay — confirmation modal before submitting a vote / override
 */
export default function VoteOverlay({ candidate, isOverride, onConfirm, onCancel, txPending }) {
  const { t } = useLocalization();
  if (!candidate) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal} className="anim-fade-in-up">
        {/* Header glow bar */}
        <div style={styles.glowBar} />

        <h2 style={styles.title}>
          {isOverride ? "🔄 Override Your Vote?" : "🗳️ Confirm Your Vote"}
        </h2>

        <p style={styles.sub}>
          {isOverride
            ? t("overrideHint")
            : "Your vote will be recorded on the blockchain."}
        </p>

        <div style={styles.candidateBox}>
          <div style={styles.candidateInitials}>
            {candidate.name.split(" ").map((w) => w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div>
            <p style={styles.candName}>{candidate.name}</p>
            <p style={styles.candPitch}>{candidate.pitch}</p>
          </div>
        </div>

        {isOverride && (
          <div style={styles.antiCoercionNote}>
            <span style={{ fontSize: "1.1rem" }}>🛡️</span>
            <span>{t("antiCoercionNotice")}</span>
          </div>
        )}

        <div style={styles.actions}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={txPending}>
            {t("cancel")}
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={txPending}>
            {txPending
              ? <><span className="spinner" /> {t("txPending")}</>
              : <>{isOverride ? "🔄" : "✓"} {t("confirm")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(8px)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 24,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 460,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(255,107,0,0.1)",
  },
  glowBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 3,
    background: "linear-gradient(90deg, transparent, #ff6b00, transparent)",
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "#f5f5f5",
    marginBottom: 8,
  },
  sub: {
    fontSize: "0.85rem",
    color: "#9a9a9a",
    marginBottom: 24,
    lineHeight: 1.6,
  },
  candidateBox: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    background: "#161616",
    border: "1px solid #1e1e1e",
    borderRadius: 14,
    marginBottom: 20,
  },
  candidateInitials: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff6b00, #cc5500)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    fontWeight: 900,
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 0 16px rgba(255,107,0,0.4)",
  },
  candName: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#f5f5f5",
    marginBottom: 3,
  },
  candPitch: {
    fontSize: "0.8rem",
    color: "#9a9a9a",
    fontStyle: "italic",
  },
  antiCoercionNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "rgba(255,107,0,0.08)",
    border: "1px solid rgba(255,107,0,0.25)",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: "0.82rem",
    color: "#ff8c35",
    lineHeight: 1.5,
    marginBottom: 20,
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 8,
  },
};
