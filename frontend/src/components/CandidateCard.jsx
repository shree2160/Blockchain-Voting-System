import React, { useState } from "react";
import { useLocalization } from "../context/LocalizationContext";

/**
 * CandidateCard — 3D interactive voting card
 *
 * Features:
 *  • CSS 3D perspective tilt on mousemove
 *  • Orange glow highlight on hover
 *  • Animated vote progress bar
 *  • "Voted" checkmark overlay
 *  • Disabled state during tx / after election ends
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const pct = totalVotes > 0
    ? ((candidate.voteCount / totalVotes) * 100).toFixed(1)
    : "0.0";

  // ── 3D tilt handler ────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  };

  const handleMouseEnter = () => setHovered(true);

  // ── Avatar: first letters ──────────────────────────────────────────────
  const initials = candidate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarColors = [
    ["#ff6b00", "#cc5500"],
    ["#7c3aed", "#4c1d95"],
    ["#0ea5e9", "#0369a1"],
    ["#10b981", "#065f46"],
    ["#f59e0b", "#92400e"],
  ];
  const colorPair = avatarColors[candidate.id % avatarColors.length];

  return (
    <div
      style={{
        ...styles.wrapper,
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: hovered ? "transform 0.05s linear" : "transform 0.4s ease",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {/* Glow ring when voted-for */}
      {isVotedFor && <div style={styles.glowRing} />}

      <div style={{
        ...styles.card,
        borderColor: isVotedFor ? "rgba(255,107,0,0.6)" : hovered ? "rgba(255,107,0,0.25)" : "#1e1e1e",
        boxShadow: isVotedFor
          ? "0 0 32px rgba(255,107,0,0.35), 0 8px 32px rgba(0,0,0,0.6)"
          : hovered
          ? "0 0 20px rgba(255,107,0,0.15), 0 8px 32px rgba(0,0,0,0.6)"
          : "0 8px 32px rgba(0,0,0,0.6)",
      }}>

        {/* Voted checkmark badge */}
        {isVotedFor && (
          <div style={styles.votedBadge}>
            ✓ {t("youVotedFor").split(" ")[2] || "Voted"}
          </div>
        )}

        {/* Top stripe */}
        <div style={{
          ...styles.stripe,
          background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
        }} />

        {/* Avatar */}
        <div style={{
          ...styles.avatar,
          background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
          boxShadow: `0 0 20px ${colorPair[0]}55`,
        }}>
          {initials}
        </div>

        {/* Name & pitch */}
        <h3 style={styles.name}>{candidate.name}</h3>
        <p style={styles.pitch}>{candidate.pitch}</p>

        {/* Tally */}
        <div style={styles.tallyRow}>
          <span style={styles.tallyNum}>{candidate.voteCount}</span>
          <span style={styles.tallyLabel}>{t("votes")}</span>
          <span style={styles.pct}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{ marginBottom: 20 }}>
          <div
            className="progress-bar__fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${colorPair[0]}, ${colorPair[1]})`,
              boxShadow: `0 0 8px ${colorPair[0]}88`,
            }}
          />
        </div>

        {/* Vote button */}
        {canVote && (
          <button
            className={`btn ${isVotedFor ? "btn-secondary" : "btn-primary"}`}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => onVote(candidate.id)}
            disabled={txPending || !canVote}
          >
            {txPending ? (
              <><span className="spinner" /> {t("txPending")}</>
            ) : isVotedFor ? (
              <>🔄 {t("overrideVote")}</>
            ) : (
              <>🗳️ {t("voteNow")}</>
            )}
          </button>
        )}

        {/* Read-only mode: show result only */}
        {!canVote && (
          <div style={styles.resultOnly}>
            <span style={{ color: "#5a5a5a", fontSize: "0.8rem" }}>
              #{candidate.id + 1}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    willChange: "transform",
  },
  glowRing: {
    position: "absolute",
    inset: -3,
    borderRadius: 24,
    border: "2px solid rgba(255,107,0,0.5)",
    boxShadow: "0 0 24px rgba(255,107,0,0.4), inset 0 0 24px rgba(255,107,0,0.05)",
    pointerEvents: "none",
    zIndex: 1,
    animation: "pulse 2s ease-in-out infinite",
  },
  card: {
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 20,
    padding: "0 20px 20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    position: "relative",
  },
  votedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "rgba(255,107,0,0.15)",
    border: "1px solid rgba(255,107,0,0.4)",
    color: "#ff6b00",
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: "0.72rem",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.5px",
    zIndex: 2,
  },
  stripe: {
    width: "calc(100% + 40px)",
    height: 6,
    marginLeft: -20,
    marginRight: -20,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.6rem",
    fontWeight: 900,
    color: "#fff",
    marginBottom: 14,
    letterSpacing: -1,
  },
  name: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#f5f5f5",
    marginBottom: 6,
    textAlign: "center",
  },
  pitch: {
    fontSize: "0.82rem",
    color: "#9a9a9a",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  tallyRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 10,
    width: "100%",
  },
  tallyNum: {
    fontSize: "1.8rem",
    fontWeight: 900,
    color: "#ff6b00",
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1,
  },
  tallyLabel: {
    fontSize: "0.8rem",
    color: "#5a5a5a",
    flex: 1,
  },
  pct: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#9a9a9a",
    fontFamily: "'JetBrains Mono', monospace",
  },
  resultOnly: {
    width: "100%",
    textAlign: "center",
    paddingTop: 4,
  },
};
