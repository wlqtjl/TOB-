'use client';

/**
 * Spark Admin — 3DGS reconstruction & hotspot editor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, Edit, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Job {
  id: string;
  sceneName: string;
  status: string;
  progress: number;
  radUrl?: string;
  createdAt: string;
  lod?: { level: number; pointCount: number; memoryMB: number };
}

interface Scene {
  id: string;
  name: string;
  description: string;
  phase: string;
}

interface Hotspot {
  id: string;
  sceneId: string;
  position: { x: number; y: number; z: number };
  kind: string;
  label: string;
  description?: string;
}

export default function SparkAdminPage() {
  const [sceneName, setSceneName] = useState('TestScene');
  const [photoCount, setPhotoCount] = useState(50);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [hotspots, setHotspots] = useState<Record<string, Hotspot[]>>({});
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiCall = useCallback(async (path: string, options?: RequestInit) => {
    try {
      const res = await fetch(`/api/spark${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error: ${res.status} ${text}`);
      }
      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API 不可达';
      setApiError(message);
      console.error(err);
      return null;
    }
  }, []);

  const loadScenes = useCallback(async () => {
    const data = await apiCall('/scenes');
    if (data) {
      setScenes(data);
      setApiError(null);
    }
  }, [apiCall]);

  const loadHotspots = useCallback(async (sceneId: string) => {
    const data = await apiCall(`/scenes/${sceneId}/hotspots`);
    if (data) {
      setHotspots((prev) => ({ ...prev, [sceneId]: data }));
    }
  }, [apiCall]);

  const pollJob = useCallback(async (id: string) => {
    const data = await apiCall(`/lod_status/${id}`);
    if (data) {
      setJob(data);
    }
  }, [apiCall]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(() => {
      pollJob(jobId);
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, pollJob]);

  useEffect(() => {
    if (selectedScene) loadHotspots(selectedScene);
  }, [selectedScene, loadHotspots]);

  const startReconstruct = async () => {
    if (photoCount < 1 || photoCount > 500) {
      alert('photoCount must be 1-500');
      return;
    }
    const data = await apiCall('/reconstruct', {
      method: 'POST',
      body: JSON.stringify({ sceneName, photoCount }),
    });
    if (data) {
      setJobId(data.jobId);
      setApiError(null);
    }
  };

  const deleteHotspot = async (sceneId: string, hotspotId: string) => {
    await apiCall(`/scenes/${sceneId}/hotspots/${hotspotId}`, { method: 'DELETE' });
    loadHotspots(sceneId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Spark 3DGS 管理后台</h1>

        {apiError && (
          <div className="bg-yellow-900 border border-yellow-600 text-yellow-200 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="text-sm">{apiError} — 显示种子数据</span>
          </div>
        )}

        {/* Reconstruction */}
        <section className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🎬 3DGS 重建</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">场景名称</label>
              <input
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">照片数量 (1-500)</label>
              <input
                type="number"
                value={photoCount}
                onChange={(e) => setPhotoCount(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
              />
            </div>
          </div>
          <button
            onClick={startReconstruct}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition flex items-center gap-2"
          >
            <Play size={16} />
            开始重建
          </button>

          {job && (
            <div className="mt-6 p-4 bg-slate-800 rounded border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Job: {job.id}</span>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="bg-slate-700 rounded-full overflow-hidden h-2 mb-2">
                <div
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-400">
                Progress: {job.progress}% · Points: {job.lod?.pointCount.toLocaleString() || 0} · Memory: {job.lod?.memoryMB || 0} MB
              </div>
              {job.radUrl && (
                <div className="mt-2 text-xs text-green-400">✅ RAD URL: {job.radUrl}</div>
              )}
            </div>
          )}
        </section>

        {/* Scenes */}
        <section className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🎭 场景列表</h2>
            <button
              onClick={loadScenes}
              className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <RefreshCw size={14} />
              刷新
            </button>
          </div>
          <div className="grid gap-3">
            {scenes.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded border transition cursor-pointer ${
                  selectedScene === s.id
                    ? 'bg-slate-800 border-blue-500'
                    : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => setSelectedScene(s.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{s.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-slate-700 rounded">
                      {s.phase}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScene(s.id);
                    }}
                    className="text-slate-400 hover:text-white transition"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hotspots Editor */}
        {selectedScene && (
          <section className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📍 Hotspot 编辑器 — {scenes.find((s) => s.id === selectedScene)?.name}</h2>
            <div className="space-y-3">
              {(hotspots[selectedScene] || []).map((h) => (
                <div
                  key={h.id}
                  className="p-4 bg-slate-800 border border-slate-600 rounded flex items-start justify-between"
                >
                  <div className="flex-1 grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Label:</span> {h.label}
                    </div>
                    <div>
                      <span className="text-slate-400">Kind:</span> {h.kind}
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Pos:</span> ({h.position.x.toFixed(1)}, {h.position.y.toFixed(1)}, {h.position.z.toFixed(1)})
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHotspot(selectedScene, h.id)}
                    className="text-red-400 hover:text-red-300 transition ml-3"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2">
              <Plus size={16} />
              添加 Hotspot (TODO)
            </button>
          </section>
        )}

        {/* Seed data fallback */}
        {apiError && (
          <section className="bg-slate-900 border border-yellow-600 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">🌱 种子数据 (API 不可达时显示)</h2>
            <div className="text-xs text-slate-400 space-y-2">
              <p>3 个内置场景: vmware-legacy-room, migration-in-progress, smartx-minimal-rack</p>
              <p>每个场景预置 3-4 个 hotspots (quiz/dragdrop/info/comparison/pain-point)</p>
              <p>后端路由: POST /api/spark/reconstruct, GET /api/spark/scenes, etc.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ready':
      return 'bg-green-600 text-white';
    case 'streaming':
    case 'reconstructing':
      return 'bg-blue-600 text-white';
    case 'analyzing':
      return 'bg-yellow-600 text-white';
    case 'queued':
      return 'bg-gray-600 text-white';
    case 'failed':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-700 text-white';
  }
}
