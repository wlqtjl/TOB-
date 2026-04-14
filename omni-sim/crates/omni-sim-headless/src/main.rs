//! Omni-Sim Headless CLI
//!
//! Runs a batch simulation without Unity, outputting telemetry as JSON.
//!
//! Usage:
//!   omni-sim-headless --opdl <path> --ticks <n> [--delta <f>] [--output <path>]
//!   omni-sim-headless --opdl <path> --serve [--ws-addr 0.0.0.0:9001]
//!
//! Verification command (§13.2 Step 2 equivalent):
//!   omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --ticks 1000
//!
//! Live server mode (WebSocket telemetry push):
//!   omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --serve
//!
//! Expected: exits 0, prints final state hash and entity count.

use anyhow::{Context, Result};
use omni_sim_core::SimulationCore;
use omni_sim_telemetry::{new_shared_buffer, now_ms, run_ws_server, sample, recommend_interval};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::{env, fs, path::PathBuf};

fn main() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    let cfg = parse_args(&args)?;

    // ── Graceful shutdown flag ─────────────────────────────────────────────
    let shutdown = Arc::new(AtomicBool::new(false));
    {
        let shutdown = shutdown.clone();
        ctrlc::set_handler(move || {
            eprintln!("[OmniSim] Received shutdown signal, stopping gracefully...");
            shutdown.store(true, Ordering::SeqCst);
        })
        .expect("Failed to set Ctrl+C handler");
    }

    // ── Load OPDL ──────────────────────────────────────────────────────────
    let json = fs::read_to_string(&cfg.opdl_path)
        .with_context(|| format!("cannot read OPDL file: {}", cfg.opdl_path.display()))?;

    let mut core = SimulationCore::from_opdl(&json)
        .with_context(|| format!("OPDL compilation failed: {}", cfg.opdl_path.display()))?;

    eprintln!(
        "[OmniSim] Loaded '{}' — {} entities",
        cfg.opdl_path.display(),
        core.entity_count()
    );

    // ── Telemetry buffer ───────────────────────────────────────────────────
    let buf = new_shared_buffer();

    // ── Serve mode: WebSocket server + continuous simulation ──────────────
    if cfg.serve {
        return run_serve_mode(&mut core, &cfg, buf, shutdown);
    }

    // ── Batch mode: run N ticks and exit ──────────────────────────────────
    run_batch_mode(&mut core, &cfg, buf)
}

/// Serve mode: start WebSocket telemetry server on a background thread,
/// then run the simulation in a continuous loop pushing frames.
fn run_serve_mode(
    core: &mut SimulationCore,
    cfg: &Config,
    buf: omni_sim_telemetry::SharedBuffer,
    shutdown: Arc<AtomicBool>,
) -> Result<()> {
    use std::thread;
    use std::time::Duration;

    let ws_addr = cfg.ws_addr.clone();
    let buf_ws = buf.clone();

    // Start WebSocket server in a background thread
    thread::spawn(move || {
        if let Err(e) = run_ws_server(&ws_addr, buf_ws, 100) {
            eprintln!("[OmniSim] WebSocket server error: {e}");
        }
    });

    // Start lightweight HTTP health check on port 9002
    let health_shutdown = shutdown.clone();
    thread::spawn(move || {
        use std::io::{Read, Write};
        use std::net::TcpListener;

        let listener = match TcpListener::bind("0.0.0.0:9002") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[OmniSim] Health check listener failed: {e}");
                return;
            }
        };
        listener
            .set_nonblocking(true)
            .expect("Cannot set non-blocking");
        eprintln!("[OmniSim] Health check endpoint on http://0.0.0.0:9002/health");

        loop {
            if health_shutdown.load(Ordering::SeqCst) {
                break;
            }
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let mut buf = [0u8; 1024];
                    let _ = stream.read(&mut buf);
                    let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\"}";
                    let _ = stream.write_all(response.as_bytes());
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100));
                }
                Err(_) => {}
            }
        }
    });

    eprintln!(
        "[OmniSim] Serve mode — simulation running continuously, WebSocket on ws://{}",
        cfg.ws_addr
    );
    eprintln!("[OmniSim] Send SIGTERM or press Ctrl+C to stop gracefully.");

    let mut tick_count: u64 = 0;
    while !shutdown.load(Ordering::SeqCst) {
        // Run a batch of ticks, then sample
        for _ in 0..10 {
            core.update(cfg.delta);
            tick_count += 1;
        }

        let frame = sample(core, now_ms());
        let interval = recommend_interval(&frame);

        // H-07 FIX: recover from poisoned mutex instead of panicking.
        match buf.lock() {
            Ok(mut guard) => guard.push(frame),
            Err(poisoned) => poisoned.into_inner().push(frame),
        }

        // Log progress periodically
        if tick_count.is_multiple_of(1000) {
            let hash = core.state_hash();
            let hash_short: String = hash.iter().take(4).map(|b| format!("{b:02x}")).collect();
            eprintln!(
                "[OmniSim] tick={tick_count} entities={} hash={hash_short}… interval={:?}",
                core.entity_count(),
                interval
            );
        }

        // Sleep to approximate real-time simulation at ~60fps
        thread::sleep(Duration::from_millis(interval.millis().min(16)));

        // If a max tick count is set, respect it
        if cfg.ticks > 0 && tick_count >= cfg.ticks {
            eprintln!("[OmniSim] Reached {tick_count} ticks — continuing in serve mode (loop)");
            // Reset simulation to keep it interesting
            let json = fs::read_to_string(&cfg.opdl_path)?;
            *core = SimulationCore::from_opdl(&json)?;
            tick_count = 0;
        }
    }

    eprintln!(
        "[OmniSim] Graceful shutdown complete — ran {} ticks, {} entities",
        tick_count,
        core.entity_count()
    );
    Ok(())
}

/// Batch mode: run N ticks, output report, and exit.
fn run_batch_mode(
    core: &mut SimulationCore,
    cfg: &Config,
    buf: omni_sim_telemetry::SharedBuffer,
) -> Result<()> {
    let t_start = std::time::Instant::now();

    for i in 0..cfg.ticks {
        core.update(cfg.delta);

        // Sample every 100 ticks (coarse — headless mode)
        if i % 100 == 0 || i == cfg.ticks - 1 {
            let frame = sample(core, now_ms());
            // H-07 FIX: recover from poisoned mutex instead of panicking.
            match buf.lock() {
                Ok(mut guard) => guard.push(frame),
                Err(poisoned) => poisoned.into_inner().push(frame),
            }
        }
    }

    let elapsed = t_start.elapsed();

    // ── Final report ───────────────────────────────────────────────────────
    let hash = core.state_hash();
    let hash_hex: String = hash.iter().map(|b| format!("{b:02x}")).collect();

    let report = serde_json::json!({
        "status":       "ok",
        "ticks":        cfg.ticks,
        "delta":        cfg.delta,
        "entity_count": core.entity_count(),
        "final_tick":   core.tick(),
        "state_hash":   hash_hex,
        "elapsed_ms":   elapsed.as_millis(),
        "ticks_per_ms": cfg.ticks as f64 / elapsed.as_millis().max(1) as f64,
    });

    if let Some(out) = &cfg.output_path {
        fs::write(out, serde_json::to_string_pretty(&report)?)?;
        eprintln!("[OmniSim] Report written to {}", out.display());
    } else {
        println!("{}", serde_json::to_string_pretty(&report)?);
    }

    eprintln!(
        "[OmniSim] Done — {} ticks in {:.1}ms ({:.0} ticks/ms)",
        cfg.ticks,
        elapsed.as_secs_f64() * 1000.0,
        cfg.ticks as f64 / elapsed.as_millis().max(1) as f64
    );

    Ok(())
}

// ── CLI argument parser ────────────────────────────────────────────────────

#[derive(Debug)]
struct Config {
    opdl_path: PathBuf,
    ticks: u64,
    delta: f32,
    output_path: Option<PathBuf>,
    serve: bool,
    ws_addr: String,
}

fn parse_args(args: &[String]) -> Result<Config> {
    let mut opdl_path = None::<PathBuf>;
    let mut ticks = 1000u64;
    let mut delta = 0.016f32; // ~60fps
    let mut output_path = None::<PathBuf>;
    let mut serve = false;
    let mut ws_addr = "0.0.0.0:9001".to_string();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--opdl" => {
                i += 1;
                opdl_path = Some(PathBuf::from(
                    args.get(i).context("--opdl requires a path argument")?,
                ));
            }
            "--ticks" => {
                i += 1;
                ticks = args
                    .get(i)
                    .context("--ticks requires a number")?
                    .parse()
                    .context("--ticks must be a positive integer")?;
            }
            "--delta" => {
                i += 1;
                delta = args
                    .get(i)
                    .context("--delta requires a number")?
                    .parse()
                    .context("--delta must be a float")?;
            }
            "--output" => {
                i += 1;
                output_path = Some(PathBuf::from(
                    args.get(i).context("--output requires a path")?,
                ));
            }
            "--serve" => {
                serve = true;
            }
            "--ws-addr" => {
                i += 1;
                ws_addr = args
                    .get(i)
                    .context("--ws-addr requires an address (e.g. 0.0.0.0:9001)")?
                    .to_string();
            }
            "--help" | "-h" => {
                print_usage();
                std::process::exit(0);
            }
            unknown => anyhow::bail!("unknown argument: {unknown}"),
        }
        i += 1;
    }

    // L-04 FIX: validate ticks > 0 and delta > 0 (only in batch mode).
    if !serve && ticks == 0 {
        anyhow::bail!("--ticks must be > 0");
    }
    if delta <= 0.0 {
        anyhow::bail!("--delta must be > 0.0");
    }

    Ok(Config {
        opdl_path: opdl_path.context("--opdl <path> is required")?,
        ticks,
        delta,
        output_path,
        serve,
        ws_addr,
    })
}

fn print_usage() {
    eprintln!(
        "Usage: omni-sim-headless --opdl <path> [--ticks <n>] [--delta <f32>] [--output <path>]
       omni-sim-headless --opdl <path> --serve [--ws-addr 0.0.0.0:9001]

Options:
  --opdl     Path to OPDL JSON file (required)
  --ticks    Number of simulation ticks to run (default: 1000)
  --delta    Simulated time per tick in seconds (default: 0.016 ≈ 60fps)
  --output   Write JSON report to file instead of stdout
  --serve    Start WebSocket telemetry server and run simulation continuously
  --ws-addr  WebSocket server bind address (default: 0.0.0.0:9001)
  --help     Show this message"
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(strs: &[&str]) -> Vec<String> {
        strs.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn parse_minimal_args() {
        let a = args(&["bin", "--opdl", "test.json"]);
        let cfg = parse_args(&a).unwrap();
        assert_eq!(cfg.opdl_path, PathBuf::from("test.json"));
        assert_eq!(cfg.ticks, 1000); // default
        assert!((cfg.delta - 0.016).abs() < 1e-6); // default
        assert!(cfg.output_path.is_none());
        assert!(!cfg.serve);
        assert_eq!(cfg.ws_addr, "0.0.0.0:9001");
    }

    #[test]
    fn parse_all_args() {
        let a = args(&[
            "bin", "--opdl", "my.opdl.json", "--ticks", "500", "--delta", "0.033", "--output",
            "report.json",
        ]);
        let cfg = parse_args(&a).unwrap();
        assert_eq!(cfg.opdl_path, PathBuf::from("my.opdl.json"));
        assert_eq!(cfg.ticks, 500);
        assert!((cfg.delta - 0.033).abs() < 1e-6);
        assert_eq!(cfg.output_path, Some(PathBuf::from("report.json")));
    }

    #[test]
    fn parse_serve_mode() {
        let a = args(&["bin", "--opdl", "test.json", "--serve"]);
        let cfg = parse_args(&a).unwrap();
        assert!(cfg.serve);
        assert_eq!(cfg.ws_addr, "0.0.0.0:9001");
    }

    #[test]
    fn parse_serve_with_custom_addr() {
        let a = args(&["bin", "--opdl", "test.json", "--serve", "--ws-addr", "127.0.0.1:8080"]);
        let cfg = parse_args(&a).unwrap();
        assert!(cfg.serve);
        assert_eq!(cfg.ws_addr, "127.0.0.1:8080");
    }

    #[test]
    fn missing_opdl_fails() {
        let a = args(&["bin", "--ticks", "100"]);
        assert!(parse_args(&a).is_err());
    }

    #[test]
    fn zero_ticks_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--ticks", "0"]);
        let err = parse_args(&a).unwrap_err();
        assert!(err.to_string().contains("--ticks must be > 0"));
    }

    #[test]
    fn zero_ticks_ok_in_serve_mode() {
        // In serve mode, ticks=0 means "run forever"
        let a = args(&["bin", "--opdl", "test.json", "--serve", "--ticks", "0"]);
        let cfg = parse_args(&a).unwrap();
        assert!(cfg.serve);
        assert_eq!(cfg.ticks, 0);
    }

    #[test]
    fn zero_delta_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--delta", "0.0"]);
        let err = parse_args(&a).unwrap_err();
        assert!(err.to_string().contains("--delta must be > 0.0"));
    }

    #[test]
    fn negative_delta_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--delta", "-1.0"]);
        let err = parse_args(&a).unwrap_err();
        assert!(err.to_string().contains("--delta must be > 0.0"));
    }

    #[test]
    fn unknown_arg_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--unknown"]);
        let err = parse_args(&a).unwrap_err();
        assert!(err.to_string().contains("unknown argument"));
    }

    #[test]
    fn opdl_missing_value_fails() {
        let a = args(&["bin", "--opdl"]);
        assert!(parse_args(&a).is_err());
    }

    #[test]
    fn ticks_missing_value_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--ticks"]);
        assert!(parse_args(&a).is_err());
    }

    #[test]
    fn ticks_non_numeric_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--ticks", "abc"]);
        assert!(parse_args(&a).is_err());
    }

    #[test]
    fn delta_non_numeric_fails() {
        let a = args(&["bin", "--opdl", "test.json", "--delta", "xyz"]);
        assert!(parse_args(&a).is_err());
    }

    #[test]
    fn empty_args_fails() {
        let a = args(&["bin"]);
        assert!(parse_args(&a).is_err());
    }
}
