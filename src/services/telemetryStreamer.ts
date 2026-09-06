/**
 * PSCAD CLONE - High-Performance Multi-Window Telemetry Streamer & Window Manager
 * Phase 20 - Step 20.1: Native Pop-Out Detachable Window Architecture
 */

import { tauriBridge } from './tauriBridge';
import { sessionManager, type ScopeWindowLayout } from './sessionManager';
import type { SimulationState } from '../types';

export interface SerializedSignalData {
  name: string;
  values: number[];
}

export interface CursorSyncPayload {
  c1?: { enabled: boolean; t: number };
  c2?: { enabled: boolean; t: number };
  crosshairTime?: number | null;
  sourceWindow: 'main' | 'popout';
  frameId?: string;
  senderId?: string;
}

export interface StreamingMetrics {
  fps: number;
  latencyMs: number;
  samplesTotal: number;
  packetCount: number;
  transport: 'BroadcastChannel' | 'TauriIPC' | 'LocalStorage' | 'None';
  lastPacketTime: number;
}

export interface TelemetryPayload {
  type:
    | 'SYNC_STATE'
    | 'SIGNALS_CHUNK'
    | 'CURSOR_SYNC'
    | 'DOCK_BACK'
    | 'POPOUT_INIT'
    | 'HEARTBEAT'
    | 'LAYOUT_UPDATE'
    | 'THEME_SYNC'
    | 'REQUEST_SYNC';
  timestamp: number;
  senderId?: string;
  projectName?: string;
  simState?: SimulationState;
  tMax?: number;
  signals?: SerializedSignalData[];
  timeArray?: number[];
  activeChannels?: string[];
  viewMode?: string;
  frameId?: string;
  cursorData?: CursorSyncPayload;
  layout?: Partial<ScopeWindowLayout>;
  theme?: string;
}

export interface PopoutWindowOptions {
  frameId?: string;
  signals?: string[];
  viewMode?: string;
  title?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

const BROADCAST_CHANNEL_NAME = 'pscad_clone_scope_telemetry_v1';
const STORAGE_SYNC_KEY = 'pscad_scope_telemetry_sync';

export class TelemetryStreamer {
  private _senderId: string = Math.random().toString(36).substring(2, 9);
  private _channel: BroadcastChannel | null = null;
  private _isDetachedWindow: boolean = false;
  private _popoutWindowRef: Window | null = null;
  private _listeners: Set<(payload: TelemetryPayload) => void> = new Set();
  private _cursorListeners: Set<(cursorData: CursorSyncPayload) => void> = new Set();
  private _metricsListeners: Set<(metrics: StreamingMetrics) => void> = new Set();
  private _cachedSignals: Map<string, number[]> = new Map();
  private _cachedSimState: SimulationState | null = null;
  private _lastKnownCursor: CursorSyncPayload | null = null;

  // Live Performance & Telemetry Streaming Metrics
  private _packetTimestamps: number[] = [];
  private _packetCount: number = 0;
  private _samplesTotal: number = 0;
  private _latencyMs: number = 0;
  private _lastPacketTime: number = 0;
  private _fps: number = 0;

  constructor() {
    this._isDetachedWindow = this.checkIfDetachedWindow();
    this.initBroadcastChannel();
    this.initStorageFallback();
    this.initTauriListeners();
  }

  /**
   * Check if current browser/webview context is running as the detached pop-out window
   */
  public checkIfDetachedWindow(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'detached-scope' || params.get('window') === 'scope';
  }

  public isDetached(): boolean {
    return this._isDetachedWindow;
  }

  public getSenderId(): string {
    return this._senderId;
  }

  public getPopoutWindowRef(): Window | null {
    return this._popoutWindowRef;
  }

  public isPopoutOpen(): boolean {
    return this._popoutWindowRef !== null && !this._popoutWindowRef.closed;
  }

  private initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        if (typeof (this._channel as any).unref === 'function') {
          (this._channel as any).unref();
        }
        this._channel.onmessage = (event: MessageEvent<TelemetryPayload>) => {
          this.handleIncomingPayload(event.data);
        };
      } catch (err) {
        console.warn('[TelemetryStreamer] BroadcastChannel init error:', err);
      }
    }
  }

  private initStorageFallback() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === STORAGE_SYNC_KEY && e.newValue) {
          try {
            const payload = JSON.parse(e.newValue) as TelemetryPayload;
            this.handleIncomingPayload(payload);
          } catch (err) {}
        }
      });
    }
  }

  private initTauriListeners() {
    if (tauriBridge.isTauri()) {
      tauriBridge.listen<TelemetryPayload>('scope_telemetry_msg', (event) => {
        if (event.payload) {
          this.handleIncomingPayload(event.payload);
        }
      });
    }
  }

  public handleIncomingPayload(payload: TelemetryPayload) {
    if (!payload || !payload.type) return;
    // Suppress echo from this instance
    if (payload.senderId && payload.senderId === this._senderId) return;

    const now = Date.now();
    this._lastPacketTime = now;
    this._packetCount++;
    this._latencyMs = Math.max(0, now - (payload.timestamp || now));

    // Rolling 1-second window for true measured FPS
    this._packetTimestamps.push(now);
    const windowStart = now - 1000;
    while (this._packetTimestamps.length > 0 && this._packetTimestamps[0] < windowStart) {
      this._packetTimestamps.shift();
    }
    this._fps = this._packetTimestamps.length;

    if (payload.signals) {
      const map = new Map<string, number[]>();
      if (payload.timeArray) {
        map.set('Time', payload.timeArray);
      }
      for (const s of payload.signals) {
        map.set(s.name, s.values);
        this._samplesTotal += s.values.length;
      }
      this._cachedSignals = map;
    }

    if (payload.simState) {
      this._cachedSimState = payload.simState;
    }

    if (payload.cursorData) {
      this._lastKnownCursor = payload.cursorData;
      this._cursorListeners.forEach((fn) => {
        try {
          fn(payload.cursorData!);
        } catch (e) {
          console.error('[TelemetryStreamer] Cursor listener error:', e);
        }
      });
    }

    if (payload.type === 'LAYOUT_UPDATE' && payload.layout) {
      sessionManager.saveScopeLayout(payload.layout).catch(() => {});
    }

    if (payload.type === 'THEME_SYNC' && payload.theme) {
      try {
        localStorage.setItem('pscad_theme', payload.theme);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', payload.theme);
        }
      } catch (e) {}
    }

    this._listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error('[TelemetryStreamer] Listener error:', e);
      }
    });

    if (this._metricsListeners.size > 0) {
      const metrics = this.getMetrics();
      this._metricsListeners.forEach((fn) => {
        try {
          fn(metrics);
        } catch (e) {}
      });
    }
  }

  /**
   * Subscribe to incoming telemetry and control messages from peer windows
   */
  public subscribe(callback: (payload: TelemetryPayload) => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Subscribe to synchronized cursor updates across windows
   */
  public subscribeCursor(callback: (cursorData: CursorSyncPayload) => void): () => void {
    this._cursorListeners.add(callback);
    return () => this._cursorListeners.delete(callback);
  }

  /**
   * Subscribe to streaming performance metrics
   */
  public subscribeMetrics(callback: (metrics: StreamingMetrics) => void): () => void {
    this._metricsListeners.add(callback);
    return () => this._metricsListeners.delete(callback);
  }

  /**
   * Broadcast message to other windows via zero-latency channels
   */
  public broadcast(payload: Omit<TelemetryPayload, 'timestamp'>): void {
    const fullPayload: TelemetryPayload = {
      ...payload,
      senderId: this._senderId,
      timestamp: Date.now(),
    };

    let transmitted = false;

    // 1. BroadcastChannel (Zero-copy native structured clone, sub-ms latency)
    if (this._channel) {
      try {
        this._channel.postMessage(fullPayload);
        transmitted = true;
      } catch (e) {
        console.warn('[TelemetryStreamer] Broadcast error:', e);
      }
    }

    // 2. Tauri Native IPC Emit
    if (tauriBridge.isTauri()) {
      try {
        tauriBridge.emit('scope_telemetry_msg', fullPayload);
        transmitted = true;
      } catch (e) {
        console.warn('[TelemetryStreamer] Tauri IPC emit error:', e);
      }
    }

    // 3. LocalStorage Fallback:
    // IMPORTANT: Only use localStorage for low-frequency control messages or if high-speed
    // transports are unavailable. High-frequency 60 FPS arrays avoid localStorage to prevent
    // UI thread blocking and QuotaExceededError.
    const isHighFrequency = fullPayload.type === 'SIGNALS_CHUNK' || fullPayload.type === 'CURSOR_SYNC';
    if (!transmitted || !isHighFrequency) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(fullPayload));
        }
      } catch (e) {
        // Suppress storage quota errors
      }
    }
  }

  /**
   * Broadcast real-time simulation signals and engine state
   */
  public broadcastSignals(
    signalsMap: Map<string, number[]>,
    simState?: SimulationState,
    tMax?: number,
    projectName?: string
  ): void {
    const serializedSignals: SerializedSignalData[] = [];
    let timeArray: number[] | undefined = undefined;

    signalsMap.forEach((vals, name) => {
      if (name === 'Time') {
        timeArray = vals;
      } else {
        serializedSignals.push({ name, values: vals });
      }
    });

    this.broadcast({
      type: 'SIGNALS_CHUNK',
      projectName,
      simState,
      tMax,
      signals: serializedSignals,
      timeArray,
    });
  }

  /**
   * Broadcast synchronized cursor movement across screens
   */
  public broadcastCursor(cursorData: CursorSyncPayload): void {
    const data: CursorSyncPayload = {
      ...cursorData,
      senderId: this._senderId,
    };
    this._lastKnownCursor = data;
    this.broadcast({
      type: 'CURSOR_SYNC',
      cursorData: data,
    });
  }

  /**
   * Get latest known cursor position across all windows
   */
  public getLastKnownCursor(): CursorSyncPayload | null {
    return this._lastKnownCursor;
  }

  /**
   * Query current streaming performance metrics
   */
  public getMetrics(): StreamingMetrics {
    let transport: StreamingMetrics['transport'] = 'None';
    if (tauriBridge.isTauri()) {
      transport = 'TauriIPC';
    } else if (this._channel) {
      transport = 'BroadcastChannel';
    } else if (typeof window !== 'undefined' && window.localStorage) {
      transport = 'LocalStorage';
    }

    return {
      fps: this._fps,
      latencyMs: this._latencyMs,
      samplesTotal: this._samplesTotal,
      packetCount: this._packetCount,
      transport,
      lastPacketTime: this._lastPacketTime,
    };
  }

  /**
   * Reset metric counters (useful for unit tests)
   */
  public resetMetrics(): void {
    this._packetTimestamps = [];
    this._packetCount = 0;
    this._samplesTotal = 0;
    this._latencyMs = 0;
    this._lastPacketTime = 0;
    this._fps = 0;
  }

  /**
   * Tear down streamer listeners and channels
   */
  public destroy(): void {
    if (this._channel) {
      try {
        this._channel.close();
      } catch (e) {}
      this._channel = null;
    }
    this._listeners.clear();
    this._cursorListeners.clear();
    this._metricsListeners.clear();
  }

  /**
   * Broadcast detached window layout geometry and monitor updates
   */
  public async broadcastLayoutUpdate(layout: Partial<ScopeWindowLayout>): Promise<ScopeWindowLayout> {
    const saved = await sessionManager.saveScopeLayout(layout);
    this.broadcast({
      type: 'LAYOUT_UPDATE',
      layout,
    });
    return saved;
  }

  /**
   * Request detached window to dock back to main application
   */
  public async requestDockBack(): Promise<void> {
    this.broadcast({
      type: 'DOCK_BACK',
    });
    await sessionManager.saveScopeLayout({ isDetached: false });
    if (this._popoutWindowRef && !this._popoutWindowRef.closed) {
      this._popoutWindowRef.close();
      this._popoutWindowRef = null;
    }
  }

  /**
   * Launch a detached native OS window for the Oscilloscope
   */
  public async openPopoutWindow(options: PopoutWindowOptions = {}): Promise<Window | null> {
    const savedLayout = await sessionManager.getScopeLayout();
    const width = options.width || savedLayout.width || 1120;
    const height = options.height || savedLayout.height || 740;

    // Dual-Monitor layout placement calculation:
    // If available screen width > 1920 (multi-monitor), default pop-out onto secondary monitor
    let left = options.left !== undefined ? options.left : savedLayout.x;
    let top = options.top !== undefined ? options.top : savedLayout.y;

    if (left === undefined || top === undefined || (left === 100 && top === 100)) {
      if (typeof window !== 'undefined') {
        const screenW = window.screen.availWidth || 1920;
        const currentWinLeft = window.screenX || 0;

        // Multi-monitor heuristic: place on right monitor if available, or offset from parent window
        if (screenW > 2400) {
          left = Math.round(screenW / 2 + 100);
          top = 100;
        } else {
          left = Math.max(50, currentWinLeft + 120);
          top = Math.max(50, (window.screenY || 0) + 80);
        }
      } else {
        left = 100;
        top = 100;
      }
    }

    // Persist detached state and layout
    await sessionManager.saveScopeLayout({
      isDetached: true,
      x: left,
      y: top,
      width,
      height,
      signals: options.signals || savedLayout.signals,
      viewMode: options.viewMode || savedLayout.viewMode,
      frameId: options.frameId !== undefined ? options.frameId : savedLayout.frameId,
    });

    const query = new URLSearchParams();
    query.set('view', 'detached-scope');
    if (options.frameId) query.set('frameId', options.frameId);
    if (options.signals && options.signals.length > 0) {
      query.set('signals', options.signals.join(','));
    }
    if (options.viewMode) query.set('mode', options.viewMode);

    const targetUrl = `${window.location.origin}${window.location.pathname}?${query.toString()}`;
    const windowName = 'PSCadModern_DetachedOscilloscope';

    // 1. Try Tauri native multi-window if running in desktop shell
    if (tauriBridge.isTauri()) {
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const existing = await WebviewWindow.getByLabel('pscad_detached_scope');
        if (existing) {
          await existing.show();
          await existing.setFocus();
          return null;
        }

        const newWin = new WebviewWindow('pscad_detached_scope', {
          url: `/?${query.toString()}`,
          title: options.title || 'PSCAD CLONE - Detached Oscilloscope Multi-Monitor Suite',
          width,
          height,
          x: left,
          y: top,
          minWidth: 550,
          minHeight: 380,
          decorations: true,
          resizable: true,
          focus: true,
        });

        newWin.once('tauri://created', () => {
          console.log('[TelemetryStreamer] Native Tauri Detached Scope Window created successfully');
        });

        return null;
      } catch (err) {
        console.warn('[TelemetryStreamer] Tauri WebviewWindow creation failed, falling back to window.open:', err);
      }
    }

    // 2. Browser standard window.open pop-out
    if (this._popoutWindowRef && !this._popoutWindowRef.closed) {
      this._popoutWindowRef.focus();
      return this._popoutWindowRef;
    }

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=no',
      'status=no',
      'toolbar=no',
      'menubar=no',
      'location=no',
    ].join(',');

    try {
      const popWin = window.open(targetUrl, windowName, features);
      if (popWin) {
        this._popoutWindowRef = popWin;
        popWin.focus();

        // Broadcast initial state once opened
        setTimeout(() => {
          this.broadcast({
            type: 'POPOUT_INIT',
            frameId: options.frameId,
            viewMode: options.viewMode,
          });
        }, 500);

        return popWin;
      }
    } catch (e) {
      console.error('[TelemetryStreamer] window.open failed:', e);
    }

    return null;
  }

  public getCachedSignals(): Map<string, number[]> {
    return this._cachedSignals;
  }

  public getCachedSimState(): SimulationState | null {
    return this._cachedSimState;
  }
}

export const telemetryStreamer = new TelemetryStreamer();
