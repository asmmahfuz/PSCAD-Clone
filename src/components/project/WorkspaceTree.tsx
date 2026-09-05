import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
  Plus,
  Trash2,
  Boxes,
  FileSpreadsheet,
  Box,
  Sparkles,
  Cable,
  FileText,
  Copy,
  Edit2,
  Check,
  X,
  Play,
  MoreVertical,
  Sliders,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';
import type { CircuitSheet, ComponentDefinition, WorkspaceProject } from '../../types';
import { definitionRegistry } from '../../engine/definitions';

export interface WorkspaceTreeProps {
  projectName: string;
  projects?: WorkspaceProject[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onCloseProject?: (projectId: string) => void;
  onSaveProject?: (projectId: string) => void;
  onCompileProject?: (projectId: string) => void;

  compCount: number;
  wireCount: number;
  activeView?: 'schematic' | 'oscilloscope' | 'split';
  setActiveView?: (v: 'schematic' | 'oscilloscope' | 'split') => void;

  sheets?: CircuitSheet[];
  activeSheetId?: string;
  onSelectSheet?: (sheetId: string) => void;
  onAddSubmoduleSheet?: () => void;
  onDuplicateSheet?: (sheetId: string) => void;
  onRenameSheet?: (sheetId: string, newName: string) => void;
  onDeleteSheet?: (sheetId: string) => void;

  // Definitions
  definitions?: ComponentDefinition[];
  onSelectDefinition?: (def: ComponentDefinition) => void;
  onInstantiateDefinition?: (def: ComponentDefinition) => void;
  onEditDefinition?: (def: ComponentDefinition) => void;
  onDuplicateDefinition?: (def: ComponentDefinition) => void;
  onDeleteDefinition?: (defId: string) => void;
  onCreateNewDefinition?: () => void;

  // Resources Studio Launches
  onOpenLCP?: () => void;
  onOpenCableConstants?: () => void;
  onOpenSnapshot?: () => void;
  onOpenComtrade?: () => void;
  onOpenProtectionStudio?: () => void;
  onOpenWorkshop?: () => void;
  onOpenMasterLibrary?: () => void;
}

export const WorkspaceTree: React.FC<WorkspaceTreeProps> = ({
  projectName,
  projects = [],
  activeProjectId,
  onSelectProject,
  onNewProject,
  onOpenProject,
  onCloseProject,
  onSaveProject,
  onCompileProject,
  compCount,
  wireCount,
  activeView: _activeView,
  setActiveView: _setActiveView,
  sheets = [],
  activeSheetId = 'root',
  onSelectSheet,
  onAddSubmoduleSheet,
  onDuplicateSheet,
  onRenameSheet,
  onDeleteSheet,
  definitions = [],
  onSelectDefinition,
  onInstantiateDefinition,
  onEditDefinition,
  onDuplicateDefinition,
  onDeleteDefinition,
  onCreateNewDefinition,
  onOpenLCP,
  onOpenCableConstants,
  onOpenSnapshot,
  onOpenComtrade,
  onOpenProtectionStudio,
  onOpenWorkshop: _onOpenWorkshop,
  onOpenMasterLibrary,
}) => {
  // Folder open/collapsed state
  const [workspaceOpen, setWorkspaceOpen] = useState<boolean>(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    [`${projectName}_definitions`]: true,
    [`${projectName}_sheets`]: true,
    [`${projectName}_lines`]: false,
    [`${projectName}_resources`]: false,
  });

  // Inline rename state for sheets
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // Right click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'workspace' | 'project' | 'sheet' | 'definition' | 'line' | 'resource';
    targetId?: string;
    targetObj?: any;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggleFolder = (folderKey: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const handleStartRenameSheet = (sheet: CircuitSheet) => {
    setRenamingSheetId(sheet.id);
    setRenameValue(sheet.name);
  };

  const handleFinishRenameSheet = () => {
    if (renamingSheetId && renameValue.trim()) {
      onRenameSheet?.(renamingSheetId, renameValue.trim());
    }
    setRenamingSheetId(null);
  };

  // Fallback project list if not provided
  const activeProjectsList: WorkspaceProject[] = projects.length > 0 ? projects : [
    {
      id: 'proj_current',
      name: projectName,
      active: true,
      dt: 50e-6,
      tMax: 0.5,
      components: [],
      wires: [],
      sheets: {},
      rootSheetId: 'root',
      activeSheetId: activeSheetId || 'root',
    }
  ];

  const allDefs = definitions.length > 0 ? definitions : definitionRegistry.getAllDefinitions();

  return (
    <div className="flex flex-col h-full bg-[#141924] border-r border-[#26334a] select-none text-[11px] font-sans">
      {/* 1. Header Toolbar */}
      <div className="h-7 px-2 bg-[#192130] border-b border-[#26334a] font-semibold text-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Workspace Explorer</span>
        </div>

        <div className="flex items-center gap-0.5">
          {onNewProject && (
            <button
              onClick={onNewProject}
              title="New Project (.pscx)"
              className="p-1 rounded hover:bg-[#253248] text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          {onOpenMasterLibrary && (
            <button
              onClick={onOpenMasterLibrary}
              title="Master Library Browser"
              className="p-1 rounded hover:bg-[#253248] text-sky-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace Tree View */}
      <div className="flex-1 p-1 overflow-y-auto space-y-0.5">
        {/* Workspace Root Node */}
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, type: 'workspace' });
          }}
          className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1a2333] cursor-pointer font-bold text-[11px] group"
        >
          <div className="flex items-center gap-1" onClick={() => setWorkspaceOpen(!workspaceOpen)}>
            {workspaceOpen ? (
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">PSCAD Workspace</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 font-normal">
            ({activeProjectsList.length} Proj)
          </span>
        </div>

        {/* Projects Subtree */}
        {workspaceOpen && (
          <div className="pl-2 space-y-1">
            {activeProjectsList.map((proj) => {
              const isCurrentActive = proj.name === projectName || proj.active || proj.id === activeProjectId;
              const defFolderKey = `${proj.name}_definitions`;
              const sheetFolderKey = `${proj.name}_sheets`;
              const lineFolderKey = `${proj.name}_lines`;
              const resFolderKey = `${proj.name}_resources`;

              return (
                <div key={proj.id} className="space-y-0.5 border-l border-[#243148] pl-1.5 my-1">
                  {/* Project Header Item */}
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, type: 'project', targetId: proj.id, targetObj: proj });
                    }}
                    onClick={() => onSelectProject?.(proj.id)}
                    className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition-colors ${
                      isCurrentActive
                        ? 'bg-[#1e2a3f] text-white font-semibold border-l-2 border-l-[#1f6feb]'
                        : 'text-slate-300 hover:bg-[#1a2333]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Cpu className={`w-3.5 h-3.5 shrink-0 ${isCurrentActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{proj.name}</span>
                      {isCurrentActive && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                          Active
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: 'project', targetId: proj.id, targetObj: proj });
                      }}
                      className="p-0.5 text-slate-500 hover:text-slate-200"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 1. Definitions Folder */}
                  <div className="pl-2 space-y-0.5 pt-0.5">
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, type: 'project', targetId: proj.id, targetObj: proj });
                      }}
                      onClick={() => toggleFolder(defFolderKey)}
                      className="flex items-center justify-between px-1 py-0.5 rounded text-slate-400 hover:bg-[#1a2333] hover:text-slate-200 cursor-pointer text-[10.5px]"
                    >
                      <div className="flex items-center gap-1">
                        {openFolders[defFolderKey] ? (
                          <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                        )}
                        <Box className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>Definitions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-slate-500">({allDefs.length})</span>
                        {onCreateNewDefinition && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateNewDefinition();
                            }}
                            title="New Definition..."
                            className="p-0.5 hover:text-purple-300 text-slate-500"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {openFolders[defFolderKey] && (
                      <div className="pl-3 space-y-0.5 border-l border-[#243148] ml-1">
                        {allDefs.map((def) => (
                          <div
                            key={def.id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, type: 'definition', targetId: def.id, targetObj: def });
                            }}
                            onClick={() => {
                              onSelectDefinition?.(def);
                              onInstantiateDefinition?.(def);
                            }}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer group text-[10.5px]"
                            title={`${def.description || def.name}\n(Click to instantiate definition onto canvas)`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              {def.category === 'custom' ? (
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              ) : def.category === 'macro' ? (
                                <Sliders className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                              ) : (
                                <Box className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                              )}
                              <span className="truncate">{def.name}</span>
                            </div>

                            <span className="text-[8.5px] opacity-75 font-mono px-1 rounded bg-black/30">
                              v{def.version || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. Schematic Sheets Folder */}
                    <div
                      onClick={() => toggleFolder(sheetFolderKey)}
                      className="flex items-center justify-between px-1 py-0.5 rounded text-slate-400 hover:bg-[#1a2333] hover:text-slate-200 cursor-pointer text-[10.5px]"
                    >
                      <div className="flex items-center gap-1">
                        {openFolders[sheetFolderKey] ? (
                          <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                        )}
                        <FileSpreadsheet className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>Schematic Sheets</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-slate-500">({sheets.length})</span>
                        {onAddSubmoduleSheet && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddSubmoduleSheet();
                            }}
                            title="Add New Submodule Sheet"
                            className="p-0.5 hover:text-sky-300 text-slate-500"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {openFolders[sheetFolderKey] && (
                      <div className="pl-3 space-y-0.5 border-l border-[#243148] ml-1">
                        {sheets.map((sheet) => {
                          const isCurrent = sheet.id === activeSheetId;
                          const isChild = Boolean(sheet.parentSheetId && sheet.parentSheetId !== 'root');
                          const isRenaming = renamingSheetId === sheet.id;

                          return (
                            <div
                              key={sheet.id}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, type: 'sheet', targetId: sheet.id, targetObj: sheet });
                              }}
                              onClick={() => {
                                if (!isRenaming) onSelectSheet?.(sheet.id);
                              }}
                              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition-colors text-[10.5px] ${
                                isCurrent
                                  ? 'bg-[#1f6feb]/30 text-sky-300 font-semibold border border-[#388bfd]/50'
                                  : 'text-slate-300 hover:bg-[#1a2333]'
                              }`}
                            >
                              {isRenaming ? (
                                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleFinishRenameSheet();
                                      if (e.key === 'Escape') setRenamingSheetId(null);
                                    }}
                                    className="w-full px-1 py-0 bg-[#0d121c] border border-[#388bfd] rounded text-[10px] text-white font-sans"
                                  />
                                  <button onClick={handleFinishRenameSheet} className="p-0.5 text-emerald-400">
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                  <button onClick={() => setRenamingSheetId(null)} className="p-0.5 text-slate-400">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className={`flex items-center gap-1 truncate ${isChild ? 'pl-2' : ''}`}>
                                    {sheet.id === 'root' ? (
                                      <FileSpreadsheet className="w-3 h-3 text-sky-400 shrink-0" />
                                    ) : (
                                      <Boxes className="w-3 h-3 text-purple-400 shrink-0" />
                                    )}
                                    <span className="truncate">{sheet.name}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {sheet.components?.length || 0}c
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Transmission Lines & Cables Folder */}
                    <div
                      onClick={() => toggleFolder(lineFolderKey)}
                      className="flex items-center justify-between px-1 py-0.5 rounded text-slate-400 hover:bg-[#1a2333] hover:text-slate-200 cursor-pointer text-[10.5px]"
                    >
                      <div className="flex items-center gap-1">
                        {openFolders[lineFolderKey] ? (
                          <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                        )}
                        <Cable className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Lines & Cables</span>
                      </div>
                    </div>

                    {openFolders[lineFolderKey] && (
                      <div className="pl-3 space-y-0.5 border-l border-[#243148] ml-1">
                        {onOpenLCP && (
                          <div
                            onClick={onOpenLCP}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer text-[10.5px]"
                          >
                            <span className="truncate">LCP Line Studio</span>
                            <span className="text-[9px] text-slate-400">FD/Modal</span>
                          </div>
                        )}
                        {onOpenCableConstants && (
                          <div
                            onClick={onOpenCableConstants}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer text-[10.5px]"
                          >
                            <span className="truncate">Cable Constants</span>
                            <span className="text-[9px] text-slate-400">Coaxial</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. Data Files & Resources Folder */}
                    <div
                      onClick={() => toggleFolder(resFolderKey)}
                      className="flex items-center justify-between px-1 py-0.5 rounded text-slate-400 hover:bg-[#1a2333] hover:text-slate-200 cursor-pointer text-[10.5px]"
                    >
                      <div className="flex items-center gap-1">
                        {openFolders[resFolderKey] ? (
                          <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                        )}
                        <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Data & Resources</span>
                      </div>
                    </div>

                    {openFolders[resFolderKey] && (
                      <div className="pl-3 space-y-0.5 border-l border-[#243148] ml-1">
                        {onOpenSnapshot && (
                          <div
                            onClick={onOpenSnapshot}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer text-[10.5px]"
                          >
                            <span className="truncate">Simulation Snapshots</span>
                            <span className="text-[9px] text-slate-400">.snap</span>
                          </div>
                        )}
                        {onOpenComtrade && (
                          <div
                            onClick={onOpenComtrade}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer text-[10.5px]"
                          >
                            <span className="truncate">COMTRADE Records</span>
                            <span className="text-[9px] text-slate-400">IEEE</span>
                          </div>
                        )}
                        {onOpenProtectionStudio && (
                          <div
                            onClick={onOpenProtectionStudio}
                            className="flex items-center justify-between px-1.5 py-0.5 rounded text-slate-300 hover:bg-[#1f6feb] hover:text-white cursor-pointer text-[10.5px]"
                          >
                            <span className="truncate">ANSI Protection Relays</span>
                            <span className="text-[9px] text-slate-400">50/21/87</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Quick Stats & View Switcher Footer */}
      <div className="p-1.5 bg-[#121620] border-t border-[#26334a] flex flex-col gap-1 shrink-0 text-[10.5px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Sheet Components:</span>
          <span className="font-mono text-slate-200 font-bold">{compCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Wires Connected:</span>
          <span className="font-mono text-slate-200 font-bold">{wireCount}</span>
        </div>
      </div>

      {/* 4. Tree Floating Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 250) }}
          className="fixed z-50 w-52 bg-[#141b27]/95 border border-[#2b3a52] rounded-md shadow-2xl p-1 text-slate-200 select-none font-sans text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
        >
          {/* Project Node Menu */}
          {contextMenu.type === 'project' && (
            <>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#243148] mb-1">
                Project: {contextMenu.targetObj?.name || projectName}
              </div>
              <button
                onClick={() => {
                  if (contextMenu.targetId) onSelectProject?.(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Set as Active Project</span>
              </button>
              <button
                onClick={() => {
                  if (contextMenu.targetId) onCompileProject?.(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
              >
                <Play className="w-3 h-3 text-sky-400" />
                <span>Compile Netlist (F5)</span>
              </button>
              <button
                onClick={() => {
                  if (contextMenu.targetId) onSaveProject?.(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
              >
                <UploadCloud className="w-3 h-3 text-emerald-400" />
                <span>Save Project (Ctrl+S)</span>
              </button>
              <div className="h-px bg-[#26334a] my-1" />
              {onAddSubmoduleSheet && (
                <button
                  onClick={() => {
                    onAddSubmoduleSheet();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>Add New Sheet...</span>
                </button>
              )}
              {onCreateNewDefinition && (
                <button
                  onClick={() => {
                    onCreateNewDefinition();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Box className="w-3 h-3 text-purple-400" />
                  <span>New Component Definition...</span>
                </button>
              )}
              <div className="h-px bg-[#26334a] my-1" />
              {onCloseProject && contextMenu.targetId && (
                <button
                  onClick={() => {
                    onCloseProject(contextMenu.targetId!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-rose-400 hover:bg-rose-500/20"
                >
                  <X className="w-3 h-3" />
                  <span>Close Project</span>
                </button>
              )}
            </>
          )}

          {/* Sheet Node Menu */}
          {contextMenu.type === 'sheet' && (
            <>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#243148] mb-1">
                Sheet: {contextMenu.targetObj?.name}
              </div>
              <button
                onClick={() => {
                  if (contextMenu.targetId) onSelectSheet?.(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
              >
                <FileSpreadsheet className="w-3 h-3 text-sky-400" />
                <span>Open / Activate Sheet</span>
              </button>
              {contextMenu.targetObj && (
                <button
                  onClick={() => {
                    handleStartRenameSheet(contextMenu.targetObj);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Edit2 className="w-3 h-3 text-amber-400" />
                  <span>Rename Sheet...</span>
                </button>
              )}
              {onDuplicateSheet && contextMenu.targetId && (
                <button
                  onClick={() => {
                    onDuplicateSheet(contextMenu.targetId!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Copy className="w-3 h-3 text-slate-300" />
                  <span>Duplicate Sheet</span>
                </button>
              )}
              {contextMenu.targetId !== 'root' && onDeleteSheet && contextMenu.targetId && (
                <>
                  <div className="h-px bg-[#26334a] my-1" />
                  <button
                    onClick={() => {
                      onDeleteSheet(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Sheet</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Definition Node Menu */}
          {contextMenu.type === 'definition' && (
            <>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#243148] mb-1">
                Definition: {contextMenu.targetObj?.name}
              </div>
              <button
                onClick={() => {
                  if (contextMenu.targetObj) onInstantiateDefinition?.(contextMenu.targetObj);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Instantiate on Canvas</span>
              </button>
              {onEditDefinition && contextMenu.targetObj && (
                <button
                  onClick={() => {
                    onEditDefinition(contextMenu.targetObj);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Edit2 className="w-3 h-3 text-purple-400" />
                  <span>Edit Definition / Code...</span>
                </button>
              )}
              {onDuplicateDefinition && contextMenu.targetObj && (
                <button
                  onClick={() => {
                    onDuplicateDefinition(contextMenu.targetObj);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Copy className="w-3 h-3 text-slate-300" />
                  <span>Duplicate Definition</span>
                </button>
              )}
              {onDeleteDefinition && contextMenu.targetId && (
                <>
                  <div className="h-px bg-[#26334a] my-1" />
                  <button
                    onClick={() => {
                      onDeleteDefinition(contextMenu.targetId!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Definition</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Workspace Root Menu */}
          {contextMenu.type === 'workspace' && (
            <>
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#243148] mb-1">
                PSCAD Workspace
              </div>
              {onNewProject && (
                <button
                  onClick={() => {
                    onNewProject();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>New Project (.pscx)...</span>
                </button>
              )}
              {onOpenProject && (
                <button
                  onClick={() => {
                    onOpenProject();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[#1f6feb] hover:text-white"
                >
                  <DownloadCloud className="w-3 h-3 text-amber-400" />
                  <span>Open Existing Project...</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
