'use client';

/**
 * IncidentReportModal — 事故复盘报告 (Game Over 结算页)
 *
 * 在玩家触发灾难性后果时展示:
 * 1. 操作时间线回放 (每步操作 + WorldState 快照)
 * 2. 损失仪表盘 (停机时长、SLA 扣分、数据丢失量)
 * 3. "正确操作路径" 对比 (专家路径 vs 玩家路径)
 * 4. 知识点链接 (关联到具体文档章节)
 */

import React from 'react';

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface ActionRecord {
  actionType: string;
  targetNodeId?: string;
  timestamp: number;
  isOptimal: boolean;
}

export interface DamageReport {
  downtimeMs: number;
  slaLoss: number;
  dataLossPercent: number;
  businessImpact: string;
}

export interface IncidentReportData {
  /** 玩家操作序列 */
  playerActions: ActionRecord[];
  /** 专家推荐路径 */
  optimalActions: string[];
  /** 损害报告 */
  damage: DamageReport;
  /** 触发的灾难名称 */
  disasterName: string;
  disasterDescription: string;
  /** 关联的知识点 */
  knowledgePoints?: string[];
}

interface IncidentReportModalProps {
  report: IncidentReportData;
  onRetry: () => void;
  onExit: () => void;
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}分钟`;
  return `${(ms / 3600000).toFixed(1)}小时`;
}

function getSeverityColor(slaLoss: number): string {
  if (slaLoss >= 50) return 'text-red-500';
  if (slaLoss >= 20) return 'text-orange-400';
  if (slaLoss >= 5) return 'text-yellow-400';
  return 'text-green-400';
}

// ─── 组件 ──────────────────────────────────────────────────────────

export default function IncidentReportModal({
  report,
  onRetry,
  onExit,
}: IncidentReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-red-500/40 bg-[#0d1117] shadow-2xl overflow-hidden">
        {/* 头部 — 事故告警 */}
        <div className="bg-red-900/40 px-6 py-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h2 className="text-lg font-bold text-red-400">事故复盘报告</h2>
              <p className="text-sm text-red-300/70">{report.disasterName}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[500px] overflow-y-auto">
          {/* 灾难描述 */}
          <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm text-red-300 leading-relaxed">{report.disasterDescription}</p>
          </div>

          {/* 损失仪表盘 */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-2">📊 损失评估</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">业务停摆</div>
                <div className="text-lg font-bold text-orange-400">
                  {formatDuration(report.damage.downtimeMs)}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">SLA 扣分</div>
                <div className={`text-lg font-bold ${getSeverityColor(report.damage.slaLoss)}`}>
                  -{report.damage.slaLoss}分
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">数据丢失</div>
                <div className={`text-lg font-bold ${report.damage.dataLossPercent > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {(report.damage.dataLossPercent * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{report.damage.businessImpact}</p>
          </div>

          {/* 操作对比时间线 */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-2">🔍 操作对比</h3>
            <div className="space-y-2">
              {report.playerActions.map((action, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    action.isOptimal
                      ? 'bg-green-900/20 border border-green-500/20'
                      : 'bg-red-900/20 border border-red-500/20'
                  }`}
                >
                  <span className="text-xs font-mono text-gray-500 w-6">{i + 1}</span>
                  <span className={action.isOptimal ? 'text-green-400' : 'text-red-400'}>
                    {action.isOptimal ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-300">{action.actionType}</span>
                  {action.targetNodeId && (
                    <span className="text-xs text-gray-500">→ {action.targetNodeId}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 专家推荐路径 */}
          <div>
            <h3 className="text-sm font-semibold text-white/70 mb-2">✅ 专家推荐路径</h3>
            <div className="flex flex-wrap gap-2">
              {report.optimalActions.map((action, i) => (
                <React.Fragment key={i}>
                  <span className="px-2 py-1 bg-green-900/30 border border-green-500/20 rounded text-xs text-green-400">
                    {action}
                  </span>
                  {i < report.optimalActions.length - 1 && (
                    <span className="text-gray-600 self-center">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 知识点 */}
          {report.knowledgePoints && report.knowledgePoints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-2">📖 关联知识点</h3>
              <div className="flex flex-wrap gap-2">
                {report.knowledgePoints.map((kp, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-900/30 border border-blue-500/20 rounded text-xs text-blue-400">
                    {kp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            重新挑战
          </button>
          <button
            onClick={onExit}
            className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
          >
            返回关卡地图
          </button>
        </div>
      </div>
    </div>
  );
}
