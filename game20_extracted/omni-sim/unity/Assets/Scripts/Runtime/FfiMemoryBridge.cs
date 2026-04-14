// unity/Assets/Scripts/Runtime/FfiMemoryBridge.cs
// Zero-copy memory bridge between Unity managed heap and Rust Wasm linear memory.
//
// Design rule (§8.2): every IntPtr received from Rust MUST have a release path
// that calls omni_free(ptr, len). Wrap all Rust-allocated pointers in FfiBuffer.

using System;
using System.Runtime.InteropServices;
using UnityEngine;

/// <summary>
/// RAII wrapper for Rust-allocated byte buffers.
/// Automatically calls omni_free when disposed.
/// </summary>
public sealed class FfiBuffer : IDisposable
{
    [DllImport("omni_sim_ffi")]
    // MUST MATCH: pub extern "C" fn omni_free(ptr: *mut u8, len: usize)
    static extern void omni_free(IntPtr ptr, int len);

    public IntPtr Ptr  { get; private set; }
    public int    Len  { get; private set; }
    private bool  _disposed;

    public FfiBuffer(IntPtr ptr, int len)
    {
        Ptr = ptr;
        Len = len;
    }

    /// <summary>Copy Rust buffer contents into a new managed byte[].</summary>
    public byte[] ToManagedArray()
    {
        if (Ptr == IntPtr.Zero || Len <= 0) return Array.Empty<byte>();
        var arr = new byte[Len];
        Marshal.Copy(Ptr, arr, 0, Len);
        return arr;
    }

    public void Dispose()
    {
        if (!_disposed && Ptr != IntPtr.Zero && Len > 0)
        {
            omni_free(Ptr, Len);
            Ptr      = IntPtr.Zero;
            Len      = 0;
            _disposed = true;
        }
    }

    ~FfiBuffer() { Dispose(); }
}

/// <summary>
/// Static helper for reading bulk entity telemetry data from Rust
/// into Unity-side float arrays without per-frame GC allocation.
/// </summary>
public static class FfiMemoryBridge
{
    // Reusable buffer — allocated once, resized only when entity count grows.
    private static float[] _cpuScratch  = Array.Empty<float>();
    private static float[] _memScratch  = Array.Empty<float>();

    /// <summary>
    /// Copy CPU usage values from the hecs world into Unity float arrays.
    /// Caller provides a TelemetryRenderer that owns the final destination.
    /// </summary>
    public static void ReadTelemetry(
        OmniSimRuntime runtime,
        out float[]    cpuOut,
        out float[]    memOut,
        out int        count)
    {
        count = (int)runtime.EntityCount;

        // Grow scratch buffers only when needed — no GC pressure in steady state.
        if (_cpuScratch.Length < count) _cpuScratch = new float[count];
        if (_memScratch.Length < count) _memScratch = new float[count];

        // Phase 1: populate from deterministic pattern matching world state.
        // Phase 2: replace with a shared memory region exposed from the Wasm module.
        byte[] hash = runtime.LastHash;
        for (int i = 0; i < count; i++)
        {
            // Pseudo-telemetry derived from hash bytes — replaced in Phase 2
            // with direct Wasm linear memory reads.
            _cpuScratch[i] = (hash[i % 32] / 255f);
            _memScratch[i] = (hash[(i + 16) % 32] / 255f);
        }

        cpuOut = _cpuScratch;
        memOut = _memScratch;
    }
}
