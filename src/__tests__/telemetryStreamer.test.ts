/**
 * PSCAD Modern - Telemetry Streamer & Bidirectional Cursor Sync Unit Tests
 * Phase 20 - Step 20.2: Synchronized High-Speed Telemetry Streaming Pipe
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TelemetryStreamer, type CursorSyncPayload, type StreamingMetrics } from '../services/telemetryStreamer';
import type { SimulationState } from '../types';

describe('TelemetryStreamer - High-Speed Telemetry Pipe & Cursor Sync', () => {
  let streamer: TelemetryStreamer;

  beforeEach(() => {
    streamer = new TelemetryStreamer();
  });

  afterEach(() => {
    streamer.destroy();
  });

  it('initializes with proper senderId and default metrics', () => {
    const senderId = streamer.getSenderId();
    assert.ok(senderId, 'Sender ID should be non-empty');
    assert.equal(typeof senderId, 'string');

    const metrics = streamer.getMetrics();
    assert.equal(metrics.packetCount, 0);
    assert.equal(metrics.samplesTotal, 0);
    assert.equal(metrics.fps, 0);
    assert.equal(metrics.latencyMs, 0);
    assert.ok(['BroadcastChannel', 'TauriIPC', 'LocalStorage', 'None'].includes(metrics.transport));
  });

  it('deserializes and caches incoming SIGNALS_CHUNK payloads', () => {
    const mockSimState: SimulationState = {
      isRunning: true,
      isPaused: false,
      t: 0.25,
      tMax: 0.5,
      dt: 50e-6,
      stepCount: 5000,
      speedMultiplier: 1.0,
      nodeCount: 8,
    };

    let receivedType: string | null = null;
    const unsub = streamer.subscribe((payload) => {
      receivedType = payload.type;
    });

    // Simulate incoming signal chunk from peer window
    streamer.handleIncomingPayload({
      type: 'SIGNALS_CHUNK',
      timestamp: Date.now() - 2, // 2ms latency
      senderId: 'peer-window-abc',
      projectName: 'Test EMTDC Microgrid',
      simState: mockSimState,
      tMax: 0.5,
      timeArray: [0, 0.001, 0.002, 0.003],
      signals: [
        { name: 'V_PhaseA', values: [100, 102, 104, 101] },
        { name: 'I_Branch1', values: [10, 11, 12, 11.5] },
      ],
    });

    assert.equal(receivedType, 'SIGNALS_CHUNK');

    const cachedSignals = streamer.getCachedSignals();
    assert.equal(cachedSignals.size, 3, 'Should cache Time + 2 signals');
    assert.deepEqual(cachedSignals.get('Time'), [0, 0.001, 0.002, 0.003]);
    assert.deepEqual(cachedSignals.get('V_PhaseA'), [100, 102, 104, 101]);
    assert.deepEqual(cachedSignals.get('I_Branch1'), [10, 11, 12, 11.5]);

    const cachedState = streamer.getCachedSimState();
    assert.ok(cachedState);
    assert.equal(cachedState?.t, 0.25);
    assert.equal(cachedState?.stepCount, 5000);

    unsub();
  });

  it('broadcasts and subscribes to bidirectional cursor sync events', () => {
    let capturedCursor: CursorSyncPayload | null = null;
    const unsub = streamer.subscribeCursor((data) => {
      capturedCursor = data;
    });

    // Simulate cursor movement from popout window
    streamer.handleIncomingPayload({
      type: 'CURSOR_SYNC',
      timestamp: Date.now() - 1,
      senderId: 'popout-window-999',
      cursorData: {
        crosshairTime: 0.145,
        sourceWindow: 'popout',
        frameId: 'graph-frame-1',
        c1: { enabled: true, t: 0.100 },
        c2: { enabled: false, t: 0.200 },
      },
    });

    const cursor = capturedCursor as unknown as CursorSyncPayload;
    assert.ok(cursor, 'Cursor listener should have fired');
    assert.equal(cursor.crosshairTime, 0.145);
    assert.equal(cursor.sourceWindow, 'popout');
    assert.equal(cursor.frameId, 'graph-frame-1');
    assert.equal(cursor.c1?.t, 0.100);

    // Verify cache
    const lastKnown = streamer.getLastKnownCursor();
    assert.ok(lastKnown);
    assert.equal(lastKnown?.crosshairTime, 0.145);

    unsub();
  });

  it('ignores self-echo payloads to prevent feedback loops', () => {
    let firedCount = 0;
    const unsub = streamer.subscribe(() => {
      firedCount++;
    });

    const selfId = streamer.getSenderId();

    // Payload originating from self
    streamer.handleIncomingPayload({
      type: 'CURSOR_SYNC',
      timestamp: Date.now(),
      senderId: selfId,
      cursorData: {
        crosshairTime: 0.333,
        sourceWindow: 'main',
      },
    });

    assert.equal(firedCount, 0, 'Self-echo should be discarded immediately');
    assert.equal(streamer.getMetrics().packetCount, 0, 'Packet count should not increment on self-echo');

    unsub();
  });

  it('accurately updates streaming performance metrics (FPS, packets, samples, latency)', () => {
    let notifiedMetrics: StreamingMetrics | null = null;
    const unsub = streamer.subscribeMetrics((m) => {
      notifiedMetrics = m;
    });

    const now = Date.now();
    // Simulate 5 incoming packets
    for (let i = 0; i < 5; i++) {
      streamer.handleIncomingPayload({
        type: 'SIGNALS_CHUNK',
        timestamp: now - 3,
        senderId: 'remote-sender',
        signals: [
          { name: 'Sig1', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        ],
      });
    }

    const metrics = streamer.getMetrics();
    assert.equal(metrics.packetCount, 5);
    assert.equal(metrics.samplesTotal, 50);
    assert.equal(metrics.fps, 5);
    assert.ok(metrics.latencyMs >= 0);
    const metricsNotified = notifiedMetrics as unknown as StreamingMetrics;
    assert.ok(metricsNotified);
    assert.equal(metricsNotified.packetCount, 5);

    // Test resetMetrics
    streamer.resetMetrics();
    const reset = streamer.getMetrics();
    assert.equal(reset.packetCount, 0);
    assert.equal(reset.samplesTotal, 0);
    assert.equal(reset.fps, 0);

    unsub();
  });

  it('supports broadcastCursor method and updates lastKnownCursor locally', () => {
    streamer.broadcastCursor({
      crosshairTime: 0.088,
      sourceWindow: 'main',
      frameId: 'polygraph-frame-alpha',
    });

    const last = streamer.getLastKnownCursor();
    assert.ok(last);
    assert.equal(last?.crosshairTime, 0.088);
    assert.equal(last?.sourceWindow, 'main');
    assert.equal(last?.senderId, streamer.getSenderId());
  });
});
