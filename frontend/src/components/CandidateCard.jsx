import React, { useState } from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * CandidateCard — Clean, professional voting card
 */
export default function CandidateCard({
  candidate,
  totalVotes,
  isVotedFor,
  canVote,
  hasVoted,
  txPending,
  onVote,
}) {
  const { t } = useLocalization();
  const [hovered, setHovered] = useState(false);

  const pct = totalVotes > 0
    ? ((candidate.voteCount / totalVotes) * 100).toFixed(1)
    : "0.0";

  const initials = candidate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hues = [
    ["#e8590c", "#c2410c"],
    ["#7c3aed", "#5b21b6"],
    ["#0891b2", "#0e7490"],
    ["#059669", "#047857"],
    ["#d97706", "#b45309"],
    ["#e11d48", "#be123c"],
  ];
  const [c1, c2] = hues[candidate.id % hues.length];

  return (
    <div
      style={styles.wrapper}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        ...styles.card,
        borderColor: isVotedFor
          ? "rgba(232,89,12,0.3)"
          : hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
      }}>

        {/* Voted indicator */}
        {isVotedFor && (
          <div style={styles.votedBadge}>✓ Your Vote</div>
        )}

        {/* Top accent line */}
        <div style={{
          ...styles.accentLine,
          background: `linear-gradient(90deg, ${c1}, ${c2})`,
          opacity: isVotedFor || hovered ? 1 : 0.4,
        }} />

        {/* Avatar */}
        <div style={{
          ...styles.avatar,
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
        }}>
          {initials}
        </div>

        {/* Name & pitch */}
        <h3 style={styles.name}>{candidate.name}</h3>
        {candidate.pitch && (
          <p style={styles.pitch}>"{candidate.pitch}"</p>
        )}

        {/* Tally */}
        <div style={styles.tallyRow}>
          <div style={styles.tallyNum}>{candidate.voteCount}</div>
          <div style={styles.tallyLabel}>{t("votes")}</div>
          <div style={styles.pct}>{pct}%</div>
        </div>

        {/* Progress */}
        <div className="progress-bar" style={{ marginBottom: 16 }}>
          <div
            className="progress-bar__fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${c1}, ${c2})`,
            }}
          />
        </div>

        {/* Vote button */}
        {canVote && (
          <button
            className={`btn ${isVotedFor ? "btn-secondary" : "btn-primary"}`}
            style={{ width: "100%" }}
            onClick={() => onVote(candidate.id)}
            disabled={txPending}
          >
            {txPending ? (
              <><span className="spinner" /> {t("txPending")}</>
            ) : isVotedFor ? (
              <>{t("overrideVote")}</>
            ) : (
              <>{t("voteNow")}</>
            )}
          </button>
        )}

        {/* Read-only: rank */}
        {!canVote && (
          <div style={styles.rankLabel}>#{candidate.id + 1}</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "0 20px 20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "all 0.25s var(--ease)",
    position: "relative",
  },
  votedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "var(--accent-soft)",
    color: "var(--accent)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: "0.68rem",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.3px",
    zIndex: 2,
  },
  accentLine: {
    width: "calc(100% + 40px)",
    height: 3,
    marginLeft: -20,
    marginRight: -20,
    marginBottom: 20,
    transition: "opacity 0.3s ease",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#fff",
    marginBottom: 14,
    letterSpacing: "-0.5px",
    fontFamily: "var(--font-mono)",
  },
  name: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-1)",
    marginBottom: 4,
    textAlign: "center",
  },
  pitch: {
    fontSize: "0.78rem",
    color: "var(--text-3)",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 1.5,
    fontStyle: "italic",
    maxWidth: 220,
  },
  tallyRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
    width: "100%",
  },
  tallyNum: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--text-1)",
    fontFamily: "var(--font-mono)",
    lineHeight: 1,
  },
  tallyLabel: {
    fontSize: "0.75rem",
    color: "var(--text-3)",
    flex: 1,
  },
  pct: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-2)",
    fontFamily: "var(--font-mono)",
  },
  rankLabel: {
    width: "100%",
    textAlign: "center",
    color: "var(--text-3)",
    fontSize: "0.78rem",
    fontFamily: "var(--font-mono)",
    paddingTop: 4,
  },
};
