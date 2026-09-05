/**
 * PSCAD Modern - Hierarchical Submodule & Multi-Sheet System
 * 
 * Features:
 * - Multi-sheet schematic hierarchy with arbitrary nesting depth
 * - Input/Output/Electrical/Polyphase canvas port mapping
 * - Breadcrumb navigation management
 * - Recursive flat netlist compiler with port alias unifications
 */

import type { CircuitSheet, CircuitComponentData, WireData, PinDomain, PinDirection, SignalDataType } from '../types';
import { COMPONENT_TYPES } from '../constants';

export interface BreadcrumbItem {
  id: string;
  name: string;
  isRoot: boolean;
}

export interface SubmodulePortMapping {
  portId: string;
  portName: string;
  domain: PinDomain;
  direction: PinDirection;
  dataType?: SignalDataType;
  componentId: string; // The SUBMODULE_PORT_* component inside the child sheet
}

export class HierarchyManager {
  private sheets: Map<string, CircuitSheet> = new Map();
  private rootSheetId: string = 'root';
  private activeSheetId: string = 'root';

  constructor(initialComps: CircuitComponentData[] = [], initialWires: WireData[] = [], rootName = 'Main Schematic') {
    this.initRoot(initialComps, initialWires, rootName);
  }

  /**
   * Initialize or reset the root sheet
   */
  public initRoot(components: CircuitComponentData[], wires: WireData[], rootName = 'Main Schematic'): void {
    this.sheets.clear();
    this.rootSheetId = 'root';
    this.activeSheetId = 'root';
    this.sheets.set('root', {
      id: 'root',
      name: rootName,
      parentSheetId: null,
      parentComponentId: null,
      components: JSON.parse(JSON.stringify(components)),
      wires: JSON.parse(JSON.stringify(wires)),
    });
  }

  /**
   * Load full sheets collection from project
   */
  public loadSheets(sheetsRecord: Record<string, CircuitSheet>, activeId = 'root'): void {
    this.sheets.clear();
    Object.entries(sheetsRecord).forEach(([id, sheet]) => {
      this.sheets.set(id, {
        id,
        name: sheet.name,
        parentSheetId: sheet.parentSheetId || null,
        parentComponentId: sheet.parentComponentId || null,
        components: JSON.parse(JSON.stringify(sheet.components || [])),
        wires: JSON.parse(JSON.stringify(sheet.wires || [])),
      });
    });

    if (!this.sheets.has('root')) {
      const firstKey = Object.keys(sheetsRecord)[0] || 'root';
      this.rootSheetId = firstKey;
    } else {
      this.rootSheetId = 'root';
    }

    this.activeSheetId = this.sheets.has(activeId) ? activeId : this.rootSheetId;
  }

  /**
   * Export all sheets as a plain object record for serialization
   */
  public exportSheets(): Record<string, CircuitSheet> {
    const record: Record<string, CircuitSheet> = {};
    this.sheets.forEach((sheet, id) => {
      record[id] = {
        id: sheet.id,
        name: sheet.name,
        parentSheetId: sheet.parentSheetId,
        parentComponentId: sheet.parentComponentId,
        components: JSON.parse(JSON.stringify(sheet.components)),
        wires: JSON.parse(JSON.stringify(sheet.wires)),
      };
    });
    return record;
  }

  public getActiveSheetId(): string {
    return this.activeSheetId;
  }

  public getRootSheetId(): string {
    return this.rootSheetId;
  }

  public getSheet(sheetId: string): CircuitSheet | undefined {
    return this.sheets.get(sheetId);
  }

  public getActiveSheet(): CircuitSheet {
    let sheet = this.sheets.get(this.activeSheetId);
    if (!sheet) {
      sheet = {
        id: this.activeSheetId,
        name: 'Main Schematic',
        parentSheetId: null,
        parentComponentId: null,
        components: [],
        wires: [],
      };
      this.sheets.set(this.activeSheetId, sheet);
    }
    return sheet;
  }

  public getAllSheets(): CircuitSheet[] {
    return Array.from(this.sheets.values());
  }

  /**
   * Save current components and wires into the active sheet
   */
  public updateActiveSheet(components: CircuitComponentData[], wires: WireData[]): void {
    const active = this.getActiveSheet();
    active.components = components;
    active.wires = wires;
  }

  /**
   * Update a specific sheet's components and wires
   */
  public updateSheet(sheetId: string, components: CircuitComponentData[], wires: WireData[]): void {
    const sheet = this.sheets.get(sheetId);
    if (sheet) {
      sheet.components = components;
      sheet.wires = wires;
    }
  }

  /**
   * Create a new child submodule sheet
   */
  public createSubmoduleSheet(parentSheetId: string, submoduleCompId: string, name: string): CircuitSheet {
    const newSheetId = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSheet: CircuitSheet = {
      id: newSheetId,
      name: name || `Submodule_${newSheetId.substr(-4)}`,
      parentSheetId,
      parentComponentId: submoduleCompId,
      components: [
        // Default template with an In and Out port
        {
          id: `port_in_${Date.now()}`,
          type: COMPONENT_TYPES.SUBMODULE_PORT_IN,
          name: 'IN_1',
          x: 100,
          y: 200,
          rotation: 0,
          params: { portDirection: 'in', portDomain: 'control', signalName: 'IN_1' },
        },
        {
          id: `port_out_${Date.now()}`,
          type: COMPONENT_TYPES.SUBMODULE_PORT_OUT,
          name: 'OUT_1',
          x: 500,
          y: 200,
          rotation: 0,
          params: { portDirection: 'out', portDomain: 'control', signalName: 'OUT_1' },
        },
      ],
      wires: [],
    };

    this.sheets.set(newSheetId, newSheet);
    return newSheet;
  }

  /**
   * Add a prepared sheet into the hierarchy
   */
  public addSheet(sheet: CircuitSheet): void {
    this.sheets.set(sheet.id, JSON.parse(JSON.stringify(sheet)));
  }

  /**
   * Duplicate an existing sheet
   */
  public duplicateSheet(sheetId: string): CircuitSheet | null {
    const existing = this.sheets.get(sheetId);
    if (!existing) return null;

    const newId = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const cloned: CircuitSheet = {
      ...JSON.parse(JSON.stringify(existing)),
      id: newId,
      name: `${existing.name}_Copy`,
      parentSheetId: existing.parentSheetId,
      parentComponentId: null,
    };

    // Re-map component and wire IDs inside duplicated sheet to avoid ID collisions
    const idMap: Record<string, string> = {};
    cloned.components.forEach((c) => {
      const oldId = c.id;
      c.id = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      idMap[oldId] = c.id;
    });

    cloned.wires.forEach((w) => {
      w.id = `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (w.startPin) {
        const parts = w.startPin.split('_');
        const compOldId = parts.slice(0, -1).join('_');
        const pinSuffix = parts[parts.length - 1];
        if (idMap[compOldId]) {
          w.startPin = `${idMap[compOldId]}_${pinSuffix}`;
        }
      }
      if (w.endPin) {
        const parts = w.endPin.split('_');
        const compOldId = parts.slice(0, -1).join('_');
        const pinSuffix = parts[parts.length - 1];
        if (idMap[compOldId]) {
          w.endPin = `${idMap[compOldId]}_${pinSuffix}`;
        }
      }
    });

    this.sheets.set(newId, cloned);
    return cloned;
  }

  /**
   * Rename a sheet
   */
  public renameSheet(sheetId: string, newName: string): void {
    const sheet = this.sheets.get(sheetId);
    if (sheet) {
      sheet.name = newName;
    }
  }

  /**
   * Delete a sheet and any descendant child sheets recursively
   */
  public deleteSheet(sheetId: string): void {
    if (sheetId === this.rootSheetId) return; // Cannot delete root sheet

    // Find and delete all children recursively
    const findChildren = (parentId: string): string[] => {
      const children: string[] = [];
      this.sheets.forEach((s) => {
        if (s.parentSheetId === parentId) {
          children.push(s.id);
          children.push(...findChildren(s.id));
        }
      });
      return children;
    };

    const toDelete = [sheetId, ...findChildren(sheetId)];
    toDelete.forEach((id) => this.sheets.delete(id));

    if (toDelete.includes(this.activeSheetId)) {
      this.activeSheetId = this.rootSheetId;
    }
  }

  /**
   * Navigate to a specific sheet by ID
   */
  public navigateTo(sheetId: string): boolean {
    if (this.sheets.has(sheetId)) {
      this.activeSheetId = sheetId;
      return true;
    }
    return false;
  }

  /**
   * Navigate up to the parent sheet of the current active sheet
   */
  public navigateUp(): boolean {
    const active = this.getActiveSheet();
    if (active.parentSheetId && this.sheets.has(active.parentSheetId)) {
      this.activeSheetId = active.parentSheetId;
      return true;
    }
    return false;
  }

  /**
   * Get breadcrumb trail from root to active sheet
   */
  public getBreadcrumbs(): BreadcrumbItem[] {
    const crumbs: BreadcrumbItem[] = [];
    let currId: string | null = this.activeSheetId;

    while (currId) {
      const s = this.sheets.get(currId);
      if (!s) break;
      crumbs.unshift({
        id: s.id,
        name: s.name,
        isRoot: s.id === this.rootSheetId,
      });
      currId = s.parentSheetId || null;
    }

    return crumbs;
  }

  /**
   * Inspect child sheet and extract its interface ports
   */
  public getSubmodulePorts(childSheetId: string): SubmodulePortMapping[] {
    const sheet = this.sheets.get(childSheetId);
    if (!sheet) return [];

    const ports: SubmodulePortMapping[] = [];

    sheet.components.forEach((comp) => {
      let domain: PinDomain = 'control';
      let direction: PinDirection = 'in';

      if (comp.type === COMPONENT_TYPES.SUBMODULE_PORT_IN) {
        domain = comp.params.portDomain || 'control';
        direction = 'in';
      } else if (comp.type === COMPONENT_TYPES.SUBMODULE_PORT_OUT) {
        domain = comp.params.portDomain || 'control';
        direction = 'out';
      } else if (comp.type === COMPONENT_TYPES.SUBMODULE_PORT_ELECTRICAL) {
        domain = 'electrical';
        direction = 'bidirectional';
      } else if (comp.type === COMPONENT_TYPES.SUBMODULE_PORT_POLYPHASE) {
        domain = 'polyphase';
        direction = 'bidirectional';
      } else {
        return;
      }

      ports.push({
        portId: comp.params.portId || comp.name || comp.id,
        portName: comp.name || comp.params.signalName || 'PORT',
        domain,
        direction,
        dataType: comp.params.portDataType || 'real',
        componentId: comp.id,
      });
    });

    return ports;
  }

  /**
   * Recursively flatten the entire sheet hierarchy into a single unified netlist dataset
   */
  public flattenHierarchy(
    targetSheetId: string = this.rootSheetId,
    prefix: string = ''
  ): { components: CircuitComponentData[]; wires: WireData[] } {
    const sheet = this.sheets.get(targetSheetId);
    if (!sheet) return { components: [], wires: [] };

    const flatComps: CircuitComponentData[] = [];
    const flatWires: WireData[] = [];

    // Copy sheet wires with prefix
    sheet.wires.forEach((wire) => {
      flatWires.push({
        ...wire,
        id: prefix ? `${prefix}/${wire.id}` : wire.id,
        startPin: wire.startPin ? (prefix ? `${prefix}/${wire.startPin}` : wire.startPin) : null,
        endPin: wire.endPin ? (prefix ? `${prefix}/${wire.endPin}` : wire.endPin) : null,
      });
    });

    // Process components
    for (const comp of sheet.components) {
      if (comp.type === COMPONENT_TYPES.SUBMODULE) {
        let childSheetId = comp.params?.childSheetId;
        if (!childSheetId || !this.sheets.has(childSheetId)) {
          const matchingSheet = Array.from(this.sheets.values()).find(
            (s) => s.parentComponentId === comp.id
          );
          if (matchingSheet) {
            childSheetId = matchingSheet.id;
          }
        }

        if (childSheetId && this.sheets.has(childSheetId)) {
          const subPrefix = prefix ? `${prefix}/${comp.id}` : comp.id;
          const childFlat = this.flattenHierarchy(childSheetId, subPrefix);
          flatComps.push(...childFlat.components);
          flatWires.push(...childFlat.wires);

          // Connect child ports to the parent submodule block's pins
          const ports = this.getSubmodulePorts(childSheetId);
          ports.forEach((port, idx) => {
            const parentPinId = prefix ? `${prefix}/${comp.id}_p${idx + 1}` : `${comp.id}_p${idx + 1}`;
            const innerPinId = `${subPrefix}/${port.componentId}_p1`;

            // Bridge wire joining parent pin to inner port pin
            flatWires.push({
              id: `bridge_${comp.id}_port_${idx}`,
              startPin: parentPinId,
              endPin: innerPinId,
              points: [],
              domain: port.domain,
              dataType: port.dataType,
            });
          });
        }
      } else {
        // Normal component or port component
        flatComps.push({
          ...comp,
          id: prefix ? `${prefix}/${comp.id}` : comp.id,
          name: prefix ? `${prefix}/${comp.name}` : comp.name,
          params: { ...comp.params },
        });
      }
    }

    return { components: flatComps, wires: flatWires };
  }
}

export const hierarchyManager = new HierarchyManager();
