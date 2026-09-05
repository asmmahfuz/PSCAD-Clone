import { tauriBridge } from './tauriBridge';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface ProjectLoadResult {
  content: string;
  filePath?: string;
  fileName: string;
}

export interface SaveResult {
  success: boolean;
  filePath?: string;
  cancelled?: boolean;
}

class NativeFileSystemService {
  private _currentFilePath: string | null = null;
  private _browserFileHandle: any | null = null;

  public getCurrentFilePath(): string | null {
    return this._currentFilePath;
  }

  public setCurrentFilePath(path: string | null) {
    this._currentFilePath = path;
  }

  public resetFilePath() {
    this._currentFilePath = null;
    this._browserFileHandle = null;
  }

  /**
   * Save project to disk. If a file path is already active, writes directly.
   * Otherwise triggers Save As dialog.
   */
  public async saveProject(
    projectName: string,
    content: string,
    forceSaveAs: boolean = false
  ): Promise<SaveResult> {
    if (tauriBridge.isTauri()) {
      if (!forceSaveAs && this._currentFilePath) {
        try {
          await tauriBridge.invoke('write_project_file', {
            path: this._currentFilePath,
            content,
          });
          return { success: true, filePath: this._currentFilePath };
        } catch (err) {
          console.warn('[NativeFS] Direct save failed, falling back to Save As:', err);
        }
      }

      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selectedPath = await save({
          title: 'Save PSCAD CLONE Project',
          defaultPath: this._currentFilePath || `${projectName}.json`,
          filters: [
            { name: 'PSCAD CLONE Project (*.json)', extensions: ['json'] },
            { name: 'PSCAD v4/v5 Project (*.pscx)', extensions: ['pscx'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (!selectedPath) {
          return { success: false, cancelled: true };
        }

        await tauriBridge.invoke('write_project_file', {
          path: selectedPath,
          content,
        });
        this._currentFilePath = selectedPath;
        return { success: true, filePath: selectedPath };
      } catch (err) {
        console.error('[NativeFS] Save dialog failed:', err);
        throw err;
      }
    }

    // Web Browser File System Access API
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window && !forceSaveAs && this._browserFileHandle) {
      try {
        const writable = await this._browserFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { success: true, filePath: this._browserFileHandle.name };
      } catch (err) {
        console.warn('[BrowserFS] Direct write failed, prompting picker:', err);
      }
    }

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${projectName}.json`,
          types: [
            {
              description: 'PSCAD CLONE Project (*.json)',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        this._browserFileHandle = handle;
        this._currentFilePath = handle.name;
        return { success: true, filePath: handle.name };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        console.warn('[BrowserFS] showSaveFilePicker failed, using classic download:', err);
      }
    }

    // Fallback: Classic Browser Anchor Download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, filePath: `${projectName}.json` };
  }

  /**
   * Open project dialog to load `.json` or `.pscx` file
   */
  public async openProject(): Promise<ProjectLoadResult | null> {
    if (tauriBridge.isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          title: 'Open PSCAD Project',
          multiple: false,
          directory: false,
          filters: [
            { name: 'Supported Projects (*.json, *.pscx)', extensions: ['json', 'pscx'] },
            { name: 'PSCAD CLONE Project (*.json)', extensions: ['json'] },
            { name: 'PSCAD XML Project (*.pscx)', extensions: ['pscx'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (!selected || typeof selected !== 'string') {
          return null;
        }

        const content: string = await tauriBridge.invoke('read_project_file', {
          path: selected,
        });

        const fileName = selected.split(/[\/\\]/).pop() || selected;
        this._currentFilePath = selected;
        return { content, filePath: selected, fileName };
      } catch (err) {
        console.error('[NativeFS] Open project failed:', err);
        throw err;
      }
    }

    // Web Browser File System Access API
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'PSCAD Project (*.json, *.pscx)',
              accept: {
                'application/json': ['.json'],
                'application/xml': ['.pscx'],
                'text/plain': ['.json', '.pscx'],
              },
            },
          ],
          multiple: false,
        });
        if (handle) {
          const file = await handle.getFile();
          const content = await file.text();
          this._browserFileHandle = handle;
          this._currentFilePath = handle.name;
          return { content, filePath: handle.name, fileName: file.name };
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
        console.warn('[BrowserFS] showOpenFilePicker failed, using input element fallback:', err);
      }
    }

    // Fallback: Classic HTML <input type="file">
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.pscx';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          resolve({ content, fileName: file.name });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }

  /**
   * Export COMTRADE IEEE C37.111 files (.cfg and .dat)
   */
  public async exportComtrade(
    baseName: string,
    cfgText: string,
    datBuffer: ArrayBuffer | string
  ): Promise<boolean> {
    if (tauriBridge.isTauri()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selectedCfg = await save({
          title: 'Export COMTRADE Configuration File (.cfg)',
          defaultPath: `${baseName}.cfg`,
          filters: [{ name: 'COMTRADE Config (*.cfg)', extensions: ['cfg'] }],
        });

        if (!selectedCfg) return false;
        const selectedDat = selectedCfg.replace(/\.cfg$/i, '') + '.dat';

        let datBytes: number[];
        if (typeof datBuffer === 'string') {
          datBytes = Array.from(new TextEncoder().encode(datBuffer));
        } else {
          datBytes = Array.from(new Uint8Array(datBuffer));
        }

        await tauriBridge.invoke('export_comtrade_files', {
          cfgPath: selectedCfg,
          datPath: selectedDat,
          cfgContent: cfgText,
          datContent: datBytes,
        });

        return true;
      } catch (err) {
        console.error('[NativeFS] COMTRADE export failed:', err);
      }
    }

    // Browser download
    const cfgBlob = new Blob([cfgText], { type: 'text/plain' });
    const cfgUrl = URL.createObjectURL(cfgBlob);
    const aCfg = document.createElement('a');
    aCfg.href = cfgUrl;
    aCfg.download = `${baseName}.cfg`;
    aCfg.click();
    URL.revokeObjectURL(cfgUrl);

    const datBlob = new Blob([datBuffer], {
      type: typeof datBuffer === 'string' ? 'text/plain' : 'application/octet-stream',
    });
    const datUrl = URL.createObjectURL(datBlob);
    const aDat = document.createElement('a');
    aDat.href = datUrl;
    aDat.download = `${baseName}.dat`;
    aDat.click();
    URL.revokeObjectURL(datUrl);

    return true;
  }

  /**
   * Export CSV Simulation Data
   */
  public async exportCsv(fileName: string, csvContent: string): Promise<boolean> {
    if (tauriBridge.isTauri()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selected = await save({
          title: 'Export CSV Simulation Data',
          defaultPath: `${fileName}.csv`,
          filters: [{ name: 'CSV Spreadsheets (*.csv)', extensions: ['csv'] }],
        });
        if (!selected) return false;
        await tauriBridge.invoke('export_data_file', {
          path: selected,
          content: csvContent,
        });
        return true;
      } catch (err) {
        console.error('[NativeFS] CSV export failed:', err);
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }
}

export const nativeFileSystem = new NativeFileSystemService();
