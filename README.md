# Artemis II Trajectory Tracker

An interactive 3D visualization of NASA's Artemis II mission trajectory, built with real ephemeris data from JPL's Horizons system.

## Features

- **Real trajectory data** — 429 data points from [JPL Horizons API](https://ssd.jpl.nasa.gov/horizons/) covering the full 10-day mission
- **3D visualization** — Earth, Moon, and Orion spacecraft with interactive camera controls
- **Three camera modes**:
  - **Free** — orbit camera with drag-to-rotate, scroll-to-zoom, right-click-to-pan
  - **Follow** — chase cam behind Orion with scroll zoom
  - **POV** — first-person view from Orion's forward camera with drag-to-look
- **Mission playback** — play/pause animation, scrub through the entire mission timeline
- **Live stats** — distance from Earth/Moon, speed, mission elapsed time, current phase
- **Mission timeline** — key events from launch to splashdown
- **Crew info** — the four Artemis II astronauts
- **Mobile-friendly** — responsive layout with collapsible sidebar
- **Social sharing** — share current mission stats to X, Bluesky, Reddit, or copy to clipboard

## Tech Stack

- React 19 + TypeScript
- Vite 5
- Canvas 2D with manual 3D projection (no WebGL required)

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20

## Getting Started

```bash
# Clone the repository
git clone git@github.com:max246/Artemis-2-tracker.git
cd Artemis-2-tracker/artemis-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
cd artemis-app
npm run build
```

The output is generated in `artemis-app/dist/` and can be served by any static file host.

## Deploy to Vercel

```bash
cd artemis-app
npx vercel
```

## Data Sources

- Trajectory data: [JPL Horizons System](https://ssd.jpl.nasa.gov/horizons/) (NASA/JPL), spacecraft ID `-1024`
- Mission details: [NASA Artemis II](https://www.nasa.gov/mission/artemis-ii/)

## Disclaimer

This is an unofficial fan project and is not affiliated with or endorsed by NASA or JPL. All NASA data is publicly available under [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
