//! # FFI Exports — Correct Implementation
//!
//! Fixes applied in this file:
//!
//! **D-01** — `static mut` replaced by `thread_local! + RefCell`.
//!   `static mut` is Undefined Behaviour in Rust. Wasm is single-threaded so
//!   `thread_local!` has zero overhead while being sound.
//!
//! **D-02** — Return values use caller-supplied output buffers, not `Vec/byte[]`.
//!   Returning a managed heap object across the FFI boundary causes Unity's
//!   P/Invoke marshaller to access freed memory.  Every output goes through
//!   a `*mut u8` + `usize` pair that the caller preallocates.
//!
//! **D-03** — `wasm-bindgen` removed entirely; only `extern "C"` with `#[no_mangle]`.
//!   `wasm-bindgen` emits JS glue that is incompatible with Unity's native
//!   Wasm loader.  Pure `extern "C"` cdylib exports are universally compatible.
//!
//! ## Return code conventions
//!
//! | Value | Meaning |
//! |-------|---------|
//! | 0     | Success |
//! | 1     | UTF-8 decode error in input pointer |
//! | 2     | OPDL parse error |
//! | 3     | OPDL validation error |
//! | -1    | Not initialised (call `omni_init` first) |
//! | -2    | Output buffer too small |

use omni_sim_core::SimulationCore;
use std::cell::RefCell;

// D-01 FIX: thread_local! + RefCell instead of static mut.
// In Wasm the module is always single-threaded so this is zero-cost.
thread_local! {
    static CORE: RefCell<Option<SimulationCore>> = const { RefCell::new(None) };
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
pub unsafe extern "C" fn omni_init(opdl_ptr: *const u8, opdl_len: usize) -> i32 {
    // SAFETY: caller guarantees the pointer + length are valid UTF-8.
    let json = match std::str::from_utf8(std::slice::from_raw_parts(opdl_ptr, opdl_len)) {
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
            if msg.contains("JSON parse") {
                2
            } else {
                3
            }
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
pub unsafe extern "C" fn omni_tick(delta: f32, out_ptr: *mut u8, out_len: usize) -> i32 {
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
                std::ptr::copy_nonoverlapping(hash.as_ptr(), out_ptr, 32);
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
pub unsafe extern "C" fn omni_free(ptr: *mut u8, len: usize) {
    // SAFETY: contract documented above
    crate::memory::free(ptr, len);
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
    CORE.with(|cell| cell.borrow().as_ref().map_or(0, |c| c.tick()))
}

/// Copy the latest 32-byte state hash into `out_ptr` without advancing the tick.
///
/// # Safety
/// `out_ptr` must be writable with at least 32 bytes.
///
/// Returns: 32 on success, -1 if not initialised, -2 if buffer too small.
#[no_mangle]
pub unsafe extern "C" fn omni_state_hash(out_ptr: *mut u8, out_len: usize) -> i32 {
    if out_len < 32 {
        return -2;
    }
    CORE.with(|cell| {
        match cell.borrow().as_ref() {
            None => -1,
            Some(core) => {
                let hash = core.state_hash();
                // SAFETY: verified above
                std::ptr::copy_nonoverlapping(hash.as_ptr(), out_ptr, 32);
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

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_OPDL: &str = r#"{"version":"1.0","pack_id":"test",
        "entities":[{"id":"s1","entity_type":"Server",
        "components":{"cpu":0.2,"memory":0.3}}]}"#;

    fn init_with(json: &str) -> i32 {
        unsafe { omni_init(json.as_ptr(), json.len()) }
    }

    #[test]
    fn init_success() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        omni_reset();
    }

    #[test]
    fn init_invalid_json_returns_2() {
        omni_reset();
        assert_eq!(init_with("{bad json}"), 2);
        omni_reset();
    }

    #[test]
    fn init_validation_error_returns_3() {
        omni_reset();
        let bad = r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":9.9,"memory":0.3}}]}"#;
        assert_eq!(init_with(bad), 3);
        omni_reset();
    }

    #[test]
    fn init_utf8_error_returns_1() {
        omni_reset();
        let bad_bytes: &[u8] = &[0xFF, 0xFE, 0xFD];
        let result = unsafe { omni_init(bad_bytes.as_ptr(), bad_bytes.len()) };
        assert_eq!(result, 1);
        omni_reset();
    }

    #[test]
    fn entity_count_after_init() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        assert_eq!(omni_entity_count(), 1);
        omni_reset();
    }

    #[test]
    fn entity_count_before_init() {
        omni_reset();
        assert_eq!(omni_entity_count(), 0);
    }

    #[test]
    fn tick_count_before_init() {
        omni_reset();
        assert_eq!(omni_tick_count(), 0);
    }

    #[test]
    fn tick_advances_and_returns_hash() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        let mut buf = [0u8; 32];
        let ret = unsafe { omni_tick(0.016, buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, 32);
        assert_eq!(omni_tick_count(), 1);
        // hash should be non-zero after tick
        assert!(buf.iter().any(|&b| b != 0));
        omni_reset();
    }

    #[test]
    fn tick_not_initialized_returns_neg1() {
        omni_reset();
        let mut buf = [0u8; 32];
        let ret = unsafe { omni_tick(0.016, buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, -1);
    }

    #[test]
    fn tick_buffer_too_small_returns_neg2() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        let mut buf = [0u8; 16]; // too small, needs 32
        let ret = unsafe { omni_tick(0.016, buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, -2);
        omni_reset();
    }

    #[test]
    fn state_hash_success() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        let mut buf = [0u8; 32];
        let ret = unsafe { omni_state_hash(buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, 32);
        omni_reset();
    }

    #[test]
    fn state_hash_not_initialized_returns_neg1() {
        omni_reset();
        let mut buf = [0u8; 32];
        let ret = unsafe { omni_state_hash(buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, -1);
    }

    #[test]
    fn state_hash_buffer_too_small_returns_neg2() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        let mut buf = [0u8; 8]; // too small
        let ret = unsafe { omni_state_hash(buf.as_mut_ptr(), buf.len()) };
        assert_eq!(ret, -2);
        omni_reset();
    }

    #[test]
    fn state_hash_does_not_advance_tick() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        let tick_before = omni_tick_count();
        let mut buf = [0u8; 32];
        unsafe { omni_state_hash(buf.as_mut_ptr(), buf.len()) };
        assert_eq!(omni_tick_count(), tick_before);
        omni_reset();
    }

    #[test]
    fn reset_clears_state() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        assert_eq!(omni_entity_count(), 1);
        omni_reset();
        assert_eq!(omni_entity_count(), 0);
        assert_eq!(omni_tick_count(), 0);
    }

    #[test]
    fn reinit_after_reset() {
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        omni_reset();
        assert_eq!(init_with(VALID_OPDL), 0);
        assert_eq!(omni_entity_count(), 1);
        omni_reset();
    }

    #[test]
    fn free_null_is_noop() {
        unsafe { omni_free(std::ptr::null_mut(), 0) };
        unsafe { omni_free(std::ptr::null_mut(), 100) };
        // Should not crash
    }
}
