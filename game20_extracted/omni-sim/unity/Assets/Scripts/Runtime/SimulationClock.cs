// unity/Assets/Scripts/Runtime/SimulationClock.cs
// Manages delta-time for the simulation loop.
//
// Responsibilities:
//   1. Decouple simulated time from Unity's real Time.deltaTime
//   2. Support time-scale multiplier (fast-forward / slow-motion)
//   3. Cap delta to avoid spiral-of-death on frame spikes
//
// Usage: attach to the same GameObject as OmniSimRuntime.
// OmniSimRuntime reads SimulatedDelta each Update().

using UnityEngine;

public class SimulationClock : MonoBehaviour
{
    [Header("Time Config")]
    [Tooltip("Multiplier applied to real deltaTime. 1.0 = real-time, 2.0 = 2× speed.")]
    [Range(0f, 10f)]
    public float TimeScale = 1.0f;

    [Tooltip("Maximum simulated delta per frame in seconds. Prevents spiral-of-death.")]
    public float MaxDelta = 0.1f;   // 100ms cap — never jump more than 6 frames

    // ── Public read-only state ─────────────────────────────────────────────
    /// Simulated seconds to pass to omni_tick this frame.
    public float SimulatedDelta { get; private set; }

    /// Accumulated simulated time since Start.
    public double SimulatedTime { get; private set; }

    /// Actual rendered frames since Start.
    public long FrameCount { get; private set; }

    // ── Unity lifecycle ────────────────────────────────────────────────────

    void Update()
    {
        // Scale and clamp — never let one frame eat more than MaxDelta.
        float raw = Time.deltaTime * TimeScale;
        SimulatedDelta = Mathf.Min(raw, MaxDelta);
        SimulatedTime += SimulatedDelta;
        FrameCount++;
    }

    // ── Editor helpers ─────────────────────────────────────────────────────

    /// Pause simulation without stopping Unity's Update loop.
    public void Pause()  => TimeScale = 0f;
    public void Resume() => TimeScale = 1f;

    /// Step a single fixed delta (useful for deterministic testing in Editor).
    public void StepFixed(float delta = 0.016f)
    {
        SimulatedDelta = delta;
        SimulatedTime += delta;
        FrameCount++;
    }
}
