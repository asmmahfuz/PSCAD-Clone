import React, { useState } from 'react';
import {
  Pin,
  X,
  Type,
  Sparkles,
  ChevronDown,
  ChevronRight,
  MousePointer,
} from 'lucide-react';

export interface ComponentWizardDockProps {
  onOpenComponentBuilder?: () => void;
  onOpenMasterLibrary?: () => void;
  onClose?: () => void;
}

export const ComponentWizardDock: React.FC<ComponentWizardDockProps> = ({
  onOpenComponentBuilder,
  onOpenMasterLibrary: _onOpenMasterLibrary,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'transmission'>('wizard');
  const [componentName, setComponentName] = useState<string>('');
  const [dx, setDx] = useState<number>(1);
  const [dy, setDy] = useState<number>(1);
  const [isGeneralOpen, setIsGeneralOpen] = useState<boolean>(true);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] border-t border-[#cbd5e1] select-none text-[11px] font-sans text-slate-800">
      {/* 1. Classic Windows Tool Window Titlebar */}
      <div className="h-6 px-2 bg-gradient-to-r from-[#dce1e7] to-[#d0d6de] border-b border-[#b8c2cc] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#1e293b]">
          <span>Component Wizard</span>
        </div>

        <div className="flex items-center gap-1 text-[#475569]">
          <button
            type="button"
            className="p-0.5 hover:bg-[#cbd5e1] rounded hover:text-slate-900 transition-colors"
            title="Pin / Unpin Dock"
          >
            <Pin className="w-3 h-3 rotate-45" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-0.5 hover:bg-rose-500 hover:text-white rounded transition-colors"
              title="Close Dock"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Mini Toolbar matching PSCAD: Create, T, P */}
      <div className="h-6 px-1.5 bg-[#edf1f5] border-b border-[#cbd5e1] flex items-center gap-1 shrink-0 text-xs">
        <button
          type="button"
          onClick={onOpenComponentBuilder}
          className="px-1.5 py-0.5 bg-[#ffffff] hover:bg-[#dbeafe] border border-[#94a3b8] rounded text-[10px] font-semibold text-[#1e293b] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          title="Create New Component Definition"
        >
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Create</span>
        </button>

        <div className="h-3.5 w-px bg-[#cbd5e1] mx-0.5" />

        <button
          type="button"
          className="p-1 hover:bg-[#dbeafe] rounded text-[#334155] border border-transparent hover:border-[#93c5fd] transition-colors"
          title="Add Text Label (T)"
        >
          <Type className="w-3 h-3 text-sky-700" />
        </button>

        <button
          type="button"
          className="p-1 hover:bg-[#dbeafe] rounded text-[#334155] border border-transparent hover:border-[#93c5fd] transition-colors"
          title="Add Electrical Pin Terminal (P)"
        >
          <Pin className="w-3 h-3 text-emerald-700" />
        </button>

        <button
          type="button"
          className="p-1 hover:bg-[#dbeafe] rounded text-[#334155] border border-transparent hover:border-[#93c5fd] transition-colors"
          title="Select Pointer"
        >
          <MousePointer className="w-3 h-3 text-slate-700" />
        </button>
      </div>

      {/* 3. Main Body: Split between Vertical Tab Strip and Component Designer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical Tab Strip on Left Edge */}
        <div className="w-6 bg-[#e2e8f0] border-r border-[#cbd5e1] flex flex-col items-center py-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('transmission')}
            className={`[writing-mode:vertical-lr] rotate-180 text-[9px] font-medium tracking-wide py-2 px-0.5 cursor-pointer transition-colors ${
              activeTab === 'transmission'
                ? 'text-[#1d4ed8] font-bold bg-[#ffffff] border-r-2 border-[#1d4ed8]'
                : 'text-[#64748b] hover:text-[#1e293b]'
            }`}
          >
            Transmission Segments
          </button>
        </div>

        {/* Center Content: Preview Canvas Box & Properties Grid */}
        <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
          {/* Component Graphic Preview Box */}
          <div className="border border-[#94a3b8] rounded bg-[#ffffff] shadow-inner p-1 flex flex-col items-center justify-center relative min-h-[90px]">
            {/* Coordinate Crosshairs */}
            <svg width="100%" height="70" viewBox="0 0 160 70" className="stroke-[#cbd5e1] stroke-[1]">
              <line x1="0" y1="35" x2="160" y2="35" strokeDasharray="3,3" />
              <line x1="80" y1="0" x2="80" y2="70" strokeDasharray="3,3" />
              {/* Red Origin Dot */}
              <circle cx="80" cy="35" r="2.5" className="fill-rose-500 stroke-rose-700" />
            </svg>
            <span className="text-[8.5px] font-mono text-slate-400 absolute bottom-1 right-1">
              (0, 0)
            </span>
          </div>

          {/* Name Field */}
          <div className="space-y-0.5">
            <label className="text-[9.5px] font-bold text-slate-700 block">Name</label>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="Enter a name for the new component..."
              className="w-full px-2 py-1 bg-white border border-[#94a3b8] rounded text-[10.5px] text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Properties Section Accordion */}
          <div className="border border-[#cbd5e1] rounded bg-white overflow-hidden text-[10px]">
            <div
              onClick={() => setIsGeneralOpen(!isGeneralOpen)}
              className="px-2 py-1 bg-[#f1f5f9] border-b border-[#cbd5e1] font-bold text-slate-700 flex items-center justify-between cursor-pointer hover:bg-[#e2e8f0]"
            >
              <div className="flex items-center gap-1">
                {isGeneralOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>General</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">4 props</span>
            </div>

            {isGeneralOpen && (
              <div className="divide-y divide-slate-100 p-1 font-mono text-[9.5px]">
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span className="text-slate-600">Dx</span>
                  <input
                    type="number"
                    value={dx}
                    onChange={(e) => setDx(Number(e.target.value))}
                    className="w-12 text-right px-1 py-0.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span className="text-slate-600">Dy</span>
                  <input
                    type="number"
                    value={dy}
                    onChange={(e) => setDy(Number(e.target.value))}
                    className="w-12 text-right px-1 py-0.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span className="text-slate-600">Is True</span>
                  <span className="text-emerald-700 font-bold">True</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span className="text-slate-600">N</span>
                  <span className="text-slate-800 font-sans italic">Untitled</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
