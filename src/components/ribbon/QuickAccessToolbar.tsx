import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  Play,
  Pause,
  Square,
  StepForward,
  FileText,
  FolderOpen,
  Camera,
  Maximize2,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react';

export interface QatItemConfig {
  id: string;
  label: string;
  shortcut: string;
  defaultVisible: boolean;
  keytip: string;
}

export const QAT_ALL_ITEMS: QatItemConfig[] = [
  { id: 'save', label: 'Save Project', shortcut: 'Ctrl+S', defaultVisible: true, keytip: '1' },
  { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', defaultVisible: true, keytip: '2' },
  { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', defaultVisible: true, keytip: '3' },
  { id: 'run', label: 'Run Simulation', shortcut: 'F5', defaultVisible: true, keytip: '4' },
  { id: 'step', label: 'Step One Cycle', shortcut: 'F10', defaultVisible: true, keytip: '5' },
  { id: 'pause', label: 'Pause Simulation', shortcut: 'F6', defaultVisible: true, keytip: '6' },
  { id: 'stop', label: 'Stop & Reset', shortcut: 'Shift+F5', defaultVisible: true, keytip: '7' },
  { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', defaultVisible: false, keytip: '8' },
  { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', defaultVisible: false, keytip: '9' },
  { id: 'snapshot', label: 'State Snapshot', shortcut: 'F9', defaultVisible: false, keytip: '0' },
  { id: 'zoomFit', label: 'Zoom to Fit', shortcut: 'Ctrl+0', defaultVisible: false, keytip: 'Z' },
];

const STORAGE_KEY = 'pscad_qat_visible_items';

interface QuickAccessToolbarProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onStop: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSnapshot: () => void;
  onZoomFit: () => void;
  isRunning: boolean;
  isPaused: boolean;
  showKeytips?: boolean;
  activeKeytip?: string | null;
}

export const QuickAccessToolbar: React.FC<QuickAccessToolbarProps> = ({
  onSave,
  onUndo,
  onRedo,
  onRun,
  onStep,
  onPause,
  onStop,
  onNew,
  onOpen,
  onSnapshot,
  onZoomFit,
  isRunning,
  isPaused,
  showKeytips = false,
}) => {
  const [visibleItems, setVisibleItems] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return QAT_ALL_ITEMS.filter((i) => i.defaultVisible).map((i) => i.id);
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleItems));
    } catch (e) {}
  }, [visibleItems]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (id: string) => {
    setVisibleItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetToDefaults = () => {
    setVisibleItems(QAT_ALL_ITEMS.filter((i) => i.defaultVisible).map((i) => i.id));
    setIsDropdownOpen(false);
  };

  const isVisible = (id: string) => visibleItems.includes(id);

  return (
    <div className="flex items-center gap-0.5 select-none relative z-30 shrink-0">
      {/* 1. Save */}
      {isVisible('save') && (
        <QatButton
          icon={<Save className="w-3.5 h-3.5 text-blue-400" />}
          title="Save Project (Ctrl+S)"
          keytip="1"
          showKeytip={showKeytips}
          onClick={onSave}
        />
      )}

      {/* 2. Undo */}
      {isVisible('undo') && (
        <QatButton
          icon={<Undo2 className="w-3.5 h-3.5 text-slate-300" />}
          title="Undo (Ctrl+Z)"
          keytip="2"
          showKeytip={showKeytips}
          onClick={onUndo}
        />
      )}

      {/* 3. Redo */}
      {isVisible('redo') && (
        <QatButton
          icon={<Redo2 className="w-3.5 h-3.5 text-slate-300" />}
          title="Redo (Ctrl+Y)"
          keytip="3"
          showKeytip={showKeytips}
          onClick={onRedo}
        />
      )}

      {/* 4. Run Simulation */}
      {isVisible('run') && (
        <QatButton
          icon={<Play className="w-3.5 h-3.5 fill-current" />}
          title="Run EMTDC Simulation (F5)"
          keytip="4"
          showKeytip={showKeytips}
          className={
            isRunning
              ? 'text-emerald-300 bg-emerald-600/30 border-emerald-500/50 shadow-sm animate-pulse'
              : 'text-emerald-400 hover:text-white hover:bg-emerald-600/40'
          }
          onClick={onRun}
        />
      )}

      {/* 5. Step */}
      {isVisible('step') && (
        <QatButton
          icon={<StepForward className="w-3.5 h-3.5 text-cyan-400" />}
          title="Step One Cycle (F10)"
          keytip="5"
          showKeytip={showKeytips}
          onClick={onStep}
        />
      )}

      {/* 6. Pause */}
      {isVisible('pause') && (
        <QatButton
          icon={<Pause className="w-3.5 h-3.5" />}
          title="Pause Simulation (F6)"
          keytip="6"
          showKeytip={showKeytips}
          className={
            isPaused
              ? 'text-amber-300 bg-amber-600/40 border-amber-500/50'
              : 'text-amber-400 hover:text-white hover:bg-amber-600/30'
          }
          onClick={onPause}
        />
      )}

      {/* 7. Stop */}
      {isVisible('stop') && (
        <QatButton
          icon={<Square className="w-3.5 h-3.5 text-rose-400" />}
          title="Stop & Reset Simulation (Shift+F5)"
          keytip="7"
          showKeytip={showKeytips}
          onClick={onStop}
        />
      )}

      {/* 8. New Project */}
      {isVisible('new') && (
        <QatButton
          icon={<FileText className="w-3.5 h-3.5 text-slate-300" />}
          title="New Project (Ctrl+N)"
          keytip="8"
          showKeytip={showKeytips}
          onClick={onNew}
        />
      )}

      {/* 9. Open Project */}
      {isVisible('open') && (
        <QatButton
          icon={<FolderOpen className="w-3.5 h-3.5 text-amber-300" />}
          title="Open Project (Ctrl+O)"
          keytip="9"
          showKeytip={showKeytips}
          onClick={onOpen}
        />
      )}

      {/* 10. Snapshot */}
      {isVisible('snapshot') && (
        <QatButton
          icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
          title="Capture Simulation Snapshot (F9)"
          keytip="0"
          showKeytip={showKeytips}
          onClick={onSnapshot}
        />
      )}

      {/* 11. Zoom Fit */}
      {isVisible('zoomFit') && (
        <QatButton
          icon={<Maximize2 className="w-3.5 h-3.5 text-indigo-300" />}
          title="Zoom to Fit Canvas (Ctrl+0)"
          keytip="Z"
          showKeytip={showKeytips}
          onClick={onZoomFit}
        />
      )}

      {/* Customize QAT Dropdown Trigger */}
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          title="Customize Quick Access Toolbar"
          aria-label="Customize Quick Access Toolbar"
          className="p-1 h-5 w-4 flex items-center justify-center rounded hover:bg-[#20293a] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-[#161c28] border border-[#2b3952] rounded-md shadow-2xl py-1 z-50 text-slate-200 text-xs backdrop-blur-md">
            <div className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#253248]">
              Customize Quick Access Toolbar
            </div>

            <div className="py-1 max-h-[300px] overflow-y-auto">
              {QAT_ALL_ITEMS.map((item) => {
                const checked = isVisible(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between px-3 py-1 text-left hover:bg-[#223049] hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 flex items-center justify-center text-blue-400">
                        {checked && <Check className="w-3 h-3 text-blue-400" />}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{item.shortcut}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#253248] pt-1 px-1">
              <button
                type="button"
                onClick={resetToDefaults}
                className="w-full flex items-center gap-2 px-2.5 py-1 text-left hover:bg-[#223049] text-slate-400 hover:text-white rounded transition-colors text-[11px] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function QatButton({
  icon,
  title,
  onClick,
  className = '',
  keytip,
  showKeytip,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
  keytip?: string;
  showKeytip?: boolean;
}) {
  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`p-1 h-5.5 w-5.5 flex items-center justify-center rounded hover:bg-[#222d40] text-slate-300 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-[#2f3d56] ${className}`}
      >
        {icon}
      </button>

      {showKeytip && keytip && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
          {keytip}
        </div>
      )}
    </div>
  );
}
