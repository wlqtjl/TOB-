/**
 * ConnectionRenderer — Draws VisualConnection instances on Canvas
 *
 * Supports: straight lines, cubic Bezier curves, dashed patterns,
 * bidirectional arrows, and animated drawing for user-created connections.
 */

import type { VisualConnection, VisualEntity } from '@skillquest/game-engine';

export interface BezierPath {
  x0: number; y0: number;
  cx1: number; cy1: number;
  cx2: number; cy2: number;
  x1: number; y1: number;
}

/** Draw a single connection on canvas */
export function drawConnection(
  ctx: CanvasRenderingContext2D,
  conn: VisualConnection,
  entityMap: Map<string, VisualEntity>,
  highlightIds?: Set<string>,
): void {
  const from = entityMap.get(conn.from);
  const to = entityMap.get(conn.to);
  if (!from || !to) return;

  ctx.save();

  const isHighlighted = highlightIds?.has(conn.id);
  ctx.strokeStyle = isHighlighted ? '#22c55e' : conn.style.color;
  ctx.lineWidth = isHighlighted ? conn.style.width + 1 : conn.style.width;
  ctx.globalAlpha = conn.style.opacity;

  if (conn.style.dashPattern && conn.style.dashPattern.length > 0) {
    ctx.setLineDash(conn.style.dashPattern);
  }

  ctx.beginPath();
  if (conn.bezierControl) {
    const { cx1, cy1, cx2, cy2 } = conn.bezierControl;
    ctx.moveTo(from.position.x, from.position.y);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, to.position.x, to.position.y);
  } else {
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
  }
  ctx.stroke();

  // Arrowhead for directional connections
  if (!conn.bidirectional) {
    drawArrowhead(ctx, from.position, to.position, conn.bezierControl);
  }

  ctx.restore();
}

/** Draw an in-progress connection line (during connect interaction) */
export function drawPendingConnection(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color = '#60a5fa',
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

/** Build a Bezier path for particle system from a connection + entity positions */
export function buildBezierPath(
  conn: VisualConnection,
  entityMap: Map<string, VisualEntity>,
): BezierPath | null {
  const from = entityMap.get(conn.from);
  const to = entityMap.get(conn.to);
  if (!from || !to) return null;

  if (conn.bezierControl) {
    return {
      x0: from.position.x, y0: from.position.y,
      cx1: conn.bezierControl.cx1, cy1: conn.bezierControl.cy1,
      cx2: conn.bezierControl.cx2, cy2: conn.bezierControl.cy2,
      x1: to.position.x, y1: to.position.y,
    };
  }

  // Straight line → cubic Bezier with control points at 1/3 and 2/3
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  return {
    x0: from.position.x, y0: from.position.y,
    cx1: from.position.x + dx / 3, cy1: from.position.y + dy / 3,
    cx2: from.position.x + (2 * dx) / 3, cy2: from.position.y + (2 * dy) / 3,
    x1: to.position.x, y1: to.position.y,
  };
}

/** Draw arrowhead at the end of a connection */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  bezier?: { cx1: number; cy1: number; cx2: number; cy2: number },
): void {
  const arrowLen = 10;
  const arrowAngle = Math.PI / 6;

  // Calculate angle at endpoint
  let angle: number;
  if (bezier) {
    // Use tangent at t=1 (from control point 2 to end)
    angle = Math.atan2(to.y - bezier.cy2, to.x - bezier.cx2);
  } else {
    angle = Math.atan2(to.y - from.y, to.x - from.x);
  }

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - arrowLen * Math.cos(angle - arrowAngle),
    to.y - arrowLen * Math.sin(angle - arrowAngle),
  );
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - arrowLen * Math.cos(angle + arrowAngle),
    to.y - arrowLen * Math.sin(angle + arrowAngle),
  );
  ctx.stroke();
}
