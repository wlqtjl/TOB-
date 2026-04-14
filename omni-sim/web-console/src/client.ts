/**
 * WebSocket client for the Omni-Sim telemetry server.
 *
 * Connects to the telemetry push server (default ws://127.0.0.1:9001)
 * and dispatches parsed TelemetryFrame events.
 *
 * Features:
 * - Automatic reconnection with exponential back-off
 * - Connection state tracking
 * - Frame validation before dispatch
 */

import type { TelemetryFrame, ConnectionState } from "./types";
import { isTelemetryFrame } from "./telemetry";

export type FrameListener = (frame: TelemetryFrame) => void;
export type StateListener = (state: ConnectionState) => void;

export interface TelemetryClientOptions {
  /** WebSocket URL. Default: "ws://127.0.0.1:9001" */
  url?: string;
  /** Maximum reconnect delay in ms. Default: 10000 */
  maxReconnectDelay?: number;
  /** Maximum number of recent frames to keep in history. Default: 300 */
  historySize?: number;
}

const DEFAULT_URL = "ws://127.0.0.1:9001";
const DEFAULT_MAX_RECONNECT_DELAY = 10_000;
const DEFAULT_HISTORY_SIZE = 300;

export class TelemetryClient {
  private ws: WebSocket | null = null;
  private _state: ConnectionState = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private frameListeners: FrameListener[] = [];
  private stateListeners: StateListener[] = [];
  private _history: TelemetryFrame[] = [];
  private _latestFrame: TelemetryFrame | null = null;

  readonly url: string;
  readonly maxReconnectDelay: number;
  readonly historySize: number;

  constructor(options: TelemetryClientOptions = {}) {
    this.url = options.url ?? DEFAULT_URL;
    this.maxReconnectDelay = options.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY;
    this.historySize = options.historySize ?? DEFAULT_HISTORY_SIZE;
  }

  /** Current connection state. */
  get state(): ConnectionState {
    return this._state;
  }

  /** Most recently received frame (or null). */
  get latestFrame(): TelemetryFrame | null {
    return this._latestFrame;
  }

  /** Frame history (oldest first), capped at historySize. */
  get history(): ReadonlyArray<TelemetryFrame> {
    return this._history;
  }

  /** Register a callback for each incoming telemetry frame. */
  onFrame(listener: FrameListener): void {
    this.frameListeners.push(listener);
  }

  /** Register a callback for connection state changes. */
  onStateChange(listener: StateListener): void {
    this.stateListeners.push(listener);
  }

  /** Open connection. Reconnects automatically on failure. */
  connect(): void {
    if (this.ws) return;
    this.setState("connecting");

    const ws = new WebSocket(this.url);

    ws.onopen = () => {
      this.reconnectDelay = 1000; // reset back-off
      this.setState("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(String(event.data));
        if (isTelemetryFrame(data)) {
          this._latestFrame = data;
          this._history.push(data);
          if (this._history.length > this.historySize) {
            this._history.shift();
          }
          for (const fn of this.frameListeners) {
            fn(data);
          }
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.setState("disconnected");
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      this.ws = null;
      this.setState("error");
      this.scheduleReconnect();
    };

    this.ws = ws;
  }

  /** Gracefully close the connection and stop reconnection. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  /** Clear frame history. */
  clearHistory(): void {
    this._history = [];
  }

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const fn of this.stateListeners) {
      fn(state);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ws = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
}
