//! Omni-Sim Headless CLI
//!
//! Runs a batch simulation without Unity, outputting telemetry as JSON.
//!
//! Usage:
//!   omni-sim-headless --opdl <path> --ticks <n> [--delta <f>] [--output <path>]
//!
//! Verification command (§13.2 Step 2 equivalent):
//!   omni-sim-headless --opdl vendor/smartx/smartx.opdl.json --ticks 1000
//!
//! Expected: exits 0, prints final state hash and entity count.

use anyhow::{Context, Result};
use omni_sim_core::SimulationCore;
use omni_sim_telemetry::{new_shared_buffer, now_ms, sample};
use std::{env, fs, path::PathBuf};

fn main() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    let cfg = parse_args(&args)?;

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

    // ── Simulation loop ────────────────────────────────────────────────────
    let t_start = std::time::Instant::now();

    for i in 0..cfg.ticks {
        core.update(cfg.delta);

        // Sample every 100 ticks (coarse — headless mode)
        if i % 100 == 0 || i == cfg.ticks - 1 {
            let frame = sample(&core, now_ms());
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

struct Config {
    opdl_path: PathBuf,
    ticks: u64,
    delta: f32,
    output_path: Option<PathBuf>,
}

fn parse_args(args: &[String]) -> Result<Config> {
    let mut opdl_path = None::<PathBuf>;
    let mut ticks = 1000u64;
    let mut delta = 0.016f32; // ~60fps
    let mut output_path = None::<PathBuf>;

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
            "--help" | "-h" => {
                print_usage();
                std::process::exit(0);
            }
            unknown => anyhow::bail!("unknown argument: {unknown}"),
        }
        i += 1;
    }

    // L-04 FIX: validate ticks > 0 and delta > 0.
    if ticks == 0 {
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
    })
}

fn print_usage() {
    eprintln!(
        "Usage: omni-sim-headless --opdl <path> [--ticks <n>] [--delta <f32>] [--output <path>]

Options:
  --opdl    Path to OPDL JSON file (required)
  --ticks   Number of simulation ticks to run (default: 1000)
  --delta   Simulated time per tick in seconds (default: 0.016 ≈ 60fps)
  --output  Write JSON report to file instead of stdout
  --help    Show this message"
    );
}
