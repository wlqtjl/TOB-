/**
 * HeroParticleFlow — 首页 Hero 粒子流动画
 *
 * 对标 Data Center 游戏：把网络流量具象化为彩色数据包球沿 bezier 曲线流动。
 * 纯 Canvas 2D 实现，零新增依赖。
 *
 * Design:
 * - Dark navy backdrop with subtle radial gradient
 * - N 条 bezier 路径（节点→节点），每条路径持续发射彩色粒子
 * - 节点脉冲呼吸光
 * - 鼠标移动触发视差偏移（微弱）
 * - 响应式：按容器宽度重采样节点坐标
 * - 尊重 prefers-reduced-motion
 */

'use client';

import { useEffect, useRef } from 'react';

// ─── Palette: packet-ball colors (data center style) ────────────────
const PACKET_COLORS = [
  '#58A6FF', // accent blue
  '#79C0FF', // light blue
  '#A5F3FC', // cyan
  '#FBBF24', // amber (warning packet)
  '#F472B6', // pink (special packet)
  '#A78BFA', // violet
];

// Normalized node positions (0..1 in both axes).
interface NodeSpec {
  x: number;
  y: number;
  label: string;
  size?: number;
}

const NODES: NodeSpec[] = [
  { x: 0.08, y: 0.55, label: 'Client', size: 14 },
  { x: 0.26, y: 0.25, label: 'Edge', size: 16 },
  { x: 0.26, y: 0.78, label: 'VPN', size: 12 },
  { x: 0.5, y: 0.5, label: 'Core', size: 22 },
  { x: 0.74, y: 0.22, label: 'App', size: 14 },
  { x: 0.74, y: 0.78, label: 'DB', size: 14 },
  { x: 0.92, y: 0.5, label: 'Storage', size: 16 },
];

interface Edge {
  from: number;
  to: number;
  /** Bezier curvature offset (perpendicular, normalized). */
  curve: number;
}

const EDGES: Edge[] = [
  { from: 0, to: 1, curve: -0.08 },
  { from: 0, to: 2, curve: 0.08 },
  { from: 1, to: 3, curve: 0.05 },
  { from: 2, to: 3, curve: -0.05 },
  { from: 3, to: 4, curve: -0.08 },
  { from: 3, to: 5, curve: 0.08 },
  { from: 4, to: 6, curve: 0.05 },
  { from: 5, to: 6, curve: -0.05 },
];

interface Packet {
  edge: number;
  t: number; // 0..1 progress
  speed: number;
  color: string;
  radius: number;
}

function bezierPoint(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  cx: number, cy: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * p0x + 2 * mt * t * cx + t * t * p1x,
    y: mt * mt * p0y + 2 * mt * t * cy + t * t * p1y,
  };
}

export default function HeroParticleFlow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const packets: Packet[] = [];
    const MAX_PACKETS = reducedMotion ? 0 : 90;

    const spawnPacket = () => {
      const edgeIdx = Math.floor(Math.random() * EDGES.length);
      packets.push({
        edge: edgeIdx,
        t: 0,
        speed: 0.0025 + Math.random() * 0.005,
        color: PACKET_COLORS[Math.floor(Math.random() * PACKET_COLORS.length)],
        radius: 2 + Math.random() * 2.5,
      });
    };

    // Pre-seed some packets at random progress
    if (!reducedMotion) {
      for (let i = 0; i < 30; i++) {
        spawnPacket();
        packets[packets.length - 1].t = Math.random();
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width - 0.5;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height - 0.5;
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const getEdgeGeometry = (edge: Edge) => {
      const a = NODES[edge.from];
      const b = NODES[edge.to];
      const parallax = reducedMotion ? 0 : 1;
      const px = mouseRef.current.x * 6 * parallax;
      const py = mouseRef.current.y * 6 * parallax;
      const ax = a.x * width + px;
      const ay = a.y * height + py;
      const bx = b.x * width + px;
      const by = b.y * height + py;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      // perpendicular curve offset
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cx = mx + nx * edge.curve * height;
      const cy = my + ny * edge.curve * height;
      return { ax, ay, bx, by, cx, cy };
    };

    let t0 = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - t0);
      t0 = now;

      ctx.clearRect(0, 0, width, height);
      const grd = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.1,
        width / 2, height / 2, Math.max(width, height) * 0.8,
      );
      grd.addColorStop(0, 'rgba(88, 166, 255, 0.08)');
      grd.addColorStop(1, 'rgba(13, 17, 23, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      // Draw edges
      ctx.lineCap = 'round';
      EDGES.forEach((edge) => {
        const { ax, ay, bx, by, cx, cy } = getEdgeGeometry(edge);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Update and draw packets
      if (!reducedMotion) {
        while (packets.length < MAX_PACKETS && Math.random() < 0.25) {
          spawnPacket();
        }
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.t += p.speed * (dt / 16.67);
          if (p.t >= 1) {
            packets.splice(i, 1);
            continue;
          }
          const edge = EDGES[p.edge];
          const { ax, ay, bx, by, cx, cy } = getEdgeGeometry(edge);
          const { x, y } = bezierPoint(ax, ay, bx, by, cx, cy, p.t);
          // Glow
          ctx.beginPath();
          ctx.arc(x, y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color + '33';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      // Draw nodes with pulse
      const pulse = (Math.sin(now / 600) + 1) / 2;
      NODES.forEach((node) => {
        const parallax = reducedMotion ? 0 : 1;
        const x = node.x * width + mouseRef.current.x * 6 * parallax;
        const y = node.y * height + mouseRef.current.y * 6 * parallax;
        const size = node.size ?? 14;
        ctx.beginPath();
        ctx.arc(x, y, size + 8 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(88, 166, 255, 0.08)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0D1117';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#58A6FF';
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
