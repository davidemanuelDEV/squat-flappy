/**
 * Canvas drawing — mint bird + steel arcade gates over a standing-desk dusk.
 * Original geometric art. Not Flappy Bird sprites.
 */

import type { GameState } from "./game";
import { birdRadius, birdX, pipeGap, pipeWidth } from "./game";

function steelGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number
): CanvasGradient {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#0f2a32");
  g.addColorStop(0.18, "#1f6f78");
  g.addColorStop(0.4, "#5eead4");
  g.addColorStop(0.55, "#99f6e4");
  g.addColorStop(0.72, "#2dd4bf");
  g.addColorStop(0.88, "#115e59");
  g.addColorStop(1, "#042f2e");
  return g;
}

function drawGateSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  capAtBottom: boolean
) {
  if (h <= 0) return;
  ctx.fillStyle = steelGradient(ctx, x, w);
  ctx.fillRect(x, y, w, h);

  const capH = Math.min(18, h * 0.15);
  const capPad = w * 0.08;
  const capY = capAtBottom ? y + h - capH : y;
  ctx.fillStyle = steelGradient(ctx, x - capPad, w + capPad * 2);
  ctx.fillRect(x - capPad, capY, w + capPad * 2, capH);

  ctx.fillStyle = "rgba(236, 253, 245, 0.28)";
  ctx.fillRect(x + w * 0.22, y, w * 0.1, h);
}

export function drawPipes(ctx: CanvasRenderingContext2D, state: GameState) {
  const pw = pipeWidth(state.width);
  const gap = pipeGap(state.width, state.height);
  for (const p of state.pipes) {
    const gapTop = p.gapY - gap / 2;
    const gapBot = p.gapY + gap / 2;
    drawGateSegment(ctx, p.x, 0, pw, gapTop, true);
    drawGateSegment(ctx, p.x, gapBot, pw, state.height - gapBot, false);
  }
}

export function drawPlayfield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "rgba(6, 22, 26, 0.46)");
  sky.addColorStop(0.4, "rgba(8, 36, 40, 0.28)");
  sky.addColorStop(0.75, "rgba(15, 58, 52, 0.32)");
  sky.addColorStop(1, "rgba(6, 28, 24, 0.5)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height * 0.4;
  const rx = width * 0.72;
  const ry = height * 0.78;
  const vig = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(rx, ry) * 0.25,
    cx,
    cy,
    Math.max(rx, ry)
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.6, "rgba(0,0,0,0.06)");
  vig.addColorStop(1, "rgba(2, 12, 14, 0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  const groundH = Math.max(28, height * 0.12);
  const ground = ctx.createLinearGradient(0, height - groundH, 0, height);
  ground.addColorStop(0, "rgba(15, 58, 52, 0)");
  ground.addColorStop(0.5, "rgba(13, 42, 38, 0.38)");
  ground.addColorStop(1, "rgba(4, 18, 16, 0.74)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, height - groundH, width, groundH);

  ctx.fillStyle = "rgba(190, 242, 100, 0.1)";
  ctx.fillRect(0, height - groundH - 2, width, 3);
}

/** Lime-mint desk-arcade bird. Shared by in-game draw + share card. */
export function drawBirdAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  velHint = 0
) {
  const tilt = Math.max(-0.5, Math.min(0.5, velHint * 0.8));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  const outline = Math.max(2.2, r * 0.14);

  ctx.beginPath();
  ctx.ellipse(r * 0.08, r * 0.55, r * 1.05, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  const body = ctx.createRadialGradient(
    -r * 0.25,
    -r * 0.35,
    r * 0.1,
    0,
    0,
    r * 1.25
  );
  body.addColorStop(0, "#ecfccb");
  body.addColorStop(0.35, "#a3e635");
  body.addColorStop(0.75, "#65a30d");
  body.addColorStop(1, "#365314");
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.18, r * 1.02, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = "#1a2e05";
  ctx.lineWidth = outline;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(r * 0.12, r * 0.28, r * 0.52, r * 0.42, 0.1, 0, Math.PI * 2);
  const belly = ctx.createRadialGradient(
    r * 0.05,
    r * 0.15,
    r * 0.05,
    r * 0.12,
    r * 0.28,
    r * 0.55
  );
  belly.addColorStop(0, "#f0fdfa");
  belly.addColorStop(1, "#99f6e4");
  ctx.fillStyle = belly;
  ctx.fill();

  ctx.save();
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, r * 0.02, r * 0.48, r * 0.32, 0, 0, Math.PI * 2);
  const wing = ctx.createRadialGradient(
    -r * 0.35,
    -r * 0.08,
    r * 0.05,
    -r * 0.22,
    r * 0.02,
    r * 0.5
  );
  wing.addColorStop(0, "#ecfdf5");
  wing.addColorStop(0.55, "#5eead4");
  wing.addColorStop(1, "#0f766e");
  ctx.fillStyle = wing;
  ctx.fill();
  ctx.strokeStyle = "#115e59";
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, r * 0.05, r * 0.22, r * 0.16, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(236, 253, 245, 0.55)";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(r * 0.28, r * 0.12, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(190, 242, 100, 0.45)";
  ctx.fill();

  const ex = r * 0.42;
  const ey = -r * 0.28;
  const er = r * 0.34;
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#052e16";
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ex + er * 0.22, ey + er * 0.05, er * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "#14532d";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex - er * 0.15, ey - er * 0.25, er * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.72, -r * 0.02);
  ctx.lineTo(r * 1.55, r * 0.08);
  ctx.lineTo(r * 0.72, r * 0.38);
  ctx.closePath();
  const beak = ctx.createLinearGradient(r * 0.72, 0, r * 1.55, r * 0.2);
  beak.addColorStop(0, "#fde047");
  beak.addColorStop(0.5, "#facc15");
  beak.addColorStop(1, "#ca8a04");
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.stroke();

  ctx.restore();
}

export function drawBird(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  velHint = 0
) {
  drawBirdAt(
    ctx,
    birdX(state.width),
    state.birdY,
    birdRadius(state.height),
    velHint
  );
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  reps: number,
  beatTarget?: number | null
) {
  const { width: w } = state;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = `900 ${Math.max(28, w * 0.08)}px system-ui, sans-serif`;
  ctx.fillStyle = "#ecfdf5";
  ctx.strokeStyle = "rgba(6, 24, 22, 0.72)";
  ctx.lineWidth = 4;
  const scoreText = String(state.score);
  const scoreY = Math.max(48, w * 0.08);
  ctx.strokeText(scoreText, w / 2, scoreY);
  ctx.fillText(scoreText, w / 2, scoreY);

  ctx.font = `600 ${Math.max(12, w * 0.032)}px system-ui, sans-serif`;
  ctx.lineWidth = 3;
  const sub = `Best ${state.highScore} · Squats ${reps}`;
  const subY = Math.max(72, w * 0.12);
  ctx.strokeText(sub, w / 2, subY);
  ctx.fillText(sub, w / 2, subY);

  if (beatTarget != null && beatTarget >= 0) {
    const barW = Math.min(w * 0.55, 220);
    const barH = Math.max(8, w * 0.014);
    const barX = (w - barW) / 2;
    const barY = subY + Math.max(10, w * 0.02);
    const progress =
      beatTarget <= 0 ? 1 : Math.min(1, state.score / beatTarget);
    ctx.fillStyle = "rgba(6, 24, 22, 0.5)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle =
      state.score > beatTarget ? "rgba(52,211,153,0.95)" : "rgba(190,242,100,0.92)";
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.strokeStyle = "rgba(204, 251, 241, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = `700 ${Math.max(11, w * 0.028)}px system-ui, sans-serif`;
    ctx.fillStyle =
      state.score > beatTarget ? "#6ee7b7" : "#d9f99d";
    ctx.lineWidth = 3;
    const label =
      state.score > beatTarget ? `Beat ${beatTarget}!` : `Beat ${beatTarget}`;
    ctx.strokeText(label, w / 2, barY + barH + Math.max(14, w * 0.032));
    ctx.fillText(label, w / 2, barY + barH + Math.max(14, w * 0.032));
  }
  ctx.restore();
}
