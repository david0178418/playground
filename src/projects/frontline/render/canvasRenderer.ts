import { CAMERA, COLORS, CORRIDOR } from '../config';
import type { GameEngine } from '../ecs/Engine';

/**
 * TEMPORARY: corridor-first flat scroll strip (V1_ACCEPTANCE_CRITERIA §4).
 * Arenas are nice-to-have next slice.
 */
export function renderFrame(ctx: CanvasRenderingContext2D, ecs: GameEngine): void {
  const cameraX = ecs.getResource('cameraX');
  const w = CAMERA.VIEW_WIDTH;
  const h = CAMERA.VIEW_HEIGHT;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = COLORS.BG;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(-cameraX, (h - CORRIDOR.HEIGHT) / 2);

  ctx.fillStyle = COLORS.CORRIDOR;
  ctx.fillRect(cameraX - 40, 0, w + 80, CORRIDOR.HEIGHT);

  ctx.fillStyle = COLORS.CORRIDOR_EDGE;
  ctx.fillRect(cameraX - 40, 0, w + 80, CORRIDOR.EDGE_PAD);
  ctx.fillRect(cameraX - 40, CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD, w + 80, CORRIDOR.EDGE_PAD);

  ctx.strokeStyle = COLORS.GRID;
  ctx.lineWidth = 1;
  const start = Math.floor(cameraX / 200) * 200;
  for (let x = start; x < cameraX + w + 200; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x, CORRIDOR.EDGE_PAD);
    ctx.lineTo(x, CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD);
    ctx.stroke();
  }

  // Left wall — no escaping the run
  ctx.fillStyle = '#c62828';
  ctx.fillRect(-4, 0, 4, CORRIDOR.HEIGHT);
  ctx.fillStyle = 'rgba(198,40,40,0.15)';
  ctx.fillRect(0, 0, 40, CORRIDOR.HEIGHT);

  const entities = ecs.getEntitiesWithQuery(['position', 'renderable']);
  const sorted = [...entities].sort((a, b) => a.components.position.y - b.components.position.y);

  for (const ent of sorted) {
    const pos = ent.components.position;
    const rend = ent.components.renderable;
    const health = ecs.entityManager.getComponent(ent.id, 'health');
    drawEntity(ctx, {
      x: pos.x,
      y: pos.y,
      shape: rend.shape,
      color: rend.color,
      radius: rend.radius ?? 10,
      width: rend.width ?? 20,
      height: rend.height ?? 20,
      label: rend.label ?? '',
      hpRatio: health ? health.current / Math.max(1, health.max) : undefined,
    });
  }

  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px monospace';
  ctx.fillText('TEMPORARY: flat corridor strip', 8, h - 8);
}

interface DrawEnt {
  x: number;
  y: number;
  shape: string;
  color: string;
  radius: number;
  width: number;
  height: number;
  label: string;
  hpRatio?: number;
}

/** Extreme ¾ / side-view placeholder: taller body oval + small head (not a flat circle). */
function drawUnitPlaceholder(ctx: CanvasRenderingContext2D, e: DrawEnt): void {
  const bodyW = e.radius * 1.15;
  const bodyH = e.radius * 2.15;
  const headRx = e.radius * 0.55;
  const headRy = e.radius * 0.65;
  const bodyCy = e.y + e.radius * 0.2;
  const headCy = e.y - bodyH * 0.42;

  ctx.beginPath();
  ctx.ellipse(e.x, bodyCy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = e.color;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(e.x, headCy, headRx, headRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = e.color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny "facing" notch on the head (reads as side/¾, not top-down)
  ctx.beginPath();
  ctx.arc(e.x + headRx * 0.55, headCy - headRy * 0.1, headRx * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
}

function drawEntity(ctx: CanvasRenderingContext2D, e: DrawEnt): void {
  ctx.save();
  if (e.shape === 'door') {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2, e.width, e.height);
    ctx.strokeStyle = '#eceff1';
    ctx.strokeRect(e.x - e.width / 2, e.y - e.height / 2, e.width, e.height);
  } else if (e.shape === 'token') {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (e.shape === 'unit') {
    drawUnitPlaceholder(ctx, e);
  } else {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
  }

  const topY =
    e.shape === 'unit' ? e.y - e.radius * 2.15 * 0.42 - e.radius * 0.65 - 6 : e.y - e.radius - 8;
  const labelY = e.shape === 'unit' ? e.y + e.radius * 1.35 : e.y + e.radius + 10;

  if (e.hpRatio !== undefined && e.hpRatio < 1) {
    const bw = e.radius * 2;
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - bw / 2, topY, bw, 3);
    ctx.fillStyle = e.hpRatio > 0.35 ? '#66bb6a' : '#ef5350';
    ctx.fillRect(e.x - bw / 2, topY, bw * Math.max(0, e.hpRatio), 3);
  }

  if (e.label) {
    ctx.fillStyle = '#eceff1';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, e.x, labelY);
  }
  ctx.restore();
}

export function resizeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = CAMERA.VIEW_WIDTH;
  canvas.height = CAMERA.VIEW_HEIGHT;
}
