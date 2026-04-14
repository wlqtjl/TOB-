/**
 * Admin Review Page — Dual-Agent Comparison Display
 *
 * Vendor admins review AI-generated questions here.
 * Shows pending levels list and detailed review with dual-agent comparison,
 * source quotes, feedback history, and approve/reject/edit actions.
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Edit3,
  FileText,
  BookOpen,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../lib/auth-context';

// ─── Types ───────────────────────────────────────────────────────────

interface PendingLevel {
  id: string;
  title: string;
  type: string;
  reviewStatus: string;
  course: { title: string; vendor: string };
  confidenceScore?: number;
  createdAt: string;
}

interface ReviewDetail {
  level: {
    id: string;
    title: string;
    type: string;
    reviewStatus: string;
    content: {
      question: string;
      options: string[];
      answer: number;
      explanation: string;
    };
  };
  sourceQuotes: Array<{
    chunkId: string;
    quote: string;
    chapterTitle: string;
    relevanceScore: number;
  }>;
  validationLogs: Array<{
    id: string;
    round: number;
    agentAAnswer: string;
    agentBAnswer: string;
    finalVerdict: string;
    confidenceScore: number;
  }>;
  feedbackLog: Array<{
    id: string;
    action: string;
    feedback: string;
    createdAt: string;
    reviewer: string;
  }>;
}

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_PENDING_LEVELS: PendingLevel[] = [
  {
    id: 'review-1',
    title: 'SmartX SMTX OS 存储架构 Quiz',
    type: 'QUIZ',
    reviewStatus: 'PENDING',
    course: { title: 'SmartX 超融合认证', vendor: 'SmartX' },
    confidenceScore: 0.93,
    createdAt: '2026-04-10T08:00:00Z',
  },
  {
    id: 'review-2',
    title: 'VSAN 网络拓扑',
    type: 'TOPOLOGY',
    reviewStatus: 'NEEDS_REVISION',
    course: { title: '虚拟化高级认证', vendor: 'SmartX' },
    confidenceScore: 0.61,
    createdAt: '2026-04-09T14:30:00Z',
  },
  {
    id: 'review-3',
    title: '副本放置策略排序',
    type: 'ORDERING',
    reviewStatus: 'PENDING',
    course: { title: 'SmartX 超融合认证', vendor: 'SmartX' },
    confidenceScore: 0.87,
    createdAt: '2026-04-08T10:15:00Z',
  },
];

const MOCK_REVIEW_DETAIL: ReviewDetail = {
  level: {
    id: 'review-1',
    title: 'SmartX SMTX OS 存储架构 Quiz',
    type: 'QUIZ',
    reviewStatus: 'PENDING',
    content: {
      question: 'SmartX SMTX OS 中，数据副本的默认数量是多少？',
      options: ['1 副本', '2 副本', '3 副本', '4 副本'],
      answer: 2,
      explanation: 'SMTX OS 默认使用 3 副本策略保证数据可靠性',
    },
  },
  sourceQuotes: [
    { chunkId: 'c1', quote: 'SMTX OS 默认采用三副本机制...', chapterTitle: '第3章: 存储架构', relevanceScore: 0.95 },
    { chunkId: 'c2', quote: '副本策略支持2-3副本配置...', chapterTitle: '第3章: 存储架构', relevanceScore: 0.88 },
  ],
  validationLogs: [
    {
      id: 'vl1',
      round: 1,
      agentAAnswer: JSON.stringify({ answer: 2, confidence: 0.92, reasoning: '根据产品文档，默认3副本' }),
      agentBAnswer: JSON.stringify({ answer: 2, confidence: 0.95, reference: '第3章明确说明默认3副本' }),
      finalVerdict: 'CONFIRMED',
      confidenceScore: 0.93,
    },
  ],
  feedbackLog: [],
};

// ─── API Helpers ─────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sq_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Status Helpers ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: '待审核', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  NEEDS_REVISION: { label: '需修改', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  APPROVED: { label: '已通过', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  REJECTED: { label: '已拒绝', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.85 ? 'bg-green-500/70' : score >= 0.6 ? 'bg-yellow-500/70' : 'bg-red-500/70';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-base-700/40">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-base-400">{pct}%</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── List View ───────────────────────────────────────────────────────

function ReviewListView({ items, onSelect }: { items: PendingLevel[]; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-base-600/30 bg-base-800/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700/50 text-left text-xs text-base-400">
              <th className="px-5 py-3">题目名称</th>
              <th className="px-5 py-3">所属课程</th>
              <th className="px-5 py-3">类型</th>
              <th className="px-5 py-3">审核状态</th>
              <th className="px-5 py-3">置信度</th>
              <th className="px-5 py-3">创建时间</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="cursor-pointer border-b border-base-700/20 transition-colors hover:bg-base-700/20"
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-base-100">{item.title}</p>
                </td>
                <td className="px-5 py-3">
                  <p className="text-base-300">{item.course.title}</p>
                  <p className="text-xs text-base-400">{item.course.vendor}</p>
                </td>
                <td className="px-5 py-3 text-base-300">{item.type}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={item.reviewStatus} />
                </td>
                <td className="px-5 py-3">
                  {item.confidenceScore != null && <ConfidenceBar score={item.confidenceScore} />}
                </td>
                <td className="px-5 py-3 text-xs text-base-400">{formatDate(item.createdAt)}</td>
                <td className="px-5 py-3">
                  <ChevronRight size={14} strokeWidth={1.5} className="text-base-400" />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-base-400">
                  暂无待审核题目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Detail View ─────────────────────────────────────────────────────

function ReviewDetailView({
  detail,
  onBack,
  onAction,
}: {
  detail: ReviewDetail;
  onBack: () => void;
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editContent, setEditContent] = useState(JSON.stringify(detail.level.content, null, 2));
  const [editFeedback, setEditFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    setActionLoading(action);
    await onAction(action, payload);
    setActionLoading(null);
  };

  // Parse agent answers
  const latestLog = detail.validationLogs[detail.validationLogs.length - 1];
  let agentA: { answer?: number; confidence?: number; reasoning?: string } = {};
  let agentB: { answer?: number; confidence?: number; reference?: string } = {};
  try { agentA = JSON.parse(latestLog?.agentAAnswer ?? '{}'); } catch { console.warn('Agent A answer parse failed'); }
  try { agentB = JSON.parse(latestLog?.agentBAnswer ?? '{}'); } catch { console.warn('Agent B answer parse failed'); }
  const isMatch = agentA.answer === agentB.answer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-base-100">{detail.level.title}</h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-base-400">
            <span className="flex items-center gap-1">
              <FileText size={13} strokeWidth={1.5} />
              {detail.level.type}
            </span>
            <StatusBadge status={detail.level.reviewStatus} />
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500 hover:text-base-100"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          返回列表
        </button>
      </div>

      {/* Content Preview */}
      <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-base-300">
          <BookOpen size={14} strokeWidth={1.5} />
          题目内容
        </h3>
        <p className="text-base-100 font-medium">{detail.level.content.question}</p>
        <ul className="mt-3 space-y-1.5">
          {detail.level.content.options.map((opt, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                i === detail.level.content.answer
                  ? 'border border-green-500/30 bg-green-500/10 text-green-300'
                  : 'border border-base-700/30 bg-base-800/20 text-base-300'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {i === detail.level.content.answer && (
                <CheckCircle2 size={14} strokeWidth={1.5} className="ml-auto text-green-400" />
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-base-400">
          <span className="text-base-300">解析: </span>{detail.level.content.explanation}
        </p>
      </div>

      {/* Dual Agent Comparison */}
      {latestLog && (
        <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
          <h3 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-300">
            <ShieldCheck size={14} strokeWidth={1.5} />
            双Agent验证对比 (Round {latestLog.round})
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Agent A */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                  Agent A - 求解器
                </span>
              </div>
              <p className="text-sm text-base-100">
                <span className="text-base-400">答案: </span>
                选项 {String.fromCharCode(65 + (agentA.answer ?? 0))}
              </p>
              <p className="mt-1 text-sm text-base-300">
                <span className="text-base-400">推理: </span>
                {agentA.reasoning ?? '-'}
              </p>
              {agentA.confidence != null && (
                <div className="mt-2">
                  <span className="text-xs text-base-400">置信度: </span>
                  <ConfidenceBar score={agentA.confidence} />
                </div>
              )}
            </div>

            {/* Agent B */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                  Agent B - 参考源
                </span>
              </div>
              <p className="text-sm text-base-100">
                <span className="text-base-400">答案: </span>
                选项 {String.fromCharCode(65 + (agentB.answer ?? 0))}
              </p>
              <p className="mt-1 text-sm text-base-300">
                <span className="text-base-400">参考: </span>
                {agentB.reference ?? '-'}
              </p>
              {agentB.confidence != null && (
                <div className="mt-2">
                  <span className="text-xs text-base-400">置信度: </span>
                  <ConfidenceBar score={agentB.confidence} />
                </div>
              )}
            </div>
          </div>

          {/* Match Indicator */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-base-700/30 bg-base-800/40 px-4 py-3">
            <div className="flex items-center gap-2">
              {isMatch ? (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-green-400" />
                  <span className="text-sm font-medium text-green-400">双Agent答案一致</span>
                </>
              ) : (
                <>
                  <XCircle size={16} strokeWidth={1.5} className="text-red-400" />
                  <span className="text-sm font-medium text-red-400">双Agent答案不一致</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-400">最终判定: </span>
              <span className={`text-sm font-medium ${latestLog.finalVerdict === 'CONFIRMED' ? 'text-green-400' : 'text-orange-400'}`}>
                {latestLog.finalVerdict === 'CONFIRMED' ? '已确认' : '待确认'}
              </span>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-base-400">综合置信度:</span>
            <ConfidenceBar score={latestLog.confidenceScore} />
          </div>
        </div>
      )}

      {/* Source Quotes */}
      {detail.sourceQuotes.length > 0 && (
        <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
          <h3 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-300">
            <FileText size={14} strokeWidth={1.5} />
            RAG 参考来源
          </h3>
          <div className="space-y-3">
            {detail.sourceQuotes.map((sq) => (
              <div key={sq.chunkId} className="rounded-xl border border-base-700/30 bg-base-800/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-accent">{sq.chapterTitle}</span>
                  <span className="text-xs text-base-400">
                    相关度: {Math.round(sq.relevanceScore * 100)}%
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-base-300 italic">
                  &ldquo;{sq.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback History */}
      {detail.feedbackLog.length > 0 && (
        <div className="rounded-2xl border border-base-600/30 bg-base-800/30 p-6">
          <h3 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-300">
            <Clock size={14} strokeWidth={1.5} />
            审核历史
          </h3>
          <div className="space-y-3">
            {detail.feedbackLog.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3 rounded-xl border border-base-700/30 bg-base-800/20 p-4">
                <div className={`mt-0.5 rounded-full p-1 ${
                  fb.action === 'APPROVED' ? 'bg-green-500/20 text-green-400'
                    : fb.action === 'REJECTED' ? 'bg-red-500/20 text-red-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {fb.action === 'APPROVED' ? <Check size={12} /> : fb.action === 'REJECTED' ? <X size={12} /> : <Edit3 size={12} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-base-400">
                    <span>{fb.reviewer}</span>
                    <span>{formatDate(fb.createdAt)}</span>
                  </div>
                  {fb.feedback && <p className="mt-1 text-sm text-base-300">{fb.feedback}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Approve */}
        <button
          onClick={() => void handleAction('approve')}
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-green-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
        >
          {actionLoading === 'approve' ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />}
          通过
        </button>

        {/* Reject */}
        {!showRejectForm ? (
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            <X size={14} strokeWidth={2} />
            拒绝
          </button>
        ) : (
          <div className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <label className="mb-2 block text-xs font-medium text-red-300">拒绝原因</label>
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="请输入拒绝原因..."
              rows={3}
              className="w-full rounded-lg border border-base-600/40 bg-base-800/60 px-3 py-2 text-sm text-base-100 placeholder-base-500 outline-none focus:border-accent/50"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => void handleAction('reject', { feedback: rejectFeedback })}
                disabled={!rejectFeedback.trim() || actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading === 'reject' ? <RefreshCw size={12} className="animate-spin" /> : <X size={12} />}
                确认拒绝
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectFeedback(''); }}
                className="rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Edit */}
        {!showEditForm ? (
          <button
            onClick={() => setShowEditForm(true)}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            <Edit3 size={14} strokeWidth={2} />
            编辑
          </button>
        ) : (
          <div className="w-full rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
            <label className="mb-2 block text-xs font-medium text-blue-300">编辑题目内容 (JSON)</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-base-600/40 bg-base-800/60 px-3 py-2 font-mono text-xs text-base-100 placeholder-base-500 outline-none focus:border-accent/50"
            />
            <label className="mb-1 mt-3 block text-xs font-medium text-blue-300">修改说明 (可选)</label>
            <textarea
              value={editFeedback}
              onChange={(e) => setEditFeedback(e.target.value)}
              placeholder="描述修改原因..."
              rows={2}
              className="w-full rounded-lg border border-base-600/40 bg-base-800/60 px-3 py-2 text-sm text-base-100 placeholder-base-500 outline-none focus:border-accent/50"
            />
            {editError && (
              <p className="mt-2 text-xs text-red-400">{editError}</p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(editContent);
                    setEditError(null);
                    void handleAction('edit', { content: parsed, feedback: editFeedback || undefined });
                  } catch {
                    setEditError('JSON 格式错误，请检查语法');
                  }
                }}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                {actionLoading === 'edit' ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                保存修改
              </button>
              <button
                onClick={() => { setShowEditForm(false); setEditContent(JSON.stringify(detail.level.content, null, 2)); setEditFeedback(''); setEditError(null); }}
                className="rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────

function ReviewContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<PendingLevel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const apiData = await fetchWithAuth<{ items: PendingLevel[] }>('/review/pending');
      setItems(apiData?.items ?? MOCK_PENDING_LEVELS);
    } catch {
      setItems(MOCK_PENDING_LEVELS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (levelId: string) => {
    setDetailLoading(true);
    setActionMessage(null);
    try {
      const apiData = await fetchWithAuth<ReviewDetail>(`/review/${levelId}`);
      setDetail(apiData ?? { ...MOCK_REVIEW_DETAIL, level: { ...MOCK_REVIEW_DETAIL.level, id: levelId } });
    } catch {
      setDetail({ ...MOCK_REVIEW_DETAIL, level: { ...MOCK_REVIEW_DETAIL.level, id: levelId } });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  const handleBack = () => {
    setSelectedId(null);
    setDetail(null);
    setActionMessage(null);
  };

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!selectedId) return;

    const endpointMap: Record<string, { method: string; path: string }> = {
      approve: { method: 'POST', path: `/review/${selectedId}/approve` },
      reject: { method: 'POST', path: `/review/${selectedId}/reject` },
      edit: { method: 'POST', path: `/review/${selectedId}/edit` },
    };

    const ep = endpointMap[action];
    if (!ep) return;

    try {
      const result = await fetchWithAuth(ep.path, {
        method: ep.method,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (result !== null) {
        setActionMessage({ type: 'success', text: `操作成功: ${action === 'approve' ? '已通过' : action === 'reject' ? '已拒绝' : '已保存修改'}` });
      } else {
        // Mock mode: show success anyway
        setActionMessage({ type: 'success', text: `[演示模式] ${action === 'approve' ? '审核通过' : action === 'reject' ? '已拒绝' : '修改已保存'}` });
      }
      void loadList();
    } catch {
      setActionMessage({ type: 'error', text: '操作失败，请重试' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-base-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900 px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-100">
            审核中心
          </h1>
          <p className="mt-1 text-sm text-base-300">
            AI 生成题目审核 / 双Agent对比验证
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadList()}
            className="flex items-center gap-1.5 rounded-lg border border-base-600/40 px-3 py-1.5 text-xs text-base-300 transition hover:border-base-500 hover:text-base-100"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            刷新
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-300 transition hover:text-base-100 hover:bg-base-700/50"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            首页
          </Link>
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          actionMessage.type === 'success'
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {actionMessage.text}
          <button onClick={() => setActionMessage(null)} className="ml-auto text-base-400 hover:text-base-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* View switching */}
      {selectedId && detail ? (
        detailLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-base-400" />
          </div>
        ) : (
          <ReviewDetailView detail={detail} onBack={handleBack} onAction={handleAction} />
        )
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-xs text-base-400">
            <ShieldAlert size={14} strokeWidth={1.5} />
            <span>共 {items.length} 个待审核题目</span>
          </div>
          <ReviewListView items={items} onSelect={handleSelect} />
        </>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function AdminReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-base-900">
          <RefreshCw size={24} className="animate-spin text-base-400" />
        </div>
      }
    >
      <ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']}>
        <ReviewContent />
      </ProtectedRoute>
    </Suspense>
  );
}
