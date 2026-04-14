//! WebSocket push server — D-06 fix.
//!
//! Architecture (§5.1):
//!   RingBuffer → Sampler → this server → Web console / Telemetry panel
//!
//! The server runs on a Tokio task and broadcasts the latest TelemetryFrame
//! JSON to all connected clients every `interval_ms` milliseconds.
//! Frame format matches §5.2 exactly.
//!
//! C-02 FIX: individual stream accept errors are logged and skipped, not propagated.
//! C-03 FIX: client sockets get a read timeout; max concurrent clients is capped.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Result;
use tungstenite::Message;

use crate::buffer::{RingBuffer, TelemetryFrame};

/// Shared state between the sampler task and the WebSocket broadcaster.
pub type SharedBuffer = Arc<Mutex<RingBuffer>>;

/// Maximum number of concurrent WebSocket client threads.
const MAX_CLIENTS: usize = 64;

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
///
/// C-02 FIX: accept errors are logged and skipped instead of terminating the server.
/// C-03 FIX: read_timeout prevents idle clients from blocking threads forever.
///           MAX_CLIENTS cap prevents DoS via thread exhaustion.
pub fn run_ws_server(addr: &str, buffer: SharedBuffer, interval_ms: u64) -> Result<()> {
    use std::net::TcpListener;
    use std::thread;
    use std::time::Duration;

    let listener = TcpListener::bind(addr)?;
    eprintln!("[OmniSim Telemetry] WebSocket server listening on ws://{addr}");

    let active_clients = Arc::new(AtomicUsize::new(0));

    for stream in listener.incoming() {
        // C-02 FIX: log and skip individual accept errors instead of propagating.
        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[OmniSim Telemetry] accept error (skipped): {e}");
                continue;
            }
        };

        // C-03 FIX: cap concurrent clients to prevent thread exhaustion DoS.
        let current = active_clients.load(Ordering::Relaxed);
        if current >= MAX_CLIENTS {
            eprintln!("[OmniSim Telemetry] max clients reached ({MAX_CLIENTS}), rejecting");
            drop(stream);
            continue;
        }

        // C-03 FIX: set read timeout so blocking `ws.read()` cannot hang forever.
        let read_timeout = Duration::from_secs(5);
        if let Err(e) = stream.set_read_timeout(Some(read_timeout)) {
            eprintln!("[OmniSim Telemetry] failed to set read timeout: {e}");
            continue;
        }

        let buf_clone = Arc::clone(&buffer);
        let clients = Arc::clone(&active_clients);
        clients.fetch_add(1, Ordering::Relaxed);

        thread::spawn(move || {
            let _guard = scopeguard(clients);

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
                // H-07 FIX: recover from poisoned mutex instead of panicking.
                let msg = {
                    let lock = match buf_clone.lock() {
                        Ok(guard) => guard,
                        Err(poisoned) => poisoned.into_inner(),
                    };
                    lock.latest().and_then(|f| frame_to_ws_message(f).ok())
                };

                if let Some(msg) = msg {
                    if ws.send(msg).is_err() {
                        break; // client disconnected
                    }
                }

                thread::sleep(Duration::from_millis(interval_ms));

                // Drain any incoming messages (ping/pong/close).
                // C-03 FIX: read_timeout ensures this won't block forever.
                match ws.read() {
                    Ok(Message::Close(_)) => break,
                    Err(tungstenite::Error::Io(ref e))
                        if e.kind() == std::io::ErrorKind::WouldBlock
                            || e.kind() == std::io::ErrorKind::TimedOut =>
                    {
                        // Timeout is expected — continue broadcasting.
                    }
                    Err(_) => break,
                    Ok(_) => {} // ignore pings etc.
                }
            }

            eprintln!("[OmniSim Telemetry] client disconnected");
        });
    }

    Ok(())
}

/// RAII-style decrement of the active client counter when a thread exits.
fn scopeguard(counter: Arc<AtomicUsize>) -> impl Drop {
    struct Guard(Arc<AtomicUsize>);
    impl Drop for Guard {
        fn drop(&mut self) {
            self.0.fetch_sub(1, Ordering::Relaxed);
        }
    }
    Guard(counter)
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

    #[test]
    fn ws_message_contains_all_entity_fields() {
        let msg = frame_to_ws_message(&sample_frame()).unwrap();
        let text = match msg {
            Message::Text(t) => t,
            _ => panic!("expected Text"),
        };
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        let entity = &v["entities"][0];
        assert!(entity["cpu"].is_number());
        assert!(entity["memory"].is_number());
        assert!(entity["network_tx"].is_number());
        assert!(entity["network_rx"].is_number());
        assert!(entity["status"].is_string());
        assert!(entity["index"].is_number());
    }

    #[test]
    fn ws_message_empty_entities() {
        let frame = TelemetryFrame {
            tick: 10,
            timestamp_ms: 2_000_000,
            state_hash_hex: "b".repeat(64),
            entities: vec![],
        };
        let msg = frame_to_ws_message(&frame).unwrap();
        let text = match msg {
            Message::Text(t) => t,
            _ => panic!("expected Text"),
        };
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(v["type"], "telemetry");
        assert_eq!(v["tick"], 10);
        assert!(v["entities"].as_array().unwrap().is_empty());
    }

    #[test]
    fn ws_message_multiple_entities() {
        let frame = TelemetryFrame {
            tick: 100,
            timestamp_ms: 5_000_000,
            state_hash_hex: "c".repeat(64),
            entities: vec![
                EntitySample {
                    index: 0,
                    cpu: 0.2,
                    memory: 0.3,
                    network_tx: 0.1,
                    network_rx: 0.05,
                    status: AlertStatus::Normal,
                },
                EntitySample {
                    index: 1,
                    cpu: 0.95,
                    memory: 0.9,
                    network_tx: 0.8,
                    network_rx: 0.7,
                    status: AlertStatus::Critical,
                },
            ],
        };
        let msg = frame_to_ws_message(&frame).unwrap();
        let text = match msg {
            Message::Text(t) => t,
            _ => panic!("expected Text"),
        };
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        let entities = v["entities"].as_array().unwrap();
        assert_eq!(entities.len(), 2);
        assert_eq!(entities[0]["status"], "normal");
        assert_eq!(entities[1]["status"], "critical");
    }

    #[test]
    fn now_ms_returns_nonzero() {
        let ts = now_ms();
        // Should be a reasonable Unix timestamp in milliseconds (after year 2000)
        assert!(ts > 946_684_800_000, "expected timestamp after year 2000, got {ts}");
    }
}
