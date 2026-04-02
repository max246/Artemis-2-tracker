import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import trajectoryData from "../data/trajectory_data.json";
import type { TrajectoryData, MissionStats } from "../types";
import { LAUNCH_UTC } from "../data/milestones";

const data = trajectoryData as TrajectoryData;
const STEP_MS = 30 * 60 * 1000; // 30 minutes between data points

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

/** Precompute timestamps for each data point */
const timestamps: number[] = data.artemis.map((p) => parseDate(p.date).getTime());

/** Convert a real timestamp to a fractional index */
function timeToFractionalIdx(ms: number): number {
  const t0 = timestamps[0];
  const raw = (ms - t0) / STEP_MS;
  return Math.max(0, Math.min(data.artemis.length - 1, raw));
}

/** Convert a fractional index back to a timestamp */
function fractionalIdxToTime(idx: number): number {
  return timestamps[0] + idx * STEP_MS;
}

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

/** Lerp between two data points */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getInterpolated(arr: { x: number; y: number; z: number }[], fIdx: number) {
  const i = Math.floor(fIdx);
  const j = Math.min(i + 1, arr.length - 1);
  const t = fIdx - i;
  return {
    x: lerp(arr[i].x, arr[j].x, t),
    y: lerp(arr[i].y, arr[j].y, t),
    z: lerp(arr[i].z, arr[j].z, t),
  };
}

export function useMissionState() {
  const maxIdx = data.artemis.length - 1;

  // fractionalIdx drives everything — it's a float like 24.73
  const nowFIdx = useMemo(() => timeToFractionalIdx(Date.now()), []);
  const [fractionalIdx, setFractionalIdx] = useState(nowFIdx);
  const [playing, setPlaying] = useState(false);
  const [liveMode, setLiveMode] = useState(true); // true = real-time ticking
  const rafRef = useRef<number>(0);

  // Real-time ticking: advance fractionalIdx with the real clock
  useEffect(() => {
    if (!liveMode || playing) return;

    let lastTime = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTime;
      lastTime = now;
      setFractionalIdx((prev) => {
        const next = prev + elapsed / STEP_MS;
        return Math.min(next, maxIdx);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [liveMode, playing, maxIdx]);

  // Playback mode: fast-forward through the timeline
  useEffect(() => {
    if (!playing) return;
    let lastTime = Date.now();
    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTime;
      lastTime = now;
      // ~1 step per 80ms = ~375x real-time
      const advance = (elapsed / 80);
      setFractionalIdx((prev) => {
        const next = prev + advance;
        return next > maxIdx ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, maxIdx]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p) setLiveMode(false); // entering play mode disables live
      return !p;
    });
  }, []);

  const jumpToNow = useCallback(() => {
    setPlaying(false);
    setLiveMode(true);
    setFractionalIdx(timeToFractionalIdx(Date.now()));
  }, []);

  const handleSliderChange = useCallback((idx: number) => {
    setLiveMode(false);
    setPlaying(false);
    setFractionalIdx(idx);
  }, []);

  // Interpolated positions
  const fIdx = Math.max(0, Math.min(fractionalIdx, maxIdx));
  const orion = getInterpolated(data.artemis, fIdx);
  const moon = getInterpolated(data.moon, fIdx);

  const distEarth = Math.sqrt(orion.x ** 2 + orion.y ** 2 + orion.z ** 2);
  const distMoon = Math.sqrt(
    (orion.x - moon.x) ** 2 + (orion.y - moon.y) ** 2 + (orion.z - moon.z) ** 2
  );

  // Speed from nearby points
  const i0 = Math.max(0, Math.floor(fIdx) - 1);
  const i1 = Math.min(i0 + 1, maxIdx);
  const a0 = data.artemis[i0];
  const a1 = data.artemis[i1];
  const speed =
    Math.sqrt((a1.x - a0.x) ** 2 + (a1.y - a0.y) ** 2 + (a1.z - a0.z) ** 2) /
    (30 * 60);

  // MET
  const pointMs = fractionalIdxToTime(fIdx);
  const metMs = pointMs - LAUNCH_UTC.getTime();
  const metH = Math.floor(metMs / 3600000);
  const metM = Math.floor((metMs % 3600000) / 60000);
  const metS = Math.floor((metMs % 60000) / 1000);
  const met = `T+${metH}h ${String(metM).padStart(2, "0")}m ${String(metS).padStart(2, "0")}s`;

  const phase = getPhase(fIdx);

  // Format current date from interpolated time
  const pointDate = new Date(pointMs);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentDate = `${pointDate.getUTCFullYear()}-${monthNames[pointDate.getUTCMonth()]}-${String(pointDate.getUTCDate()).padStart(2, "0")} ${String(pointDate.getUTCHours()).padStart(2, "0")}:${String(pointDate.getUTCMinutes()).padStart(2, "0")}:${String(pointDate.getUTCSeconds()).padStart(2, "0")}`;

  const stats: MissionStats = {
    distEarth,
    distMoon,
    speed,
    met,
    phase,
    currentDate,
  };

  return {
    data,
    currentIdx: fIdx,
    setCurrentIdx: handleSliderChange,
    maxIdx,
    playing,
    togglePlay,
    jumpToNow,
    stats,
    liveMode,
  };
}
