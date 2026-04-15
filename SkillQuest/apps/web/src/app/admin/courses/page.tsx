/**
 * Course Admin Page — Course Management + Document Upload
 *
 * Vendor admins upload documents, trigger AI generation,
 * and manage courses with status tracking.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileText,
  File,
  Search,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  RefreshCw,
  FolderOpen,
  BarChart3,
  Clock,
  ExternalLink,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../lib/auth-context';

// ─── Types ───────────────────────────────────────────────────────────

interface CourseAdmin {
  id: string;
  title: string;
  vendor: string;
  category: string;
  status: string;
  levelCount: number;
  pendingCount: number;
}

interface ImportInsights {
  pageCount: number;
  chapterCount: number;
  estimatedLevels: number;
  chapters: Array<{ title: string; pages: number }>;
}

type ImportPhase = 'idle' | 'analyzing' | 'parsing' | 'generating' | 'validating' | 'saving' | 'done' | 'error';

interface ImportStatus {
  jobId: string;
  phase: ImportPhase;
  progress: number;
  message?: string;
  courseId?: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_COURSES_ADMIN: CourseAdmin[] = [
  { id: 'c1', title: 'SmartX 超融合认证', vendor: 'SmartX', category: 'VIRTUALIZATION', status: 'published', levelCount: 12, pendingCount: 0 },
  { id: 'c2', title: '深信服 SD-WAN 培训', vendor: 'Sangfor', category: 'NETWORK', status: 'pending_review', levelCount: 8, pendingCount: 3 },
  { id: 'c3', title: '华为 HCI 认证', vendor: 'Huawei', category: 'CLOUD', status: 'draft', levelCount: 0, pendingCount: 0 },
];

// ─── API Helpers ─────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sq_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    if (!options?.body || typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function analyzeImport(file: File): Promise<ImportInsights | null> {
  if (!API_URL) return null;
  const form = new FormData();
  form.append('file', file);
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sq_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/courses/import/analyze`, { method: 'POST', body: form, headers });
    if (!res.ok) return null;
    return (await res.json()) as ImportInsights;
  } catch {
    return null;
  }
}

async function startImport(file: File, tenantId: string, hint?: string): Promise<{ jobId: string } | null> {
  if (!API_URL) return null;
  const form = new FormData();
  form.append('file', file);
  form.append('tenantId', tenantId);
  if (hint) form.append('hint', hint);
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sq_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/courses/import`, { method: 'POST', body: form, headers });
    if (!res.ok) return null;
    return (await res.json()) as { jobId: string };
  } catch {
    return null;
  }
}

async function pollImportStatus(jobId: string): Promise<ImportStatus | null> {
  return fetchWithAuth<ImportStatus>(`/courses/import/status/${jobId}`);
}

// ─── Status Config ───────────────────────────────────────────────────

const COURSE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-base-400', bg: 'bg-base-600/20 border-base-200' },
  pending_review: { label: '待审核', color: 'text-amber-600', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  published: { label: '已发布', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-green-400/30' },
  archived: { label: '已归档', color: 'text-base-400', bg: 'bg-base-50 border-base-100' },
};

function CourseStatusBadge({ status }: { status: string }) {
  const cfg = COURSE_STATUS_CONFIG[status] ?? COURSE_STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const PHASE_LABELS: Record<string, string> = {
  idle: '就绪',
  analyzing: '分析中',
  parsing: '文档解析',
  generating: 'AI 生成',
  validating: '双Agent 验证',
  saving: '保存中',
  done: '完成',
  error: '错误',
};

const PHASE_ORDER: ImportPhase[] = ['parsing', 'analyzing', 'generating', 'validating', 'saving'];

// ─── Upload Section ──────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];
const MAX_FILE_SIZE = 30 * 1024 * 1024;

function UploadSection({ tenantId }: { tenantId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [insights, setInsights] = useState<ImportInsights | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [hint, setHint] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const validateFile = (f: File): boolean => {
    const parts = f.name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()?.toLowerCase() : '';
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
      setError('不支持的文件格式，请上传 PDF/DOCX/TXT 文件');
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('文件大小超过 30MB 限制');
      return false;
    }
    return true;
  };

  const handleFile = (f: File) => {
    if (!validateFile(f)) return;
    setFile(f);
    setInsights(null);
    setImportStatus(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeImport(file);
      if (result) {
        setInsights(result);
      } else {
        // Mock mode
        setInsights({
          pageCount: 42,
          chapterCount: 6,
          estimatedLevels: 10,
          chapters: [
            { title: '第1章: 产品概述', pages: 8 },
            { title: '第2章: 架构设计', pages: 12 },
            { title: '第3章: 存储架构', pages: 10 },
            { title: '第4章: 网络配置', pages: 6 },
            { title: '第5章: 运维管理', pages: 4 },
            { title: '第6章: 最佳实践', pages: 2 },
          ],
        });
      }
    } catch {
      setError('文档分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await startImport(file, tenantId, hint || undefined);
      if (result?.jobId) {
        // Poll for status
        pollingRef.current = setInterval(async () => {
          const status = await pollImportStatus(result.jobId);
          if (status) {
            setImportStatus(status);
            if (status.phase === 'done' || status.phase === 'error') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setImporting(false);
            }
          }
        }, 2000);
      } else {
        // Mock import progress
        const mockPhases: ImportPhase[] = ['parsing', 'analyzing', 'generating', 'validating', 'saving', 'done'];
        let step = 0;
        pollingRef.current = setInterval(() => {
          if (step < mockPhases.length) {
            setImportStatus({
              jobId: 'mock-job',
              phase: mockPhases[step],
              progress: Math.round(((step + 1) / mockPhases.length) * 100),
              message: `[演示模式] ${PHASE_LABELS[mockPhases[step]]}...`,
            });
            step++;
          } else {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setImporting(false);
          }
        }, 1500);
      }
    } catch {
      setError('导入启动失败，请重试');
      setImporting(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload size={28} strokeWidth={1.5} className="text-base-400" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText size={28} strokeWidth={1.5} className="text-red-600" />;
    if (ext === 'docx' || ext === 'doc') return <File size={28} strokeWidth={1.5} className="text-blue-600" />;
    return <FileText size={28} strokeWidth={1.5} className="text-base-600" />;
  };

  return (
    <div className="rounded-2xl border border-base-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-600">
        <Upload size={14} strokeWidth={1.5} />
        文档上传
      </h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? 'border-accent/50 bg-accent/5'
            : file
              ? 'border-emerald-200 bg-green-500/5'
              : 'border-base-200 bg-white hover:border-accent/40/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="flex flex-col items-center gap-2">
          {getFileIcon()}
          {file ? (
            <>
              <p className="text-sm font-medium text-base-900">{file.name}</p>
              <p className="text-xs text-base-400">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-base-600">拖拽文件到此处，或点击选择</p>
              <p className="text-xs text-base-400">支持 PDF / DOCX / TXT，最大 30MB</p>
            </>
          )}
        </div>
      </div>

      {/* Hint */}
      {file && !importStatus && (
        <div className="mt-4">
          <label className="mb-1 block text-xs text-base-400">课程提示 (可选)</label>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="提供额外上下文帮助AI更好理解文档内容..."
            rows={2}
            className="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder-base-500 outline-none focus:border-accent/50"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-300">
          <AlertCircle size={14} strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {file && !importStatus && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => void handleAnalyze()}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg border border-base-200 px-4 py-2 text-sm text-base-600 transition hover:border-accent/30 hover:text-base-900 disabled:opacity-50"
          >
            {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} strokeWidth={1.5} />}
            分析文档
          </button>
          <button
            onClick={() => void handleStartImport()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-lg bg-accent/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent disabled:opacity-50"
          >
            {importing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} strokeWidth={1.5} />}
            开始导入
          </button>
        </div>
      )}

      {/* Analysis Insights */}
      {insights && !importStatus && (
        <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <h3 className="mb-3 text-xs font-medium text-accent">文档结构预览</h3>
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold text-base-900">{insights.pageCount}</p>
              <p className="text-xs text-base-400">页面</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-base-900">{insights.chapterCount}</p>
              <p className="text-xs text-base-400">章节</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-base-900">{insights.estimatedLevels}</p>
              <p className="text-xs text-base-400">预估关卡</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {insights.chapters.map((ch, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs">
                <span className="text-base-600">{ch.title}</span>
                <span className="text-base-400">{ch.pages} 页</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Progress */}
      {importStatus && (
        <div className="mt-4 rounded-xl border border-base-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-medium text-base-600">导入进度</h3>

          {/* Phase steps */}
          <div className="mb-4 flex items-center justify-between">
            {PHASE_ORDER.map((phase, i) => {
              const currentIdx = PHASE_ORDER.indexOf(importStatus.phase as ImportPhase);
              const isDone = importStatus.phase === 'done' || i < currentIdx;
              const isCurrent = phase === importStatus.phase;
              return (
                <React.Fragment key={phase}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                      isDone ? 'border-green-500/50 bg-green-500/20 text-emerald-600'
                        : isCurrent ? 'border-accent/50 bg-accent/20 text-accent'
                        : 'border-base-200 bg-white text-base-400'
                    }`}>
                      {isDone ? <CheckCircle2 size={12} /> : i + 1}
                    </div>
                    <span className={`text-[10px] ${isCurrent ? 'text-accent' : isDone ? 'text-emerald-600' : 'text-base-400'}`}>
                      {PHASE_LABELS[phase]}
                    </span>
                  </div>
                  {i < PHASE_ORDER.length - 1 && (
                    <div className={`h-px flex-1 mx-1 ${i < currentIdx || importStatus.phase === 'done' ? 'bg-green-500/30' : 'bg-base-100'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-base-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                importStatus.phase === 'done' ? 'bg-emerald-500' : importStatus.phase === 'error' ? 'bg-red-500/70' : 'bg-accent/60'
              }`}
              style={{ width: `${importStatus.progress}%` }}
            />
          </div>

          {/* Status message */}
          {importStatus.message && (
            <p className={`mt-2 text-xs ${importStatus.phase === 'error' ? 'text-red-600' : importStatus.phase === 'done' ? 'text-emerald-600' : 'text-base-400'}`}>
              {importStatus.message}
            </p>
          )}

          {importStatus.phase === 'done' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 size={14} strokeWidth={1.5} />
              导入完成
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────

function CoursesAdminContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const apiData = await fetchWithAuth<CourseAdmin[]>('/courses');
      setCourses(apiData ?? MOCK_COURSES_ADMIN);
    } catch {
      setCourses(MOCK_COURSES_ADMIN);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCourses(); }, [loadCourses]);

  // Quick stats
  const totalCourses = courses.length;
  const totalLevels = courses.reduce((s, c) => s + c.levelCount, 0);
  const pendingCount = courses.reduce((s, c) => s + c.pendingCount, 0);
  const publishedCount = courses.filter((c) => c.status === 'published').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <RefreshCw size={24} className="animate-spin text-base-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-900">
            课程管理
          </h1>
          <p className="mt-1 text-sm text-base-600">
            文档上传 / AI 题目生成 / 课程管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadCourses()}
            className="flex items-center gap-1.5 rounded-lg border border-base-200 px-3 py-1.5 text-xs text-base-600 transition hover:border-accent/40 hover:text-base-900"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            刷新
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-base-600 transition hover:text-base-900 hover:bg-base-100"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            首页
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '课程总数', value: totalCourses, icon: BookOpen, color: 'text-blue-600' },
          { label: '关卡总数', value: totalLevels, icon: BarChart3, color: 'text-emerald-600' },
          { label: '待审核', value: pendingCount, icon: Clock, color: 'text-amber-600' },
          { label: '已发布', value: publishedCount, icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-base-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <s.icon size={16} strokeWidth={1.5} className={s.color} />
              <span className="text-xs text-base-400">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold text-base-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <UploadSection tenantId={user?.tenantId ?? 'demo-tenant'} />

        {/* Course List */}
        <div className="rounded-2xl border border-base-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-medium text-base-600">
            <FolderOpen size={14} strokeWidth={1.5} />
            课程列表
          </h2>
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-base-100 bg-white p-4 transition-colors hover:bg-base-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-base-900">{course.title}</h3>
                    <p className="mt-0.5 text-xs text-base-400">
                      {course.vendor} / {course.category}
                    </p>
                  </div>
                  <CourseStatusBadge status={course.status} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-base-400">
                  <span className="flex items-center gap-1">
                    <BarChart3 size={12} strokeWidth={1.5} />
                    {course.levelCount} 关卡
                  </span>
                  {course.pendingCount > 0 && (
                    <Link
                      href={`/admin/review?courseId=${course.id}`}
                      className="flex items-center gap-1 text-amber-600 transition hover:text-yellow-300"
                    >
                      <AlertCircle size={12} strokeWidth={1.5} />
                      {course.pendingCount} 待审核
                      <ExternalLink size={10} strokeWidth={1.5} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="py-10 text-center text-sm text-base-400">
                暂无课程，请上传文档开始创建
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <RefreshCw size={24} className="animate-spin text-base-400" />
        </div>
      }
    >
      <ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']}>
        <CoursesAdminContent />
      </ProtectedRoute>
    </Suspense>
  );
}
