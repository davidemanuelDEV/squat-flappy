/**
 * Lightweight canvas crash burst — geometric only, no sprites.
 */

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
};

export type CrashBurst = {
  x: number;
  y: number;
  age: number;
  duration: number;
  particles: Particle[];
  flash: number;
};

const COLORS = [
  "#a3e635",
  "#65a30d",
  "#2dd4bf",
  "#5eead4",
  "#fde047",
  "#ecfccb",
  "#0f766e",
  "#bef264",
];

export function createCrashBurst(x: number, y: number, scale = 1): CrashBurst {
  const n = 18 + Math.floor(Math.random() * 8);
  const particles: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
    const speed = (120 + Math.random() * 220) * scale;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 40 * scale,
      life: 1,
      maxLife: 0.35 + Math.random() * 0.35,
      r: (3 + Math.random() * 5) * scale,
      color: COLORS[i % COLORS.length],
    });
  }
  return {
    x,
    y,
    age: 0,
    duration: 0.7,
    particles,
    flash: 1,
  };
}

export function tickCrash(burst: CrashBurst, dt: number): CrashBurst | null {
  const age = burst.age + dt;
  if (age > burst.duration) return null;
  const flash = Math.max(0, 1 - age / 0.18);
  const particles = burst.particles
    .map((p) => {
      const life = p.life - dt / p.maxLife;
      if (life <= 0) return null;
      return {
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vx: p.vx * 0.96,
        vy: p.vy * 0.96 + 380 * dt,
        life,
        r: p.r * (0.85 + 0.15 * life),
      };
    })
    .filter((p): p is Particle => p != null);
  return { ...burst, age, flash, particles };
}

export function drawCrash(ctx: CanvasRenderingContext2D, burst: CrashBurst) {
  ctx.save();
  if (burst.flash > 0.02) {
    const a = burst.flash * 0.55;
    const rad = 28 + (1 - burst.flash) * 70;
    const g = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, rad);
    g.addColorStop(0, `rgba(236,252,203,${a})`);
    g.addColorStop(0.45, `rgba(45,212,191,${a * 0.55})`);
    g.addColorStop(1, "rgba(163,230,53,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of burst.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const WIPEOUT_LINES = [
  "Desk 1, quads 0.",
  "That gate filed an HR ticket.",
  "Stand. Squat. Bonk.",
  "Parallel was cute. The gap disagreed.",
  "Your standing desk just won.",
  "Air squat: strong. Aim: spicy.",
  "The monitor saw everything.",
  "Eye height was fine. Knees were rumors.",
  "Arcade mode: you paid in quads.",
  "That wasn’t a gap, that was a standup.",
  "Bird tried parkour. Steel said no.",
  "Hold the 90. Dodge the rest.",
  "Lime bird, slate gate, sad squat.",
  "You hugged the steel. Bold.",
  "Form check: bird needs a deeper sit.",
] as const;

export function pickWipeoutLine(exclude?: string | null): string {
  const list = WIPEOUT_LINES as readonly string[];
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  if (exclude && list.length > 1) {
    let guard = 0;
    while (pick === exclude && guard++ < 8) {
      pick = list[Math.floor(Math.random() * list.length)];
    }
  }
  return pick;
}
