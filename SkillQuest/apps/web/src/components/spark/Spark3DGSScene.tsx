'use client';

/**
 * Spark3DGSScene — 3D Gaussian Splatting scene renderer
 *
 * Renders .rad files via @sparkjsdev/spark (dynamic import for SSR safety).
 * Falls back to procedural Three.js boxes if RAD unavailable.
 * Adds clickable hotspots + OrbitControls + particle flow animation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SparkScene, SparkHotspot } from '@skillquest/types';

interface Spark3DGSSceneProps {
  scene: SparkScene;
  hotspots: SparkHotspot[];
  onHotspotClick: (hotspot: SparkHotspot) => void;
  particleFlow?: boolean;
  className?: string;
}

export default function Spark3DGSScene({
  scene,
  hotspots,
  onHotspotClick,
  particleFlow = false,
  className = '',
}: Spark3DGSSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [loadingRAD, setLoadingRAD] = useState(false);
  const [radReady, setRadReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    let cleanupFn: (() => void) | null = null;

    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight || 480;

        // Scene, camera, renderer
        const threeScene = new THREE.Scene();
        threeScene.background = new THREE.Color(scene.phase === 'legacy' ? 0x1a1a1a : scene.phase === 'migration' ? 0x0d1b2a : 0x0a192f);

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(5, 3, 8);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI * 0.6;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        threeScene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(3, 5, 2);
        threeScene.add(directionalLight);

        // Try to load RAD via Spark
        let splatMesh: any = null;
        if (scene.radUrl && !scene.procedural) {
          try {
            setLoadingRAD(true);
            const { SplatMesh } = await import('@sparkjsdev/spark');
            splatMesh = new SplatMesh({ url: scene.radUrl });
            threeScene.add(splatMesh);
            setRadReady(true);
            setLoadingRAD(false);
          } catch (err) {
            console.warn('[Spark3DGSScene] Failed to load RAD, falling back to procedural', err);
            setError('RAD 加载失败，使用程序化场景');
            setLoadingRAD(false);
          }
        }

        // Procedural fallback (or if scene.procedural)
        if (!splatMesh) {
          buildProceduralScene(THREE, threeScene, scene.phase);
        }

        // Add clickable hotspots
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const hotspotMeshes: Array<{ mesh: any; hotspot: SparkHotspot }> = [];

        hotspots.forEach((h) => {
          const color = getHotspotColor(h.kind);
          const geometry = new THREE.SphereGeometry(0.15, 16, 16);
          const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(h.position.x, h.position.y, h.position.z);
          threeScene.add(mesh);
          hotspotMeshes.push({ mesh, hotspot: h });

          // Add pulse animation via simple scale oscillation
          const initialScale = 1;
          let time = 0;
          const animateHotspot = () => {
            time += 0.05;
            mesh.scale.setScalar(initialScale + Math.sin(time) * 0.1);
          };
          (mesh as any).__animateHotspot = animateHotspot;
        });

        // Particle flow (migration phase)
        let particleSystem: any | null = null;
        let particleTime = 0;
        if (particleFlow) {
          particleSystem = createParticleFlow(THREE, threeScene);
        }

        // Pointer click handler
        const onPointerDown = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(hotspotMeshes.map((h) => h.mesh));
          if (intersects.length > 0) {
            const hit = hotspotMeshes.find((h) => h.mesh === intersects[0].object);
            if (hit) onHotspotClick(hit.hotspot);
          }
        };
        renderer.domElement.addEventListener('pointerdown', onPointerDown);

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
          if (!container) return;
          const w = container.clientWidth;
          const h = container.clientHeight || 480;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        // Animation loop
        let animationId: number;
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          hotspotMeshes.forEach(({ mesh }) => {
            if ((mesh as any).__animateHotspot) (mesh as any).__animateHotspot();
          });
          if (particleSystem) {
            particleTime += 0.01;
            const positions = (particleSystem.geometry.attributes.position as any).array;
            for (let i = 0; i < positions.length; i += 3) {
              positions[i + 1] += Math.sin(particleTime + i * 0.1) * 0.01;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
          }
          renderer.render(threeScene, camera);
        };
        animate();

        cleanupFn = () => {
          cancelAnimationFrame(animationId);
          resizeObserver.disconnect();
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          controls.dispose();
          renderer.dispose();
          threeScene.clear();
          container.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.error('[Spark3DGSScene] Initialization error:', err);
        setError('场景初始化失败');
      }
    })();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [scene, hotspots, onHotspotClick, particleFlow]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} style={{ minHeight: 480 }}>
      {loadingRAD && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-sm">正在流式加载 .RAD…</div>
        </div>
      )}
      {radReady && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded z-10">
          点云已就绪
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded z-10">
          {error}
        </div>
      )}
    </div>
  );
}

// ── Helper: hotspot color ────────────────────────────────────────────

function getHotspotColor(kind: string): number {
  switch (kind) {
    case 'quiz':
      return 0x3b82f6; // blue
    case 'dragdrop':
      return 0x8b5cf6; // purple
    case 'info':
      return 0x10b981; // green
    case 'comparison':
      return 0xf59e0b; // amber
    case 'pain-point':
      return 0xef4444; // red
    default:
      return 0x6b7280; // gray
  }
}

// ── Helper: procedural scene builder ────────────────────────────────

function buildProceduralScene(THREE: any, scene: any, phase: string) {
  const boxGeo = new THREE.BoxGeometry(1, 2, 0.8);
  const material = new THREE.MeshStandardMaterial({ color: 0x555555 });

  if (phase === 'legacy') {
    // Cluttered: many boxes in chaotic grid
    for (let i = 0; i < 12; i++) {
      const box = new THREE.Mesh(boxGeo, material.clone());
      box.position.set((i % 4) * 2 - 3, 1, Math.floor(i / 4) * 2 - 2);
      box.material.color.setHex(0x3a3a3a);
      scene.add(box);
    }
  } else if (phase === 'smartx') {
    // Minimal: single sleek box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.5, 1),
      new THREE.MeshStandardMaterial({ color: 0x1e40af, metalness: 0.6, roughness: 0.3 })
    );
    box.position.set(0, 1.25, 0);
    scene.add(box);
  } else {
    // Migration: intermediate setup
    for (let i = 0; i < 6; i++) {
      const box = new THREE.Mesh(boxGeo, material.clone());
      box.position.set((i % 3) * 2 - 2, 1, Math.floor(i / 3) * 2 - 1);
      box.material.color.setHex(0x4a5568);
      scene.add(box);
    }
  }

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
}

// ── Helper: particle flow ────────────────────────────────────────────

function createParticleFlow(THREE: any, scene: any): any {
  const particleCount = 800;
  const positions = new Float32Array(particleCount * 3);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4, 2, 0),
    new THREE.Vector3(-2, 3, 1),
    new THREE.Vector3(0, 2.5, 0),
    new THREE.Vector3(2, 3, -1),
    new THREE.Vector3(4, 2, 0),
  ]);

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    const point = curve.getPointAt(t);
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    transparent: true,
    opacity: 0.7,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  return particles;
}
