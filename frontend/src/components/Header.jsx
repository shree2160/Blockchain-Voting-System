import React from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * Header — sticky top navigation bar
 * Shows: Logo | Network badge | Language toggle | Connect/Disconnect button
 */
export default function Header({ account, chainId, networkName, isAdmin, connectWallet, txPending }) {
  const { t, toggleLang, lang } = useLocalization();

  const shortAddr = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logoGroup}>
          <div style={styles.logoBadge}>⛓</div>
          <div>
            <h1 style={styles.logoTitle}>{t("appTitle")}</h1>
            <p style={styles.logoSub}>V2.0</p>
          </div>
        </div>

        {/* Right controls */}
        <div style={styles.controls}>
          {/* Network badge */}
          {account && (
            <span className={`badge ${chainId === 11155111 ? "badge-orange" : "badge-green"}`}>
              <span className="dot-pulse" />
              {networkName}
            </span>
          )}

          {/* Admin tag */}
          {isAdmin && (
            <span className="badge badge-red">⚡ ADMIN</span>
          )}

          {/* Language toggle */}
          <button
            className="btn btn-secondary"
            onClick={toggleLang}
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            {lang === "en" ? "🇮🇳 मराठी" : "🇬🇧 English"}
          </button>

          {/* Connect / wallet display */}
          {!account ? (
            <button className="btn btn-primary" onClick={connectWallet} disabled={txPending}>
              {txPending ? <span className="spinner" /> : "🦊"}
              {t("connectWallet")}
            </button>
          ) : (
            <div style={styles.walletChip}>
              <span style={styles.walletDot} />
              <span className="text-mono" style={{ fontSize: "0.85rem" }}>{shortAddr}</span>
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
    background: "rgba(8,8,8,0.85)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid #1e1e1e",
    padding: "0 24px",
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    height: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #ff6b00, #cc5500)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    boxShadow: "0 0 16px rgba(255,107,0,0.4)",
  },
  logoTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #ff6b00, #ffb347)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  logoSub: {
    fontSize: "0.7rem",
    color: "#5a5a5a",
    fontFamily: "'JetBrains Mono', monospace",
    margin: 0,
    marginTop: 1,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  walletChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 999,
    fontSize: "0.85rem",
    color: "#f5f5f5",
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00e676",
    boxShadow: "0 0 8px rgba(0,230,118,0.5)",
  },
};
