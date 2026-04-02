import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

// Phases based on actual trajectory data:
//   idx 0-5:    Earth orbit maneuvers (launch to ICPS separation)
//   idx 5-20:   Coasting to apogee
//   idx 20-43:  Descending back toward perigee
//   idx 43-45:  Perigee & TLI burn
//   idx 45-220: Translunar coast
//   idx 220-250: Lunar flyby
//   idx 250-410: Trans-Earth coast
//   idx 410+:   Earth return & reentry
function getPhase(idx: number): string {
  if (idx <= 5) return "Earth Orbit";
  if (idx <= 20) return "Coast to Apogee";
  if (idx <= 43) return "Descent to Perigee";
  if (idx <= 46) return "Translunar Injection";
  if (idx <= 220) return "Translunar Coast";
  if (idx <= 250) return "Lunar Flyby";
  if (idx <= 410) return "Trans-Earth Coast";
  return "Earth Return";
}

/** Find the trajectory index closest to the current real time */
function computeNowIdx(): number {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < data.artemis.length; i++) {
    const t = parseDate(data.artemis[i].date).getTime();
    const diff = Math.abs(t - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

export function useMissionState() {
  const nowIdx = useMemo(() => computeNowIdx(), []);
  const [currentIdx, setCurrentIdx] = useState(nowIdx);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const maxIdx = data.artemis.length - 1;

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const jumpToNow = useCallback(() => {
    setCurrentIdx(computeNowIdx());
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
  const phase = getPhase(ai);

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
