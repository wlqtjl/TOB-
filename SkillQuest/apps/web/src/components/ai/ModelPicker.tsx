/**
 * ModelPicker — AI 模型选择器组件
 *
 * 设计规范:
 * - 3列响应式网格布局
 * - 当前选中高亮 (indigo ring)
 * - 未配置 API Key 的模型显示灰度 + "未配置" 标签
 * - DeepSeek 标注 "低成本"，Gemini 标注 "动画推荐"
 */

'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────

export interface ProviderStatus {
  key: string;
  name: string;
  configured: boolean;
  defaultModel: string;
}

interface ModelPickerProps {
  providers: ProviderStatus[];
  selectedKey: string;
  onSelect: (key: string) => void;
  label?: string;
}

// ─── Badges / Tags ────────────────────────────────────────────────────

const PROVIDER_TAGS: Record<string, { text: string; color: string }> = {
  deepseek: { text: '低成本', color: 'bg-green-100 text-green-700' },
  gemini: { text: '动画推荐', color: 'bg-purple-100 text-purple-700' },
  openai: { text: '旗舰', color: 'bg-blue-100 text-blue-700' },
  claude: { text: '长文本', color: 'bg-orange-100 text-orange-700' },
  ollama: { text: '本地部署', color: 'bg-gray-100 text-gray-700' },
};

const PROVIDER_ICONS: Record<string, string> = {
  deepseek: '🐋',
  qwen: '☁️',
  zhipu: '🧠',
  openai: '🤖',
  gemini: '💎',
  claude: '🎭',
  minimax: '⚡',
  doubao: '🫘',
  ollama: '🦙',
};

// ─── Component ────────────────────────────────────────────────────────

export default function ModelPicker({
  providers,
  selectedKey,
  onSelect,
  label,
}: ModelPickerProps) {
  return (
    <div>
      {label && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{label}</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map((p) => {
          const isSelected = selectedKey === p.key;
          const tag = PROVIDER_TAGS[p.key];
          const icon = PROVIDER_ICONS[p.key] ?? '🔌';

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => p.configured && onSelect(p.key)}
              className={`
                relative rounded-xl border-2 p-4 text-left transition-all duration-200
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-md'
                  : p.configured
                    ? 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-semibold text-sm text-gray-900">
                    {p.name}
                  </span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                )}
              </div>

              {/* Model Name */}
              <p className="text-xs text-gray-500 mb-2 font-mono">
                {p.defaultModel}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {tag && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tag.color}`}>
                    {tag.text}
                  </span>
                )}
                {!p.configured && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    未配置
                  </span>
                )}
                {p.configured && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                    已配置
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
