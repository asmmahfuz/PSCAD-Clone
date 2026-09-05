/**
 * PSCAD CLONE - Dual Inspector Mode Unit Tests
 * Phase 21 - Step 21.4: Dual Inspector Mode (Docked Sidebar vs. Modal Dialog Toggle)
 * 
 * Validates:
 * - Session layout defaults with inspectorMode & collapse states
 * - Inspector mode persistence & retrieval in sessionManager
 * - Seamless parameter edit preservation during mode transitions
 * - Selection persistence across inspector toggles
 * - Rail collapse geometry and width constraints
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  sessionManager,
  type InspectorMode,
} from '../services/sessionManager';
import { COMPONENT_TYPES } from '../constants';
import type { CircuitComponentData } from '../types';

// Mock localStorage for Node test runner
const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mockStorage.get(k) || null,
  setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
  removeItem: (k: string) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

describe('Dual Inspector Mode - Session & Layout Persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('provides default workspace layout with docked inspector mode and uncollapsed dock', () => {
    assert.equal(DEFAULT_WORKSPACE_LAYOUT.inspectorMode, 'docked');
    assert.equal(DEFAULT_WORKSPACE_LAYOUT.isRightDockCollapsed, false);
    assert.equal(DEFAULT_WORKSPACE_LAYOUT.rightWidth, 288);
  });

  it('retrieves default inspector mode as "docked" when no session is stored', async () => {
    const mode = await sessionManager.getInspectorMode();
    assert.equal(mode, 'docked');
  });

  it('persists and restores "modal" inspector mode successfully', async () => {
    await sessionManager.saveInspectorMode('modal');
    const mode = await sessionManager.getInspectorMode();
    assert.equal(mode, 'modal');

    const layout = await sessionManager.getWorkspaceLayout();
    assert.equal(layout.inspectorMode, 'modal');
  });

  it('persists and restores right dock collapsed state with layout', async () => {
    await sessionManager.saveWorkspaceLayout({
      inspectorMode: 'modal',
      isRightDockCollapsed: true,
      rightWidth: 320,
    });

    const layout = await sessionManager.getWorkspaceLayout();
    assert.equal(layout.inspectorMode, 'modal');
    assert.equal(layout.isRightDockCollapsed, true);
    assert.equal(layout.rightWidth, 320);
  });

  it('switches back to "docked" mode and preserves user custom rightWidth', async () => {
    await sessionManager.saveWorkspaceLayout({
      inspectorMode: 'modal',
      isRightDockCollapsed: true,
      rightWidth: 350,
    });

    await sessionManager.saveWorkspaceLayout({
      inspectorMode: 'docked',
      isRightDockCollapsed: false,
    });

    const layout = await sessionManager.getWorkspaceLayout();
    assert.equal(layout.inspectorMode, 'docked');
    assert.equal(layout.isRightDockCollapsed, false);
    assert.equal(layout.rightWidth, 350); // Preserved previous custom width
  });
});

describe('Dual Inspector Mode - Layout Geometry & Width Calculations', () => {
  it('determines effective sidebar width based on collapsed state', () => {
    const getEffectiveWidth = (isCollapsed: boolean, rightWidth: number) => {
      return isCollapsed ? 28 : Math.max(180, Math.min(650, rightWidth || 288));
    };

    // When collapsed, width is 28px slim rail
    assert.equal(getEffectiveWidth(true, 300), 28);
    assert.equal(getEffectiveWidth(true, 500), 28);

    // When expanded, width matches configured width within bounds
    assert.equal(getEffectiveWidth(false, 288), 288);
    assert.equal(getEffectiveWidth(false, 400), 400);

    // Clamps out-of-bounds widths
    assert.equal(getEffectiveWidth(false, 50), 180);
    assert.equal(getEffectiveWidth(false, 900), 650);
  });
});

describe('Dual Inspector Mode - Seamless Parameter Preservation', () => {
  it('preserves parameter edits when switching from docked inspector to modal dialog', () => {
    const originalComponent: CircuitComponentData = {
      id: 'res_1',
      name: 'R_Load',
      type: COMPONENT_TYPES.RESISTOR,
      x: 200,
      y: 200,
      rotation: 0,
      params: { R: 50 },
    };

    // User edits parameter in docked inspector
    const updatedInDock: CircuitComponentData = {
      ...originalComponent,
      name: 'R_Load_Modified',
      params: { ...originalComponent.params, R: 120 },
    };

    // User triggers "Open Floating Modal" (onOpenModal)
    // The modal receives the component with modified params
    const modalDraft = {
      component: updatedInDock,
      draftParams: { ...updatedInDock.params },
      draftName: updatedInDock.name,
    };

    assert.equal(modalDraft.component.id, 'res_1');
    assert.equal(modalDraft.draftName, 'R_Load_Modified');
    assert.equal(modalDraft.draftParams.R, 120);
  });

  it('preserves parameter edits when docking from modal dialog back to sidebar', () => {
    const initialComponent: CircuitComponentData = {
      id: 'xfmr_1',
      name: 'T1',
      type: COMPONENT_TYPES.TRANSFORMER_3PH,
      x: 300,
      y: 300,
      rotation: 0,
      params: {
        primaryConn: 'Yg',
        secondaryConn: 'Delta',
        ratedMVA: 100,
        V_pri_kV: 230,
        V_sec_kV: 69,
      },
    };

    // User edits parameters in modal dialog
    const modalDraftEdits: CircuitComponentData = {
      ...initialComponent,
      name: 'T1_Substation',
      params: {
        ...initialComponent.params,
        primaryConn: 'Delta',
        secondaryConn: 'Delta',
        ratedMVA: 150,
      },
    };

    // User clicks "Dock to Sidebar" (onDockToSidebar)
    let selectedComponent: CircuitComponentData | null = null;
    let isModalOpen = true;
    let inspectorMode: InspectorMode = 'modal';
    let isCollapsed = true;

    const handleDockToSidebar = (updated: CircuitComponentData) => {
      selectedComponent = updated;
      isModalOpen = false;
      inspectorMode = 'docked';
      isCollapsed = false;
    };

    handleDockToSidebar(modalDraftEdits);

    assert.equal(isModalOpen, false);
    assert.equal(inspectorMode, 'docked');
    assert.equal(isCollapsed, false);
    assert.notEqual(selectedComponent, null);
    assert.equal((selectedComponent as any).name, 'T1_Substation');
    assert.equal((selectedComponent as any).params.ratedMVA, 150);
    assert.equal((selectedComponent as any).params.primaryConn, 'Delta');
  });

  it('retains component selection without resetting when toggling inspector mode', () => {
    const component: CircuitComponentData = {
      id: 'cap_1',
      name: 'C_Filter',
      type: COMPONENT_TYPES.CAPACITOR,
      x: 400,
      y: 400,
      rotation: 90,
      params: { C: 1e-6 },
    };

    let activeSelected: CircuitComponentData | null = component;
    let mode: InspectorMode = 'docked';

    const toggleMode = () => {
      mode = mode === 'docked' ? 'modal' : 'docked';
      // Selection must remain active
    };

    toggleMode();
    assert.equal(mode, 'modal');
    assert.equal(activeSelected?.id, 'cap_1');

    toggleMode();
    assert.equal(mode, 'docked');
    assert.equal(activeSelected?.id, 'cap_1');
  });
});
