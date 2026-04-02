import { useState } from "react";
import TrajectoryScene from "./components/TrajectoryScene";
import Sidebar from "./components/Sidebar";
import PlaybackControls from "./components/PlaybackControls";
import { useMissionState } from "./hooks/useMissionState";
import type { ViewMode } from "./types";

export default function App() {
  const {
    data,
    currentIdx,
    setCurrentIdx,
    maxIdx,
    playing,
    togglePlay,
    jumpToNow,
    stats,
    liveMode,
  } = useMissionState();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("free");

  return (
    <div className="app">
      <Sidebar
        stats={stats}
        currentIdx={currentIdx}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="scene-container">
        <TrajectoryScene data={data} currentIdx={currentIdx} viewMode={viewMode} />
        <PlaybackControls
          currentIdx={currentIdx}
          maxIdx={maxIdx}
          playing={playing}
          currentDate={stats.currentDate}
          viewMode={viewMode}
          liveMode={liveMode}
          onSliderChange={setCurrentIdx}
          onTogglePlay={togglePlay}
          onJumpToNow={jumpToNow}
          onViewChange={setViewMode}
        />
      </div>
    </div>
  );
}
