'use client';

/**
 * SimulationCanvas — 交互画布区主容器
 *
 * GPSL v1.1: 根据 SandboxSimConfig.engineType 自动选择渲染引擎
 * 集成 WaveEngine / ParticleSystem / VectorField / LogicGate
 */

import React from 'react';
import type { SandboxSimConfig } from '@skillquest/types';
import WaveEngine from './WaveEngine';
import ParticleSystem from './ParticleSystem';
import VectorField from './VectorField';
import LogicGate from './LogicGate';

export interface SimulationCanvasProps {
  /** 模拟配置 */
  config: SandboxSimConfig;
  /** 当前变量值 */
  values: Record<string, number>;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
}

/**
 * 检查变量是否超过告警阈值
 */
function checkAlerts(
  values: Record<string, number>,
  thresholds?: SandboxSimConfig['alertThresholds'],
): boolean {
  if (!thresholds) return false;
  return Object.entries(thresholds).some(([name, t]) => {
    const val = values[name];
    if (val === undefined) return false;
    return (t.min !== undefined && val < t.min) || (t.max !== undefined && val > t.max);
  });
}

export default function SimulationCanvas({
  config,
  values,
  width = 560,
  height = 320,
}: SimulationCanvasProps) {
  const hasAlert = checkAlerts(values, config.alertThresholds);

  switch (config.engineType) {
    case 'wave':
      return (
        <WaveEngine
          frequency={values['frequency'] ?? 5}
          amplitude={values['amplitude'] ?? 50}
          speed={values['speed'] ?? 2}
          width={width}
          height={height}
          interference={!!values['interference']}
          secondFrequency={values['secondFrequency']}
          alert={hasAlert}
        />
      );

    case 'particle':
      return (
        <ParticleSystem
          count={values['count'] ?? 50}
          temperature={values['temperature'] ?? 300}
          pressure={values['pressure'] ?? 1}
          width={width}
          height={height}
          alert={hasAlert}
        />
      );

    case 'vector_field':
      return (
        <VectorField
          fieldStrength={values['fieldStrength'] ?? 5}
          fieldType={(values['fieldType'] as unknown as 'gravity' | 'electric' | 'flow') ?? 'gravity'}
          sourceX={values['sourceX'] ?? 0.5}
          sourceY={values['sourceY'] ?? 0.5}
          width={width}
          height={height}
          alert={hasAlert}
        />
      );

    case 'logic_gate':
      return (
        <LogicGate
          gateType={(values['gateType'] as unknown as 'AND' | 'OR' | 'NOT' | 'XOR') ?? 'AND'}
          inputA={!!values['inputA']}
          inputB={!!values['inputB']}
          throughputLabel={values['throughput'] ? `吞吐量: ${values['throughput']} IOPS` : undefined}
          alert={hasAlert}
        />
      );

    default:
      // Fallback: generic SVG curve based on formula
      return <GenericCurveCanvas values={values} width={width} height={height} alert={hasAlert} />;
  }
}

/**
 * GenericCurveCanvas — 通用曲线画布 (无特定引擎时使用)
 * 用第一个和第二个变量作为 X/Y 绘制简单的关联曲线
 */
function GenericCurveCanvas({
  values,
  width,
  height,
  alert,
}: {
  values: Record<string, number>;
  width: number;
  height: number;
  alert: boolean;
}) {
  const keys = Object.keys(values);
  const xVal = values[keys[0]] ?? 1;
  const yVal = values[keys[1]] ?? 1;

  // Generate a simple curve: y = height/2 - (xVal * sin(x/yVal))
  const points: string[] = [];
  for (let px = 0; px < width; px += 2) {
    const py = height / 2 - (xVal * 2) * Math.sin(px / Math.max(yVal, 0.1) * 0.05);
    points.push(`${px},${Math.max(10, Math.min(height - 10, py))}`);
  }

  return (
    <svg
      width={width}
      height={height}
      className={`rounded-lg border ${alert ? 'border-red-300 bg-red-50/30' : 'border-base-200 bg-white/50'}`}
    >
      {/* Grid */}
      {Array.from({ length: 10 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1={0} y1={height * i / 10}
          x2={width} y2={height * i / 10}
          stroke="rgba(229,231,235,0.5)" strokeWidth={0.5}
        />
      ))}

      {/* Center line */}
      <line
        x1={0} y1={height / 2}
        x2={width} y2={height / 2}
        stroke="rgba(156,163,175,0.5)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Curve */}
      <polyline
        fill="none"
        stroke={alert ? '#DC2626' : '#4F46E5'}
        strokeWidth={2}
        points={points.join(' ')}
      />

      {/* Labels */}
      <text x={10} y={20} fontSize={11} fill="#6B7280">
        {keys[0]}: {xVal}
      </text>
      <text x={10} y={36} fontSize={11} fill="#6B7280">
        {keys[1]}: {yVal}
      </text>
    </svg>
  );
}
