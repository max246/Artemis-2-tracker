import type { Milestone } from "../types";

// Milestone indices and times derived from actual JPL Horizons trajectory data.
// All times are UTC. Phase is computed dynamically in the UI based on currentIdx.
export const MILESTONES: Milestone[] = [
  { idx: 0,   label: "Launch",                   date: "Apr 1, 22:35 UTC", phase: "complete" },
  { idx: 1,   label: "Perigee Raise Maneuver",   date: "Apr 1, 23:25 UTC", phase: "complete" },
  { idx: 3,   label: "Apogee Raise Burn",        date: "Apr 2, 00:23 UTC", phase: "complete" },
  { idx: 5,   label: "ICPS Separation",           date: "Apr 2, 01:59 UTC", phase: "complete" },
  { idx: 20,  label: "Apogee (76,528 km)",        date: "Apr 2, 12:00 UTC", phase: "complete" },
  { idx: 44,  label: "Perigee / TLI Burn",        date: "Apr 3, 00:00 UTC", phase: "future" },
  { idx: 96,  label: "Trajectory Correction #1",  date: "Apr 4, 02:00 UTC", phase: "future" },
  { idx: 144, label: "Trajectory Correction #2",  date: "Apr 5, 02:00 UTC", phase: "future" },
  { idx: 234, label: "Closest Lunar Approach",    date: "Apr 6, 23:00 UTC", phase: "future" },
  { idx: 350, label: "Return Correction #1",      date: "Apr 9, 09:00 UTC", phase: "future" },
  { idx: 420, label: "Entry Interface",            date: "Apr 10, 20:00 UTC", phase: "future" },
  { idx: 428, label: "Splashdown",                date: "Apr 11, 00:00 UTC", phase: "future" },
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
