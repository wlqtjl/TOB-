// unity/Assets/Scripts/Rendering/HeatmapOverlay.cs
// Heatmap overlay — renders a world-space texture showing aggregated CPU load
// across the entity grid, updated each frame from TelemetryRenderer data.
//
// Phase 1: CPU-side texture update via Texture2D.SetPixels32 (simple, correct).
// Phase 2: replace with ComputeShader for 100k entities at full 60fps.
//
// Performance (§8.2): Texture2D pixels preallocated — no per-frame `new`.

using UnityEngine;

[RequireComponent(typeof(Renderer))]
public class HeatmapOverlay : MonoBehaviour
{
    [Header("Heatmap Config")]
    [Tooltip("Resolution of the heatmap texture (NxN). Must be power of 2.")]
    public int textureResolution = 256;

    [Tooltip("Smoothing factor [0,1]. Higher = more temporal smoothing.")]
    [Range(0f, 0.99f)]
    public float smoothing = 0.85f;

    // ── Private state ──────────────────────────────────────────────────────
    private Texture2D   _heatmapTex;
    private Color32[]   _pixels;       // preallocated — no GC in Update
    private float[]     _smoothed;     // smoothed CPU values per cell
    private Renderer    _renderer;
    private int         _gridCols;

    // §5.3 heatmap colours — matching TelemetryRenderer exactly.
    private static readonly Color32 _colNormal   = new(0,   200, 0,   255);  // green
    private static readonly Color32 _colWarning  = new(255, 200, 0,   255);  // yellow
    private static readonly Color32 _colCritical = new(220, 30,  30,  255);  // red

    // ── Unity lifecycle ────────────────────────────────────────────────────

    void Awake()
    {
        _renderer   = GetComponent<Renderer>();
        int total   = textureResolution * textureResolution;
        _pixels     = new Color32[total];
        _smoothed   = new float[total];
        _heatmapTex = new Texture2D(textureResolution, textureResolution,
                                    TextureFormat.RGBA32, mipChain: false)
        {
            filterMode = FilterMode.Bilinear,
            wrapMode   = TextureWrapMode.Clamp,
            name       = "OmniSimHeatmap"
        };
        _renderer.material.mainTexture = _heatmapTex;
    }

    /// <summary>
    /// Update heatmap from CPU usage array (called by OmniSimRuntime).
    /// No heap allocation — writes into preallocated arrays.
    /// </summary>
    public void UpdateHeatmap(float[] cpuUsages, int count, int gridCols)
    {
        _gridCols = Mathf.Max(1, gridCols);

        for (int i = 0; i < count && i < _smoothed.Length; i++)
        {
            // Exponential moving average — reduces flicker.
            _smoothed[i] = _smoothed[i] * smoothing + cpuUsages[i] * (1f - smoothing);
        }

        int texW = textureResolution;
        for (int py = 0; py < texW; py++)
        {
            for (int px = 0; px < texW; px++)
            {
                // Map texture pixel → entity grid cell.
                int ex = px * _gridCols / texW;
                int ey = py * _gridCols / texW;
                int idx = ey * _gridCols + ex;

                float cpu = (idx < _smoothed.Length) ? _smoothed[idx] : 0f;
                _pixels[py * texW + px] = CpuToColor(cpu);
            }
        }

        _heatmapTex.SetPixels32(_pixels);
        _heatmapTex.Apply(updateMipmaps: false);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static Color32 CpuToColor(float cpu)
    {
        if (cpu >= 0.9f)  return _colCritical;
        if (cpu >= 0.7f)
        {
            float t = (cpu - 0.7f) / 0.2f;
            return Color32.Lerp(_colWarning, _colCritical, t);
        }
        {
            float t = cpu / 0.7f;
            return Color32.Lerp(_colNormal, _colWarning, t);
        }
    }

    void OnDestroy()
    {
        if (_heatmapTex != null) Destroy(_heatmapTex);
    }
}
