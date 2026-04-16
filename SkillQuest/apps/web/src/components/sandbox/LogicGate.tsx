'use client';

/**
 * LogicGate — IT 产品逻辑门与数据流转模拟组件
 *
 * GPSL v1.1 原子级物理组件: 模拟 AND/OR/NOT/XOR 逻辑门和数据路由
 * 用于 IT 产品架构、存储逻辑流转等交互实验
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'BUFFER';

export interface LogicGateProps {
  /** 逻辑门类型 */
  gateType: GateType;
  /** 输入 A */
  inputA: boolean;
  /** 输入 B (NOT 门忽略此输入) */
  inputB?: boolean;
  /** 吞吐量标签 */
  throughputLabel?: string;
  /** 是否显示告警 */
  alert?: boolean;
}

function evaluateGate(type: GateType, a: boolean, b: boolean): boolean {
  switch (type) {
    case 'AND': return a && b;
    case 'OR': return a || b;
    case 'NOT': return !a;
    case 'XOR': return a !== b;
    case 'NAND': return !(a && b);
    case 'BUFFER': return a;
  }
}

export default function LogicGate({
  gateType,
  inputA,
  inputB = false,
  throughputLabel,
  alert = false,
}: LogicGateProps) {
  const output = useMemo(() => evaluateGate(gateType, inputA, inputB), [gateType, inputA, inputB]);
  const isUnary = gateType === 'NOT' || gateType === 'BUFFER';

  const wireColor = (active: boolean) => active ? '#059669' : '#9CA3AF';
  const dotColor = (active: boolean) => active ? '#059669' : '#D1D5DB';

  return (
    <div className={`relative rounded-lg border p-4 ${alert ? 'border-red-300 bg-red-50/30' : 'border-base-200 bg-white/80'}`}>
      <svg viewBox="0 0 300 160" className="w-full" style={{ maxHeight: 160 }}>
        {/* Input A wire */}
        <motion.line
          x1="20" y1={isUnary ? '80' : '50'}
          x2="90" y2={isUnary ? '80' : '50'}
          stroke={wireColor(inputA)}
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <circle cx="20" cy={isUnary ? 80 : 50} r="6" fill={dotColor(inputA)} />
        <text x="8" y={isUnary ? 100 : 38} fontSize="10" fill="#6B7280" textAnchor="middle">A</text>

        {/* Input B wire (binary gates only) */}
        {!isUnary && (
          <>
            <motion.line
              x1="20" y1="110" x2="90" y2="110"
              stroke={wireColor(inputB)}
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />
            <circle cx="20" cy={110} r="6" fill={dotColor(inputB)} />
            <text x="8" y="130" fontSize="10" fill="#6B7280" textAnchor="middle">B</text>
          </>
        )}

        {/* Gate body */}
        <motion.rect
          x="90" y="30" width="100" height="100" rx="12"
          fill={alert ? 'rgba(254, 226, 226, 0.8)' : 'rgba(238, 242, 255, 0.8)'}
          stroke={alert ? '#DC2626' : '#4F46E5'}
          strokeWidth="2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <text x="140" y="86" fontSize="16" fontWeight="bold" fill={alert ? '#DC2626' : '#4F46E5'} textAnchor="middle">
          {gateType}
        </text>

        {/* Output wire */}
        <motion.line
          x1="190" y1="80" x2="260" y2="80"
          stroke={wireColor(output)}
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <motion.circle
          cx="270" cy="80" r="8"
          fill={dotColor(output)}
          animate={{
            scale: output ? [1, 1.3, 1] : 1,
            filter: output ? 'drop-shadow(0 0 4px rgba(5,150,105,0.5))' : 'none',
          }}
          transition={{ duration: 0.6, repeat: output ? Infinity : 0, repeatType: 'reverse' }}
        />
        <text x="280" y="68" fontSize="10" fill="#6B7280" textAnchor="middle">OUT</text>
        <text x="270" y="100" fontSize="10" fontWeight="600" fill={output ? '#059669' : '#9CA3AF'} textAnchor="middle">
          {output ? '1' : '0'}
        </text>
      </svg>

      {throughputLabel && (
        <div className="mt-2 text-center text-xs text-base-500">
          {throughputLabel}
        </div>
      )}
    </div>
  );
}
