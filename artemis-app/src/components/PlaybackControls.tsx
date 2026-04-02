import type { ViewMode } from "../types";

interface PlaybackControlsProps {
  currentIdx: number;
  maxIdx: number;
  playing: boolean;
  currentDate: string;
  viewMode: ViewMode;
  onSliderChange: (idx: number) => void;
  onTogglePlay: () => void;
  onJumpToNow: () => void;
  onViewChange: (mode: ViewMode) => void;
}

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: "free", label: "Free" },
  { mode: "follow", label: "Follow" },
  { mode: "pov", label: "POV" },
];

export default function PlaybackControls({
  currentIdx,
  maxIdx,
  playing,
  currentDate,
  viewMode,
  onSliderChange,
  onTogglePlay,
  onJumpToNow,
  onViewChange,
}: PlaybackControlsProps) {
  return (
    <div className="controls">
      <button className={`controls__btn ${playing ? "active" : ""}`} onClick={onTogglePlay}>
        {playing ? "\u23F8 Pause" : "\u25B6 Play"}
      </button>
      <input
        type="range"
        className="controls__slider"
        min={0}
        max={maxIdx}
        value={currentIdx}
        onChange={(e) => onSliderChange(parseInt(e.target.value))}
      />
      <span className="controls__time">{currentDate}</span>
      <div className="controls__views">
        {VIEW_LABELS.map(({ mode, label }) => (
          <button
            key={mode}
            className={`controls__view-btn ${viewMode === mode ? "active" : ""}`}
            onClick={() => onViewChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      <button className="controls__btn" onClick={onJumpToNow}>
        Now
      </button>
    </div>
  );
}
