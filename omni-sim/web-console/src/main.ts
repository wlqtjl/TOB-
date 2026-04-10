/**
 * Omni-Sim Web Console — entry point.
 *
 * Connects to the telemetry WebSocket server and renders
 * real-time simulation data into the dashboard.
 */

import { TelemetryClient } from "./client";
import { renderFrame, renderConnectionState } from "./dashboard";

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined ?? "ws://127.0.0.1:9001";

function main(): void {
  const client = new TelemetryClient({ url: WS_URL });

  client.onStateChange((state) => {
    renderConnectionState(state);
  });

  client.onFrame((frame) => {
    renderFrame(frame, client.history);
  });

  // Wire up reconnect button
  const reconnectBtn = document.getElementById("btn-reconnect");
  if (reconnectBtn) {
    reconnectBtn.addEventListener("click", () => {
      client.disconnect();
      client.clearHistory();
      client.connect();
    });
  }

  // Start connection
  renderConnectionState("connecting");
  client.connect();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
