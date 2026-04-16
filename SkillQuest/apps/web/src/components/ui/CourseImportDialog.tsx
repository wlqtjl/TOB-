'use client';

/**
 * CourseImportDialog — Minimalist frosted glass redesign
 *
 * Design: glass backdrop, Lucide icons, clean typography
 *
 * GPSL v1.1: Added Gemini simulation mode toggle.
 * When enabled, documents are processed through Gemini 3 Flash to generate
 * interactive sandbox simulations alongside traditional quiz levels.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileCheck,
  Folder,
  Rocket,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Beaker,
  FlaskConical,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

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
  apiBase?: string;
  tenantId?: string;
}

// ─── Constants ────────────────────────────────────────────────────

const ACCEPT = '.pdf,.docx,.doc,.txt,.md';
const MAX_SIZE_MB = 30;

const STATUS_ORDER: JobStatus[] = ['parsing', 'generating', 'saving', 'done'];
const STEP_LABELS = ['解析文档', 'AI 生成', '保存数据库', '完成'];

// GPSL v1.1 — Gemini 模型描述协议 (MDP) Prompt 模板
const GEMINI_SIM_PROMPT = `## Role: SkillQuest Physics & Engineering Architect
## Task: Convert the following technical text into an Interactive Simulation Schema.

## Text Input: [文档片段将自动注入]

## Output Format (Strict JSON):
{
  "model_type": "physical_law | logic_flow | mechanical_cycle",
  "math_formula": "LaTeX format string",
  "variables": [
    {"name": "variable_name", "label": "显示名称", "min": 0, "max": 100, "default": 50, "unit": "单位"}
  ],
  "visual_logic": "Describe the animation behavior of the SVG/Canvas elements based on variables.",
  "learning_check": "What happens when variable X is changed to Y?"
}`;

// ─── Component ───────────────────────────────────────────────────

export default function CourseImportDialog({ onClose, onSuccess, apiBase = 'http://localhost:3001/api', tenantId = 'default-tenant' }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [enableSimulation, setEnableSimulation] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);

    const form = new FormData();
    form.append('file', file);
    form.append('tenantId', tenantId);
    if (hint) form.append('hint', hint);
    if (enableSimulation) {
      form.append('enableSimulation', 'true');
      form.append('simulationPrompt', GEMINI_SIM_PROMPT);
    }

    try {
      const res = await fetch(`${apiBase}/courses/import`, { method: 'POST', body: form });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message ?? `上传失败 (HTTP ${res.status})`);
      }
      const { jobId } = (await res.json()) as { jobId: string };
      startPolling(jobId);
    } catch (err) {
      setJob({ jobId: '', status: 'error', progress: 0, message: '上传失败', error: (err as Error).message });
      setUploading(false);
    }
  };

  const startPolling = (jobId: string) => {
    setJob({ jobId, status: 'pending', progress: 5, message: '正在上传…' });

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
            setTimeout(() => data.courseId && onSuccess(data.courseId), 1500);
          }
        }
      } catch {
        // network jitter — keep polling
      }
    }, 2000);
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  };

  const isRunning = uploading || (job && job.status !== 'done' && job.status !== 'error');
  const isDone = job?.status === 'done';
  const isError = job?.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-heavy w-full max-w-lg rounded-2xl shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-base-200 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-base-900">上传文档生成课程</h2>
            <p className="mt-0.5 text-xs text-base-400">
              AI 自动提取知识点并生成{enableSimulation ? '交互模拟实验 + ' : ''} 7 种题型关卡
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={!!isRunning}
            className="rounded-lg p-2 text-base-400 transition hover:bg-base-100 hover:text-base-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* ── File Picker ── */}
          {!job && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border border-dashed p-10 text-center transition ${
                  dragOver
                    ? 'border-accent/60 bg-accent/5'
                    : file
                    ? 'border-emerald-200 bg-green-950/10'
                    : 'border-base-200/60 hover:border-accent/40'
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
                    <FileCheck size={28} strokeWidth={1.5} className="mx-auto text-emerald-600" />
                    <p className="mt-3 text-sm font-medium text-base-900">{file.name}</p>
                    <p className="mt-1 text-xs text-base-400">{(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换</p>
                  </>
                ) : (
                  <>
                    <Folder size={28} strokeWidth={1.5} className="mx-auto text-base-400" />
                    <p className="mt-3 text-sm text-base-600">拖拽文件或点击选择</p>
                    <p className="mt-1 text-xs text-base-400">PDF · DOCX · TXT（最大 {MAX_SIZE_MB} MB）</p>
                  </>
                )}
              </div>

              {fileError && (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle size={14} strokeWidth={1.5} />
                  {fileError}
                </p>
              )}

              {/* Hint */}
              <div>
                <label className="mb-1.5 block text-xs text-base-400">补充说明（可选）</label>
                <textarea
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="例如：这是 SmartX 超融合替换 VMware 的迁移最佳实践文档"
                  rows={3}
                  className="w-full rounded-lg border border-base-200/60 bg-white/50 px-3 py-2.5 text-sm text-base-900 placeholder-base-500 transition focus:border-accent/50 focus:outline-none"
                />
              </div>

              {/* GPSL v1.1 — Gemini Simulation Toggle */}
              <div
                onClick={() => setEnableSimulation(!enableSimulation)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  enableSimulation
                    ? 'border-accent/40 bg-accent-50/40'
                    : 'border-base-200/60 hover:border-accent/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`rounded-lg p-2 ${enableSimulation ? 'bg-accent/10' : 'bg-base-100'}`}>
                      <FlaskConical size={16} strokeWidth={1.5} className={enableSimulation ? 'text-accent' : 'text-base-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${enableSimulation ? 'text-accent-700' : 'text-base-700'}`}>
                        Gemini 交互模拟
                      </p>
                      <p className="text-[11px] text-base-400">
                        生成可调参的动态实验关卡 (GPSL v1.1)
                      </p>
                    </div>
                  </div>
                  <div className={`h-5 w-9 rounded-full transition-colors ${enableSimulation ? 'bg-accent' : 'bg-base-300'}`}>
                    <div className={`h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${enableSimulation ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                {enableSimulation && (
                  <div className="mt-3 rounded-lg bg-accent-50/60 px-3 py-2 text-[11px] leading-relaxed text-accent-600">
                    <Beaker size={11} strokeWidth={1.5} className="mr-1 inline" />
                    Gemini 将从文档中提取物理量/逻辑流程，自动生成交互式沙盒模拟关卡。
                    学员可通过滑块调节参数，实时观察模型变化。
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-base-200/60 py-2.5 text-sm text-base-600 transition hover:border-accent/40 hover:text-base-900"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || !!fileError || uploading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-base-900 transition hover:bg-accent-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket size={14} strokeWidth={1.5} />
                  {enableSimulation ? '生成课程 + 实验' : '开始生成'}
                </button>
              </div>
            </>
          )}

          {/* ── Progress ── */}
          {job && (
            <div className="space-y-5">
              {/* Progress bar */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-base-600">{job.message}</span>
                  <span className="font-mono text-base-400">{job.progress}%</span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-base-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isError ? 'bg-red-600' : isDone ? 'bg-emerald-500' : 'bg-accent'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Step indicators */}
              {!isError && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {STEP_LABELS.map((label, idx) => {
                    const statusIdx = STATUS_ORDER.indexOf(job.status);
                    const isActive = STATUS_ORDER[idx] === job.status;
                    const isPast = statusIdx > idx;
                    return (
                      <div
                        key={label}
                        className={`rounded-lg border py-2.5 text-xs transition ${
                          isActive
                            ? 'border-accent/40 bg-accent/5 text-accent'
                            : isPast
                            ? 'border-green-700/30 text-emerald-600'
                            : 'border-base-200 text-base-400'
                        }`}
                      >
                        {isPast ? '✓ ' : ''}{label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Error */}
              {isError && job.error && (
                <div className="rounded-lg border border-red-800/40 bg-red-950/10 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={14} strokeWidth={1.5} />
                    {job.error}
                  </p>
                </div>
              )}

              {/* Success */}
              {isDone && (
                <div className="rounded-lg border border-green-700/30 bg-green-950/10 px-4 py-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 size={16} strokeWidth={1.5} />
                    课程已生成！正在跳转…
                  </p>
                </div>
              )}

              {/* Bottom actions */}
              <div className="flex gap-3">
                {isError && (
                  <>
                    <button
                      onClick={() => { setJob(null); setUploading(false); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-base-200/60 py-2.5 text-sm text-base-600 transition hover:border-accent/40"
                    >
                      <RotateCcw size={14} strokeWidth={1.5} />
                      重新上传
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 rounded-lg border border-base-200/60 py-2.5 text-sm text-base-600 transition hover:border-accent/40"
                    >
                      关闭
                    </button>
                  </>
                )}
                {isRunning && !isError && (
                  <div className="flex w-full items-center justify-center gap-2 text-sm text-base-400">
                    <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
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
