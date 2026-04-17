/**
 * Admin Content Generator Page — 标准数据流内容生成器
 *
 * 厂家管理员可以使用此页面创建、配置、预览和管理
 * 标准化数据流可视化内容，支持任意分布式系统模板。
 *
 * 从 ZBS 数据流可视化提炼而来，形成可复用的标准生成器。
 */

'use client';

import React, { useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Eye,
  Trash2,
  Copy,
  Edit3,
  Database,
  Network,
  Server,
  Shield,
  Cloud,
  Settings,
  CheckCircle2,
  HardDrive,
  Workflow,
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../lib/auth-context';
import type { DataFlowTemplate } from '@skillquest/types';
import StandardFlowGenerator from '../../../components/game/StandardFlowGenerator';

// ─── Category Config ─────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  storage: { label: '分布式存储', icon: HardDrive, color: 'text-indigo-600 bg-indigo-50' },
  network: { label: '网络', icon: Network, color: 'text-blue-600 bg-blue-50' },
  compute: { label: '计算', icon: Server, color: 'text-emerald-600 bg-emerald-50' },
  security: { label: '安全', icon: Shield, color: 'text-red-600 bg-red-50' },
  database: { label: '数据库', icon: Database, color: 'text-amber-600 bg-amber-50' },
  custom: { label: '自定义', icon: Settings, color: 'text-gray-600 bg-gray-50' },
};

// ─── Built-in Templates ──────────────────────────────────────────────

const DEFAULT_CHUNK_COLORS: Record<string, string> = {
  chunk1: '#6366F1',
  chunk2: '#22C55E',
  chunk3: '#F59E0B',
  chunk4: '#EC4899',
};

const BUILTIN_TEMPLATES: DataFlowTemplate[] = [
  {
    id: 'zbs',
    name: 'ZBS 分布式存储',
    description: '深信服 ZBS 分布式存储系统的数据流向，包含写入、分布、故障恢复、副本策略、读取五个场景。',
    category: 'storage',
    vendor: 'Sangfor',
    totalChunks: 4,
    replicaCount: 3,
    nodeCount: 3,
    chunkColors: DEFAULT_CHUNK_COLORS,
    scenes: [
      { id: 1, title: '文件写入', description: '你的文件是怎么进入 ZBS 的', interactable: false },
      { id: 2, title: '数据分布', description: '三台机器各存了什么', interactable: true },
      { id: 3, title: '节点故障', description: '坏了一台会怎样', interactable: false },
      { id: 4, title: '副本策略', description: '副本数量你来决定', interactable: true },
      { id: 5, title: '数据读取', description: 'ZBS 怎么快速找到你的文件', interactable: false },
    ],
    nodes: [
      { id: 'a', label: '节点 A', role: 'storage', chunks: ['C1', 'C2', 'C3'] },
      { id: 'b', label: '节点 B', role: 'storage', chunks: ['C2', 'C3', 'C4'] },
      { id: 'c', label: '节点 C', role: 'storage', chunks: ['C1', 'C4', 'C2'] },
    ],
    texts: {
      writeTitle: '文件写入',
      writeDescription: '假设你在电脑上保存了一个 PPT 文件，看看 ZBS 是怎么处理它的：',
      distributionTitle: '数据分布',
      distributionDescription: '你的文件被分成 4 块后，每块会存 2 份副本，分别放在不同的机器上。',
      failureTitle: '节点故障',
      failureDescription: '如果其中一台机器突然坏了，你的数据会丢吗？让我们来模拟一下。',
      replicaTitle: '副本策略',
      replicaDescription: '副本数量不是固定的，你可以根据业务需求自行选择。拖动滑块看看效果：',
      readTitle: '数据读取',
      readDescription: '当你的应用需要读取文件时，ZBS 会自动选择延迟最低的节点来提供数据。',
    },
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'ceph-crush',
    name: 'Ceph CRUSH',
    description: 'Ceph 分布式存储 CRUSH 算法的数据放置策略，包含写入、CRUSH映射、OSD故障、副本配置、读取场景。',
    category: 'storage',
    vendor: 'Red Hat',
    totalChunks: 6,
    replicaCount: 3,
    nodeCount: 4,
    chunkColors: { chunk1: '#3B82F6', chunk2: '#10B981', chunk3: '#F97316', chunk4: '#8B5CF6', chunk5: '#EF4444', chunk6: '#14B8A6' },
    scenes: [
      { id: 1, title: '对象写入', description: '数据对象如何进入 Ceph 集群', interactable: false },
      { id: 2, title: 'CRUSH 映射', description: 'CRUSH 算法如何分配数据到 OSD', interactable: true },
      { id: 3, title: 'OSD 故障', description: '当 OSD 节点离线时的自动恢复', interactable: false },
      { id: 4, title: '副本配置', description: '配置 pool 的副本数量', interactable: true },
      { id: 5, title: '数据读取', description: 'Primary OSD 如何响应读取请求', interactable: false },
    ],
    nodes: [
      { id: 'osd0', label: 'OSD.0', role: 'storage', chunks: ['C1', 'C2', 'C5'] },
      { id: 'osd1', label: 'OSD.1', role: 'storage', chunks: ['C2', 'C3', 'C6'] },
      { id: 'osd2', label: 'OSD.2', role: 'storage', chunks: ['C3', 'C4', 'C1'] },
      { id: 'osd3', label: 'OSD.3', role: 'storage', chunks: ['C4', 'C5', 'C6'] },
    ],
    texts: {
      writeTitle: '对象写入',
      writeDescription: '客户端将数据写入 Ceph 集群，RADOS 自动将对象分片并分布到多个 OSD：',
      distributionTitle: 'CRUSH 映射',
      distributionDescription: 'CRUSH 算法根据权重和故障域将数据分配到不同 OSD 节点。',
      failureTitle: 'OSD 故障',
      failureDescription: '当某个 OSD 节点异常退出集群时，Ceph 会自动触发数据重平衡。',
      replicaTitle: '副本配置',
      replicaDescription: '通过调整 pool 的 size 参数，控制每个 PG 的副本数量：',
      readTitle: '数据读取',
      readDescription: '读取请求直接发送到 Primary OSD，确保一致性和低延迟。',
    },
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'iscsi-path',
    name: 'iSCSI 数据路径',
    description: 'iSCSI 存储协议的数据传输路径，包含 SCSI 命令封装、网络传输、多路径切换、故障转移、IO完成。',
    category: 'network',
    vendor: '',
    totalChunks: 3,
    replicaCount: 2,
    nodeCount: 3,
    chunkColors: { chunk1: '#0EA5E9', chunk2: '#F59E0B', chunk3: '#EF4444' },
    scenes: [
      { id: 1, title: 'SCSI 封装', description: 'SCSI 命令如何被封装到 TCP/IP 报文', interactable: false },
      { id: 2, title: '路径分布', description: '多条网络路径如何承载 IO 请求', interactable: true },
      { id: 3, title: '路径故障', description: '当一条路径断开时的自动切换', interactable: false },
      { id: 4, title: '多路径策略', description: '配置 Round-Robin 或 Active-Standby', interactable: true },
      { id: 5, title: 'IO 完成', description: '数据从存储阵列返回到主机', interactable: false },
    ],
    nodes: [
      { id: 'path1', label: '路径 1', role: 'router', chunks: ['C1', 'C2'] },
      { id: 'path2', label: '路径 2', role: 'router', chunks: ['C2', 'C3'] },
      { id: 'path3', label: '路径 3', role: 'router', chunks: ['C1', 'C3'] },
    ],
    texts: {
      writeTitle: 'SCSI 封装',
      writeDescription: '主机发起 SCSI 写命令，iSCSI Initiator 将其封装到 TCP/IP 报文中：',
      distributionTitle: '路径分布',
      distributionDescription: 'IO 请求通过多条网络路径分发到存储目标。',
      failureTitle: '路径故障',
      failureDescription: '当一条网络路径中断时，多路径软件会自动切换到备用路径。',
      replicaTitle: '多路径策略',
      replicaDescription: '你可以选择轮询(Round-Robin)或主备(Active-Standby)模式：',
      readTitle: 'IO 完成',
      readDescription: '存储阵列处理完 SCSI 命令后，数据通过最优路径返回主机。',
    },
    createdAt: '2026-03-05T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
];

// ─── Helper: create empty template ──────────────────────────────────

function createEmptyTemplate(): DataFlowTemplate {
  const now = new Date().toISOString();
  return {
    id: `custom-${Date.now()}`,
    name: '',
    description: '',
    category: 'custom',
    vendor: '',
    totalChunks: 4,
    replicaCount: 3,
    nodeCount: 3,
    chunkColors: { ...DEFAULT_CHUNK_COLORS },
    scenes: [
      { id: 1, title: '数据写入', description: '数据如何进入系统', interactable: false },
      { id: 2, title: '数据分布', description: '数据如何分布到各节点', interactable: true },
      { id: 3, title: '节点故障', description: '节点故障时的自动恢复', interactable: false },
      { id: 4, title: '副本策略', description: '调整副本数量', interactable: true },
      { id: 5, title: '数据读取', description: '如何快速读取数据', interactable: false },
    ],
    nodes: [],
    texts: {
      writeTitle: '数据写入',
      writeDescription: '客户端将数据发送到集群，系统自动进行分块处理：',
      distributionTitle: '数据分布',
      distributionDescription: '数据块被分散存储到不同节点，每块保留多份副本。',
      failureTitle: '节点故障',
      failureDescription: '当节点发生故障时，系统如何保证数据不丢失？让我们模拟一下。',
      replicaTitle: '副本策略',
      replicaDescription: '你可以根据业务需求调整副本数量，找到安全性和存储成本的平衡点：',
      readTitle: '数据读取',
      readDescription: '系统自动选择延迟最低的节点来提供数据，保证最佳性能。',
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Template Card ───────────────────────────────────────────────────

function TemplateCard({ template, onPreview, onDuplicate, onDelete, isBuiltin }: {
  template: DataFlowTemplate;
  onPreview: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isBuiltin: boolean;
}) {
  const cat = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.custom;
  const CatIcon = cat.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${cat.color}`}>
            <CatIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{template.name || '未命名模板'}</h3>
            {template.vendor && (
              <span className="text-xs text-gray-400">{template.vendor}</span>
            )}
          </div>
        </div>
        {isBuiltin && (
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] text-indigo-600 font-medium">
            内置
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500 line-clamp-2">{template.description}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>{template.totalChunks} 数据块</span>
        <span>{template.replicaCount} 副本</span>
        <span>{template.nodeCount} 节点</span>
        <span>{template.scenes.length} 场景</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition"
        >
          <Eye size={14} /> 预览
        </button>
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
        >
          <Copy size={14} /> 复制
        </button>
        {!isBuiltin && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 size={14} /> 删除
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Template Editor ─────────────────────────────────────────────────

function TemplateEditor({ template, onChange, onSave, onCancel }: {
  template: DataFlowTemplate;
  onChange: (t: DataFlowTemplate) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateField = <K extends keyof DataFlowTemplate>(key: K, value: DataFlowTemplate[K]) => {
    onChange({ ...template, [key]: value, updatedAt: new Date().toISOString() });
  };

  const updateText = (key: keyof DataFlowTemplate['texts'], value: string) => {
    onChange({ ...template, texts: { ...template.texts, [key]: value }, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">模板名称 *</label>
          <input
            type="text"
            value={template.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="例如：ZBS 分布式存储"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">厂商</label>
          <input
            type="text"
            value={template.vendor || ''}
            onChange={(e) => updateField('vendor', e.target.value)}
            placeholder="例如：Sangfor"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">描述</label>
        <textarea
          value={template.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="描述这个数据流模板的用途..."
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">系统类型</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => updateField('category', key as DataFlowTemplate['category'])}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                  template.category === key
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} /> {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">数据块数量</label>
          <input
            type="number"
            min={2}
            max={12}
            value={template.totalChunks}
            onChange={(e) => updateField('totalChunks', Math.max(2, Math.min(12, Number(e.target.value))))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">默认副本数</label>
          <input
            type="number"
            min={1}
            max={5}
            value={template.replicaCount}
            onChange={(e) => updateField('replicaCount', Math.max(1, Math.min(5, Number(e.target.value))))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">节点数量</label>
          <input
            type="number"
            min={2}
            max={8}
            value={template.nodeCount}
            onChange={(e) => updateField('nodeCount', Math.max(2, Math.min(8, Number(e.target.value))))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
      </div>

      {/* Scene Texts */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-3">场景文案配置</h4>
        <div className="space-y-3">
          {([
            ['writeDescription', '写入场景描述'],
            ['distributionDescription', '分布场景描述'],
            ['failureDescription', '故障场景描述'],
            ['replicaDescription', '副本场景描述'],
            ['readDescription', '读取场景描述'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type="text"
                value={template.texts[key]}
                onChange={(e) => updateText(key, e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          取消
        </button>
        <button
          onClick={onSave}
          disabled={!template.name.trim()}
          className="flex items-center gap-1 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={16} /> 保存模板
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────

function ContentGeneratorContent() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DataFlowTemplate[]>(BUILTIN_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<DataFlowTemplate[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'preview'>('list');
  const [editingTemplate, setEditingTemplate] = useState<DataFlowTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DataFlowTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');

  const allTemplates = activeTab === 'builtin' ? templates : customTemplates;

  const handleCreate = useCallback(() => {
    const newTemplate = createEmptyTemplate();
    setEditingTemplate(newTemplate);
    setView('edit');
  }, []);

  const handlePreview = useCallback((template: DataFlowTemplate) => {
    setPreviewTemplate(template);
    setView('preview');
  }, []);

  const handleDuplicate = useCallback((template: DataFlowTemplate) => {
    const now = new Date().toISOString();
    const dup: DataFlowTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (副本)`,
      createdAt: now,
      updatedAt: now,
    };
    setEditingTemplate(dup);
    setView('edit');
  }, []);

  const handleDelete = useCallback((templateId: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const handleSave = useCallback(() => {
    if (!editingTemplate) return;
    const existing = customTemplates.find(t => t.id === editingTemplate.id);
    if (existing) {
      setCustomTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
    } else {
      setCustomTemplates(prev => [...prev, editingTemplate]);
    }
    setEditingTemplate(null);
    setView('list');
    setActiveTab('custom');
  }, [editingTemplate, customTemplates]);

  const handleBack = useCallback(() => {
    setView('list');
    setEditingTemplate(null);
    setPreviewTemplate(null);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            {view !== 'list' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
              >
                <ArrowLeft size={16} /> 返回列表
              </button>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Workflow className="text-indigo-500" size={24} />
                  内容生成器
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  创建和管理标准化数据流可视化模板，适用于任意分布式系统
                </p>
              </div>
              {view === 'list' && (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition shadow-sm"
                >
                  <Plus size={16} /> 新建模板
                </button>
              )}
            </div>
          </div>

          {/* List View */}
          {view === 'list' && (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('builtin')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activeTab === 'builtin'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  内置模板 ({templates.length})
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    activeTab === 'custom'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  自定义模板 ({customTemplates.length})
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{templates.length + customTemplates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">总模板数</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{templates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">内置模板</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{customTemplates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">自定义模板</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{Object.keys(CATEGORY_CONFIG).length}</p>
                  <p className="text-xs text-gray-500 mt-1">系统类型</p>
                </div>
              </div>

              {/* Template Grid */}
              {allTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onPreview={() => handlePreview(t)}
                      onDuplicate={() => handleDuplicate(t)}
                      onDelete={() => handleDelete(t.id)}
                      isBuiltin={activeTab === 'builtin'}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                  <Workflow className="mx-auto text-gray-300" size={48} />
                  <p className="mt-3 text-sm text-gray-400">
                    {activeTab === 'custom' ? '还没有自定义模板，点击「新建模板」开始创建' : '没有内置模板'}
                  </p>
                  {activeTab === 'custom' && (
                    <button
                      onClick={handleCreate}
                      className="mt-4 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition"
                    >
                      <Plus size={14} className="inline mr-1" /> 新建模板
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Edit View */}
          {view === 'edit' && editingTemplate && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-500" />
                {editingTemplate.name ? `编辑：${editingTemplate.name}` : '新建数据流模板'}
              </h2>
              <TemplateEditor
                template={editingTemplate}
                onChange={setEditingTemplate}
                onSave={handleSave}
                onCancel={handleBack}
              />
            </div>
          )}

          {/* Preview View */}
          {view === 'preview' && previewTemplate && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="text-indigo-500" size={20} />
                    <div>
                      <h2 className="text-base font-semibold text-gray-800">
                        预览：{previewTemplate.name}
                      </h2>
                      <p className="text-xs text-gray-400">{previewTemplate.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{previewTemplate.totalChunks} 数据块</span>
                    <span>·</span>
                    <span>{previewTemplate.replicaCount} 副本</span>
                    <span>·</span>
                    <span>{previewTemplate.nodeCount} 节点</span>
                  </div>
                </div>
              </div>
              <StandardFlowGenerator template={previewTemplate} previewMode />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContentGeneratorPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      }>
        <ContentGeneratorContent />
      </Suspense>
    </ProtectedRoute>
  );
}
