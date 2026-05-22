import React from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * Header — minimal sticky navigation
 */
export default function Header({ account, chainId, networkName, isAdmin, connectWallet, txPending }) {
  const { t, toggleLang, lang } = useLocalization();

  const shortAddr = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : null;

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logoGroup}>
          <div style={styles.logoMark}>CV</div>
          <div>
            <h1 style={styles.logoTitle}>CryptoVote</h1>
            <p style={styles.logoSub}>Campus V2.0</p>
          </div>
        </div>

        {/* Right controls */}
        <div style={styles.controls}>
          {account && (
            <span className={`badge ${chainId === 11155111 ? "badge-orange" : "badge-green"}`}>
              <span className="dot-pulse" />
              {networkName}
            </span>
          )}

          {isAdmin && (
            <span className="badge badge-red">ADMIN</span>
          )}

          <button
            className="btn btn-secondary"
            onClick={toggleLang}
            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
          >
            {lang === "en" ? "मराठी" : "EN"}
          </button>

          {!account ? (
            <button className="btn btn-primary" onClick={connectWallet} disabled={txPending}>
              {txPending ? <span className="spinner" /> : null}
              {t("connectWallet")}
            </button>
          ) : (
            <div style={styles.walletChip}>
              <span style={styles.walletDot} />
              <span className="text-mono" style={{ fontSize: "0.8rem" }}>{shortAddr}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(9,9,11,0.8)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    padding: "0 24px",
  },
  inner: {
    maxWidth: 1120,
    margin: "0 auto",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "#fff",
    fontFamily: "var(--font-mono)",
    letterSpacing: "-0.5px",
  },
  logoTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-1)",
    margin: 0,
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: "0.65rem",
    color: "var(--text-3)",
    fontFamily: "var(--font-mono)",
    margin: 0,
    letterSpacing: "0.5px",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  walletChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: "0.8rem",
    color: "var(--text-1)",
  },
  walletDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--green)",
  },
};
