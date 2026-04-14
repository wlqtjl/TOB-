/// Shared memory management for the FFI boundary.
///
/// Ownership contract (MUST be honoured by every caller):
/// - Buffers returned via `*mut u8` were allocated by Rust.
/// - The C caller (Unity) MUST call `omni_free(ptr, len)` exactly once per pointer.
/// - Buffers passed IN by the caller are NEVER freed by Rust.

/// Allocate a zeroed byte buffer of `len` bytes and return a raw pointer.
///
/// # Safety
/// Returns `null` if `len == 0`. Caller takes ownership and must free
/// via `omni_free(ptr, len)`.
pub unsafe fn alloc(len: usize) -> *mut u8 {
    if len == 0 {
        return std::ptr::null_mut();
    }
    // SAFETY: we allocate a properly-aligned Vec<u8>, get its raw pointer,
    // then forget the Vec to prevent deallocation. Caller owns the memory.
    let mut v: Vec<u8> = vec![0u8; len];
    let ptr = v.as_mut_ptr();
    std::mem::forget(v); // transfer ownership to caller
    ptr
}

/// Free a buffer previously returned by `alloc`.
///
/// # Safety
/// - `ptr` MUST have been returned by `alloc(len)`.
/// - Must not be called more than once for the same pointer.
/// - Calling with `ptr=null` or `len=0` is a safe no-op.
pub unsafe fn free(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    // SAFETY: ptr was allocated as a Vec<u8> with exactly `len` bytes and
    // capacity `len`. The caller guarantees single-free ownership.
    drop(Vec::from_raw_parts(ptr, len, len));
}
