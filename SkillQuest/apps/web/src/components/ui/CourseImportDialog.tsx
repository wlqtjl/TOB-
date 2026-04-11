'use client';

/**
 * CourseImportDialog — 文档上传 + AI 课程生成进度对话框
 *
 * 流程：
 * 1. 用户选择文件（PDF / DOCX / TXT），填写可选说明
 * 2. POST /api/courses/import → 获取 jobId
 * 3. 每 2 秒轮询 GET /api/courses/import/status/:jobId
 * 4. 完成后显示"前往课程"按钮
 */

import React, { useCallback, useRef, useState } from 'react';

// ─── 类型 ────────────────────────────────────────────────────────

type JobStatus = 'pending' | 'parsing' | 'generating' | 'saving' | 'done' | 'error';

interface ImportJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  message: string;
  courseId?: string;
  error?: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (courseId: string) => void;
  apiBase?: string;   // defaults to http://localhost:3001/api
  tenantId?: string;
}

// ─── 常量 ────────────────────────────────────────────────────────

const ACCEPT = '.pdf,.docx,.doc,.txt,.md';
const MAX_SIZE_MB = 30;

// ─── Component ───────────────────────────────────────────────────

export default function CourseImportDialog({ onClose, onSuccess, apiBase = 'http://localhost:3001/api', tenantId = 'default-tenant' }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 文件校验 ─────────────────────────────────────────────────

  const validateFile = (f: File): string => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `文件过大，最大支持 ${MAX_SIZE_MB} MB`;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext)) return '不支持该格式，请选择 PDF / DOCX / TXT';
    return '';
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    if (!err) setFile(f);
  };

  // ── 拖拽 ─────────────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  // ── 上传 ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);

    const form = new FormData();
    form.append('file', file);
    form.append('tenantId', tenantId);
    if (hint) form.append('hint', hint);

    try {
      const res = await fetch(`${apiBase}/courses/import`, { method: 'POST', body: form });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message ?? `上传失败 (HTTP ${res.status})`);
      }
      const { jobId } = (await res.json()) as { jobId: string };
      startPolling(jobId);
    } catch (err) {
      setJob({ jobId: '', status: 'error', progress: 0, message: '❌ 上传失败', error: (err as Error).message });
      setUploading(false);
    }
  };

  // ── 轮询 ─────────────────────────────────────────────────────

  const startPolling = (jobId: string) => {
    setJob({ jobId, status: 'pending', progress: 5, message: '📤 正在上传…' });

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/courses/import/status/${jobId}`);
        if (!res.ok) return;
        const data = (await res.json()) as ImportJob;
        setJob(data);

        if (data.status === 'done' || data.status === 'error') {
          clearInterval(pollRef.current!);
          setUploading(false);
          if (data.status === 'done' && data.courseId) {
            // 延迟 1 秒后回调，让用户看到成功状态
            setTimeout(() => data.courseId && onSuccess(data.courseId), 1500);
          }
        }
      } catch {
        // 网络抖动，继续轮询
      }
    }, 2000);
  };

  // ── 清理 ─────────────────────────────────────────────────────

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  };

  // ── 渲染 ─────────────────────────────────────────────────────

  const isRunning = uploading || (job && job.status !== 'done' && job.status !== 'error');
  const isDone = job?.status === 'done';
  const isError = job?.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100">📄 上传文档生成课程</h2>
            <p className="text-xs text-gray-500">AI 自动提取知识点并生成 7 种题型关卡</p>
          </div>
          <button
            onClick={handleClose}
            disabled={!!isRunning}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* 文件选择区 */}
          {!job && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragOver
                    ? 'border-blue-400 bg-blue-950/30'
                    : file
                    ? 'border-green-500/50 bg-green-950/20'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {file ? (
                  <>
                    <p className="text-3xl">✅</p>
                    <p className="mt-2 font-medium text-green-400">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl">📂</p>
                    <p className="mt-2 text-sm text-gray-400">拖拽文件或点击选择</p>
                    <p className="mt-1 text-xs text-gray-600">支持 PDF · DOCX · TXT（最大 {MAX_SIZE_MB} MB）</p>
                  </>
                )}
              </div>

              {fileError && (
                <p className="text-sm text-red-400">⚠️ {fileError}</p>
              )}

              {/* 可选说明 */}
              <div>
                <label className="mb-1.5 block text-xs text-gray-500">补充说明（可选）— 帮助 AI 更准确地生成课程</label>
                <textarea
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="例如：这是 SmartX 超融合替换 VMware 的迁移最佳实践文档，重点关注迁移步骤和故障处理"
                  rows={3}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || !!fileError || uploading}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  🚀 开始生成
                </button>
              </div>
            </>
          )}

          {/* 进度显示 */}
          {job && (
            <div className="space-y-4">
              {/* 进度条 */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400">{job.message}</span>
                  <span className="font-mono text-gray-500">{job.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* 步骤指示器 */}
              {!isError && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: '解析文档', statuses: ['parsing'] },
                    { label: 'AI 生成', statuses: ['generating'] },
                    { label: '保存数据库', statuses: ['saving'] },
                    { label: '完成', statuses: ['done'] },
                  ].map((step, idx) => {
                    const isActive = step.statuses.includes(job.status);
                    const isPast = ['parsing', 'generating', 'saving', 'done'].indexOf(job.status) > idx;
                    return (
                      <div
                        key={step.label}
                        className={`rounded-lg border py-2 text-xs transition ${
                          isActive
                            ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                            : isPast
                            ? 'border-green-700 bg-green-950/20 text-green-400'
                            : 'border-gray-800 text-gray-600'
                        }`}
                      >
                        {isPast ? '✓ ' : isActive ? '⟳ ' : ''}{step.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 错误详情 */}
              {isError && job.error && (
                <div className="rounded-lg border border-red-800 bg-red-950/20 px-4 py-3">
                  <p className="text-xs text-red-400">{job.error}</p>
                </div>
              )}

              {/* 成功提示 */}
              {isDone && (
                <div className="rounded-lg border border-green-700 bg-green-950/20 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-green-300">🎉 课程已生成！正在跳转…</p>
                </div>
              )}

              {/* 底部按钮 */}
              <div className="flex gap-3">
                {(isError) && (
                  <>
                    <button
                      onClick={() => { setJob(null); setUploading(false); }}
                      className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:border-gray-500"
                    >
                      重新上传
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:border-gray-500"
                    >
                      关闭
                    </button>
                  </>
                )}
                {isRunning && !isError && (
                  <div className="flex w-full items-center justify-center gap-2 text-sm text-gray-500">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    处理中，请稍候…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
