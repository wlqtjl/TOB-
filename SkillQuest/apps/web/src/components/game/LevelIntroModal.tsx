'use client';

/**
 * LevelIntroModal — 关卡叙事入口
 *
 * 进入关卡时展示角色扮演场景：
 * - 时间、地点、角色
 * - 任务简报
 * - 开场引子
 *
 * 让游戏"感觉像游戏"而不是"考试"
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, FileText, Zap } from 'lucide-react';
import type { LevelNarrative } from '@skillquest/types';

interface LevelIntroModalProps {
  narrative: LevelNarrative;
  levelNumber?: number;
  onStart: () => void;
  onViewBackground?: () => void;
}

export default function LevelIntroModal({
  narrative,
  levelNumber,
  onStart,
  onViewBackground,
}: LevelIntroModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-indigo-200 bg-white shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 size={20} />
            <span className="text-sm font-medium opacity-90">
              {levelNumber ? `第${levelNumber}关` : '闯关任务'}
            </span>
          </div>
          <h2 className="text-xl font-bold">{narrative.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Hook */}
          <motion.p
            className="text-sm text-gray-600 leading-relaxed italic border-l-4 border-indigo-200 pl-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {narrative.hook}
          </motion.p>

          {/* Role & Mission */}
          <motion.div
            className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-base">👤</span>
              <div>
                <p className="text-xs text-gray-400">你的角色</p>
                <p className="text-sm text-gray-700 font-medium">{narrative.protagonist}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-base">🎯</span>
              <div>
                <p className="text-xs text-gray-400">任务目标</p>
                <p className="text-sm text-gray-700">{narrative.missionBrief}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {onViewBackground && (
            <button
              onClick={onViewBackground}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
            >
              <FileText size={14} /> 查看任务背景
            </button>
          )}
          <div className="ml-auto">
            <motion.button
              onClick={onStart}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap size={14} /> 直接开始
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
