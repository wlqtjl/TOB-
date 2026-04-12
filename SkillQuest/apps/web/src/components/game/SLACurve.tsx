'use client';

/**
 * SLACurve — SLA 实时跌落曲线图
 *
 * 使用 SVG 路径绘制基于 impactScore 的动态下降曲线。
 * 灾难后果（如脑裂）会导致曲线陡降。
 */

import React from 'react';

interface SLACurveProps {
  /** [timestamp, slaPercent][] */
  points: Array<[number, number]>;
  width?: number;
  height?: number;
}

export default function SLACurve({
  points,
  width = 280,
  height = 80,
}: SLACurveProps) {
  if (points.length < 2) return null;

  const padding = { top: 12, right: 12, bottom: 20, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Compute ranges
  const maxTime = Math.max(...points.map((p) => p[0]));
  const minSLA = Math.min(...points.map((p) => p[1]));
  const maxSLA = Math.max(...points.map((p) => p[1]));
  const slaRange = Math.max(maxSLA - minSLA, 0.01); // avoid division by zero

  // Map data to SVG coords
  const svgPoints = points.map(([t, sla]) => ({
    x: padding.left + (maxTime > 0 ? (t / maxTime) * plotW : 0),
    y: padding.top + plotH - ((sla - minSLA) / slaRange) * plotH,
  }));

  // Build smooth path using quadratic bezier
  let pathD = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
  for (let i = 1; i < svgPoints.length; i++) {
    const prev = svgPoints[i - 1];
    const curr = svgPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    pathD += ` Q ${cpx} ${prev.y} ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const areaD =
    pathD +
    ` L ${svgPoints[svgPoints.length - 1].x} ${padding.top + plotH}` +
    ` L ${svgPoints[0].x} ${padding.top + plotH} Z`;

  // Color: green → red gradient based on final SLA
  const finalSLA = points[points.length - 1][1];
  const strokeColor = finalSLA > 99.9 ? '#22c55e' : finalSLA > 99.5 ? '#f59e0b' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sla-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={padding.left}
          y1={padding.top + plotH * (1 - frac)}
          x2={padding.left + plotW}
          y2={padding.top + plotH * (1 - frac)}
          stroke="#30363d"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#sla-area-gradient)" />

      {/* Curve line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {svgPoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={3}
          fill={strokeColor}
          fillOpacity={0.8}
          stroke="#0D1117"
          strokeWidth={1.5}
        />
      ))}

      {/* Y-axis labels */}
      <text
        x={padding.left - 4}
        y={padding.top + 4}
        textAnchor="end"
        fontSize="9"
        fill="#6e7681"
        fontFamily="monospace"
      >
        {maxSLA.toFixed(1)}%
      </text>
      <text
        x={padding.left - 4}
        y={padding.top + plotH + 4}
        textAnchor="end"
        fontSize="9"
        fill="#6e7681"
        fontFamily="monospace"
      >
        {minSLA.toFixed(1)}%
      </text>

      {/* X-axis label */}
      <text
        x={padding.left + plotW}
        y={height - 2}
        textAnchor="end"
        fontSize="9"
        fill="#6e7681"
        fontFamily="monospace"
      >
        {Math.floor(maxTime / 60)}min
      </text>
    </svg>
  );
}
