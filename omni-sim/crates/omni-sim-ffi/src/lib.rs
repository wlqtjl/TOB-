/// Omni-Sim FFI bridge.
///
/// Compiled as both `cdylib` (Wasm / Unity native plugin) and
/// `staticlib` (C smoke-test harness on native targets).
///
/// No `wasm-bindgen` — pure `extern "C"` + `#[no_mangle]`.  (D-03 fix)

pub mod exports;
pub mod memory;

// Re-export at crate root so the C header can reference them easily.
pub use exports::*;
