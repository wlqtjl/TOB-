'use client';

/**
 * NarrativeModal — 任务剧情弹窗
 *
 * 在关卡加载前弹出模拟通讯工具界面（钉钉/企微/Slack/终端/邮件）。
 * AI 扮演运维主管，通过文字、紧急红字告警发布任务。
 *
 * 交互流程:
 * 1. 关卡加载 → 检查 preStory 配置
 * 2. 有配置 → 弹出本组件
 * 3. 消息逐条弹出 (typewriter + 延迟)
 * 4. 红色告警文字闪烁动画
 * 5. "收到，马上处理" 按钮关闭 → 进入关卡
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── 类型定义 (与 @skillquest/types NarrativeConfig 对齐) ─────────

export type NarrativeChannel = 'dingtalk' | 'wechat_work' | 'slack' | 'terminal' | 'email';

export interface NarrativeMessage {
  role: string;
  avatar?: string;
  text: string;
  style?: 'normal' | 'danger' | 'success' | 'info';
  imageUrl?: string;
}

export interface NarrativeConfig {
  channel: NarrativeChannel;
  title?: string;
  messages: NarrativeMessage[];
  autoPlayDelayMs: number;
}

interface NarrativeModalProps {
  config: NarrativeConfig;
  onComplete: () => void;
}

// ─── 频道样式配置 ─────────────────────────────────────────────────

const CHANNEL_STYLES: Record<NarrativeChannel, { bg: string; border: string; headerBg: string; icon: string; name: string }> = {
  dingtalk: {
    bg: 'bg-[#0d1117]',
    border: 'border-blue-500/30',
    headerBg: 'bg-blue-900/40',
    icon: '钉钉',
    name: '钉钉群消息',
  },
  wechat_work: {
    bg: 'bg-[#0d1117]',
    border: 'border-emerald-200',
    headerBg: 'bg-green-900/40',
    icon: '企微',
    name: '企业微信',
  },
  slack: {
    bg: 'bg-[#0d1117]',
    border: 'border-purple-500/30',
    headerBg: 'bg-purple-900/40',
    icon: '#',
    name: 'Slack Channel',
  },
  terminal: {
    bg: 'bg-black',
    border: 'border-green-400/30',
    headerBg: 'bg-gray-900',
    icon: '>_',
    name: 'Terminal',
  },
  email: {
    bg: 'bg-[#0d1117]',
    border: 'border-yellow-500/30',
    headerBg: 'bg-yellow-900/40',
    icon: '@',
    name: '紧急邮件',
  },
};

const MESSAGE_STYLES: Record<string, string> = {
  normal: 'text-gray-200',
  danger: 'text-red-600 font-bold animate-pulse',
  success: 'text-emerald-600',
  info: 'text-blue-600',
};

// ─── 组件 ─────────────────────────────────────────────────────────

export default function NarrativeModal({ config, onComplete }: NarrativeModalProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelStyle = CHANNEL_STYLES[config.channel] || CHANNEL_STYLES.dingtalk;

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, typingText]);

  // 逐条播放消息
  useEffect(() => {
    if (visibleMessages >= config.messages.length) {
      setAllComplete(true);
      return;
    }

    const currentMsg = config.messages[visibleMessages];
    if (!currentMsg) return;

    setIsTyping(true);
    setTypingText('');

    // Typewriter 效果
    let charIndex = 0;
    const text = currentMsg.text;
    const charDelay = config.channel === 'terminal' ? 30 : 50;

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setTypingText(text.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);

        // 延迟后显示下一条
        setTimeout(() => {
          setVisibleMessages(prev => prev + 1);
        }, config.autoPlayDelayMs);
      }
    }, charDelay);

    return () => clearInterval(typeInterval);
  }, [visibleMessages, config.messages, config.autoPlayDelayMs, config.channel]);

  const handleSkip = useCallback(() => {
    setVisibleMessages(config.messages.length);
    setAllComplete(true);
  }, [config.messages.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-lg mx-4 rounded-xl border ${channelStyle.border} ${channelStyle.bg} shadow-2xl overflow-hidden`}>
        {/* 频道头部 */}
        <div className={`${channelStyle.headerBg} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{channelStyle.icon}</span>
            <span className="text-sm font-medium text-white/90">
              {config.title || channelStyle.name}
            </span>
          </div>
          {!allComplete && (
            <button
              onClick={handleSkip}
              className="text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              跳过 →
            </button>
          )}
        </div>

        {/* 消息列表 */}
        <div className="px-4 py-3 max-h-[400px] overflow-y-auto space-y-3">
          {config.messages.slice(0, visibleMessages).map((msg, i) => (
            <div key={i} className="flex items-start gap-2">
              {msg.avatar && (
                <span className="text-xl flex-shrink-0 mt-0.5">{msg.avatar}</span>
              )}
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-0.5">{msg.role}</div>
                <div className={`text-sm leading-relaxed ${MESSAGE_STYLES[msg.style || 'normal']}`}>
                  {msg.text}
                </div>
                {msg.imageUrl && (
                  <div className="mt-2 rounded-lg bg-gray-800/50 p-2 text-xs text-gray-400">
                    [截图附件]
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 正在输入的消息 */}
          {isTyping && visibleMessages < config.messages.length && (
            <div className="flex items-start gap-2">
              {config.messages[visibleMessages]?.avatar && (
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {config.messages[visibleMessages]?.avatar}
                </span>
              )}
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-0.5">
                  {config.messages[visibleMessages]?.role}
                </div>
                <div className={`text-sm leading-relaxed ${MESSAGE_STYLES[config.messages[visibleMessages]?.style || 'normal']}`}>
                  {typingText}
                  <span className="animate-pulse">▌</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 底部操作栏 */}
        {allComplete && (
          <div className="px-4 py-3 border-t border-white/10">
            <button
              onClick={onComplete}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              收到，马上处理 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
