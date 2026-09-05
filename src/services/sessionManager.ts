import { tauriBridge } from './tauriBridge';
import { nativeFileSystem } from './nativeFileSystem';

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  componentCount: number;
  wireCount: number;
  thumbnail?: string;
}

export interface SessionAutoSave {
  projectName: string;
  filePath?: string;
  savedAt: number;
  jsonContent: string;
  thumbnail?: string;
}

export interface ScopeWindowLayout {
  isDetached: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  monitorIndex?: number;
  monitorName?: string;
  isMaximized?: boolean;
  signals?: string[];
  viewMode?: string;
  frameId?: string | null;
  autoRestore: boolean;
  lastUpdated: number;
}

export type InspectorMode = 'docked' | 'modal';

export interface WorkspaceLayout {
  leftWidth: number;
  leftTopHeight: number;
  rightWidth: number;
  bottomHeight: number;
  splitRatio: number;
  activeView: 'schematic' | 'oscilloscope' | 'split';
  inspectorMode: InspectorMode;
  isRightDockCollapsed: boolean;
  lastUpdated: number;
}

export interface MultiMonitorInfo {
  isMultiMonitor: boolean;
  monitorCount: number;
  primaryWidth: number;
  primaryHeight: number;
  totalWidth: number;
  isExtended?: boolean;
}

export const DEFAULT_SCOPE_LAYOUT: ScopeWindowLayout = {
  isDetached: false,
  x: 100,
  y: 100,
  width: 1100,
  height: 740,
  monitorIndex: 0,
  autoRestore: true,
  lastUpdated: 0,
};

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  leftWidth: 260,
  leftTopHeight: 145,
  rightWidth: 288,
  bottomHeight: 144,
  splitRatio: 50,
  activeView: 'schematic',
  inspectorMode: 'docked',
  isRightDockCollapsed: false,
  lastUpdated: 0,
};

const LOCAL_STORAGE_RECENT = 'pscad_clone_recent_projects_v1';
const LOCAL_STORAGE_AUTOSAVE = 'pscad_clone_autosave_v1';
const LOCAL_STORAGE_SCOPE_LAYOUT = 'pscad_clone_scope_layout_v1';
const LOCAL_STORAGE_WORKSPACE_LAYOUT = 'pscad_clone_workspace_layout_v1';

class SessionManager {
  private _autoSaveTimer: any = null;
  private _isDirty: boolean = false;
  private _onDirtyChangeListeners: Set<(dirty: boolean) => void> = new Set();
  private _onAutoSaveListeners: Set<(timestamp: number) => void> = new Set();

  constructor() {
    this.startAutoSaveLoop();
  }

  public isDirty(): boolean {
    return this._isDirty;
  }

  public setDirty(dirty: boolean) {
    if (this._isDirty !== dirty) {
      this._isDirty = dirty;
      this._onDirtyChangeListeners.forEach((fn) => fn(dirty));
    }
  }

  public onDirtyChange(listener: (dirty: boolean) => void): () => void {
    this._onDirtyChangeListeners.add(listener);
    return () => this._onDirtyChangeListeners.delete(listener);
  }

  public onAutoSave(listener: (timestamp: number) => void): () => void {
    this._onAutoSaveListeners.add(listener);
    return () => this._onAutoSaveListeners.delete(listener);
  }

  /**
   * Capture and save current session cache
   */
  public async performAutoSave(
    projectName: string,
    jsonContent: string,
    thumbnail?: string
  ): Promise<void> {
    const savedAt = Date.now();
    const sessionData: SessionAutoSave = {
      projectName,
      filePath: nativeFileSystem.getCurrentFilePath() || undefined,
      savedAt,
      jsonContent,
      thumbnail,
    };

    // Save to LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTOSAVE, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('[SessionManager] LocalStorage auto-save write error:', e);
    }

    // Save to Native Backend if in Tauri
    if (tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('save_session_cache', {
          data: {
            project_name: projectName,
            file_path: sessionData.filePath,
            saved_at: savedAt,
            json_content: jsonContent,
          },
        });
      } catch (err) {
        console.warn('[SessionManager] Native auto-save failed:', err);
      }
    }

    this._onAutoSaveListeners.forEach((fn) => fn(savedAt));
  }

  /**
   * Check for recoverable session from crash or unexpected exit
   */
  public async checkRecoverableSession(): Promise<SessionAutoSave | null> {
    // Check Tauri native cache first
    if (tauriBridge.isTauri()) {
      try {
        const nativeCache = await tauriBridge.invoke<any>('load_session_cache');
        if (nativeCache && nativeCache.json_content) {
          return {
            projectName: nativeCache.project_name,
            filePath: nativeCache.file_path,
            savedAt: nativeCache.saved_at,
            jsonContent: nativeCache.json_content,
          };
        }
      } catch (err) {
        console.warn('[SessionManager] Native session cache load error:', err);
      }
    }

    // Check LocalStorage cache
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUTOSAVE);
      if (stored) {
        return JSON.parse(stored) as SessionAutoSave;
      }
    } catch (e) {
      console.warn('[SessionManager] LocalStorage session read error:', e);
    }

    return null;
  }

  /**
   * Clear session cache upon clean user exit or save
   */
  public async clearAutoSave(): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_STORAGE_AUTOSAVE);
    } catch (e) {}

    if (tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('clear_session_cache');
      } catch (e) {}
    }
  }

  /**
   * Get Recent Projects
   */
  public async getRecentProjects(): Promise<RecentProject[]> {
    if (tauriBridge.isTauri()) {
      try {
        const rawList = await tauriBridge.invoke<any[]>('get_recent_projects');
        if (Array.isArray(rawList)) {
          return rawList.map((r) => ({
            id: r.id || r.path,
            name: r.name,
            path: r.path,
            lastOpened: r.last_opened,
            componentCount: r.component_count || 0,
            wireCount: r.wire_count || 0,
            thumbnail: r.thumbnail,
          }));
        }
      } catch (err) {
        console.warn('[SessionManager] Native recent projects failed, falling back:', err);
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_RECENT);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}

    return [];
  }

  /**
   * Register a project into recent projects history
   */
  public async addRecentProject(project: {
    name: string;
    path: string;
    componentCount: number;
    wireCount: number;
    thumbnail?: string;
  }): Promise<RecentProject[]> {
    const item: RecentProject = {
      id: project.path || `proj_${Date.now()}`,
      name: project.name,
      path: project.path,
      lastOpened: Date.now(),
      componentCount: project.componentCount,
      wireCount: project.wireCount,
      thumbnail: project.thumbnail,
    };

    let list = await this.getRecentProjects();
    list = list.filter((p) => p.path !== item.path && p.name !== item.name);
    list.unshift(item);
    if (list.length > 20) list = list.slice(0, 20);

    try {
      localStorage.setItem(LOCAL_STORAGE_RECENT, JSON.stringify(list));
    } catch (e) {}

    if (tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('add_recent_project', {
          item: {
            id: item.id,
            name: item.name,
            path: item.path,
            last_opened: item.lastOpened,
            component_count: item.componentCount,
            wire_count: item.wireCount,
            thumbnail: item.thumbnail,
          },
        });
      } catch (err) {
        console.warn('[SessionManager] Native add recent project error:', err);
      }
    }

    return list;
  }

  /**
   * Remove recent project from list
   */
  public async removeRecentProject(pathOrId: string): Promise<RecentProject[]> {
    let list = await this.getRecentProjects();
    list = list.filter((p) => p.path !== pathOrId && p.id !== pathOrId);

    try {
      localStorage.setItem(LOCAL_STORAGE_RECENT, JSON.stringify(list));
    } catch (e) {}

    if (tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('remove_recent_project', {
          path_str: pathOrId,
        });
      } catch (err) {}
    }

    return list;
  }

  /**
   * Detect multi-monitor environment via Screen API and coordinate heuristics
   */
  public detectMultiMonitor(): MultiMonitorInfo {
    if (typeof window === 'undefined') {
      return {
        isMultiMonitor: false,
        monitorCount: 1,
        primaryWidth: 1920,
        primaryHeight: 1080,
        totalWidth: 1920,
        isExtended: false,
      };
    }

    const screen = window.screen;
    const isExtended = ('isExtended' in screen && Boolean((screen as any).isExtended)) || false;
    const availWidth = screen.availWidth || 1920;
    const availHeight = screen.availHeight || 1080;
    const width = screen.width || 1920;

    // High virtual width span across multi-monitors or window positioned outside standard single monitor
    const isVirtualMultiSpan = availWidth >= 2400 || width >= 2400;
    const isWindowOnSecondary = typeof window.screenX === 'number' && (window.screenX >= 1800 || window.screenX < -100);

    const isMultiMonitor = isExtended || isVirtualMultiSpan || isWindowOnSecondary;
    const monitorCount = isMultiMonitor ? Math.max(2, Math.round(availWidth / 1920) || 2) : 1;

    return {
      isMultiMonitor,
      monitorCount,
      primaryWidth: Math.min(availWidth, 1920),
      primaryHeight: availHeight,
      totalWidth: availWidth,
      isExtended,
    };
  }

  /**
   * Safe screen clamp to prevent opening windows out-of-bounds or off-screen
   */
  public clampBoundsToScreen(
    x: number,
    y: number,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } {
    const clampedW = Math.max(460, Math.min(width || 1100, 3840));
    const clampedH = Math.max(320, Math.min(height || 740, 2160));

    // Allow spanning onto secondary monitor if coordinate is negative or > primary width
    const clampedX = Math.max(-3840, Math.min(x ?? 100, 7680));
    const clampedY = Math.max(20, Math.min(y ?? 100, 2160));

    return {
      x: clampedX,
      y: clampedY,
      width: clampedW,
      height: clampedH,
    };
  }

  /**
   * Save detached oscilloscope window layout
   */
  public async saveScopeLayout(partial: Partial<ScopeWindowLayout>): Promise<ScopeWindowLayout> {
    const current = await this.getScopeLayout();
    const updated: ScopeWindowLayout = {
      ...current,
      ...partial,
      lastUpdated: Date.now(),
    };

    // Clamp coordinates
    const clamped = this.clampBoundsToScreen(updated.x, updated.y, updated.width, updated.height);
    updated.x = clamped.x;
    updated.y = clamped.y;
    updated.width = clamped.width;
    updated.height = clamped.height;

    try {
      localStorage.setItem(LOCAL_STORAGE_SCOPE_LAYOUT, JSON.stringify(updated));
    } catch (e) {
      console.warn('[SessionManager] Failed to persist scope layout to localStorage:', e);
    }

    if (tauriBridge.isTauri()) {
      try {
        await tauriBridge.invoke('save_scope_layout', { layout: updated });
      } catch (err) {
        // Suppress if command is handled in frontend
      }
    }

    return updated;
  }

  /**
   * Retrieve saved detached oscilloscope layout
   */
  public async getScopeLayout(): Promise<ScopeWindowLayout> {
    if (tauriBridge.isTauri()) {
      try {
        const nativeLayout = await tauriBridge.invoke<ScopeWindowLayout>('get_scope_layout');
        if (nativeLayout && typeof nativeLayout.x === 'number') {
          return { ...DEFAULT_SCOPE_LAYOUT, ...nativeLayout };
        }
      } catch (e) {}
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SCOPE_LAYOUT);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SCOPE_LAYOUT, ...parsed };
      }
    } catch (e) {}

    return { ...DEFAULT_SCOPE_LAYOUT };
  }

  /**
   * Clear saved scope layout
   */
  public async clearScopeLayout(): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_STORAGE_SCOPE_LAYOUT);
    } catch (e) {}
  }

  /**
   * Check if detached oscilloscope layout should automatically restore on startup
   */
  public async shouldAutoRestoreScope(): Promise<boolean> {
    const layout = await this.getScopeLayout();
    if (!layout.autoRestore || !layout.isDetached) {
      return false;
    }

    // Auto-restore is valid if multi-monitor is present OR if explicitly saved as detached
    const multi = this.detectMultiMonitor();
    return multi.isMultiMonitor || layout.autoRestore;
  }

  /**
   * Save workspace docking layout
   */
  public async saveWorkspaceLayout(partial: Partial<WorkspaceLayout>): Promise<WorkspaceLayout> {
    const current = await this.getWorkspaceLayout();
    const updated: WorkspaceLayout = {
      ...current,
      ...partial,
      lastUpdated: Date.now(),
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_WORKSPACE_LAYOUT, JSON.stringify(updated));
    } catch (e) {}

    return updated;
  }

  /**
   * Retrieve saved workspace docking layout
   */
  public async getWorkspaceLayout(): Promise<WorkspaceLayout> {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_WORKSPACE_LAYOUT);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_WORKSPACE_LAYOUT, ...parsed };
      }
    } catch (e) {}

    return { ...DEFAULT_WORKSPACE_LAYOUT };
  }

  /**
   * Quick access to inspector mode preference
   */
  public async getInspectorMode(): Promise<InspectorMode> {
    const layout = await this.getWorkspaceLayout();
    return layout.inspectorMode || 'docked';
  }

  /**
   * Save updated inspector mode preference
   */
  public async saveInspectorMode(mode: InspectorMode): Promise<WorkspaceLayout> {
    return this.saveWorkspaceLayout({ inspectorMode: mode });
  }

  private startAutoSaveLoop() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    // Trigger auto-save every 30 seconds
    this._autoSaveTimer = setInterval(() => {
      if (this._isDirty) {
        // Trigger auto save event to request project snapshot from App
        window.dispatchEvent(new CustomEvent('pscad_request_autosave'));
      }
    }, 30000);
    if (this._autoSaveTimer && typeof (this._autoSaveTimer as any).unref === 'function') {
      (this._autoSaveTimer as any).unref();
    }
  }
}

export const sessionManager = new SessionManager();
