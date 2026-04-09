//! Omni-Sim Telemetry — D-06 fix.
//!
//! Data flow (§5.1):
//! ```text
//! ECS World ──► Sampler (every 100ms) ──► RingBuffer (3600 frames)
//!                                              │
//!                              ┌──────────────┴───────────────┐
//!                              ▼                              ▼
//!                    WebSocket push server            Unity memory bridge
//!                    (Web console panel)         (TelemetryRenderer.cs)
//! ```

pub mod buffer;
pub mod sampler;
pub mod ws_server;

pub use buffer::{AlertStatus, EntitySample, RingBuffer, TelemetryFrame};
pub use sampler::{recommend_interval, sample, SampleInterval};
pub use ws_server::{frame_to_ws_message, now_ms, run_ws_server, SharedBuffer};

use std::sync::{Arc, Mutex};

/// Convenience constructor for a new shared ring buffer.
pub fn new_shared_buffer() -> SharedBuffer {
    Arc::new(Mutex::new(RingBuffer::new()))
}
