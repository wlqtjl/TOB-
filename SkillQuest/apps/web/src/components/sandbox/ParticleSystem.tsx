'use client';

/**
 * ParticleSystem — 分子运动/扩散/气体压力模拟组件
 *
 * GPSL v1.1 原子级物理组件: 模拟粒子随机运动、布朗运动和扩散现象
 */

import React, { useRef, useEffect, useCallback } from 'react';

export interface ParticleSystemProps {
  /** 粒子数量 */
  count: number;
  /** 温度 (影响粒子速度) */
  temperature?: number;
  /** 容器压力 (影响边界反弹力度) */
  pressure?: number;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 粒子颜色 */
  color?: string;
  /** 粒子大小 */
  particleSize?: number;
  /** 是否显示告警 */
  alert?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const BOUNDARY_OFFSET = 10;

export default function ParticleSystem({
  count,
  temperature = 300,
  pressure = 1,
  width = 600,
  height = 300,
  color = '#6366F1',
  particleSize = 4,
  alert = false,
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize / update particles
  useEffect(() => {
    const existing = particlesRef.current;
    const particles: Particle[] = [];
    const speedFactor = Math.sqrt(temperature / 300);

    for (let i = 0; i < count; i++) {
      if (i < existing.length) {
        particles.push(existing[i]);
      } else {
        particles.push({
          x: Math.random() * (width - 2 * BOUNDARY_OFFSET) + BOUNDARY_OFFSET,
          y: Math.random() * (height - 2 * BOUNDARY_OFFSET) + BOUNDARY_OFFSET,
          vx: (Math.random() - 0.5) * 3 * speedFactor,
          vy: (Math.random() - 0.5) * 3 * speedFactor,
        });
      }
    }
    particlesRef.current = particles;
  }, [count, width, height, temperature]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = alert ? 'rgba(254, 226, 226, 0.3)' : 'rgba(249, 250, 251, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Container walls
    const wallThickness = Math.max(1, pressure * 2);
    ctx.strokeStyle = alert ? '#DC2626' : '#9CA3AF';
    ctx.lineWidth = wallThickness;
    ctx.strokeRect(5, 5, width - 10, height - 10);

    const speedFactor = Math.sqrt(temperature / 300);
    const bounceForce = pressure * 0.8;

    // Update and draw particles
    particlesRef.current.forEach((p) => {
      // Apply temperature-based velocity adjustment
      p.vx += (Math.random() - 0.5) * 0.2 * speedFactor;
      p.vy += (Math.random() - 0.5) * 0.2 * speedFactor;

      // Dampen to prevent infinite acceleration
      p.vx *= 0.99;
      p.vy *= 0.99;

      p.x += p.vx;
      p.y += p.vy;

      // Boundary bounce with pressure
      if (p.x < BOUNDARY_OFFSET) { p.x = BOUNDARY_OFFSET; p.vx = Math.abs(p.vx) * bounceForce; }
      if (p.x > width - BOUNDARY_OFFSET) { p.x = width - BOUNDARY_OFFSET; p.vx = -Math.abs(p.vx) * bounceForce; }
      if (p.y < BOUNDARY_OFFSET) { p.y = BOUNDARY_OFFSET; p.vy = Math.abs(p.vy) * bounceForce; }
      if (p.y > height - BOUNDARY_OFFSET) { p.y = height - BOUNDARY_OFFSET; p.vy = -Math.abs(p.vy) * bounceForce; }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Velocity trail
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    animRef.current = requestAnimationFrame(draw);
  }, [width, height, color, particleSize, temperature, pressure, alert]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-lg border ${alert ? 'border-red-300' : 'border-base-200'}`}
    />
  );
}
