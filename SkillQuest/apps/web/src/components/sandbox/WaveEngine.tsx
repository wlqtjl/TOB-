'use client';

/**
 * WaveEngine — 波纹/频率/干涉现象模拟组件
 *
 * GPSL v1.1 原子级物理组件: 模拟波的传播、频率变化与干涉效果
 * 用于多普勒效应、声波传播等交互实验
 */

import React, { useRef, useEffect, useCallback } from 'react';

export interface WaveEngineProps {
  /** 波的频率 (Hz) */
  frequency: number;
  /** 波的振幅 */
  amplitude: number;
  /** 波速 */
  speed?: number;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 波的颜色 */
  color?: string;
  /** 是否显示干涉模式 (双波源) */
  interference?: boolean;
  /** 第二波源频率 (仅干涉模式) */
  secondFrequency?: number;
  /** 是否显示告警 */
  alert?: boolean;
}

export default function WaveEngine({
  frequency,
  amplitude,
  speed = 2,
  width = 600,
  height = 300,
  color = '#4F46E5',
  interference = false,
  secondFrequency,
  alert = false,
}: WaveEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = alert ? 'rgba(254, 226, 226, 0.3)' : 'rgba(249, 250, 251, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.5)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const midY = height / 2;
    const clampedAmp = Math.min(amplitude, midY - 10);

    // Wave 1
    ctx.beginPath();
    ctx.strokeStyle = alert ? '#DC2626' : color;
    ctx.lineWidth = 2;
    for (let x = 0; x < width; x++) {
      const y = midY + clampedAmp * Math.sin((x * frequency * 0.02) + timeRef.current * speed);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Interference wave
    if (interference && secondFrequency) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x++) {
        const y = midY + clampedAmp * Math.sin((x * secondFrequency * 0.02) + timeRef.current * speed * 1.1);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Combined wave
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      for (let x = 0; x < width; x++) {
        const y1 = clampedAmp * Math.sin((x * frequency * 0.02) + timeRef.current * speed);
        const y2 = clampedAmp * Math.sin((x * secondFrequency * 0.02) + timeRef.current * speed * 1.1);
        const y = midY + (y1 + y2) / 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Center line
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    timeRef.current += 0.05;
    animRef.current = requestAnimationFrame(draw);
  }, [frequency, amplitude, speed, width, height, color, interference, secondFrequency, alert]);

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
