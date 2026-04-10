#!/usr/bin/env bash
# entrypoint.sh — Start web console (nginx) + headless simulation server.
set -euo pipefail

echo "[OmniSim Deploy] Starting nginx (port 3000)..."
nginx

echo "[OmniSim Deploy] Starting headless simulation server..."
exec omni-sim-headless "$@"
