/**
 * High-Performance Tauri 2.0 Bridge & IPC Abstraction Layer
 * Provides seamless dual-mode execution (Desktop Native vs Browser Dev Server)
 */

export interface NativeWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

class TauriBridge {
  private _isTauri: boolean | null = null;

  public isTauri(): boolean {
    if (this._isTauri !== null) return this._isTauri;
    this._isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    return this._isTauri;
  }

  public async invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<T>(cmd, args);
      } catch (err) {
        console.warn(`[TauriBridge] Native invoke '${cmd}' failed, falling back:`, err);
        throw err;
      }
    }
    throw new Error(`Native command '${cmd}' is only available in Desktop Shell`);
  }

  public async listen<T = any>(
    event: string,
    handler: (event: { payload: T }) => void
  ): Promise<() => void> {
    if (this.isTauri()) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<T>(event, (e) => handler(e as any));
        return unlisten;
      } catch (err) {
        console.warn(`[TauriBridge] Native listen '${event}' failed:`, err);
      }
    }
    // Fallback: window custom event
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<T>;
      handler({ payload: customEvent.detail });
    };
    window.addEventListener(`pscad_${event}`, listener);
    return () => window.removeEventListener(`pscad_${event}`, listener);
  }

  public async emit<T = any>(event: string, payload?: T): Promise<void> {
    if (this.isTauri()) {
      try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit(event, payload);
        return;
      } catch (err) {
        console.warn(`[TauriBridge] Native emit '${event}' failed:`, err);
      }
    }
    // Fallback: dispatch custom event in browser
    window.dispatchEvent(new CustomEvent(`pscad_${event}`, { detail: payload }));
  }

  public getWindowControls(): NativeWindowControls {
    return {
      minimize: async () => {
        if (this.isTauri()) {
          try {
            await this.invoke('window_minimize');
            return;
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().minimize();
              return;
            } catch (err) {
              console.error('[TauriBridge] minimize error:', err);
            }
          }
        } else {
          console.log('[Browser Shell] Minimize window');
        }
      },
      toggleMaximize: async () => {
        if (this.isTauri()) {
          try {
            await this.invoke('window_toggle_maximize');
            return;
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().toggleMaximize();
              return;
            } catch (err) {
              console.error('[TauriBridge] toggleMaximize error:', err);
            }
          }
        } else {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      },
      close: async () => {
        if (this.isTauri()) {
          try {
            await this.invoke('window_close');
            return;
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().close();
              return;
            } catch (err) {
              console.error('[TauriBridge] close error:', err);
            }
          }
        } else {
          if (confirm('Close PSCAD Modern? Any unsaved changes will be kept in auto-save cache.')) {
            window.close();
          }
        }
      },
      setAlwaysOnTop: async (alwaysOnTop: boolean) => {
        if (this.isTauri()) {
          try {
            await this.invoke('window_set_always_on_top', { alwaysOnTop });
            return;
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
              return;
            } catch (err) {
              console.error('[TauriBridge] setAlwaysOnTop error:', err);
            }
          }
        }
      },
      setFullscreen: async (fullscreen: boolean) => {
        if (this.isTauri()) {
          try {
            await this.invoke('window_set_fullscreen', { fullscreen });
            return;
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().setFullscreen(fullscreen);
              return;
            } catch (err) {
              console.error('[TauriBridge] setFullscreen error:', err);
            }
          }
        } else {
          if (fullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      },
      isMaximized: async () => {
        if (this.isTauri()) {
          try {
            return await this.invoke<boolean>('window_is_maximized');
          } catch (e) {
            try {
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              return await getCurrentWindow().isMaximized();
            } catch (err) {
              return false;
            }
          }
        }
        return Boolean(document.fullscreenElement);
      },
    };
  }
}

export const tauriBridge = new TauriBridge();
export const isTauri = () => tauriBridge.isTauri();
export const invokeTauri = <T = any>(cmd: string, args?: Record<string, any>) => tauriBridge.invoke<T>(cmd, args);
