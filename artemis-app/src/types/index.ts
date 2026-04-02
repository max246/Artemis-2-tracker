export interface TrajectoryPoint {
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface TrajectoryData {
  artemis: TrajectoryPoint[];
  moon: TrajectoryPoint[];
}

export interface Milestone {
  idx: number;
  label: string;
  date: string;
  phase: "complete" | "current" | "future";
}

export interface MissionStats {
  distEarth: number;
  distMoon: number;
  speed: number;
  met: string;
  phase: string;
  currentDate: string;
}

export type ViewMode = "free" | "follow" | "pov";
