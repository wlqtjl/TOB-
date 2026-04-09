// unity/Assets/Scripts/Rendering/TelemetryRenderer.cs
// GPU Instancing renderer — D-07 fix (was empty file in original draft).
//
// Renders up to 100,000 entities as instanced meshes at 60fps using
// DrawMeshInstanced.  Each entity is coloured by CPU usage (§5.3 heatmap).
//
// Performance rules (§8.2):
//   - NO `new` inside Update() — all arrays pre-allocated in Start().
//   - Batch size capped at BATCH = 1023 (Unity GPU instancing hard limit).
//   - MaterialPropertyBlock reused across batches (no per-frame alloc).

using UnityEngine;

[RequireComponent(typeof(OmniSimRuntime))]
public class TelemetryRenderer : MonoBehaviour
{
    // ── Inspector ──────────────────────────────────────────────────────────
    [Header("Mesh & Material")]
    public Mesh     entityMesh;
    public Material instancedMaterial;   // must have "Enable GPU Instancing" checked

    [Header("Layout")]
    [Tooltip("Maximum entities to render. Preallocates this many matrix slots.")]
    public int maxEntities = 100_000;

    [Tooltip("Grid spacing between entity cubes in world units.")]
    public float gridSpacing = 1.5f;

    // ── Constants ──────────────────────────────────────────────────────────
    // Unity's DrawMeshInstanced hard limit per call.
    private const int BATCH = 1023;

    // §5.3 alert thresholds — kept in sync with buffer.rs AlertStatus::classify.
    private const float WARN_CPU  = 0.70f;
    private const float CRIT_CPU  = 0.90f;

    // ── Preallocated arrays (zero GC after Start) ──────────────────────────
    private Matrix4x4[]          _matrices;       // world transforms (full)
    private Vector4[]            _colors;         // RGBA per entity (full)
    private Matrix4x4[]          _batchMatrices;  // batch slice — reused
    private Vector4[]            _batchColors;    // batch slice — reused
    private MaterialPropertyBlock _mpb;

    private int  _entityCount;
    private bool _ready;

    // ── Unity lifecycle ────────────────────────────────────────────────────

    void Start()
    {
        if (entityMesh == null || instancedMaterial == null)
        {
            Debug.LogError("[OmniSim] TelemetryRenderer: Mesh or Material not assigned.");
            return;
        }

        // Allocate once — never reallocated after this point.
        _matrices      = new Matrix4x4[maxEntities];
        _colors        = new Vector4[maxEntities];
        _batchMatrices = new Matrix4x4[BATCH];
        _batchColors   = new Vector4[BATCH];
        _mpb           = new MaterialPropertyBlock();

        // Lay out entity positions on a 2D grid in the XZ plane.
        int cols = Mathf.CeilToInt(Mathf.Sqrt(maxEntities));
        for (int i = 0; i < maxEntities; i++)
        {
            float x = (i % cols) * gridSpacing;
            float z = (i / cols) * gridSpacing;
            _matrices[i] = Matrix4x4.TRS(
                new Vector3(x, 0f, z),
                Quaternion.identity,
                Vector3.one * 0.8f);
        }

        _ready = true;
        Debug.Log($"[OmniSim] TelemetryRenderer ready — capacity {maxEntities:N0} entities");
    }

    // ── Public API (called by OmniSimRuntime each frame) ───────────────────

    /// <summary>
    /// Update entity colours from CPU usage array.
    /// Called before Update() renders — no allocation.
    /// </summary>
    /// <param name="cpuUsages">CPU usage [0,1] per entity.</param>
    /// <param name="count">Number of active entities.</param>
    public void UpdateTelemetry(float[] cpuUsages, int count)
    {
        _entityCount = Mathf.Min(count, maxEntities);

        for (int i = 0; i < _entityCount; i++)
        {
            float t = cpuUsages[i];
            // §5.3 heatmap: green → yellow → red
            Color c = t < 0.5f
                ? Color.Lerp(Color.green,  Color.yellow, t * 2f)
                : Color.Lerp(Color.yellow, Color.red,   (t - 0.5f) * 2f);

            _colors[i] = new Vector4(c.r, c.g, c.b, c.a);
        }
    }

    // ── Render loop ────────────────────────────────────────────────────────

    void Update()
    {
        if (!_ready || _entityCount == 0) return;
        RenderBatched();
    }

    /// <summary>
    /// Submit entities in BATCH-sized calls.
    /// Array.Copy into pre-allocated batch slices — no heap allocation.
    /// </summary>
    private void RenderBatched()
    {
        int remaining = _entityCount;
        int offset    = 0;

        while (remaining > 0)
        {
            int n = Mathf.Min(BATCH, remaining);

            // Copy slice into preallocated batch arrays (no `new`).
            System.Array.Copy(_matrices, offset, _batchMatrices, 0, n);
            System.Array.Copy(_colors,   offset, _batchColors,   0, n);

            _mpb.SetVectorArray("_Color", _batchColors);

            Graphics.DrawMeshInstanced(
                entityMesh, 0, instancedMaterial,
                _batchMatrices, n, _mpb,
                UnityEngine.Rendering.ShadowCastingMode.Off,
                receiveShadows: false);

            offset    += n;
            remaining -= n;
        }
    }

    // ── Gizmo (Editor only) ────────────────────────────────────────────────
#if UNITY_EDITOR
    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireCube(
            new Vector3(maxEntities * gridSpacing * 0.5f, 0f, maxEntities * gridSpacing * 0.5f),
            new Vector3(maxEntities * gridSpacing, 1f, maxEntities * gridSpacing));
    }
#endif
}
