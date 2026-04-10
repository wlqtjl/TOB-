/**
 * OPDL Packs page — vendor pack management.
 */

import { getMockPacks } from "../mock";

export function renderPacksPage(container: HTMLElement): void {
  const packs = getMockPacks();

  container.innerHTML = `
    <div class="page-header">
      <h2>OPDL Vendor Packs</h2>
      <span class="page-subtitle">Manage simulation definition packages</span>
    </div>

    <!-- Pack Summary -->
    <section class="summary-bar">
      <div class="summary-card">
        <span class="summary-label">Total Packs</span>
        <span class="summary-value">${packs.length}</span>
      </div>
      <div class="summary-card alert-card-normal">
        <span class="summary-label">Loaded</span>
        <span class="summary-value">${packs.filter((p) => p.status === "loaded").length}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Available</span>
        <span class="summary-value">${packs.filter((p) => p.status === "available").length}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Total Entities</span>
        <span class="summary-value">${packs.reduce((sum, p) => sum + p.entityCount, 0)}</span>
      </div>
    </section>

    <!-- Pack List -->
    <section class="detail-section">
      <h2>Installed Packs</h2>
      <div class="pack-list">
        ${packs.map((p) => renderPackCard(p)).join("")}
      </div>
    </section>

    <!-- OPDL Specification -->
    <section class="detail-section">
      <h2>OPDL v1.0 Specification</h2>
      <div class="props-grid">
        <div class="prop-row">
          <span class="prop-label">Format</span>
          <span class="prop-value mono">*.opdl.json</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Compiler Pipeline</span>
          <span class="prop-value">Lex → Parse → Validate (3-stage)</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">Entity Types</span>
          <span class="prop-value">Compute, Storage, Network, Custom</span>
        </div>
        <div class="prop-row">
          <span class="prop-label">State Hash</span>
          <span class="prop-value">Blake3 deterministic hash per tick</span>
        </div>
      </div>
    </section>

    <!-- Create Pack Guide -->
    <section class="detail-section">
      <h2>Create New Pack</h2>
      <div class="code-block">
        <code># 1. Create vendor directory
mkdir -p vendor/my-vendor/

# 2. Write OPDL definition
cat > vendor/my-vendor/my-pack.opdl.json &lt;&lt; 'EOF'
{
  "name": "My Custom Pack",
  "version": "1.0.0",
  "entities": [
    {
      "type": "compute",
      "count": 4,
      "cpu_model": "sine_wave",
      "memory_model": "random_walk"
    }
  ]
}
EOF

# 3. Validate
omni-sim-headless --opdl vendor/my-vendor/my-pack.opdl.json --ticks 10

# 4. Register in Unity
cp vendor/my-vendor/my-pack.opdl.json unity/StreamingAssets/Packs/</code>
      </div>
    </section>
  `;
}

interface PackCardInfo {
  name: string;
  vendor: string;
  version: string;
  entityCount: number;
  description: string;
  status: string;
  path: string;
}

function renderPackCard(pack: PackCardInfo): string {
  const statusClass =
    pack.status === "loaded"
      ? "pack-loaded"
      : pack.status === "error"
        ? "pack-error"
        : "pack-available";
  const statusLabel =
    pack.status === "loaded"
      ? "✅ Loaded"
      : pack.status === "error"
        ? "❌ Error"
        : "📦 Available";

  return `
    <div class="pack-card ${statusClass}">
      <div class="pack-card-header">
        <span class="pack-name">${pack.name}</span>
        <span class="pack-version mono">v${pack.version}</span>
        <span class="pack-status-badge">${statusLabel}</span>
      </div>
      <div class="pack-card-body">
        <p class="pack-description">${pack.description}</p>
        <div class="pack-meta">
          <span>Vendor: <strong>${pack.vendor}</strong></span>
          <span>Entities: <strong>${pack.entityCount}</strong></span>
          <span class="mono">Path: ${pack.path}</span>
        </div>
      </div>
      <div class="pack-card-actions">
        ${pack.status === "loaded" ? '<button class="btn btn-sm">Unload</button>' : '<button class="btn btn-sm btn-primary">Load</button>'}
        <button class="btn btn-sm">Validate</button>
        <button class="btn btn-sm">Details</button>
      </div>
    </div>
  `;
}
