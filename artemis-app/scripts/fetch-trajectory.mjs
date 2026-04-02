#!/usr/bin/env node

/**
 * Fetches the latest Artemis II and Moon trajectory data from
 * JPL Horizons API and writes it to src/data/trajectory_data.json.
 *
 * Run manually:   node scripts/fetch-trajectory.mjs
 * Runs automatically before each build via the "prebuild" npm script.
 */

const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

// Artemis II launched Apr 1, 2026 22:35:12 UTC — trajectory starts ~3.5h after
const TRAJECTORY_START = "2026-04-02 02:00";
const TRAJECTORY_END = "2026-04-11 00:00";
const STEP = "30 min";

async function fetchBody(command, label) {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${command}'`,
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER: "'500@399'",
    START_TIME: `'${TRAJECTORY_START}'`,
    STOP_TIME: `'${TRAJECTORY_END}'`,
    STEP_SIZE: `'${STEP}'`,
    REF_SYSTEM: "ICRF",
    VEC_TABLE: "2",
  });

  console.log(`Fetching ${label} (${command}) from JPL Horizons...`);
  const res = await fetch(`${HORIZONS_API}?${params}`);
  if (!res.ok) throw new Error(`Horizons API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const result = data.result;

  const match = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!match) throw new Error(`No ephemeris data found for ${label}`);

  const lines = match[1].trim().split("\n");
  const points = [];

  for (let i = 0; i < lines.length; i += 3) {
    const dateLine = lines[i].trim();
    const dateMatch = dateLine.match(/A\.D\. (\S+ \S+)/);
    const date = dateMatch ? dateMatch[1] : "";

    const vals = lines[i + 1].match(/[-+]?\d+\.\d+E[+-]\d+/g);
    if (!vals || vals.length < 3) continue;

    points.push({
      date,
      x: parseFloat(vals[0]),
      y: parseFloat(vals[1]),
      z: parseFloat(vals[2]),
    });
  }

  console.log(`  Got ${points.length} points for ${label}`);
  return points;
}

async function main() {
  try {
    const [artemis, moon] = await Promise.all([
      fetchBody("-1024", "Artemis II"),
      fetchBody("301", "Moon"),
    ]);

    const output = JSON.stringify({ artemis, moon });
    const outPath = new URL("../src/data/trajectory_data.json", import.meta.url);

    const { writeFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    writeFileSync(fileURLToPath(outPath), output);

    console.log(`Wrote trajectory_data.json (${(output.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error("Failed to fetch trajectory data:", err.message);
    console.error("Keeping existing trajectory_data.json");
    process.exit(0); // Don't fail the build — use stale data instead
  }
}

main();
