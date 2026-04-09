/// # FFI Exports — Correct Implementation
///
/// Fixes applied in this file:
///
/// **D-01** — `static mut` replaced by `thread_local! + RefCell`.
///   `static mut` is Undefined Behaviour in Rust. Wasm is single-threaded so
///   `thread_local!` has zero overhead while being sound.
///
/// **D-02** — Return values use caller-supplied output buffers, not `Vec/byte[]`.
///   Returning a managed heap object across the FFI boundary causes Unity's
///   P/Invoke marshaller to access freed memory.  Every output goes through
///   a `*mut u8` + `usize` pair that the caller preallocates.
///
/// **D-03** — `wasm-bindgen` removed entirely; only `extern "C"` with `#[no_mangle]`.
///   `wasm-bindgen` emits JS glue that is incompatible with Unity's native
///   Wasm loader.  Pure `extern "C"` cdylib exports are universally compatible.
///
/// ## Return code conventions
///
/// | Value | Meaning |
/// |-------|---------|
/// | 0     | Success |
/// | 1     | UTF-8 decode error in input pointer |
/// | 2     | OPDL parse error |
/// | 3     | OPDL validation error |
/// | -1    | Not initialised (call `omni_init` first) |
/// | -2    | Output buffer too small |

use omni_sim_core::SimulationCore;
use std::cell::RefCell;

// D-01 FIX: thread_local! + RefCell instead of static mut.
// In Wasm the module is always single-threaded so this is zero-cost.
thread_local! {
    static CORE: RefCell<Option<SimulationCore>> = RefCell::new(None);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported functions
// ─────────────────────────────────────────────────────────────────────────────

/// Initialise the simulation from an OPDL JSON byte slice.
///
/// # Safety
/// `opdl_ptr` must point to a valid UTF-8 buffer of exactly `opdl_len` bytes
/// that remains valid for the duration of this call.
///
/// Returns: 0=success, 1=UTF-8 error, 2=parse error, 3=validation error.
#[no_mangle]
pub extern "C" fn omni_init(opdl_ptr: *const u8, opdl_len: usize) -> i32 {
    // SAFETY: caller guarantees the pointer + length are valid UTF-8.
    let json = match unsafe {
        std::str::from_utf8(std::slice::from_raw_parts(opdl_ptr, opdl_len))
    } {
        Ok(s) => s,
        Err(_) => return 1,
    };

    CORE.with(|cell| match SimulationCore::from_opdl(json) {
        Ok(core) => {
            *cell.borrow_mut() = Some(core);
            0
        }
        // Distinguish parse vs validation errors using the error message prefix
        // set by the OPDL compiler stages.
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("JSON parse") { 2 } else { 3 }
        }
    })
}

/// Advance the simulation by one frame.
///
/// # Safety
/// `out_ptr` must point to a writable buffer of at least `out_len` bytes.
/// The caller must ensure `out_len >= 32`.
///
/// D-02 FIX: writes the 32-byte state hash into the caller's buffer.
/// Returns: 32 on success, -1 if not initialised, -2 if buffer too small.
#[no_mangle]
pub extern "C" fn omni_tick(delta: f32, out_ptr: *mut u8, out_len: usize) -> i32 {
    if out_len < 32 {
        return -2;
    }

    CORE.with(|cell| {
        let mut borrow = cell.borrow_mut();
        match borrow.as_mut() {
            None => -1,
            Some(core) => {
                core.update(delta);
                let hash = core.state_hash();
                // SAFETY: out_len >= 32, out_ptr is caller-owned and writable
                unsafe {
                    std::ptr::copy_nonoverlapping(hash.as_ptr(), out_ptr, 32);
                }
                32
            }
        }
    })
}

/// Free a Rust-allocated heap buffer.
///
/// Must be called for every pointer received from Rust-side allocation helpers.
/// Calling with `ptr=null` or `len=0` is a safe no-op.
///
/// # Safety
/// `ptr` must have been allocated by Rust with `len` bytes and not yet freed.
#[no_mangle]
pub extern "C" fn omni_free(ptr: *mut u8, len: usize) {
    // SAFETY: contract documented above
    unsafe { crate::memory::free(ptr, len) };
}

/// Return the current live entity count (0 if not initialised).
#[no_mangle]
pub extern "C" fn omni_entity_count() -> u32 {
    CORE.with(|cell| {
        cell.borrow()
            .as_ref()
            .map_or(0, |c| c.entity_count() as u32)
    })
}

/// Return the current tick counter (0 if not initialised).
#[no_mangle]
pub extern "C" fn omni_tick_count() -> u64 {
    CORE.with(|cell| {
        cell.borrow()
            .as_ref()
            .map_or(0, |c| c.tick())
    })
}

/// Copy the latest 32-byte state hash into `out_ptr` without advancing the tick.
///
/// # Safety
/// `out_ptr` must be writable with at least 32 bytes.
///
/// Returns: 32 on success, -1 if not initialised, -2 if buffer too small.
#[no_mangle]
pub extern "C" fn omni_state_hash(out_ptr: *mut u8, out_len: usize) -> i32 {
    if out_len < 32 {
        return -2;
    }
    CORE.with(|cell| {
        match cell.borrow().as_ref() {
            None => -1,
            Some(core) => {
                let hash = core.state_hash();
                // SAFETY: verified above
                unsafe { std::ptr::copy_nonoverlapping(hash.as_ptr(), out_ptr, 32); }
                32
            }
        }
    })
}

/// Reset the simulation (drop current state).
/// After calling this, `omni_init` must be called again before `omni_tick`.
#[no_mangle]
pub extern "C" fn omni_reset() {
    CORE.with(|cell| {
        *cell.borrow_mut() = None;
    });
}
