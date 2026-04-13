#!/usr/bin/env bash
# build/build_wasm.sh — Compile omni-sim-ffi to Wasm and copy to Unity.
# Usage: ./build/build_wasm.sh [--release|--debug]
#
# Verification: file should be ~800KB release, >0 debug.
set -euo pipefail

MODE="${1:---release}"
PROFILE="release"
[[ "$MODE" == "--debug" ]] && PROFILE="debug"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[OmniSim Build] ── Compiling Wasm ($PROFILE) ──"

# Ensure Wasm target is installed
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# Compile
if [[ "$PROFILE" == "release" ]]; then
  cargo build -p omni-sim-ffi --target wasm32-unknown-unknown --release
else
  cargo build -p omni-sim-ffi --target wasm32-unknown-unknown
fi

WASM_SRC="target/wasm32-unknown-unknown/${PROFILE}/omni_sim_ffi.wasm"
WASM_DST="unity/Assets/Plugins/Wasm/omni_sim_ffi.wasm"

if [[ ! -f "$WASM_SRC" ]]; then
  echo "[OmniSim Build] ❌ Wasm binary not found at $WASM_SRC"
  exit 1
fi

mkdir -p "$(dirname "$WASM_DST")"
cp "$WASM_SRC" "$WASM_DST"

# Optional: wasm-opt size + speed optimisation (requires binaryen)
if command -v wasm-opt &>/dev/null && [[ "$PROFILE" == "release" ]]; then
  echo "[OmniSim Build] Running wasm-opt -O3 ..."
  wasm-opt -O3 "$WASM_DST" -o "$WASM_DST"
fi

SIZE=$(du -sh "$WASM_DST" | cut -f1)
echo "[OmniSim Build] ✅ Done — $WASM_DST  ($SIZE)"
