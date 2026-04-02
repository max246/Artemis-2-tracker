import { useState, useCallback, useRef, useEffect } from "react";
import trajectoryData from "../data/trajectory_data.json";
import type { TrajectoryData, MissionStats } from "../types";
import { LAUNCH_UTC } from "../data/milestones";

const data = trajectoryData as TrajectoryData;
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseDate(dateStr: string): Date {
  const parts = dateStr.split(/[- :]+/);
  return new Date(
    Date.UTC(
      parseInt(parts[0]),
      MONTHS[parts[1]],
      parseInt(parts[2]),
      parseInt(parts[3]),
      parseInt(parts[4]),
      parseInt(parts[5])
    )
  );
}

function getPhase(metHours: number): string {
  if (metHours < 1) return "Earth Orbit";
  if (metHours < 13) return "Orbit Raising";
  if (metHours < 26) return "Pre-TLI Coast";
  if (metHours < 27) return "Translunar Injection";
  if (metHours < 100) return "Translunar Coast";
  if (metHours < 130) return "Lunar Flyby";
  if (metHours < 210) return "Trans-Earth Coast";
  return "Earth Return";
}

export function useMissionState() {
  const [currentIdx, setCurrentIdx] = useState(20);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const maxIdx = data.artemis.length - 1;

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const jumpToNow = useCallback(() => {
    setCurrentIdx(20);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIdx((prev) => (prev >= maxIdx ? 0 : prev + 1));
      }, 80);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, maxIdx]);

  const ai = Math.min(currentIdx, maxIdx);
  const a = data.artemis[ai];
  const m = data.moon[ai];

  const distEarth = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
  const distMoon = Math.sqrt(
    (a.x - m.x) ** 2 + (a.y - m.y) ** 2 + (a.z - m.z) ** 2
  );

  let speed = 0;
  if (ai > 0) {
    const prev = data.artemis[ai - 1];
    const dist = Math.sqrt(
      (a.x - prev.x) ** 2 + (a.y - prev.y) ** 2 + (a.z - prev.z) ** 2
    );
    speed = dist / (30 * 60); // km/s
  }

  const pointDate = parseDate(a.date);
  const metMs = pointDate.getTime() - LAUNCH_UTC.getTime();
  const metH = Math.floor(metMs / 3600000);
  const metM = Math.floor((metMs % 3600000) / 60000);
  const met = `T+${metH}h ${metM}m`;
  const phase = getPhase(metH);

  const stats: MissionStats = {
    distEarth,
    distMoon,
    speed,
    met,
    phase,
    currentDate: a.date.replace(".0000", ""),
  };

  return {
    data,
    currentIdx,
    setCurrentIdx,
    maxIdx,
    playing,
    togglePlay,
    jumpToNow,
    stats,
  };
}
