// unity/Assets/Scripts/Runtime/OmniSimRuntime.cs
// Core Unity driver — loads OPDL, drives tick, forwards telemetry to renderer.
//
// D-02 FIX: byte[] buffers passed by the caller; no managed heap returned from Rust.
// D-03 FIX: DllImport uses plain symbol names — no wasm-bindgen glue.
// H-03 FIX: Uses SimulationClock.SimulatedDelta instead of raw Time.deltaTime.
// H-04 FIX: Drives TelemetryRenderer via FfiMemoryBridge each frame.
// H-05 FIX: P/Invoke uses UIntPtr for Rust usize parameters (correct on both 32/64-bit).
//
// P/Invoke signatures MUST MATCH crates/omni-sim-ffi/src/exports.rs exactly.
// Tag every signature line with // MUST MATCH to enforce the rule.

using System;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;

public class OmniSimRuntime : MonoBehaviour
{
    // ── P/Invoke declarations (MUST MATCH exports.rs) ─────────────────────────
    // H-05 FIX: use UIntPtr for Rust `usize` — correct on both Wasm (32-bit) and native (64-bit).
    // MUST MATCH: pub extern "C" fn omni_init(opdl_ptr: *const u8, opdl_len: usize) -> i32
    [DllImport("omni_sim_ffi")] static extern int omni_init(byte[] opdl, UIntPtr len);

    // MUST MATCH: pub extern "C" fn omni_tick(delta: f32, out_ptr: *mut u8, out_len: usize) -> i32
    [DllImport("omni_sim_ffi")] static extern int omni_tick(float delta, byte[] outHash, UIntPtr outLen);

    // MUST MATCH: pub extern "C" fn omni_free(ptr: *mut u8, len: usize)
    [DllImport("omni_sim_ffi")] static extern void omni_free(IntPtr ptr, UIntPtr len);

    // MUST MATCH: pub extern "C" fn omni_entity_count() -> u32
    [DllImport("omni_sim_ffi")] static extern uint omni_entity_count();

    // MUST MATCH: pub extern "C" fn omni_tick_count() -> u64
    [DllImport("omni_sim_ffi")] static extern ulong omni_tick_count();

    // MUST MATCH: pub extern "C" fn omni_reset()
    [DllImport("omni_sim_ffi")] static extern void omni_reset();

    // ── Inspector fields ───────────────────────────────────────────────────────
    [Header("References")]
    public TelemetryRenderer telemetryRenderer;
    public SimulationClock   simulationClock;

    [Header("Config")]
    [Tooltip("OPDL pack filename inside StreamingAssets/Packs/")]
    public string opdlPackFile = "smartx.opdl.json";

    // ── Public state ───────────────────────────────────────────────────────────
    public bool   IsReady     => _initialized;
    public byte[] LastHash    => _hashBuffer;
    public uint   EntityCount => _initialized ? omni_entity_count() : 0;

    // ── Private state ──────────────────────────────────────────────────────────
    // D-02 FIX: 32-byte buffer preallocated once; never allocated in Update().
    private readonly byte[] _hashBuffer = new byte[32];
    private bool _initialized;

    // ── Unity lifecycle ────────────────────────────────────────────────────────

    void Start()
    {
        string path = Path.Combine(
            Application.streamingAssetsPath, "Packs", opdlPackFile);

        if (!File.Exists(path))
        {
            Debug.LogError($"[OmniSim] OPDL pack not found: {path}");
            return;
        }

        byte[] opdlBytes = File.ReadAllBytes(path);
        int result = omni_init(opdlBytes, (UIntPtr)opdlBytes.Length);

        if (result != 0)
        {
            Debug.LogError($"[OmniSim] Init failed — error code {result}" +
                           " (1=UTF-8, 2=parse, 3=validation)");
            return;
        }

        _initialized = true;
        Debug.Log($"[OmniSim] Initialised — {omni_entity_count()} entities loaded");
    }

    void Update()
    {
        if (!_initialized) return;

        // H-03 FIX: use SimulationClock's clamped & scaled delta instead of raw Time.deltaTime.
        float delta = (simulationClock != null)
            ? simulationClock.SimulatedDelta
            : Time.deltaTime;

        // D-02 FIX: write into preallocated buffer, not a new array.
        int written = omni_tick(delta, _hashBuffer, (UIntPtr)_hashBuffer.Length);

        if (written != 32)
        {
            Debug.LogWarning($"[OmniSim] omni_tick unexpected return: {written}");
            return;
        }

        // H-04 FIX: drive TelemetryRenderer with actual telemetry data each frame.
        if (telemetryRenderer != null)
        {
            FfiMemoryBridge.ReadTelemetry(this, out float[] cpuUsages, out _, out int count);
            telemetryRenderer.UpdateTelemetry(cpuUsages, count);
        }

        // Forward hash byte[0] as a quick liveness indicator.
        if (omni_tick_count() % 60 == 0)
            Debug.Log($"[OmniSim] tick={omni_tick_count()} hash[0]={_hashBuffer[0]}");
    }

    void OnDestroy()
    {
        if (_initialized)
        {
            omni_reset();
            _initialized = false;
        }
    }
}
