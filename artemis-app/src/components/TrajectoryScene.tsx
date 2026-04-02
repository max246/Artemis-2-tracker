import { useRef, useEffect, useCallback } from "react";
import type { TrajectoryData, ViewMode } from "../types";
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, MILESTONES } from "../data/milestones";

interface SceneProps {
  data: TrajectoryData;
  currentIdx: number;
  viewMode: ViewMode;
}

interface Camera {
  rotX: number;
  rotY: number;
  zoom: number;
  panX: number;
  panY: number;
}

// ---- Math helpers ----
function vec3sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function vec3add(a: number[], b: number[]): number[] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function vec3scale(v: number[], s: number): number[] {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function vec3len(v: number[]): number {
  return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}
function vec3norm(v: number[]): number[] {
  const l = vec3len(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function vec3cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function vec3dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Project world coords -> screen using camera rotation (free mode)
function projectFree(
  x: number, y: number, z: number,
  cam: Camera, w: number, h: number
): { x: number; y: number; depth: number } {
  const scale = cam.zoom * Math.min(w, h);
  const cosY = Math.cos(cam.rotY), sinY = Math.sin(cam.rotY);
  let rx = x * cosY - y * sinY;
  let ry = x * sinY + y * cosY;
  const rz = z;

  const cosX = Math.cos(cam.rotX), sinX = Math.sin(cam.rotX);
  const ry2 = ry * cosX - rz * sinX;
  const rz2 = ry * sinX + rz * cosX;
  ry = ry2;

  return {
    x: w / 2 + rx * scale + cam.panX,
    y: h / 2 - rz2 * scale + cam.panY,
    depth: ry,
  };
}

// Project world coords -> screen from a viewpoint looking at a target (follow/pov)
function projectLookAt(
  x: number, y: number, z: number,
  eye: number[], forward: number[], up: number[],
  fov: number, w: number, h: number,
): { x: number; y: number; depth: number } | null {
  const rel = [x - eye[0], y - eye[1], z - eye[2]];
  const right = vec3norm(vec3cross(forward, up));
  const camUp = vec3norm(vec3cross(right, forward));

  const dz = vec3dot(rel, forward); // depth along look direction
  const dx = vec3dot(rel, right);
  const dy = vec3dot(rel, camUp);

  if (dz < 0.0001) return null; // behind camera

  const scale = (Math.min(w, h) * 0.5) / Math.tan(fov / 2);
  return {
    x: w / 2 + (dx / dz) * scale,
    y: h / 2 - (dy / dz) * scale,
    depth: dz,
  };
}

function projectRadiusFree(r: number, cam: Camera, w: number, h: number): number {
  return Math.max(r * cam.zoom * Math.min(w, h), 3);
}

function projectRadiusPersp(r: number, depth: number, fov: number, w: number, h: number): number {
  if (depth < 0.001) return 0;
  const scale = (Math.min(w, h) * 0.5) / Math.tan(fov / 2);
  return Math.max((r / depth) * scale, 1.5);
}

// Deterministic stars
function makeStars(count: number) {
  const stars: { x: number; y: number; r: number; a: number }[] = [];
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    stars.push({ x: rand(), y: rand(), r: rand() * 1.2, a: rand() * 0.4 + 0.15 });
  }
  return stars;
}

const STARS = makeStars(300);
const S = 1 / 500000; // km -> scene units

export default function TrajectoryScene({ data, currentIdx, viewMode }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>({ rotX: -0.5, rotY: -0.3, zoom: 1, panX: 0, panY: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0, button: 0, startPanX: 0, startPanY: 0 });
  const followZoomRef = useRef<number>(1);
  const povLookRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cam = camRef.current;
    const art = data.artemis;
    const moon = data.moon;
    const ai = Math.min(currentIdx, art.length - 1);
    const mi = Math.min(currentIdx, moon.length - 1);

    // Compute follow/pov camera if needed
    const orionW = [art[ai].x * S, art[ai].y * S, art[ai].z * S];

    // Velocity direction (forward for POV)
    let velocity: number[];
    if (ai < art.length - 1) {
      const next = art[ai + 1];
      velocity = vec3norm(vec3sub([next.x * S, next.y * S, next.z * S], orionW));
    } else if (ai > 0) {
      const prev = art[ai - 1];
      velocity = vec3norm(vec3sub(orionW, [prev.x * S, prev.y * S, prev.z * S]));
    } else {
      velocity = [1, 0, 0];
    }

    const FOV = 1.2; // ~69 degrees
    const FOLLOW_DIST = 0.6 * followZoomRef.current;

    // Projection function based on view mode
    let proj: (x: number, y: number, z: number) => { x: number; y: number; depth: number } | null;
    let projR: (r: number, depth: number) => number;
    let isPersp = false;

    if (viewMode === "free") {
      proj = (x, y, z) => projectFree(x, y, z, cam, w, h);
      projR = (r, _d) => projectRadiusFree(r, cam, w, h);
    } else if (viewMode === "follow") {
      isPersp = true;
      // Camera behind and above Orion, looking at it
      const up = [0, 0, 1] as number[];
      const right = vec3norm(vec3cross(velocity, up));
      const camUp = vec3norm(vec3cross(right, velocity));
      const eye = vec3add(vec3add(orionW, vec3scale(velocity, -FOLLOW_DIST)), vec3scale(camUp, FOLLOW_DIST * 0.4));
      const forward = vec3norm(vec3sub(orionW, eye));
      proj = (x, y, z) => projectLookAt(x, y, z, eye, forward, camUp, FOV, w, h);
      projR = (r, d) => projectRadiusPersp(r, d, FOV, w, h);
    } else {
      // POV: from Orion, drag to look around
      isPersp = true;
      const up = [0, 0, 1] as number[];
      const baseForward = velocity;
      const baseRight = vec3norm(vec3cross(baseForward, up));
      const baseUp = vec3norm(vec3cross(baseRight, baseForward));

      // Apply yaw (left/right) rotation around baseUp
      const { yaw, pitch } = povLookRef.current;
      const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
      const afterYaw = vec3add(
        vec3scale(baseForward, cosYaw),
        vec3scale(baseRight, sinYaw)
      );

      // Apply pitch (up/down) rotation around the new right axis
      const newRight = vec3norm(vec3cross(afterYaw, baseUp));
      const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
      const forward = vec3norm(vec3add(
        vec3scale(afterYaw, cosPitch),
        vec3scale(baseUp, sinPitch)
      ));

      const right = newRight;
      const camUp = vec3norm(vec3cross(right, forward));
      const eye = orionW;
      proj = (x, y, z) => projectLookAt(x, y, z, eye, forward, camUp, FOV * 1.2, w, h);
      projR = (r, d) => projectRadiusPersp(r, d, FOV * 1.2, w, h);
    }

    // ---- Draw ----
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of STARS) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const p = (pt: { x: number; y: number; z: number }) =>
      proj(pt.x * S, pt.y * S, pt.z * S);

    // Collect drawable objects with depth for painter's algorithm in persp modes
    type Drawable = { depth: number; draw: () => void };
    const drawables: Drawable[] = [];

    const addDrawable = (depth: number, fn: () => void) => {
      if (isPersp) drawables.push({ depth, draw: fn });
      else fn();
    };

    // Moon orbit path
    const moonPathFn = () => {
      ctx.strokeStyle = "rgba(148,163,184,0.1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < moon.length; i += 2) {
        const pt = p(moon[i]);
        if (!pt) { started = false; continue; }
        if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    addDrawable(100, moonPathFn);

    // Artemis future trajectory
    const futureFn = () => {
      ctx.strokeStyle = "rgba(96,165,250,0.15)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      let started = false;
      for (let i = currentIdx; i < art.length; i++) {
        const pt = p(art[i]);
        if (!pt) { started = false; continue; }
        if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    addDrawable(90, futureFn);

    // Artemis traveled trajectory
    const traveledFn = () => {
      if (currentIdx <= 0) return;
      ctx.lineWidth = 2;
      for (let i = 1; i <= currentIdx && i < art.length; i++) {
        const p0 = p(art[i - 1]);
        const p1 = p(art[i]);
        if (!p0 || !p1) continue;
        const alpha = 0.15 + 0.85 * (i / currentIdx);
        ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    };
    addDrawable(95, traveledFn);

    // Distance lines
    const distLinesFn = () => {
      const orionPt = p(art[ai]);
      const moonPt = p(moon[mi]);
      const earthPt = proj(0, 0, 0);
      if (!orionPt) return;
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 0.5;
      if (earthPt) {
        ctx.strokeStyle = "rgba(96,165,250,0.15)";
        ctx.beginPath();
        ctx.moveTo(earthPt.x, earthPt.y);
        ctx.lineTo(orionPt.x, orionPt.y);
        ctx.stroke();
      }
      if (moonPt) {
        ctx.strokeStyle = "rgba(148,163,184,0.1)";
        ctx.beginPath();
        ctx.moveTo(moonPt.x, moonPt.y);
        ctx.lineTo(orionPt.x, orionPt.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };
    addDrawable(80, distLinesFn);

    // Earth
    const earthPt = proj(0, 0, 0);
    if (earthPt) {
      const earthR = projR(EARTH_RADIUS_KM * S, earthPt.depth);
      addDrawable(earthPt.depth, () => {
        const ep = earthPt;
        const grad = ctx.createRadialGradient(
          ep.x - earthR * 0.3, ep.y - earthR * 0.3, 0, ep.x, ep.y, earthR
        );
        grad.addColorStop(0, "#5eead4");
        grad.addColorStop(0.5, "#2563eb");
        grad.addColorStop(1, "#1e3a5f");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, earthR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(96,165,250,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, earthR + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#34d399";
        ctx.font = `${Math.max(9, Math.min(14, earthR * 0.8))}px system-ui`;
        ctx.fillText("Earth", ep.x + earthR + 6, ep.y + 4);
      });
    }

    // Moon
    const moonPt = p(moon[mi]);
    if (moonPt) {
      const moonR = projR(MOON_RADIUS_KM * S, moonPt.depth);
      addDrawable(moonPt.depth, () => {
        const mp = moonPt;
        const grad = ctx.createRadialGradient(
          mp.x - moonR * 0.3, mp.y - moonR * 0.3, 0, mp.x, mp.y, moonR
        );
        grad.addColorStop(0, "#e2e8f0");
        grad.addColorStop(0.7, "#94a3b8");
        grad.addColorStop(1, "#475569");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, moonR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${Math.max(9, Math.min(14, moonR * 0.8))}px system-ui`;
        ctx.fillText("Moon", mp.x + moonR + 6, mp.y + 4);
      });
    }

    // Milestone markers
    for (const ms of MILESTONES) {
      if (ms.idx >= art.length) continue;
      const mpt = p(art[ms.idx]);
      if (!mpt) continue;
      addDrawable(mpt.depth, () => {
        ctx.fillStyle =
          ms.idx < currentIdx - 2
            ? "rgba(52,211,153,0.5)"
            : ms.idx <= currentIdx + 2
              ? "rgba(96,165,250,0.7)"
              : "rgba(71,85,105,0.5)";
        ctx.beginPath();
        ctx.arc(mpt.x, mpt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Orion marker (skip in POV since we ARE Orion)
    if (viewMode !== "pov") {
      const orionPt = p(art[ai]);
      if (orionPt) {
        addDrawable(orionPt.depth - 0.001, () => {
          const pulse = (Date.now() % 2000) / 2000;
          ctx.shadowColor = "#60a5fa";
          ctx.shadowBlur = 20;
          ctx.fillStyle = "#60a5fa";
          ctx.beginPath();
          ctx.arc(orionPt.x, orionPt.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(96,165,250,${0.6 - pulse * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(orionPt.x, orionPt.y, 6 + pulse * 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px system-ui";
          ctx.fillText('Orion "Integrity"', orionPt.x + 12, orionPt.y - 8);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "10px system-ui";
          ctx.fillText(art[ai].date.replace(".0000", ""), orionPt.x + 12, orionPt.y + 6);
        });
      }
    }

    // In persp mode, sort by depth (far first) and draw
    if (isPersp) {
      drawables.sort((a, b) => b.depth - a.depth);
      for (const d of drawables) d.draw();
    }

    // POV overlay: crosshair + HUD
    if (viewMode === "pov") {
      // Subtle crosshair
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = "rgba(96,165,250,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 5);
      ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy + 5);
      ctx.stroke();

      // HUD frame corners
      ctx.strokeStyle = "rgba(96,165,250,0.15)";
      ctx.lineWidth = 1;
      const m = 30;
      const cl = 40;
      // top-left
      ctx.beginPath(); ctx.moveTo(m, m + cl); ctx.lineTo(m, m); ctx.lineTo(m + cl, m); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(w - m - cl, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + cl); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(m, h - m - cl); ctx.lineTo(m, h - m); ctx.lineTo(m + cl, h - m); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(w - m - cl, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - cl); ctx.stroke();

      // POV label
      ctx.fillStyle = "rgba(96,165,250,0.6)";
      ctx.font = "bold 11px system-ui";
      ctx.fillText("ORION FORWARD CAM", m + 6, m + 16);

      // Velocity vector
      const distE = vec3len([art[ai].x, art[ai].y, art[ai].z]);
      const distM = vec3len(vec3sub([art[ai].x, art[ai].y, art[ai].z], [moon[mi].x, moon[mi].y, moon[mi].z]));
      ctx.fillStyle = "rgba(148,163,184,0.5)";
      ctx.font = "10px system-ui";
      ctx.fillText(`Earth: ${formatDist(distE)}`, m + 6, h - m - 26);
      ctx.fillText(`Moon: ${formatDist(distM)}`, m + 6, h - m - 12);
    }

    // Follow mode label
    if (viewMode === "follow") {
      ctx.fillStyle = "rgba(96,165,250,0.5)";
      ctx.font = "bold 11px system-ui";
      ctx.fillText("CHASE CAM", 16, 24);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [data, currentIdx, viewMode]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Mouse + touch interaction with pinch-to-zoom
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number }>({
    active: false, startDist: 0, startZoom: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Mouse handlers ---
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startRotX: viewMode === "pov" ? povLookRef.current.pitch : camRef.current.rotX,
        startRotY: viewMode === "pov" ? povLookRef.current.yaw : camRef.current.rotY,
        startPanX: camRef.current.panX,
        startPanY: camRef.current.panY,
        button: e.button,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (viewMode === "pov") {
        povLookRef.current = {
          yaw: dragRef.current.startRotY + dx * 0.004,
          pitch: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, dragRef.current.startRotX + dy * 0.004)),
        };
        return;
      }
      if (viewMode !== "free") return;
      if (dragRef.current.button === 2) {
        camRef.current.panX = dragRef.current.startPanX + dx;
        camRef.current.panY = dragRef.current.startPanY + dy;
      } else {
        camRef.current.rotY = dragRef.current.startRotY + dx * 0.005;
        camRef.current.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragRef.current.startRotX + dy * 0.005));
      }
    };

    const onMouseUp = () => { dragRef.current.active = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (viewMode === "free") {
        camRef.current.zoom = Math.max(0.2, Math.min(5, camRef.current.zoom * (1 - e.deltaY * 0.001)));
      } else if (viewMode === "follow") {
        followZoomRef.current = Math.max(0.2, Math.min(5, followZoomRef.current * (1 + e.deltaY * 0.001)));
      }
    };

    // --- Touch handlers (single-finger drag + two-finger pinch zoom) ---
    function touchDist(t1: Touch, t2: Touch): number {
      return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Start pinch
        e.preventDefault();
        pinchRef.current = {
          active: true,
          startDist: touchDist(e.touches[0], e.touches[1]),
          startZoom: viewMode === "follow" ? followZoomRef.current : camRef.current.zoom,
        };
        dragRef.current.active = false;
      } else if (e.touches.length === 1) {
        // Single finger drag
        const t = e.touches[0];
        dragRef.current = {
          active: true,
          startX: t.clientX,
          startY: t.clientY,
          startRotX: viewMode === "pov" ? povLookRef.current.pitch : camRef.current.rotX,
          startRotY: viewMode === "pov" ? povLookRef.current.yaw : camRef.current.rotY,
          startPanX: camRef.current.panX,
          startPanY: camRef.current.panY,
          button: 0,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.active) {
        e.preventDefault();
        const dist = touchDist(e.touches[0], e.touches[1]);
        const scale = dist / pinchRef.current.startDist;
        if (viewMode === "free") {
          camRef.current.zoom = Math.max(0.2, Math.min(5, pinchRef.current.startZoom * scale));
        } else if (viewMode === "follow") {
          followZoomRef.current = Math.max(0.2, Math.min(5, pinchRef.current.startZoom / scale));
        }
        return;
      }

      if (!dragRef.current.active || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;

      if (viewMode === "pov") {
        povLookRef.current = {
          yaw: dragRef.current.startRotY + dx * 0.004,
          pitch: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, dragRef.current.startRotX + dy * 0.004)),
        };
      } else if (viewMode === "free") {
        camRef.current.rotY = dragRef.current.startRotY + dx * 0.005;
        camRef.current.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragRef.current.startRotX + dy * 0.005));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current.active = false;
      if (e.touches.length === 0) dragRef.current.active = false;
    };

    const onContext = (e: Event) => e.preventDefault();

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    canvas.addEventListener("contextmenu", onContext);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("contextmenu", onContext);
    };
  }, [viewMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        touchAction: "none",
        background: "#0a0e1a",
      }}
    />
  );
}

function formatDist(km: number): string {
  if (km > 100000) return (km / 1000).toFixed(0) + "k km";
  return km.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " km";
}
