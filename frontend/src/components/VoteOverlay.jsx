import React from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * VoteOverlay — clean confirmation modal
 */
export default function VoteOverlay({ candidate, isOverride, onConfirm, onCancel, txPending }) {
  const { t } = useLocalization();
  if (!candidate) return null;

  const initials = candidate.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={styles.backdrop} onClick={onCancel}>
      <div style={styles.modal} className="anim-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Accent top */}
        <div style={styles.topAccent} />

        <h2 style={styles.title}>
          {isOverride ? "Override Your Vote?" : "Confirm Your Vote"}
        </h2>

        <p style={styles.sub}>
          {isOverride
            ? t("overrideHint")
            : "Your vote will be recorded immutably on the blockchain."}
        </p>

        <div style={styles.candidateBox}>
          <div style={styles.candidateAvatar}>{initials}</div>
          <div>
            <p style={styles.candName}>{candidate.name}</p>
            {candidate.pitch && (
              <p style={styles.candPitch}>{candidate.pitch}</p>
            )}
          </div>
        </div>

        {isOverride && (
          <div style={styles.warningNote}>
            <span style={{ fontSize: "0.85rem" }}>🛡️</span>
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
              : <>{isOverride ? "Override" : "Confirm"}</>}
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
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "32px 28px",
    width: "100%",
    maxWidth: 420,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  },
  topAccent: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 2,
    background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
  },
  title: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text-1)",
    marginBottom: 6,
  },
  sub: {
    fontSize: "0.82rem",
    color: "var(--text-3)",
    marginBottom: 20,
    lineHeight: 1.6,
  },
  candidateBox: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    marginBottom: 16,
  },
  candidateAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
    fontWeight: 800,
    color: "#fff",
    flexShrink: 0,
    fontFamily: "var(--font-mono)",
  },
  candName: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: 2,
  },
  candPitch: {
    fontSize: "0.78rem",
    color: "var(--text-3)",
    fontStyle: "italic",
  },
  warningNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "var(--accent-soft)",
    border: "1px solid rgba(232,89,12,0.15)",
    borderRadius: "var(--radius)",
    padding: "10px 14px",
    fontSize: "0.78rem",
    color: "var(--text-2)",
    lineHeight: 1.5,
    marginBottom: 16,
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
  },
};
