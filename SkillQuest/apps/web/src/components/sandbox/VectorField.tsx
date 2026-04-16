'use client';

/**
 * VectorField — 引力场/电磁场/流量流向模拟组件
 *
 * GPSL v1.1 原子级物理组件: 使用箭头矩阵可视化力场方向和强度
 */

import React, { useRef, useEffect, useCallback } from 'react';

export interface VectorFieldProps {
  /** 场强度 */
  fieldStrength: number;
  /** 场类型 */
  fieldType?: 'gravity' | 'electric' | 'flow';
  /** 源点 X (归一化 0-1) */
  sourceX?: number;
  /** 源点 Y (归一化 0-1) */
  sourceY?: number;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
  /** 矢量颜色 */
  color?: string;
  /** 网格密度 */
  gridDensity?: number;
  /** 是否显示告警 */
  alert?: boolean;
}

const FLOW_PHASE_FACTOR = 0.3;
const FLOW_VARIATION_AMPLITUDE = 0.3;

export default function VectorField({
  fieldStrength,
  fieldType = 'gravity',
  sourceX = 0.5,
  sourceY = 0.5,
  width = 600,
  height = 300,
  color = '#4F46E5',
  gridDensity = 15,
  alert = false,
}: VectorFieldProps) {
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

    const srcPx = sourceX * width;
    const srcPy = sourceY * height;
    const cellW = width / gridDensity;
    const cellH = height / gridDensity;

    // Draw source point
    ctx.beginPath();
    ctx.arc(srcPx, srcPy, 6, 0, Math.PI * 2);
    ctx.fillStyle = alert ? '#DC2626' : '#D97706';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(srcPx, srcPy, 10, 0, Math.PI * 2);
    ctx.strokeStyle = alert ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw vector arrows
    for (let i = 0; i < gridDensity; i++) {
      for (let j = 0; j < gridDensity; j++) {
        const cx = cellW * (i + 0.5);
        const cy = cellH * (j + 0.5);

        const dx = cx - srcPx;
        const dy = cy - srcPy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) continue;

        let angle: number;
        let magnitude: number;

        switch (fieldType) {
          case 'gravity':
            angle = Math.atan2(-dy, -dx); // toward source
            magnitude = (fieldStrength * 100) / (dist + 10);
            break;
          case 'electric':
            angle = Math.atan2(dy, dx); // away from source
            magnitude = (fieldStrength * 100) / (dist + 10);
            break;
          case 'flow':
          default:
            angle = Math.atan2(dy, dx) + Math.sin(timeRef.current + i * FLOW_PHASE_FACTOR) * FLOW_VARIATION_AMPLITUDE;
            magnitude = fieldStrength * 8;
            break;
        }

        const arrowLen = Math.min(magnitude, cellW * 0.7);
        const alpha = Math.min(1, magnitude / 15);

        const endX = cx + Math.cos(angle) * arrowLen;
        const endY = cy + Math.sin(angle) * arrowLen;

        // Arrow body
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Arrowhead
        const headLen = 4;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angle - 0.5),
          endY - headLen * Math.sin(angle - 0.5),
        );
        ctx.lineTo(
          endX - headLen * Math.cos(angle + 0.5),
          endY - headLen * Math.sin(angle + 0.5),
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    timeRef.current += 0.03;
    animRef.current = requestAnimationFrame(draw);
  }, [fieldStrength, fieldType, sourceX, sourceY, width, height, color, gridDensity, alert]);

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
