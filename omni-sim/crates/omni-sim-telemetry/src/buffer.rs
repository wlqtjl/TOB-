//! Fixed-capacity ring buffer for telemetry frame history.
//!
//! Capacity: 3600 frames (1 hour @ 1 fps, or 1 minute @ 60 fps).
//! When full, the oldest frame is silently overwritten (no allocation).
//!
//! L-07 NOTE: Each frame stores a `Vec<EntitySample>` per entity. For 100k
//! entities, a full buffer could consume ~8.6 GB. Callers should use coarse
//! sampling (e.g., every 100 ticks) or cap the number of sampled entities
//! per frame when running large simulations.

pub const RING_CAPACITY: usize = 3600;

/// A single sampled telemetry frame.
#[derive(Debug, Clone, serde::Serialize)]
pub struct TelemetryFrame {
    pub tick: u64,
    pub timestamp_ms: u64,
    pub state_hash_hex: String,
    pub entities: Vec<EntitySample>,
}

/// Per-entity snapshot inside a frame.
#[derive(Debug, Clone, serde::Serialize)]
pub struct EntitySample {
    pub index: usize,
    pub cpu: f32,
    pub memory: f32,
    pub network_tx: f32,
    pub network_rx: f32,
    pub status: AlertStatus,
}

/// Alert level — matches §5.3 thresholds exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertStatus {
    Normal,
    Warning,
    Critical,
}

impl AlertStatus {
    pub fn classify(cpu: f32, memory: f32) -> Self {
        if cpu > 0.9 || memory > 0.85 {
            Self::Critical
        } else if cpu > 0.7 || memory > 0.7 {
            Self::Warning
        } else {
            Self::Normal
        }
    }
}

/// Ring buffer — fixed heap allocation, no re-alloc on push.
pub struct RingBuffer {
    buf: Vec<Option<TelemetryFrame>>,
    head: usize, // next write index
    len: usize,  // current fill level (saturates at capacity)
}

impl RingBuffer {
    pub fn new() -> Self {
        Self {
            buf: vec![None; RING_CAPACITY],
            head: 0,
            len: 0,
        }
    }

    /// Push a frame, overwriting the oldest if full.
    pub fn push(&mut self, frame: TelemetryFrame) {
        self.buf[self.head] = Some(frame);
        self.head = (self.head + 1) % RING_CAPACITY;
        if self.len < RING_CAPACITY {
            self.len += 1;
        }
    }

    /// Return the most recent frame, or `None` if empty.
    pub fn latest(&self) -> Option<&TelemetryFrame> {
        if self.len == 0 {
            return None;
        }
        let idx = (self.head + RING_CAPACITY - 1) % RING_CAPACITY;
        self.buf[idx].as_ref()
    }

    /// Iterate frames in chronological order (oldest first).
    pub fn iter_chronological(&self) -> impl Iterator<Item = &TelemetryFrame> {
        let start = if self.len == RING_CAPACITY {
            self.head
        } else {
            0
        };
        (0..self.len).filter_map(move |i| {
            let idx = (start + i) % RING_CAPACITY;
            self.buf[idx].as_ref()
        })
    }

    pub fn len(&self) -> usize {
        self.len
    }
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }
}

impl Default for RingBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(tick: u64) -> TelemetryFrame {
        TelemetryFrame {
            tick,
            timestamp_ms: tick * 16,
            state_hash_hex: format!("{tick:064x}"),
            entities: vec![],
        }
    }

    #[test]
    fn push_and_latest() {
        let mut rb = RingBuffer::new();
        rb.push(frame(1));
        rb.push(frame(2));
        assert_eq!(rb.latest().unwrap().tick, 2);
        assert_eq!(rb.len(), 2);
    }

    #[test]
    fn wraps_around_at_capacity() {
        let mut rb = RingBuffer::new();
        for i in 0..=(RING_CAPACITY as u64) {
            rb.push(frame(i));
        }
        assert_eq!(rb.len(), RING_CAPACITY);
        // latest should be the last pushed
        assert_eq!(rb.latest().unwrap().tick, RING_CAPACITY as u64);
    }

    #[test]
    fn chronological_order() {
        let mut rb = RingBuffer::new();
        for i in 1..=5u64 {
            rb.push(frame(i));
        }
        let ticks: Vec<u64> = rb.iter_chronological().map(|f| f.tick).collect();
        assert_eq!(ticks, vec![1, 2, 3, 4, 5]);
    }
}
