/**
 * Sandbox Component Library — GPSL v1.1 原子级物理组件库
 *
 * STEM 实验室组件, 供 Gemini 生成的交互模拟关卡调用:
 * - WaveEngine:       波纹/频率/干涉现象
 * - ParticleSystem:   分子运动/扩散/气体压力
 * - VectorField:      引力场/电磁场/流量流向
 * - LogicGate:        IT 逻辑门/数据流转
 * - ParameterPanel:   调参面板 (Slider/Toggle)
 * - FormulaDisplay:   KaTeX 公式渲染
 * - SimulationCanvas: 交互画布区主容器
 */

export { default as WaveEngine } from './WaveEngine';
export type { WaveEngineProps } from './WaveEngine';

export { default as ParticleSystem } from './ParticleSystem';
export type { ParticleSystemProps } from './ParticleSystem';

export { default as VectorField } from './VectorField';
export type { VectorFieldProps } from './VectorField';

export { default as LogicGate } from './LogicGate';
export type { LogicGateProps, GateType } from './LogicGate';

export { default as ParameterPanel } from './ParameterPanel';
export type { ParameterPanelProps } from './ParameterPanel';

export { default as FormulaDisplay } from './FormulaDisplay';
export type { FormulaDisplayProps } from './FormulaDisplay';

export { default as SimulationCanvas } from './SimulationCanvas';
export type { SimulationCanvasProps } from './SimulationCanvas';
