'use client';

/**
 * FormulaDisplay — KaTeX 公式渲染组件
 *
 * GPSL v1.1: 展示 LaTeX 格式的数学公式, 支持变量高亮
 */

import React, { useMemo } from 'react';
import katex from 'katex';

export interface FormulaDisplayProps {
  /** LaTeX 公式字符串 */
  formula: string;
  /** 当前变量值 (用于在公式下方展示计算结果) */
  variables?: Record<string, number>;
  /** 是否以 display 模式渲染 (居中大号) */
  displayMode?: boolean;
}

export default function FormulaDisplay({
  formula,
  variables,
  displayMode = true,
}: FormulaDisplayProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return `<span class="text-red-500">公式解析错误: ${formula}</span>`;
    }
  }, [formula, displayMode]);

  // Compute result if variables provided
  const computedResult = useMemo(() => {
    if (!variables || Object.keys(variables).length === 0) return null;
    return Object.entries(variables)
      .map(([key, val]) => `${key} = ${val}`)
      .join(', ');
  }, [variables]);

  return (
    <div className="space-y-2 rounded-lg border border-base-200 bg-white/80 p-4">
      <div
        className="overflow-x-auto text-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {computedResult && (
        <p className="text-center text-xs text-base-400">
          当前参数: {computedResult}
        </p>
      )}
    </div>
  );
}
