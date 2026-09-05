import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Clock,
  Layers,
  Trash2,
  Search,
  ExternalLink,
  Plus,
  Zap,
  X,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { sessionManager, type RecentProject } from '../../services/sessionManager';
import { nativeFileSystem } from '../../services/nativeFileSystem';

interface RecentProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProjectContent: (content: string, filePath?: string, fileName?: string) => void;
  onNewProject: () => void;
}

export const RecentProjectsModal: React.FC<RecentProjectsModalProps> = ({
  isOpen,
  onClose,
  onOpenProjectContent,
  onNewProject,
}) => {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    const list = await sessionManager.getRecentProjects();
    setProjects(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id);
    }
  };

  if (!isOpen) return null;

  const handleOpenSelected = async (proj: RecentProject) => {
    try {
      if (proj.path && nativeFileSystem.getCurrentFilePath() !== proj.path) {
        // If native or accessible
        const res = await nativeFileSystem.openProject();
        if (res) {
          onOpenProjectContent(res.content, res.filePath, res.fileName);
          onClose();
          return;
        }
      }
    } catch (e) {
      console.warn('Direct open error, prompting browse:', e);
    }
    // Fallback trigger browse
    handleBrowseDisk();
  };

  const handleBrowseDisk = async () => {
    try {
      const res = await nativeFileSystem.openProject();
      if (res) {
        onOpenProjectContent(res.content, res.filePath, res.fileName);
        onClose();
      }
    } catch (e) {
      console.error('Browse failed:', e);
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = await sessionManager.removeRecentProject(id);
    setProjects(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121722] border border-[#263147] rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#263147] flex items-center justify-between bg-[#161d2b]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-white">PSCAD CLONE Project Hub</h2>
              <p className="text-xs text-slate-400">
                Recent project workspaces, disk storage, and template library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#263147] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 border-b border-[#263147] flex items-center justify-between gap-4 bg-[#0f141e]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search recent projects by name or filepath..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#182030] border border-[#263147] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#1f6feb]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowseDisk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#283548] border border-[#334155] text-xs font-semibold text-slate-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-[#58a6ff]" />
              Browse Disk...
            </button>
            <button
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#1a5ec4] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Empty Project
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c1017]">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-[#161d2b] border border-[#263147] text-slate-500 mb-3">
                <FileCode className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Recent Projects Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Open an existing `.json` or `.pscx` project file from disk or start a new EMTDC schematic simulation.
              </p>
              <button
                onClick={handleBrowseDisk}
                className="px-4 py-2 rounded-lg bg-[#1f6feb] text-white text-xs font-semibold hover:bg-[#1a5ec4] transition-colors"
              >
                Open Project from Disk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProjects.map((proj) => {
                const isSelected = selectedId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedId(proj.id)}
                    onDoubleClick={() => handleOpenSelected(proj)}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#182234] border-[#3b82f6] ring-1 ring-[#3b82f6]/40'
                        : 'bg-[#131924] border-[#222c3d] hover:bg-[#162030] hover:border-[#2f3d54]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-white flex items-center gap-2">
                            {proj.name}
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px] mt-0.5">
                            {proj.path || 'Local Workspace Session'}
                          </p>
                        </div>
                      </div>

                      <button
                        title="Remove from recent history"
                        onClick={(e) => handleRemove(e, proj.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1e2738] flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {proj.componentCount} Components
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatRelativeTime(proj.lastOpened)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenSelected(proj)}
                        className="flex items-center gap-1 text-[#58a6ff] hover:text-blue-300 font-medium transition-colors"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#263147] bg-[#161d2b] flex items-center justify-between text-xs text-slate-400">
          <span>Double-click any project card to open immediately.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg hover:bg-[#263147] text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
