#!/usr/bin/env bash
# build/build_all.sh — Full workspace build: check + test + Wasm.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[OmniSim] ── Step 1/4: fmt check ──"
cargo fmt --all -- --check

echo "[OmniSim] ── Step 2/4: clippy ──"
cargo clippy --workspace --deny warnings

echo "[OmniSim] ── Step 3/4: tests ──"
cargo test --workspace

echo "[OmniSim] ── Step 4/4: Wasm build ──"
./build/build_wasm.sh

echo "[OmniSim] ✅ All steps passed"
