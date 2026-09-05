/**
 * PSCAD Modern - Multi-Monitor Workspace Layout Persistence Unit Tests
 * Phase 20 - Step 20.4: Multi-Monitor Workspace Layout Persistence
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionManager,
  DEFAULT_SCOPE_LAYOUT,
} from '../services/sessionManager';
import { TelemetryStreamer, type TelemetryPayload } from '../services/telemetryStreamer';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Attach mock localStorage to global object
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  (globalThis as any).localStorage = new MockLocalStorage();
}

describe('SessionManager - Multi-Monitor Scope Layout Persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    await sessionManager.clearScopeLayout();
  });

  it('returns default layout values when no saved layout exists', async () => {
    const layout = await sessionManager.getScopeLayout();
    assert.equal(layout.isDetached, false);
    assert.equal(layout.width, DEFAULT_SCOPE_LAYOUT.width);
    assert.equal(layout.height, DEFAULT_SCOPE_LAYOUT.height);
    assert.equal(layout.x, DEFAULT_SCOPE_LAYOUT.x);
    assert.equal(layout.y, DEFAULT_SCOPE_LAYOUT.y);
    assert.equal(layout.autoRestore, true);
  });

  it('saves and merges scope layout attributes cleanly', async () => {
    const saved = await sessionManager.saveScopeLayout({
      isDetached: true,
      x: 1980,
      y: 120,
      width: 1280,
      height: 800,
      signals: ['V_Bus1', 'I_Line1'],
      viewMode: 'harmonic',
      autoRestore: true,
    });

    assert.equal(saved.isDetached, true);
    assert.equal(saved.x, 1980);
    assert.equal(saved.y, 120);
    assert.equal(saved.width, 1280);
    assert.equal(saved.height, 800);
    assert.deepEqual(saved.signals, ['V_Bus1', 'I_Line1']);
    assert.equal(saved.viewMode, 'harmonic');
    assert.ok(saved.lastUpdated > 0);

    // Verify retrieval from persistence
    const reloaded = await sessionManager.getScopeLayout();
    assert.equal(reloaded.isDetached, true);
    assert.equal(reloaded.x, 1980);
    assert.equal(reloaded.width, 1280);
    assert.deepEqual(reloaded.signals, ['V_Bus1', 'I_Line1']);
  });

  it('clamps invalid or offscreen bounds safely', () => {
    // Too small width/height
    const small = sessionManager.clampBoundsToScreen(100, 100, 100, 100);
    assert.ok(small.width >= 460, 'Width should clamp to min 460');
    assert.ok(small.height >= 320, 'Height should clamp to min 320');

    // Negative Y should be clamped to top bar safe bound
    const negY = sessionManager.clampBoundsToScreen(100, -500, 1000, 700);
    assert.ok(negY.y >= 20, 'Y should clamp to safe top bound >= 20');

    // Multi-monitor secondary screen coordinate (e.g. x = 2560) should be preserved
    const multiX = sessionManager.clampBoundsToScreen(2560, 120, 1200, 800);
    assert.equal(multiX.x, 2560, 'Secondary display X position should be preserved');
  });

  it('evaluates shouldAutoRestoreScope based on detached flag and autoRestore toggle', async () => {
    // Not detached
    await sessionManager.saveScopeLayout({ isDetached: false, autoRestore: true });
    let shouldRestore = await sessionManager.shouldAutoRestoreScope();
    assert.equal(shouldRestore, false);

    // Detached but autoRestore disabled
    await sessionManager.saveScopeLayout({ isDetached: true, autoRestore: false });
    shouldRestore = await sessionManager.shouldAutoRestoreScope();
    assert.equal(shouldRestore, false);

    // Detached and autoRestore enabled
    await sessionManager.saveScopeLayout({ isDetached: true, autoRestore: true });
    shouldRestore = await sessionManager.shouldAutoRestoreScope();
    assert.equal(shouldRestore, true);
  });

  it('clears scope layout cleanly upon clearScopeLayout', async () => {
    await sessionManager.saveScopeLayout({ isDetached: true, x: 2200 });
    await sessionManager.clearScopeLayout();
    const layout = await sessionManager.getScopeLayout();
    assert.equal(layout.isDetached, false);
    assert.equal(layout.x, DEFAULT_SCOPE_LAYOUT.x);
  });
});

describe('SessionManager - Multi-Monitor Detection & Workspace Docking Persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
  });

  it('detects multi-monitor heuristics and reports monitor structure', () => {
    const info = sessionManager.detectMultiMonitor();
    assert.ok(typeof info.isMultiMonitor === 'boolean');
    assert.ok(info.monitorCount >= 1);
    assert.ok(info.primaryWidth > 0);
  });

  it('persists and restores workspace docking dimensions and active view', async () => {
    const updated = await sessionManager.saveWorkspaceLayout({
      leftWidth: 320,
      leftTopHeight: 180,
      rightWidth: 350,
      bottomHeight: 200,
      splitRatio: 65,
      activeView: 'split',
    });

    assert.equal(updated.leftWidth, 320);
    assert.equal(updated.leftTopHeight, 180);
    assert.equal(updated.rightWidth, 350);
    assert.equal(updated.bottomHeight, 200);
    assert.equal(updated.splitRatio, 65);
    assert.equal(updated.activeView, 'split');

    const reloaded = await sessionManager.getWorkspaceLayout();
    assert.equal(reloaded.leftWidth, 320);
    assert.equal(reloaded.splitRatio, 65);
    assert.equal(reloaded.activeView, 'split');
  });
});

describe('TelemetryStreamer - Layout Update & Multi-Window Sync', () => {
  let streamer: TelemetryStreamer;

  beforeEach(async () => {
    localStorage.clear();
    await sessionManager.clearScopeLayout();
    streamer = new TelemetryStreamer();
  });

  afterEach(() => {
    streamer.destroy();
  });

  it('broadcasts LAYOUT_UPDATE and persists updated geometry to sessionManager', async () => {
    let receivedLayout: any = null;
    const receiver = new TelemetryStreamer();
    const unsub = receiver.subscribe((payload: TelemetryPayload) => {
      if (payload.type === 'LAYOUT_UPDATE') {
        receivedLayout = payload.layout;
      }
    });

    await streamer.broadcastLayoutUpdate({
      x: 2100,
      y: 150,
      width: 1200,
      height: 750,
      isDetached: true,
      autoRestore: true,
    });

    // Brief tick for broadcast transport delivery
    await new Promise((r) => setTimeout(r, 40));

    // Check saved state in sessionManager
    const saved = await sessionManager.getScopeLayout();
    assert.equal(saved.x, 2100);
    assert.equal(saved.y, 150);
    assert.equal(saved.isDetached, true);
    assert.ok(receivedLayout, 'Receiver should have received layout payload');

    unsub();
    receiver.destroy();
  });

  it('updates session layout to isDetached: false upon requestDockBack', async () => {
    await sessionManager.saveScopeLayout({ isDetached: true, x: 2000 });
    await streamer.requestDockBack();

    const saved = await sessionManager.getScopeLayout();
    assert.equal(saved.isDetached, false);
  });
});
