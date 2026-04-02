import type { Milestone } from "../types";

export const MILESTONES: Milestone[] = [
  { idx: 0, label: "Launch", date: "Apr 1, 22:35 UTC", phase: "complete" },
  { idx: 2, label: "Perigee Raise Maneuver", date: "Apr 1, 23:25", phase: "complete" },
  { idx: 4, label: "Apogee Raise Burn", date: "Apr 2, 00:23", phase: "complete" },
  { idx: 6, label: "ICPS Separation", date: "Apr 2, 01:59", phase: "complete" },
  { idx: 22, label: "Perigee Raise Burn", date: "Apr 2, 11:30", phase: "current" },
  { idx: 50, label: "Translunar Injection", date: "Apr 2, 23:43", phase: "future" },
  { idx: 144, label: "Trajectory Correction #1", date: "Apr 3, 22:43", phase: "future" },
  { idx: 192, label: "Trajectory Correction #2", date: "Apr 4, 23:43", phase: "future" },
  { idx: 234, label: "Closest Lunar Approach", date: "Apr 6, 23:06", phase: "future" },
  { idx: 350, label: "Return Correction #1", date: "Apr 8, 00:04", phase: "future" },
  { idx: 420, label: "Entry Interface", date: "Apr 10, 22:04", phase: "future" },
  { idx: 428, label: "Splashdown", date: "Apr 11, 00:00", phase: "future" },
];

export const LAUNCH_UTC = new Date("2026-04-01T22:35:12Z");
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737;

export const CREW = [
  { name: "Reid Wiseman", role: "Commander", agency: "NASA" },
  { name: "Victor Glover", role: "Pilot", agency: "NASA" },
  { name: "Christina Koch", role: "Mission Specialist", agency: "NASA" },
  { name: "Jeremy Hansen", role: "Mission Specialist", agency: "CSA" },
];
