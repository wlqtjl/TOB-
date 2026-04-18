/**
 * AI Settings Page — 管理后台 AI 模型配置
 *
 * 功能:
 * - ModelPicker: 选择生成器、校验器、动画模型
 * - API Key 配置: 脱敏显示 + "测试连接" 按钮
 * - 推荐组合: 显示预设的最佳模型组合
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Key,
  Zap,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ModelPicker, { type ProviderStatus } from '../../../components/ai/ModelPicker';

// ─── Types ─────────────────────────────────────────────────────────────

interface AISettings {
  generatorProvider: string;
  generatorModel: string;
  validatorProvider: string;
  validatorModel: string;
  animationProvider: string;
  animationModel: string;
}

interface TestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

// ─── API helpers ───────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sq_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchProviders(): Promise<ProviderStatus[]> {
  if (!API_URL) return getMockProviders();
  try {
    const res = await fetch(`${API_URL}/ai/providers`, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return getMockProviders();
}

async function fetchSettings(): Promise<AISettings> {
  if (!API_URL) return getDefaultSettings();
  try {
    const res = await fetch(`${API_URL}/ai/settings`, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }
  return getDefaultSettings();
}

async function saveSettings(settings: AISettings): Promise<boolean> {
  if (!API_URL) return true;
  try {
    const res = await fetch(`${API_URL}/ai/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch { return false; }
}

async function writeApiKey(provider: string, apiKey: string): Promise<boolean> {
  if (!API_URL) return true;
  try {
    const res = await fetch(`${API_URL}/ai/key/${provider}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ apiKey }),
    });
    return res.ok;
  } catch { return false; }
}

async function testProvider(provider: string): Promise<TestResult> {
  if (!API_URL) return { ok: true, message: '模拟测试成功', latencyMs: 100 };
  try {
    const res = await fetch(`${API_URL}/ai/test/${provider}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) return await res.json();
    return { ok: false, message: '请求失败', latencyMs: 0 };
  } catch {
    return { ok: false, message: '网络错误', latencyMs: 0 };
  }
}

// ─── Mock / Default Data ──────────────────────────────────────────────

function getMockProviders(): ProviderStatus[] {
  return [
    { key: 'deepseek', name: 'DeepSeek', configured: false, defaultModel: 'deepseek-chat' },
    { key: 'qwen', name: '通义千问', configured: false, defaultModel: 'qwen-max' },
    { key: 'zhipu', name: '智谱 GLM', configured: false, defaultModel: 'glm-4-plus' },
    { key: 'openai', name: 'GPT-4o', configured: true, defaultModel: 'gpt-4o' },
    { key: 'gemini', name: 'Gemini', configured: true, defaultModel: 'gemini-2.0-flash' },
    { key: 'claude', name: 'Claude', configured: false, defaultModel: 'claude-3-5-sonnet-20240620' },
  ];
}

function getDefaultSettings(): AISettings {
  return {
    generatorProvider: 'openai',
    generatorModel: 'gpt-4o',
    validatorProvider: 'openai',
    validatorModel: 'gpt-4o-mini',
    animationProvider: 'gemini',
    animationModel: 'gemini-2.0-flash',
  };
}

// ─── Recommended Combos ───────────────────────────────────────────────

const PRESETS = [
  {
    name: '极速高性价比',
    desc: '全中国内网可用，无需代理',
    generator: 'qwen',
    validator: 'deepseek',
    animation: 'qwen',
    icon: '🚀',
  },
  {
    name: '顶配逻辑与动画',
    desc: '最强推理 + 最优动画',
    generator: 'openai',
    validator: 'claude',
    animation: 'gemini',
    icon: '👑',
  },
];

// ─── Page Component ───────────────────────────────────────────────────

function AISettingsPageContent() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [settings, setSettings] = useState<AISettings>(getDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // API Key form state
  const [keyProvider, setKeyProvider] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keySubmitting, setKeySubmitting] = useState(false);
  const [keyResult, setKeyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Connection test state
  const [testingProvider, setTestingProvider] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, s] = await Promise.all([fetchProviders(), fetchSettings()]);
    setProviders(p);
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSettings(settings);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyProvider || !keyValue.trim()) return;
    setKeySubmitting(true);
    const ok = await writeApiKey(keyProvider, keyValue.trim());
    setKeySubmitting(false);
    if (ok) {
      setKeyValue('');
      setKeyResult({ ok: true, msg: `${keyProvider} API Key 已配置` });
      await loadData(); // Refresh provider status
    } else {
      setKeyResult({ ok: false, msg: '保存失败' });
    }
    setTimeout(() => setKeyResult(null), 3000);
  };

  const handleTest = async (provider: string) => {
    setTestingProvider(provider);
    setTestResult(null);
    const result = await testProvider(provider);
    setTestResult(result);
    setTestingProvider('');
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings({
      ...settings,
      generatorProvider: preset.generator,
      validatorProvider: preset.validator,
      animationProvider: preset.animation,
      generatorModel: providers.find(p => p.key === preset.generator)?.defaultModel ?? '',
      validatorModel: providers.find(p => p.key === preset.validator)?.defaultModel ?? '',
      animationModel: providers.find(p => p.key === preset.animation)?.defaultModel ?? '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI 模型设置</h1>
              <p className="text-sm text-gray-500">配置课程生成、校验和动画使用的 AI 模型</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Recommended Combos */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            推荐组合
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{preset.icon}</span>
                  <span className="font-bold text-gray-900">{preset.name}</span>
                </div>
                <p className="text-sm text-gray-500">{preset.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Model Pickers */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500" />
            模型选择
          </h2>

          <ModelPicker
            label="生成器 (Generator)"
            providers={providers}
            selectedKey={settings.generatorProvider}
            onSelect={(key) =>
              setSettings({
                ...settings,
                generatorProvider: key,
                generatorModel: providers.find(p => p.key === key)?.defaultModel ?? '',
              })
            }
          />

          <ModelPicker
            label="校验器 (Validator)"
            providers={providers}
            selectedKey={settings.validatorProvider}
            onSelect={(key) =>
              setSettings({
                ...settings,
                validatorProvider: key,
                validatorModel: providers.find(p => p.key === key)?.defaultModel ?? '',
              })
            }
          />

          <ModelPicker
            label="动画生成 (Animation)"
            providers={providers}
            selectedKey={settings.animationProvider}
            onSelect={(key) =>
              setSettings({
                ...settings,
                animationProvider: key,
                animationModel: providers.find(p => p.key === key)?.defaultModel ?? '',
              })
            }
          />
        </section>

        {/* API Key Management */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            API Key 配置
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Provider Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择模型
                  </label>
                  <select
                    value={keyProvider}
                    onChange={(e) => setKeyProvider(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">选择 Provider…</option>
                    {providers.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} {p.configured ? '（已配置）' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={
                      keyProvider && providers.find(p => p.key === keyProvider)?.configured
                        ? '●●●●●●●●（已配置）'
                        : '输入 API Key…'
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={!keyProvider || !keyValue.trim() || keySubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {keySubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存
                  </button>
                  <button
                    type="button"
                    disabled={!keyProvider || testingProvider === keyProvider}
                    onClick={() => keyProvider && handleTest(keyProvider)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {testingProvider === keyProvider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    测试连接
                  </button>
                </div>
              </div>

              {/* Key Result */}
              {keyResult && (
                <div className={`flex items-center gap-2 text-sm ${keyResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {keyResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {keyResult.msg}
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.message}
                  {testResult.ok && (
                    <span className="text-gray-400">({testResult.latencyMs}ms)</span>
                  )}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Provider Status Overview */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Provider 状态
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">默认模型</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providers.map((p) => (
                  <tr key={p.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.defaultModel}</td>
                    <td className="px-4 py-3 text-center">
                      {p.configured ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已配置
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> 未配置
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTest(p.key)}
                        disabled={!p.configured || testingProvider === p.key}
                        className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        {testingProvider === p.key ? '测试中…' : '测试连接'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Page Export ───────────────────────────────────────────────────────

export default function AISettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AISettingsPageContent />
    </ProtectedRoute>
  );
}
