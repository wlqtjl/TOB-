#!/usr/bin/env bash
# deploy/setup.sh — Virtual environment setup & deployment script.
#
# Installs all dependencies and builds the Omni-Sim platform from source.
# Supports: Ubuntu/Debian 22.04+, macOS (with Homebrew).
#
# Usage:
#   chmod +x deploy/setup.sh
#   ./deploy/setup.sh            # full build + test
#   ./deploy/setup.sh --quick    # skip tests, just build
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
QUICK=false
[[ "${1:-}" == "--quick" ]] && QUICK=true

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Omni-Sim Platform — Environment Setup             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Detect OS ────────────────────────────────────────────────────────

OS="$(uname -s)"
echo "[1/6] Detected OS: $OS"

# ── Step 2: Install Rust (if needed) ─────────────────────────────────────────

echo "[2/6] Checking Rust toolchain..."
if command -v rustc &>/dev/null; then
    RUST_VER="$(rustc --version)"
    echo "  ✅ Found: $RUST_VER"
else
    echo "  ⚠️  Rust not found — installing via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    source "$HOME/.cargo/env"
    echo "  ✅ Installed: $(rustc --version)"
fi

# Ensure wasm32 target
echo "  Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# ── Step 3: Install Node.js (if needed) ──────────────────────────────────────

echo "[3/6] Checking Node.js..."
if command -v node &>/dev/null; then
    NODE_VER="$(node --version)"
    echo "  ✅ Found: Node.js $NODE_VER"
else
    echo "  ⚠️  Node.js not found — installing..."
    echo "  ⚠️  NOTE: This downloads and runs an install script from nodesource.com."
    echo "  ⚠️  Review https://deb.nodesource.com/setup_20.x before proceeding in sensitive environments."
    if [[ "$OS" == "Linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "Darwin" ]]; then
        brew install node@20
    fi
    echo "  ✅ Installed: Node.js $(node --version)"
fi

# ── Step 4: Build Rust workspace ─────────────────────────────────────────────

echo "[4/6] Building Rust workspace..."
cd "$PROJECT_ROOT"

if [[ "$QUICK" == "false" ]]; then
    echo "  Running: cargo fmt --all -- --check"
    cargo fmt --all -- --check

    echo "  Running: cargo clippy --workspace --deny warnings"
    cargo clippy --workspace --deny warnings

    echo "  Running: cargo test --workspace"
    cargo test --workspace
fi

echo "  Running: cargo build -p omni-sim-headless --release"
cargo build -p omni-sim-headless --release

echo "  ✅ Headless binary: target/release/omni-sim-headless"

# ── Step 5: Build Web Console ────────────────────────────────────────────────

echo "[5/6] Building Web Console..."
cd "$PROJECT_ROOT/web-console"

echo "  Running: npm ci"
npm ci --ignore-scripts

if [[ "$QUICK" == "false" ]]; then
    echo "  Running: npm run lint"
    npm run lint

    echo "  Running: npm test"
    npm test
fi

echo "  Running: npm run build"
npm run build

echo "  ✅ Web Console built: web-console/dist/"

# ── Step 6: Build Wasm (optional) ────────────────────────────────────────────

echo "[6/6] Building Wasm binary..."
cd "$PROJECT_ROOT"
./build/build_wasm.sh

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    ✅ Setup Complete                     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  Headless simulation:                                    ║"
echo "║    cargo run -p omni-sim-headless -- \\                   ║"
echo "║      --opdl vendor/smartx/smartx.opdl.json \\             ║"
echo "║      --ticks 1000                                        ║"
echo "║                                                          ║"
echo "║  Web Console dev server:                                 ║"
echo "║    cd web-console && npm run dev                         ║"
echo "║    → http://localhost:3000                               ║"
echo "║                                                          ║"
echo "║  Docker (all-in-one):                                    ║"
echo "║    docker compose up --build                             ║"
echo "║    → http://localhost:3000                               ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
