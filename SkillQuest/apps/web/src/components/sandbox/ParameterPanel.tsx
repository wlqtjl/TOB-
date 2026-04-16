'use client';

/**
 * ParameterPanel — 根据 SimVariable[] 自动渲染滑块/旋钮调参面板
 *
 * GPSL v1.1: Gemini 生成的 JSON 定义 → 自动渲染 Slider/Toggle 组件
 */

import React from 'react';
import type { SimVariable } from '@skillquest/types';

export interface ParameterPanelProps {
  /** 变量定义列表 */
  variables: SimVariable[];
  /** 当前变量值 */
  values: Record<string, number>;
  /** 变量值变更回调 */
  onChange: (name: string, value: number) => void;
  /** 告警阈值 */
  alertThresholds?: Record<string, { min?: number; max?: number; message: string }>;
}

export default function ParameterPanel({
  variables,
  values,
  onChange,
  alertThresholds,
}: ParameterPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-base-400">
        调参面板
      </h3>
      {variables.map((v) => {
        const value = values[v.name] ?? v.default;
        const threshold = alertThresholds?.[v.name];
        const isAlert =
          threshold &&
          ((threshold.min !== undefined && value < threshold.min) ||
            (threshold.max !== undefined && value > threshold.max));

        return (
          <div key={v.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-base-700">{v.label}</label>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                  isAlert
                    ? 'bg-red-50 text-red-600'
                    : 'bg-base-100 text-base-600'
                }`}
              >
                {value}
                {v.unit ? ` ${v.unit}` : ''}
              </span>
            </div>

            <input
              type="range"
              min={v.min}
              max={v.max}
              step={v.step ?? 1}
              value={value}
              onChange={(e) => onChange(v.name, parseFloat(e.target.value))}
              className={`h-1.5 w-full cursor-pointer appearance-none rounded-full ${
                isAlert ? 'bg-red-200 accent-red-600' : 'bg-base-200 accent-accent'
              }`}
            />

            <div className="flex justify-between text-[10px] text-base-400">
              <span>{v.min}{v.unit ? ` ${v.unit}` : ''}</span>
              <span>{v.max}{v.unit ? ` ${v.unit}` : ''}</span>
            </div>

            {isAlert && threshold && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {threshold.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
