//! Shared memory management for the FFI boundary.
//!
//! Ownership contract (MUST be honoured by every caller):
//! - Buffers returned via `*mut u8` were allocated by Rust.
//! - The C caller (Unity) MUST call `omni_free(ptr, len)` exactly once per pointer.
//! - Buffers passed IN by the caller are NEVER freed by Rust.

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alloc_zero_returns_null() {
        let ptr = unsafe { alloc(0) };
        assert!(ptr.is_null());
    }

    #[test]
    fn alloc_returns_valid_zeroed_memory() {
        let len = 64;
        let ptr = unsafe { alloc(len) };
        assert!(!ptr.is_null());
        // Memory should be zeroed
        for i in 0..len {
            assert_eq!(unsafe { *ptr.add(i) }, 0);
        }
        // Free the allocated memory
        unsafe { free(ptr, len) };
    }

    #[test]
    fn alloc_and_free_roundtrip() {
        let len = 1024;
        let ptr = unsafe { alloc(len) };
        assert!(!ptr.is_null());
        // Write some data
        unsafe {
            *ptr = 42;
            *ptr.add(len - 1) = 99;
        }
        // Free should not panic
        unsafe { free(ptr, len) };
    }

    #[test]
    fn free_null_is_noop() {
        unsafe { free(std::ptr::null_mut(), 0) };
        unsafe { free(std::ptr::null_mut(), 100) };
    }

    #[test]
    fn free_zero_len_is_noop() {
        // Even with a non-null pointer (we won't actually use a real ptr
        // here since len=0 triggers early return before using the pointer)
        let ptr = unsafe { alloc(1) };
        // free with len=0 is a no-op — the pointer won't be freed
        unsafe { free(ptr, 0) };
        // Now properly free it
        unsafe { free(ptr, 1) };
    }
}
