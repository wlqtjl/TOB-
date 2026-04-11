/**
 * EntityRenderer — Draws VisualEntity instances on Canvas
 *
 * Extracted from UniversalGameRenderer for modularity.
 * Handles: circles, rounded rects, icons, labels, stars, glow effects.
 */

import type { VisualEntity } from '@skillquest/game-engine';

const CLICKABLE_OPACITY_THRESHOLD = 0.5;

/** Draw a single entity on canvas */
export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: VisualEntity,
  isHovered: boolean,
  isSelected: boolean,
): void {
  const { x, y } = entity.position;
  const { w, h } = entity.size;
  const hw = w / 2;
  const hh = h / 2;

  ctx.save();
  ctx.globalAlpha = entity.style.opacity;

  // Glow effect (enhanced on hover/selection)
  if (entity.style.glowColor && entity.style.glowRadius) {
    const glowMultiplier = isSelected ? 2.5 : isHovered ? 1.8 : 1;
    ctx.shadowColor = entity.style.glowColor;
    ctx.shadowBlur = entity.style.glowRadius * glowMultiplier;
  }

  // Background fill + stroke
  ctx.fillStyle = entity.style.fill;
  ctx.strokeStyle = isSelected ? '#ffffff' : entity.style.stroke;
  ctx.lineWidth = isSelected ? entity.style.strokeWidth + 1 : entity.style.strokeWidth;

  // Shape: circle for small entities, rounded rect for larger
  if (w <= 80 && h <= 80) {
    const radius = Math.min(hw, hh);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    drawRoundedRect(ctx, x - hw, y - hh, w, h, 8);
    ctx.fill();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Icon
  ctx.font = w <= 80 ? '24px serif' : '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(entity.icon, x, y - (w > 80 ? 4 : 0));

  // Label
  if (entity.label) {
    ctx.font = w <= 80 ? '10px sans-serif' : '12px sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.textAlign = 'center';

    const maxChars = w <= 80 ? 12 : 30;
    const labelY = w <= 80 ? y + hh + 14 : y + 10;
    const lines = entity.label.split('\n');
    lines.forEach((line, i) => {
      const display = line.length > maxChars ? line.slice(0, maxChars) + '…' : line;
      ctx.fillText(display, x, labelY + i * 14);
    });
  }

  // Stars metadata
  const starsDisplay = entity.metadata.starsDisplay as string | undefined;
  if (starsDisplay) {
    ctx.font = '10px serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText(starsDisplay, x, y + hh + 28);
  }

  // Draggable indicator
  if (entity.draggable && isHovered) {
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    if (w <= 80) {
      ctx.beginPath();
      ctx.arc(x, y, Math.min(hw, hh) + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawRoundedRect(ctx, x - hw - 4, y - hh - 4, w + 8, h + 8, 10);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/** Check if cursor is over an entity */
export function hitTestEntity(
  entity: VisualEntity,
  mx: number,
  my: number,
): boolean {
  const { x, y } = entity.position;
  const hw = entity.size.w / 2;
  const hh = entity.size.h / 2;
  return Math.abs(mx - x) < hw && Math.abs(my - y) < hh;
}

/** Check if entity should be clickable */
export function isEntityClickable(entity: VisualEntity): boolean {
  return entity.metadata.clickable !== false && entity.style.opacity > CLICKABLE_OPACITY_THRESHOLD;
}

/** Draw a rounded rectangle path */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
