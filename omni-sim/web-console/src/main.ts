/**
 * Omni-Sim Web Console — entry point.
 *
 * Multi-page SPA with hash-based routing. Connects to the telemetry
 * WebSocket server and renders real-time simulation data.
 */

import { TelemetryClient } from "./client";
import { renderFrame, renderConnectionState } from "./dashboard";
import { Router } from "./router";
import { renderDashboardPage, populateDashboardMock, makeEntityRowsClickable } from "./pages/dashboard";
import { renderEntityDetailPage } from "./pages/entity-detail";
import { renderSimulationPage } from "./pages/simulation";
import { renderAlertsPage } from "./pages/alerts";
import { renderPacksPage } from "./pages/packs";
import { renderSettingsPage } from "./pages/settings";
import { renderAboutPage } from "./pages/about";

const WS_URL = (import.meta.env.VITE_WS_URL ?? "ws://127.0.0.1:9001") as string;

/** Whether we're using mock data (no live WebSocket). */
let demoMode = false;

function getContentEl(): HTMLElement {
  return document.getElementById("app-content") as HTMLElement;
}

function main(): void {
  const client = new TelemetryClient({ url: WS_URL });
  const router = new Router();

  // ── Dashboard page ──────────────────────────────────────────────────────
  router.on("/", () => {
    const content = getContentEl();
    renderDashboardPage(content);

    if (demoMode) {
      populateDashboardMock();
    } else if (client.latestFrame) {
      renderFrame(client.latestFrame, client.history);
      makeEntityRowsClickable(client.latestFrame);
    }
  });

  // ── Entity detail page ──────────────────────────────────────────────────
  router.on("/entity/:id", (params) => {
    renderEntityDetailPage(getContentEl(), params);
  });

  // ── Simulation control page ─────────────────────────────────────────────
  router.on("/simulation", () => {
    renderSimulationPage(getContentEl());
  });

  // ── Alerts page ─────────────────────────────────────────────────────────
  router.on("/alerts", () => {
    renderAlertsPage(getContentEl());
  });

  // ── Packs page ──────────────────────────────────────────────────────────
  router.on("/packs", () => {
    renderPacksPage(getContentEl());
  });

  // ── Settings page ───────────────────────────────────────────────────────
  router.on("/settings", () => {
    renderSettingsPage(getContentEl());
  });

  // ── About page ──────────────────────────────────────────────────────────
  router.on("/about", () => {
    renderAboutPage(getContentEl());
  });

  // ── WebSocket client events ─────────────────────────────────────────────
  client.onStateChange((state) => {
    renderConnectionState(state);

    // If connection fails, switch to demo mode with mock data
    if (state === "error" && !demoMode) {
      demoMode = true;
      renderConnectionState("connected");
      // Update the connection indicator to show demo mode
      const el = document.getElementById("conn-status");
      if (el) el.textContent = "🟢 Demo Mode";
      // Re-render current page with mock data
      router.resolve();
    }
  });

  client.onFrame((frame) => {
    // Only update dashboard if we're on it
    if (router.path === "/" || router.path === "") {
      renderFrame(frame, client.history);
      makeEntityRowsClickable(frame);
    }
  });

  // ── Reconnect button ───────────────────────────────────────────────────
  const reconnectBtn = document.getElementById("btn-reconnect");
  if (reconnectBtn) {
    reconnectBtn.addEventListener("click", () => {
      demoMode = false;
      client.disconnect();
      client.clearHistory();
      client.connect();
    });
  }

  // ── Start ───────────────────────────────────────────────────────────────
  renderConnectionState("connecting");
  router.start();
  client.connect();

  // Auto-switch to demo mode after 3 seconds if still not connected
  setTimeout(() => {
    if (client.state !== "connected" && !demoMode) {
      demoMode = true;
      client.disconnect();
      renderConnectionState("connected");
      const el = document.getElementById("conn-status");
      if (el) el.textContent = "🟢 Demo Mode";
      router.resolve();
    }
  }, 3000);
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
