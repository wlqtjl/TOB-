#!/usr/bin/env bash
# entrypoint.sh — Start web console (nginx) + headless simulation server.
# Handles SIGTERM gracefully: forwards signal to child processes.
set -euo pipefail

cleanup() {
  echo "[OmniSim Deploy] Received SIGTERM, shutting down..."
  # Send SIGTERM to all child processes
  kill -TERM "$SIM_PID" 2>/dev/null || true
  nginx -s quit 2>/dev/null || true
  wait "$SIM_PID" 2>/dev/null
  echo "[OmniSim Deploy] Shutdown complete."
  exit 0
}

trap cleanup SIGTERM SIGINT

echo "[OmniSim Deploy] Starting nginx (port 3000)..."
nginx

echo "[OmniSim Deploy] Starting headless simulation server..."
omni-sim-headless "$@" &
SIM_PID=$!

# Wait for the simulation process (allows trap to work)
wait "$SIM_PID"
