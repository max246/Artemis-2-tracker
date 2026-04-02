import { useCallback } from "react";
import type { MissionStats } from "../types";
import { MILESTONES, CREW } from "../data/milestones";

function formatDist(km: number): string {
  if (km > 100000) return (km / 1000).toFixed(0) + "k km";
  return km.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " km";
}

interface SidebarProps {
  stats: MissionStats;
  currentIdx: number;
  open: boolean;
  onToggle: () => void;
}

function getShareText(stats: MissionStats): string {
  const speed = (stats.speed * 3600).toFixed(0);
  return `Tracking Artemis II live! ${stats.met} into the mission, Orion "Integrity" is ${formatDist(stats.distEarth)} from Earth, traveling at ${speed} km/h toward the Moon.`;
}

export default function Sidebar({ stats, currentIdx, open, onToggle }: SidebarProps) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = getShareText(stats);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${shareText}\n${pageUrl}`);
  }, [shareText, pageUrl]);

  return (
    <>
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {open ? "\u2715" : "\u2630"}
      </button>

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <h1>
            Artemis <span className="text-blue">II</span> Tracker
          </h1>
          <p className="subtitle">Real-time trajectory from JPL Horizons API</p>
        </div>

        <div className="card">
          <h3 className="card__title">Current Status</h3>
          <div className="phase-badge">{stats.phase}</div>
          <div className="stat-grid">
            <StatRow label="Mission Elapsed" value={stats.met} className="highlight" />
            <StatRow label="Distance from Earth" value={formatDist(stats.distEarth)} />
            <StatRow label="Distance to Moon" value={formatDist(stats.distMoon)} />
            <StatRow
              label="Speed"
              value={`${(stats.speed * 3600).toFixed(0)} km/h (${stats.speed.toFixed(2)} km/s)`}
              className="green"
            />
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">Crew - "Integrity"</h3>
          <ul className="crew-list">
            {CREW.map((c) => (
              <li key={c.name}>
                {c.name}
                <span className="crew-role">
                  {c.role} ({c.agency})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="card__title">Mission Timeline</h3>
          <div className="timeline">
            {MILESTONES.map((ms) => {
              let cls = "timeline-item";
              if (ms.idx < currentIdx - 2) cls += " complete";
              else if (ms.idx <= currentIdx + 2) cls += " current";
              else cls += " future";
              return (
                <div key={ms.label} className={cls}>
                  <div>{ms.label}</div>
                  <div className="timeline-date">{ms.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">Controls</h3>
          <p className="hint">Click and drag to rotate. Scroll to zoom. Right-click to pan.</p>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "#60a5fa" }} /> Orion
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "#94a3b8" }} /> Moon
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: "#34d399" }} /> Earth
            </span>
          </div>
        </div>
        <div className="card">
          <h3 className="card__title">Share</h3>
          <div className="share-buttons">
            <a
              className="share-btn share-btn--x"
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Post
            </a>
            <a
              className="share-btn share-btn--bsky"
              href={`https://bsky.app/intent/compose?text=${encodeURIComponent(shareText + "\n" + pageUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.178 3.126-4.443.766-8.325 2.878-4.625 7.285 4.201 4.012 6.063-1.063 6.942-3.177.482-1.158.655-2.013.881-2.013.226 0 .399.855.881 2.013.879 2.114 2.741 7.19 6.942 3.177 3.7-4.407-.182-6.519-4.625-7.285 2.578.35 5.393-.499 6.178-3.126C19.622 9.418 20 4.458 20 3.768c0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.62-4.3 1.24C12.046 4.747 9.087 8.686 8 10.8h4z" transform="translate(2 1)"/></svg>
              Bluesky
            </a>
            <a
              className="share-btn share-btn--reddit"
              href={`https://reddit.com/submit?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent("Artemis II Trajectory Tracker - Live mission data from JPL Horizons")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
              Reddit
            </a>
            <button className="share-btn share-btn--copy" onClick={handleCopyLink}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>

        <div className="card attribution">
          <h3 className="card__title">Data Sources</h3>
          <p className="hint">
            Trajectory data provided by{" "}
            <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener noreferrer">
              JPL Horizons System
            </a>{" "}
            (NASA/JPL). Mission details from{" "}
            <a href="https://www.nasa.gov/mission/artemis-ii/" target="_blank" rel="noopener noreferrer">
              NASA Artemis II
            </a>.
          </p>
          <p className="hint" style={{ marginTop: 6 }}>
            This is an unofficial fan project and is not affiliated with or endorsed by NASA or JPL.
            All NASA data is publicly available under{" "}
            <a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noopener noreferrer">
              NASA's media usage guidelines
            </a>.
          </p>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && <div className="sidebar-backdrop" onClick={onToggle} />}
    </>
  );
}

function StatRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${className}`}>{value}</span>
    </div>
  );
}
