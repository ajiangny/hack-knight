import { useEffect, useRef, useState } from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import mascotSvg from '../../assets/brand/logoprimary.svg?raw';

// Looping fireworks drawn on a canvas behind the Hero's back hill. Renders
// nothing until the countdown target passes — the same moment the timer
// switches to "Hackathon In-Progress!" — and stays static for users who
// prefer reduced motion. Every so often a little mascot hops up in place of a
// rocket, does a flip or spin at the top of its arc, and falls back down.
// Each burst also lights up the sky around it with a soft glow that fades out.

const COLORS = ['#a855f7', '#c084fc', '#2dd4bf', '#fbbf24', '#ec4899', '#3b82f6', '#a3e635'];
const GRAVITY = 0.04;
const TRAIL = 6;
const MASCOT_CHANCE = 0.25;
const GLOW_SPRITE = 128;
const GLOW_PEAK = 0.35; // max opacity of a burst's glow
const GLOW_DECAY = 0.012; // per frame, ~80 frames to fade
const MASCOT_ASPECT = 2622 / 3544; // logoprimary.svg viewBox width / height
// The file sizes itself at 100%, which Firefox refuses to draw onto a canvas,
// so give it fixed pixel dimensions.
const MASCOT_SRC =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(mascotSvg.replace('width="100%" height="100%"', 'width="262" height="354"'));

interface Rocket { x: number; y: number; vy: number; peakY: number; color: string }
interface Mascot {
  x: number; y: number; vx: number; vy: number;
  size: number; age: number; airtime: number;
  // "flip" rotates head over heels; "spin" turns around like a coin.
  trick: 'flip' | 'spin'; dir: 1 | -1;
}
interface Glow { x: number; y: number; radius: number; life: number; sprite: HTMLCanvasElement }
interface Spark {
  x: number; y: number; vx: number; vy: number;
  life: number; decay: number; color: string;
  trail: { x: number; y: number }[];
}

// A radial gradient drawn once per color, so a glow each frame is a single
// drawImage instead of building a gradient.
function makeGlowSprite(color: string) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = GLOW_SPRITE;
  const g = sprite.getContext('2d');
  if (g) {
    const r = GLOW_SPRITE / 2;
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + '66');
    gradient.addColorStop(1, color + '00');
    g.fillStyle = gradient;
    g.fillRect(0, 0, GLOW_SPRITE, GLOW_SPRITE);
  }
  return sprite;
}

function useHasStarted(targetDate: string) {
  const targetMs = new Date(targetDate).getTime();
  const [now, setNow] = useState(() => Date.now());
  const started = now >= targetMs;

  useEffect(() => {
    if (started) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [started]);

  return started;
}

export default function Fireworks() {
  const { targetDate } = useCountdown();
  const started = useHasStarted(targetDate);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!started || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mascotImg = new Image();
    mascotImg.src = MASCOT_SRC;

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const mascots: Mascot[] = [];
    const glows: Glow[] = [];
    const glowSprites = new Map(COLORS.map((c) => [c, makeGlowSprite(c)]));
    let nextLaunch = 0;

    const hop = () => {
      const size = 36 + Math.random() * 24;
      const peakY = height * (0.25 + Math.random() * 0.3);
      const startY = height + size;
      const vy = -Math.sqrt(2 * GRAVITY * (startY - peakY));
      mascots.push({
        x: width * (0.1 + Math.random() * 0.8),
        y: startY,
        vx: (Math.random() - 0.5) * 1.5,
        vy,
        size,
        age: 0,
        // Frames until it falls back to where it started.
        airtime: (2 * -vy) / GRAVITY,
        trick: Math.random() < 0.5 ? 'flip' : 'spin',
        dir: Math.random() < 0.5 ? 1 : -1,
      });
    };

    const launch = () => {
      const peakY = height * (0.12 + Math.random() * 0.33);
      rockets.push({
        x: width * (0.1 + Math.random() * 0.8),
        y: height,
        // Speed that just reaches peakY under gravity.
        vy: -Math.sqrt(2 * GRAVITY * (height - peakY)),
        peakY,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    const explode = (r: Rocket) => {
      const count = 50 + Math.floor(Math.random() * 30);
      const speed = 1.5 + Math.random() * 2;
      glows.push({
        x: r.x, y: r.y,
        // Roughly how far the sparks travel before drag stops them.
        radius: speed * 55,
        life: 1,
        sprite: glowSprites.get(r.color)!,
      });
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const v = speed * (0.6 + Math.random() * 0.4);
        sparks.push({
          x: r.x, y: r.y,
          vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
          life: 1, decay: 0.008 + Math.random() * 0.008,
          color: Math.random() < 0.2 ? '#f4f4f5' : r.color,
          trail: [],
        });
      }
    };

    // Only animate while the hero is on screen and the tab is visible.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);

    let frame = 0;
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;

      if (t >= nextLaunch) {
        if (mascotImg.complete && Math.random() < MASCOT_CHANCE) hop();
        else launch();
        nextLaunch = t + 500 + Math.random() * 1100;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = glows.length - 1; i >= 0; i--) {
        const g = glows[i];
        g.life -= GLOW_DECAY;
        if (g.life <= 0) {
          glows.splice(i, 1);
          continue;
        }
        // Bright flash that eases out, spreading a little as it fades.
        const size = g.radius * (1.6 - 0.4 * g.life) * 2;
        ctx.globalAlpha = GLOW_PEAK * g.life * g.life;
        ctx.drawImage(g.sprite, g.x - size / 2, g.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += GRAVITY;
        r.y += r.vy;
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x - 1, r.y, 2, 8);
        if (r.vy >= 0 || r.y <= r.peakY) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > TRAIL) s.trail.shift();
        s.vx *= 0.98;
        s.vy = s.vy * 0.98 + GRAVITY;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.strokeStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(s.trail[0].x, s.trail[0].y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      for (let i = mascots.length - 1; i >= 0; i--) {
        const m = mascots[i];
        m.vy += GRAVITY;
        m.x += m.vx;
        m.y += m.vy;
        m.age++;
        if (m.age > m.airtime) {
          mascots.splice(i, 1);
          continue;
        }
        // One full turn during the middle of the hop, eased, so it leaves
        // and lands upright.
        const p = Math.min(Math.max((m.age / m.airtime - 0.25) / 0.5, 0), 1);
        const turn = (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2) * Math.PI * 2 * m.dir;
        const w = m.size * MASCOT_ASPECT;
        ctx.save();
        ctx.translate(m.x, m.y);
        if (m.trick === 'flip') ctx.rotate(turn);
        else ctx.scale(Math.cos(turn), 1);
        ctx.drawImage(mascotImg, -w / 2, -m.size / 2, w, m.size);
        ctx.restore();
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
    };
  }, [started]);

  if (!started) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
