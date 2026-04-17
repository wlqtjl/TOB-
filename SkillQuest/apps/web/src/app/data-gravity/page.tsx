'use client';

/**
 * DataGravity Visualization — Canvas 2D physics simulation
 *
 * Renders a distributed storage cluster with gravitational data-particle physics.
 * Uses @skillquest/game-engine for physics and @skillquest/types for type safety.
 */

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Anchor, Shield, ScanSearch, Atom, RotateCcw, ArrowLeft,
  Activity, Gauge, Zap, TrendingDown,
} from 'lucide-react';
import {
  createDataGravityState, updatePhysics, createGravityNode,
  dopplerColor, computeEnergyMetrics, createEntropyHistory, recordEntropy,
  placeGravityAnchor, placeForceShield, activateLens, updateLensPosition,
  deactivateLens, getParticlesInLens, applySingularity,
  injectNodeFailure, recoverNode, executeGravityGunAction,
} from '@skillquest/game-engine';
import type {
  DataGravityState, GravityNode, DataParticle, EnergyMetrics,
  GravityGunToolType, Vec2,
} from '@skillquest/types';
import type { EntropyHistory } from '@skillquest/game-engine';

/* ────────────────── constants ────────────────── */

const TOOLS: { id: GravityGunToolType; label: string; Icon: typeof Anchor }[] = [
  { id: 'gravity_anchor', label: '副本锚定', Icon: Anchor },
  { id: 'force_shield',   label: '网络隔离',  Icon: Shield },
  { id: 'the_lens',       label: '副本检测',   Icon: ScanSearch },
  { id: 'singularity',    label: '节点故障注入',   Icon: Atom },
];

const NODE_COLORS: Record<string, string> = {
  normal: '#3fb950', failed: '#f85149', overloaded: '#d29922',
};

const INITIAL_NODES: { label: string; x: number; y: number; cap: number; bw: number }[] = [
  { label: '存储节点-A', x: 200, y: 300, cap: 1.0, bw: 1.0 },
  { label: '存储节点-B', x: 500, y: 300, cap: 0.8, bw: 0.9 },
  { label: '存储节点-C', x: 350, y: 500, cap: 0.6, bw: 0.7 },
];

/* ────────────────── helpers ────────────────── */

function canvasPos(e: React.MouseEvent<HTMLCanvasElement>): Vec2 {
  const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function speed(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/* ────────────────── component ────────────────── */

function BackToLevelButton() {
  const searchParams = useSearchParams();
  const fromLevel = searchParams.get('from') === 'level';
  if (!fromLevel) return null;
  return (
    <Link
      href="/level/2"
      className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-base-200/40 bg-white/10 backdrop-blur px-3 py-1.5 text-xs text-base-300 hover:text-white hover:border-base-200/60 transition-colors"
    >
      <ArrowLeft size={12} strokeWidth={1.5} /> 返回关卡
    </Link>
  );
}

export default function DataGravityPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DataGravityState | null>(null);
  const entropyRef = useRef<EntropyHistory | null>(null);
  const rafRef = useRef<number>(0);
  const toolRef = useRef<GravityGunToolType>('gravity_anchor');
  const dragStart = useRef<Vec2 | null>(null);
  const lensActive = useRef(false);
  const prevKE = useRef(0);
  const prevTime = useRef(performance.now());

  const [activeTool, setActiveTool] = useState<GravityGunToolType>('gravity_anchor');
  const [metrics, setMetrics] = useState<EnergyMetrics | null>(null);
  const [nodeList, setNodeList] = useState<GravityNode[]>([]);
  const [particleCount, setParticleCount] = useState(0);
  const [gConst, setGConst] = useState(400);
  const [friction, setFriction] = useState(0.98);
  const [lensInfo, setLensInfo] = useState<DataParticle[]>([]);

  /* ── init state ── */
  const initState = useCallback(() => {
    const nodes: GravityNode[] = INITIAL_NODES.map((n, i) =>
      createGravityNode(`node-${i + 1}`, { x: n.x, y: n.y }, {
        capacity: n.cap, bandwidth: n.bw, label: n.label,
      }),
    );
    const particles: DataParticle[] = [];
    for (let r = 0; r < 3; r++) {
      for (let p = 0; p < 10; p++) {
        const node = nodes[r];
        particles.push({
          id: `p-${r}-${p}`,
          position: {
            x: node.position.x + (Math.random() - 0.5) * 120,
            y: node.position.y + (Math.random() - 0.5) * 120,
          },
          velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
          acceleration: { x: 0, y: 0 },
          mass: 1,
          replicaId: `replica-${r}`,
          color: '#58A6FF',
          trail: [],
          metadata: { dataId: `data-r${r}-p${p}` },
        });
      }
    }
    const st = createDataGravityState(nodes, particles, { G: gConst, friction });
    stateRef.current = st;
    entropyRef.current = createEntropyHistory();
    prevKE.current = 0;
    prevTime.current = performance.now();
    setNodeList([...st.nodes]);
    setParticleCount(st.particles.length);
  }, [gConst, friction]);

  /* ── drawing ── */
  const draw = useCallback((ctx: CanvasRenderingContext2D, st: DataGravityState) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // background + grid
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(88,166,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // gravity anchors
    st.anchors.forEach((a) => {
      const pulse = 8 + 3 * Math.sin(Date.now() / 300);
      ctx.beginPath();
      ctx.arc(a.position.x, a.position.y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(250,204,21,0.25)';
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // force shields (collision segments)
    st.segments.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.start.x, s.start.y);
      ctx.lineTo(s.end.x, s.end.y);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // particle trails
    st.particles.forEach((p) => {
      if (p.trail.length < 2) return;
      for (let i = 1; i < p.trail.length; i++) {
        const alpha = i / p.trail.length * 0.3;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.strokeStyle = `rgba(88,166,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // particles
    st.particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = dopplerColor(speed(p.velocity));
      ctx.fill();
    });

    // nodes
    st.nodes.forEach((n) => {
      const color = NODE_COLORS[n.status] || NODE_COLORS.normal;
      // glow
      ctx.beginPath();
      ctx.arc(n.position.x, n.position.y, 32, 0, Math.PI * 2);
      ctx.fillStyle = `${color}1f`;
      ctx.fill();
      // circle
      ctx.beginPath();
      ctx.arc(n.position.x, n.position.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#0D1117';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // label
      ctx.fillStyle = '#c9d1d9';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.position.x, n.position.y + 38);
    });

    // lens
    if (st.lens?.active) {
      ctx.beginPath();
      ctx.arc(st.lens.position.x, st.lens.position.y, st.lens.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(88,166,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(88,166,255,0.04)';
      ctx.fill();
    }
  }, []);

  /* ── animation loop ── */
  /* ── init on mount only ── */
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initState();
    }
  }, [initState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      const st = stateRef.current;
      if (st) {
        const now = performance.now();
        const deltaMs = now - prevTime.current;
        prevTime.current = now;
        const deltaSec = deltaMs / 1000;

        st.G = gConst;
        st.friction = friction;
        const updated = updatePhysics(st, deltaMs);
        stateRef.current = updated;

        const em = computeEnergyMetrics(updated, prevKE.current, deltaSec);
        prevKE.current = em.kineticEnergy;

        if (entropyRef.current) {
          recordEntropy(entropyRef.current, now, em.entropyDelta);
        }

        // resize canvas to container
        const parent = canvas.parentElement;
        if (parent) {
          const w = parent.clientWidth;
          const h = parent.clientHeight;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
        }

        draw(ctx, updated);
        setMetrics(em);
        setNodeList([...updated.nodes]);
        setParticleCount(updated.particles.length);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [gConst, friction, draw]);

  /* ── mouse handlers ── */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = canvasPos(e);
    const tool = toolRef.current;
    if (tool === 'force_shield') { dragStart.current = pos; return; }
    if (tool === 'gravity_anchor' && stateRef.current) {
      stateRef.current = placeGravityAnchor(stateRef.current, pos);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolRef.current === 'force_shield' && dragStart.current) {
      if (stateRef.current) {
        stateRef.current = placeForceShield(stateRef.current, dragStart.current, canvasPos(e));
      }
      dragStart.current = null;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolRef.current !== 'the_lens' || !stateRef.current) return;
    const pos = canvasPos(e);
    if (!lensActive.current) {
      stateRef.current = activateLens(stateRef.current, pos, 60);
      lensActive.current = true;
    } else {
      stateRef.current = updateLensPosition(stateRef.current, pos);
    }
    setLensInfo(getParticlesInLens(stateRef.current));
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (lensActive.current && stateRef.current) {
      stateRef.current = deactivateLens(stateRef.current);
      lensActive.current = false;
      setLensInfo([]);
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolRef.current === 'singularity' && stateRef.current) {
      stateRef.current = applySingularity(stateRef.current, canvasPos(e), { power: 120 });
    }
  }, []);

  const selectTool = useCallback((t: GravityGunToolType) => {
    toolRef.current = t;
    setActiveTool(t);
    if (t !== 'the_lens' && lensActive.current && stateRef.current) {
      stateRef.current = deactivateLens(stateRef.current);
      lensActive.current = false;
      setLensInfo([]);
    }
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    if (!stateRef.current) return;
    const node = stateRef.current.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.status === 'failed') {
      stateRef.current = recoverNode(stateRef.current, nodeId);
    } else {
      stateRef.current = injectNodeFailure(stateRef.current, nodeId);
    }
    // Update node list and force re-render
    setNodeList([...stateRef.current.nodes]);
  }, []);

  const handleReset = useCallback(() => { initState(); }, [initState]);

  /* ── entropy sparkline ── */
  const Sparkline = useCallback(() => {
    const hist = entropyRef.current;
    if (!hist || hist.values.length < 2) return null;
    const data = hist.values.slice(-50);
    const max = Math.max(...data.map(Math.abs), 0.001);
    const w = 160;
    const h = 32;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h / 2 - (v / max) * (h / 2 - 2)}`).join(' ');
    return (
      <svg width={w} height={h} className="mt-1">
        <polyline points={pts} fill="none" stroke="#58A6FF" strokeWidth="1.5" opacity="0.7" />
      </svg>
    );
  }, []);

  /* ── metric bar ── */
  const MetricBar = ({ label, value, max, Icon: Ic }: { label: string; value: number; max: number; Icon: typeof Activity }) => {
    const pct = Math.min((Math.abs(value) / max) * 100, 100);
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-xs text-base-600 mb-1">
          <Ic size={12} strokeWidth={1.5} className="text-accent" />
          <span>{label}</span>
          <span className="ml-auto text-base-400">{value.toFixed(2)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-base-100 overflow-hidden">
          <div className="h-full rounded-full bg-accent/50 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0D1117] text-base-900 font-[Inter,sans-serif]">
      {/* ── Left Panel ── */}
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-base-200 bg-white backdrop-blur p-4 overflow-y-auto">
        <Link href="/" className="flex items-center gap-2 text-xs text-base-400 hover:text-accent transition-colors">
          <ArrowLeft size={14} strokeWidth={1.5} /> 返回首页
        </Link>

        {/* ZBS knowledge banner */}
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-2.5 text-[10px] text-base-600 leading-relaxed space-y-1">
          <p className="font-semibold text-accent text-xs mb-1">本页面模拟 ZBS 分布式块存储的数据分布原理：</p>
          <p>• <span className="text-base-800 font-medium">粒子</span> = 数据块（16MB chunk）</p>
          <p>• <span className="text-base-800 font-medium">存储节点</span> = ZBS 物理存储节点</p>
          <p>• <span className="text-base-800 font-medium">引力</span> = 节点副本亲和度</p>
          <p>• 节点故障时，粒子自动向健康节点迁移 = 数据重建</p>
        </div>

        {/* tools */}
        <div>
          <h3 className="text-xs font-semibold text-base-400 mb-2">工具栏</h3>
          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTool(t.id)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] transition-all border ${
                  activeTool === t.id
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-base-200 bg-white text-base-400 hover:border-accent/20'
                }`}
              >
                <t.Icon size={16} strokeWidth={1.5} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* node toggles */}
        <div>
          <h3 className="text-xs font-semibold text-base-400 mb-2">ZBS 存储节点状态</h3>
          <div className="space-y-1.5">
            {nodeList.map((n) => (
              <button
                key={n.id}
                onClick={() => toggleNode(n.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-base-200 bg-white px-3 py-2 text-xs hover:border-accent/20 transition-all"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: NODE_COLORS[n.status] || '#3fb950' }}
                />
                <span className="truncate text-base-600">{n.label}</span>
                <span className="ml-auto text-[10px] text-base-400">
                  {n.status === 'normal' ? '正常' : n.status === 'failed' ? '已故障' : n.status === 'overloaded' ? '过载' : n.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* sliders */}
        <div>
          <h3 className="text-xs font-semibold text-base-400 mb-2">物理参数</h3>
          <label className="block text-[10px] text-base-400 mb-1">
            副本亲和力 G = {gConst}
          </label>
          <input
            type="range" min={50} max={2000} value={gConst}
            onChange={(e) => setGConst(Number(e.target.value))}
            className="w-full accent-[#58A6FF] h-1"
          />
          <label className="block text-[10px] text-base-400 mt-2 mb-1">
            带宽上限系数 = {friction.toFixed(2)}
          </label>
          <input
            type="range" min={80} max={100} value={friction * 100}
            onChange={(e) => setFriction(Number(e.target.value) / 100)}
            className="w-full accent-[#58A6FF] h-1"
          />
        </div>

        <div className="text-xs text-base-400">
          数据块 (16MB chunk): <span className="text-base-900 font-semibold">{particleCount}</span>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-base-200 bg-white py-2 text-xs text-base-600 hover:border-accent/30 hover:text-accent transition-all"
        >
          <RotateCcw size={12} strokeWidth={1.5} /> 重置模拟
        </button>
      </aside>

      {/* ── Center Canvas ── */}
      <main className="relative flex-1">
        {/* Title bar */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0D1117]/80 to-transparent">
          <span className="text-xs text-base-400/80 font-medium">
            ZBS 数据分布仿真 — 副本亲和力驱动的分布式存储模型
          </span>
          <Suspense fallback={null}>
            <BackToLevelButton />
          </Suspense>
        </div>
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
        />
        {/* lens tooltip */}
        {lensInfo.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-xl border border-base-200 bg-white/80 backdrop-blur p-3 text-xs text-base-600 space-y-1">
            <p className="text-accent font-semibold">Lens: {lensInfo.length} particles</p>
            {lensInfo.slice(0, 5).map((p) => (
              <p key={p.id} className="text-base-400 truncate">
                {p.id} | v={speed(p.velocity).toFixed(1)} | replica={p.replicaId}
              </p>
            ))}
            {lensInfo.length > 5 && <p className="text-base-400">...+{lensInfo.length - 5} more</p>}
          </div>
        )}
      </main>

      {/* ── Right Panel ── */}
      <aside className="flex w-56 shrink-0 flex-col gap-4 border-l border-base-200 bg-white backdrop-blur p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-base-400">能量指标</h3>
        {metrics && (
          <>
            <MetricBar label="IO 速率 (读写吞吐)" value={metrics.kineticEnergy} max={500} Icon={Activity} />
            <MetricBar label="节点负载压力" value={metrics.potentialEnergy} max={500} Icon={Gauge} />
            <MetricBar label="带宽损耗率" value={metrics.bandwidthLossRate} max={1} Icon={Zap} />
            <MetricBar label="数据分布混乱度" value={metrics.entropyDelta} max={5} Icon={TrendingDown} />

            <div className="mt-1">
              <span className="text-[10px] text-base-400">数据迁移总量 (MB)</span>
              <p className="text-sm font-semibold text-base-900">{metrics.displacement.toFixed(1)}</p>
            </div>
          </>
        )}

        <div>
          <span className="text-[10px] text-base-400">数据混乱度历史</span>
          <Sparkline />
        </div>
      </aside>
    </div>
  );
}
