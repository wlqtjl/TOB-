/**
 * ParticleSystem — Canvas 2D particle engine with object pooling
 *
 * Replaces CSS stroke-dasharray animation with real particle objects.
 * Each particle has independent position, velocity, lifecycle,
 * and follows Bezier curves — equivalent to Data Center packet-balls.
 */

export interface Particle {
  /** Current position */
  x: number;
  y: number;
  /** Progress along Bezier path (0 → 1) */
  pathProgress: number;
  /** Particle speed multiplier */
  speed: number;
  /** Size in px */
  size: number;
  /** Color as CSS string */
  color: string;
  /** Alpha (0 → 1) */
  alpha: number;
  /** Trail positions for afterglow effect */
  trail: Array<{ x: number; y: number; alpha: number }>;
  /** Max trail length */
  trailLength: number;
  /** Whether particle is alive */
  alive: boolean;
  /** Connection ID this particle belongs to */
  connectionId: string;
  /** Shape */
  shape: 'circle' | 'square' | 'diamond';
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  alive: boolean;
}

interface BezierPath {
  x0: number;
  y0: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x1: number;
  y1: number;
}

/** Evaluate cubic Bezier at parameter t */
function bezierPoint(path: BezierPath, t: number): { x: number; y: number } {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  return {
    x: uuu * path.x0 + 3 * uu * t * path.cx1 + 3 * u * tt * path.cx2 + ttt * path.x1,
    y: uuu * path.y0 + 3 * uu * t * path.cy1 + 3 * u * tt * path.cy2 + ttt * path.y1,
  };
}

const POOL_SIZE = 500;
const BURST_POOL_SIZE = 200;

export class ParticleSystem {
  /** Object pool for flow particles */
  private pool: Particle[] = [];
  /** Active flow particles */
  private active: Particle[] = [];
  /** Object pool for burst particles */
  private burstPool: BurstParticle[] = [];
  /** Active burst particles */
  private activeBursts: BurstParticle[] = [];

  constructor() {
    // Pre-allocate particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createBlankParticle());
    }
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      this.burstPool.push(this.createBlankBurst());
    }
  }

  private createBlankParticle(): Particle {
    return {
      x: 0, y: 0, pathProgress: 0, speed: 1, size: 3,
      color: '#FFD700', alpha: 1, trail: [], trailLength: 6,
      alive: false, connectionId: '', shape: 'circle',
    };
  }

  private createBlankBurst(): BurstParticle {
    return {
      x: 0, y: 0, vx: 0, vy: 0, size: 3,
      color: '#22c55e', alpha: 1, life: 0, maxLife: 1,
      alive: false,
    };
  }

  /** Acquire a particle from pool */
  private acquire(): Particle | null {
    const p = this.pool.pop();
    if (p) {
      p.alive = true;
      p.pathProgress = 0;
      p.alpha = 1;
      p.trail = [];
      this.active.push(p);
      return p;
    }
    return null;
  }

  /** Return particle to pool */
  private release(p: Particle): void {
    p.alive = false;
    this.pool.push(p);
  }

  /** Emit particles for a connection */
  emitForConnection(
    connectionId: string,
    config: {
      color: string;
      speed: number;
      size: number;
      density: number;
      trailLength: number;
      shape: 'circle' | 'square' | 'diamond';
    },
  ): void {
    // Check existing particles for this connection
    const existing = this.active.filter(
      (p) => p.connectionId === connectionId && p.alive,
    ).length;

    const needed = config.density - existing;
    for (let i = 0; i < needed; i++) {
      const p = this.acquire();
      if (!p) break;
      p.connectionId = connectionId;
      p.color = config.color;
      p.speed = config.speed;
      p.size = config.size;
      p.trailLength = config.trailLength;
      p.shape = config.shape;
      // Stagger particles along path
      p.pathProgress = i / config.density;
    }
  }

  /** Emit a burst of particles at position (for feedback effects) */
  emitBurst(
    x: number,
    y: number,
    config: {
      count: number;
      color: string;
      speed: number;
      lifetime: number;
      spread: number;
    },
  ): void {
    for (let i = 0; i < config.count; i++) {
      let bp = this.burstPool.pop();
      if (!bp) bp = this.createBlankBurst();
      const angle = (config.spread * i) / config.count - config.spread / 2;
      const spd = config.speed * (0.5 + Math.random() * 0.5);
      bp.x = x;
      bp.y = y;
      bp.vx = Math.cos(angle) * spd;
      bp.vy = Math.sin(angle) * spd;
      bp.color = config.color;
      bp.size = 2 + Math.random() * 3;
      bp.alpha = 1;
      bp.life = 0;
      bp.maxLife = config.lifetime;
      bp.alive = true;
      this.activeBursts.push(bp);
    }
  }

  /** Update all particles. dt = seconds since last frame */
  update(
    dt: number,
    paths: Map<string, BezierPath>,
  ): void {
    // Update flow particles
    const toRelease: Particle[] = [];

    for (const p of this.active) {
      if (!p.alive) continue;
      const path = paths.get(p.connectionId);
      if (!path) {
        toRelease.push(p);
        continue;
      }

      // Store trail
      if (p.trailLength > 0) {
        p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > p.trailLength) {
          p.trail.pop();
        }
      }

      // Advance along path
      p.pathProgress += (p.speed / 500) * dt;
      if (p.pathProgress >= 1) {
        p.pathProgress -= 1; // Loop
      }

      const pos = bezierPoint(path, p.pathProgress);
      p.x = pos.x;
      p.y = pos.y;
    }

    for (const p of toRelease) {
      this.release(p);
    }
    this.active = this.active.filter((p) => p.alive);

    // Update burst particles
    for (const bp of this.activeBursts) {
      if (!bp.alive) continue;
      bp.life += dt;
      if (bp.life >= bp.maxLife) {
        bp.alive = false;
        this.burstPool.push(bp);
        continue;
      }
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      bp.vy += 200 * dt; // gravity
      bp.alpha = 1 - bp.life / bp.maxLife;
    }
    this.activeBursts = this.activeBursts.filter((bp) => bp.alive);
  }

  /** Render all particles to canvas context */
  render(ctx: CanvasRenderingContext2D): void {
    // Render flow particles + trails
    for (const p of this.active) {
      if (!p.alive) continue;

      // Draw trail
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const trailAlpha = t.alpha * (1 - i / p.trail.length) * 0.5;
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = p.color;
        const trailSize = p.size * (1 - i / p.trail.length * 0.5);
        this.drawShape(ctx, t.x, t.y, trailSize, p.shape);
      }

      // Draw particle
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // Glow effect
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      this.drawShape(ctx, p.x, p.y, p.size, p.shape);
      ctx.shadowBlur = 0;
    }

    // Render burst particles
    for (const bp of this.activeBursts) {
      if (!bp.alive) continue;
      ctx.globalAlpha = bp.alpha;
      ctx.fillStyle = bp.color;
      ctx.shadowColor = bp.color;
      ctx.shadowBlur = bp.size;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  private drawShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    shape: 'circle' | 'square' | 'diamond',
  ): void {
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  /** Remove all particles for a specific connection */
  removeConnection(connectionId: string): void {
    for (const p of this.active) {
      if (p.connectionId === connectionId) {
        this.release(p);
      }
    }
    this.active = this.active.filter((p) => p.alive);
  }

  /** Clear all particles */
  clear(): void {
    for (const p of this.active) {
      this.release(p);
    }
    this.active = [];
    for (const bp of this.activeBursts) {
      bp.alive = false;
      this.burstPool.push(bp);
    }
    this.activeBursts = [];
  }

  /** Get active particle count (for debug/perf monitoring) */
  get activeCount(): number {
    return this.active.length + this.activeBursts.length;
  }
}

export type { BezierPath };
export { bezierPoint };
