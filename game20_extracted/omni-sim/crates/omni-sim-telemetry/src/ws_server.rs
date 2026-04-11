/// WebSocket push server — D-06 fix.
///
/// Architecture (§5.1):
///   RingBuffer → Sampler → this server → Web console / Telemetry panel
///
/// The server runs on a Tokio task and broadcasts the latest TelemetryFrame
/// JSON to all connected clients every `interval_ms` milliseconds.
/// Frame format matches §5.2 exactly.

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Result;
use tungstenite::Message;

use crate::buffer::{RingBuffer, TelemetryFrame};

/// Shared state between the sampler task and the WebSocket broadcaster.
pub type SharedBuffer = Arc<Mutex<RingBuffer>>;

/// Serialise a frame to the §5.2 WebSocket JSON format.
///
/// Example output:
/// ```json
/// {
///   "type": "telemetry",
///   "tick": 42314,
///   "timestamp_ms": 1719840000000,
///   "state_hash": "a3f9b2...",
///   "entities": [...]
/// }
/// ```
pub fn frame_to_ws_message(frame: &TelemetryFrame) -> Result<Message> {
    // Build §5.2 packet structure
    #[derive(serde::Serialize)]
    struct WsPacket<'a> {
        #[serde(rename = "type")]
        msg_type: &'static str,
        tick: u64,
        timestamp_ms: u64,
        state_hash: &'a str,
        entities: &'a [crate::buffer::EntitySample],
    }

    let packet = WsPacket {
        msg_type: "telemetry",
        tick: frame.tick,
        timestamp_ms: frame.timestamp_ms,
        state_hash: &frame.state_hash_hex,
        entities: &frame.entities,
    };

    Ok(Message::Text(serde_json::to_string(&packet)?))
}

/// Return current Unix timestamp in milliseconds.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Start the WebSocket broadcast server.
///
/// This function blocks until the server is shut down.
/// In production, call it from a dedicated Tokio task.
///
/// `addr`        — bind address, e.g. `"127.0.0.1:9001"`
/// `buffer`      — shared ring buffer populated by the sampler
/// `interval_ms` — push interval in milliseconds
pub fn run_ws_server(
    addr: &str,
    buffer: SharedBuffer,
    interval_ms: u64,
) -> Result<()> {
    use std::net::TcpListener;
    use std::thread;
    use std::time::Duration;

    let listener = TcpListener::bind(addr)?;
    eprintln!("[OmniSim Telemetry] WebSocket server listening on ws://{addr}");

    for stream in listener.incoming() {
        let stream = stream?;
        let buf_clone = Arc::clone(&buffer);

        thread::spawn(move || {
            let mut ws = match tungstenite::accept(stream) {
                Ok(ws) => ws,
                Err(e) => {
                    eprintln!("[OmniSim Telemetry] handshake error: {e}");
                    return;
                }
            };

            eprintln!("[OmniSim Telemetry] client connected");

            loop {
                // Send latest frame
                let msg = {
                    let lock = buf_clone.lock().expect("telemetry buffer poisoned");
                    lock.latest().and_then(|f| frame_to_ws_message(f).ok())
                };

                if let Some(msg) = msg {
                    if ws.send(msg).is_err() {
                        break; // client disconnected
                    }
                }

                thread::sleep(Duration::from_millis(interval_ms));

                // Drain any incoming messages (ping/pong/close)
                match ws.read() {
                    Ok(Message::Close(_)) | Err(_) => break,
                    Ok(_) => {} // ignore pings etc.
                }
            }

            eprintln!("[OmniSim Telemetry] client disconnected");
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::buffer::{AlertStatus, EntitySample, TelemetryFrame};

    fn sample_frame() -> TelemetryFrame {
        TelemetryFrame {
            tick: 42,
            timestamp_ms: 1_000_000,
            state_hash_hex: "a".repeat(64),
            entities: vec![EntitySample {
                index: 0,
                cpu: 0.73,
                memory: 0.51,
                network_tx: 0.22,
                network_rx: 0.18,
                status: AlertStatus::Warning,
            }],
        }
    }

    #[test]
    fn ws_message_is_valid_json() {
        let msg = frame_to_ws_message(&sample_frame()).unwrap();
        let text = match msg {
            Message::Text(t) => t,
            _ => panic!("expected Text"),
        };
        let v: serde_json::Value = serde_json::from_str(&text).expect("invalid JSON");
        assert_eq!(v["type"], "telemetry");
        assert_eq!(v["tick"], 42u64);
        assert_eq!(v["entities"][0]["cpu"], 0.73f32);
    }

    #[test]
    fn ws_message_contains_state_hash() {
        let msg = frame_to_ws_message(&sample_frame()).unwrap();
        if let Message::Text(t) = msg {
            assert!(t.contains("state_hash"));
        }
    }
}
