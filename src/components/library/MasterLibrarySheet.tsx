import React, { useState } from 'react';
import { ArrowRight, ZoomIn, ZoomOut, Maximize2, ExternalLink } from 'lucide-react';
import { COMPONENT_TYPES } from '../../constants';
import { MasterCategorySubSheet } from './MasterCategorySubSheet';

export interface MasterLibrarySheetProps {
  onAddComp: (type: string, customDefId?: string, definitionId?: string) => void;
  onOpenFlyoutCategory?: (category: string) => void;
  onSwitchToProjectTab?: () => void;
}

interface ComponentItem {
  type: string;
  name: string;
  sublabel?: string;
  symbol?: React.ReactNode;
  width?: number;
  height?: number;
}

export const MasterLibrarySheet: React.FC<MasterLibrarySheetProps> = ({
  onAddComp,
  onOpenFlyoutCategory,
  onSwitchToProjectTab,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [hoveredComp, setHoveredComp] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleComponentClick = (comp: ComponentItem) => {
    onAddComp(comp.type);
    if (onSwitchToProjectTab) {
      onSwitchToProjectTab();
    }
  };

  const handleDragStart = (e: React.DragEvent, comp: ComponentItem) => {
    const payload = JSON.stringify({ type: comp.type, name: comp.name });
    e.dataTransfer.setData('application/pscad-component', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (activeCategory) {
    return (
      <MasterCategorySubSheet
        category={activeCategory}
        onBack={() => setActiveCategory(null)}
        onSelectCategory={(cat) => setActiveCategory(cat)}
        onAddComp={onAddComp}
        onSwitchToProjectTab={onSwitchToProjectTab}
        onOpenFlyoutCategory={onOpenFlyoutCategory}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white select-none overflow-hidden font-sans text-slate-800 relative">
      {/* 1. Master Library Sheet Ribbon / Canvas Toolbar */}
      <div className="h-7 bg-[#f0f3f6] border-b border-[#cbd5e1] px-3 flex items-center justify-between text-xs text-[#334155] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1e293b]">PSCAD Master Library (master.pslx)</span>
          <span className="text-[#64748b] text-[11px]">— Click or drag any component directly into your schematic</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-medium text-[11px] min-w-[40px] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1 hover:bg-[#e2e8f0] rounded text-[#475569] transition-colors cursor-pointer"
            title="Actual Size (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Canvas Area rendering the 12 Category Panels */}
      <div className="flex-1 overflow-auto p-6 bg-[#ffffff] relative">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: '1360px',
            minHeight: '880px',
          }}
          className="grid grid-cols-6 gap-4 pb-12 transition-transform duration-75"
        >
          {/* =========================================================================
              CARD 1: PASSIVE ELEMENTS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              PASSIVE ELEMENTS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                {/* Resistor */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.RESISTOR, name: 'Resistor' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.RESISTOR, name: 'Resistor' })}
                  draggable
                  onMouseEnter={() => setHoveredComp('resistor')}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`p-1.5 rounded cursor-pointer transition-all flex flex-col items-center ${
                    hoveredComp === 'resistor' ? 'bg-[#dbeafe] ring-1 ring-[#3b82f6]' : 'hover:bg-[#f1f5f9]'
                  }`}
                >
                  <svg width="60" height="24" viewBox="0 0 60 24" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="2" y1="12" x2="14" y2="12" />
                    <circle cx="2" cy="12" r="2" className="fill-[#1d4ed8]" />
                    <path d="M14 12 L18 5 L24 19 L30 5 L36 19 L42 5 L46 12" />
                    <line x1="46" y1="12" x2="58" y2="12" />
                    <circle cx="58" cy="12" r="2" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10px] font-bold text-slate-700 mt-1 font-mono">1.0 [ohm]</span>
                </div>

                {/* Inductor */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.INDUCTOR, name: 'Inductor' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.INDUCTOR, name: 'Inductor' })}
                  draggable
                  onMouseEnter={() => setHoveredComp('inductor')}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`p-1.5 rounded cursor-pointer transition-all flex flex-col items-center ${
                    hoveredComp === 'inductor' ? 'bg-[#dbeafe] ring-1 ring-[#3b82f6]' : 'hover:bg-[#f1f5f9]'
                  }`}
                >
                  <svg width="60" height="24" viewBox="0 0 60 24" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="2" y1="12" x2="12" y2="12" />
                    <circle cx="2" cy="12" r="2" className="fill-[#1d4ed8]" />
                    <path d="M12 12 A6 6 0 0 1 24 12 A6 6 0 0 1 36 12 A6 6 0 0 1 48 12" />
                    <line x1="48" y1="12" x2="58" y2="12" />
                    <circle cx="58" cy="12" r="2" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10px] font-bold text-slate-700 mt-1 font-mono">0.1 [H]</span>
                </div>

                {/* Capacitor */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.CAPACITOR, name: 'Capacitor' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.CAPACITOR, name: 'Capacitor' })}
                  draggable
                  onMouseEnter={() => setHoveredComp('capacitor')}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`p-1.5 rounded cursor-pointer transition-all flex flex-col items-center ${
                    hoveredComp === 'capacitor' ? 'bg-[#dbeafe] ring-1 ring-[#3b82f6]' : 'hover:bg-[#f1f5f9]'
                  }`}
                >
                  <svg width="60" height="24" viewBox="0 0 60 24" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="2" y1="12" x2="26" y2="12" />
                    <circle cx="2" cy="12" r="2" className="fill-[#1d4ed8]" />
                    <line x1="26" y1="4" x2="26" y2="20" strokeWidth="2.2" />
                    <line x1="34" y1="4" x2="34" y2="20" strokeWidth="2.2" />
                    <line x1="34" y1="12" x2="58" y2="12" />
                    <circle cx="58" cy="12" r="2" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10px] font-bold text-slate-700 mt-1 font-mono">1.0 [uF]</span>
                </div>
              </div>

              {/* Second row of passive elements */}
              <div className="grid grid-cols-3 gap-2 text-center my-2">
                {/* Series RLC */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.SERIES_RLC, name: 'Series RLC' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.SERIES_RLC, name: 'Series RLC' })}
                  draggable
                  className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="55" height="22" viewBox="0 0 55 22" className="stroke-slate-900 fill-none stroke-[1.6]">
                    <rect x="8" y="5" width="38" height="12" rx="1" />
                    <line x1="2" y1="11" x2="8" y2="11" />
                    <line x1="46" y1="11" x2="53" y2="11" />
                  </svg>
                  <span className="text-[9px] text-slate-600 font-mono">1.0 [ohm]</span>
                </div>

                {/* Ground */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.GROUND, name: 'Ground' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.GROUND, name: 'Ground' })}
                  draggable
                  className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="36" height="28" viewBox="0 0 36 28" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="18" y1="2" x2="18" y2="14" />
                    <circle cx="18" cy="2" r="2" className="fill-[#1d4ed8]" />
                    <line x1="8" y1="14" x2="28" y2="14" />
                    <line x1="11" y1="19" x2="25" y2="19" />
                    <line x1="14" y1="24" x2="22" y2="24" />
                  </svg>
                  <span className="text-[9px] text-slate-600">GND</span>
                </div>

                {/* Spark gap / Arrester */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.SURGE_ARRESTER, name: 'Surge Arrester' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.SURGE_ARRESTER, name: 'Surge Arrester' })}
                  draggable
                  className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="40" height="28" viewBox="0 0 40 28" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="20" y1="2" x2="20" y2="8" />
                    <circle cx="20" cy="2" r="2" className="fill-[#1d4ed8]" />
                    <polygon points="12,8 28,8 20,16" className="fill-slate-700" />
                    <polygon points="12,24 28,24 20,16" className="fill-slate-700" />
                    <line x1="20" y1="24" x2="20" y2="27" />
                  </svg>
                  <span className="text-[9px] text-slate-600">MOV</span>
                </div>
              </div>

              {/* Bottom switch & node contacts */}
              <div className="flex justify-around items-center py-2 border-t border-slate-100">
                <svg width="48" height="24" viewBox="0 0 48 24" className="stroke-slate-800 fill-none stroke-[1.6]">
                  <line x1="4" y1="12" x2="18" y2="12" />
                  <circle cx="18" cy="12" r="2.5" className="fill-white stroke-slate-900" />
                  <line x1="20" y1="11" x2="34" y2="4" />
                  <circle cx="34" cy="12" r="2.5" className="fill-white stroke-slate-900" />
                  <line x1="36" y1="12" x2="44" y2="12" />
                  <circle cx="4" cy="12" r="2" className="fill-[#1d4ed8]" />
                  <circle cx="44" cy="12" r="2" className="fill-[#1d4ed8]" />
                </svg>
                <span className="text-[11px] font-bold text-slate-500">→</span>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Passive RLC')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Passive Elements Sub-Sheet (master.pslx > Passive Elements)"
                >
                  <span>More on Passive Elements</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Passive RLC');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for Passive Elements"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 2: SOURCES
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              SOURCES
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3 pt-2">
                {/* 3-Phase AC Source */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.AC_SOURCE_3PH, name: '3-Phase AC Source' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.AC_SOURCE_3PH, name: '3-Phase AC Source' })}
                  draggable
                  onMouseEnter={() => setHoveredComp('src3ph')}
                  onMouseLeave={() => setHoveredComp(null)}
                  className={`p-2 rounded cursor-pointer transition-all flex flex-col items-center ${
                    hoveredComp === 'src3ph' ? 'bg-[#dbeafe] ring-1 ring-[#3b82f6]' : 'hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-600 mb-0.5 font-mono">1.0 [ohm]</span>
                  <svg width="100" height="36" viewBox="0 0 100 36" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <circle cx="50" cy="18" r="14" className="fill-white" />
                    <path d="M42 18 Q46 12 50 18 Q54 24 58 18" strokeWidth="2" />
                    <line x1="12" y1="18" x2="36" y2="18" />
                    <circle cx="12" cy="18" r="2.5" className="fill-[#1d4ed8]" />
                    <line x1="64" y1="18" x2="88" y2="18" />
                    <circle cx="88" cy="18" r="2.5" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10.5px] font-semibold text-slate-700 mt-0.5">Three Phase</span>
                </div>

                {/* Single-Phase AC Source */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.AC_SOURCE_1PH, name: '1-Phase AC Source' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.AC_SOURCE_1PH, name: '1-Phase AC Source' })}
                  draggable
                  className="p-2 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <span className="text-[9px] font-bold text-slate-600 mb-0.5 font-mono">1.0 [ohm]</span>
                  <svg width="90" height="32" viewBox="0 0 90 32" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <circle cx="45" cy="16" r="12" className="fill-white" />
                    <path d="M38 16 Q41.5 11 45 16 Q48.5 21 52 16" strokeWidth="1.8" />
                    <line x1="10" y1="16" x2="33" y2="16" />
                    <circle cx="10" cy="16" r="2.5" className="fill-[#1d4ed8]" />
                    <line x1="57" y1="16" x2="80" y2="16" />
                    <circle cx="80" cy="16" r="2.5" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10px] font-medium text-slate-600 mt-0.5">Single Phase</span>
                </div>

                {/* DC Source */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.DC_SOURCE, name: 'DC Source' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.DC_SOURCE, name: 'DC Source' })}
                  draggable
                  className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg width="50" height="24" viewBox="0 0 50 24" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <circle cx="25" cy="12" r="10" className="fill-white" />
                    <line x1="19" y1="9" x2="31" y2="9" strokeWidth="2" />
                    <line x1="21" y1="15" x2="29" y2="15" strokeWidth="2" strokeDasharray="2,2" />
                    <line x1="4" y1="12" x2="15" y2="12" />
                    <line x1="35" y1="12" x2="46" y2="12" />
                  </svg>
                  <span className="text-[10px] font-mono text-slate-700">DC V-Source</span>
                </div>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Sources & Generators')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Sources & Generators Sub-Sheet (master.pslx > Sources)"
                >
                  <span>More on Sources</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Sources & Generators');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for Sources"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 3: MISCELLANEOUS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              MISCELLANEOUS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 pt-1">
                {/* Pills row 1 */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="px-2 py-0.5 border border-sky-600 rounded-full text-sky-800 bg-sky-50 font-bold">
                    TIME
                  </span>
                  <span className="px-1.5 py-0.5 border border-slate-400 rounded text-slate-700 bg-slate-50">
                    (1/Sqrt(3))
                  </span>
                </div>

                {/* Pills row 2 */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="px-2 py-0.5 border border-sky-600 rounded-full text-sky-800 bg-sky-50">
                    Delta-T
                  </span>
                  <span className="px-2 py-0.5 border border-slate-400 rounded text-slate-700 bg-slate-50">
                    PI
                  </span>
                </div>

                {/* Pills row 3 */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="px-2 py-0.5 border border-sky-600 rounded-full text-sky-800 bg-sky-50">
                    Run#
                  </span>
                  <span className="px-2 py-0.5 border border-rose-400 rounded text-rose-800 bg-rose-50">
                    False
                  </span>
                </div>

                {/* Pills row 4 */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="px-2 py-0.5 border border-sky-600 rounded-full text-sky-800 bg-sky-50">
                    #Runs
                  </span>
                  <span className="text-slate-600 text-[9px]">(1)</span>
                </div>

                {/* Pills row 5 */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="px-2 py-0.5 border border-sky-600 rounded-full text-sky-800 bg-sky-50">
                    Rank#
                  </span>
                  <div className="text-right">
                    <div className="text-[9px]">1</div>
                    <div className="text-[9px] text-slate-700 font-bold">377.0</div>
                  </div>
                </div>

                {/* Array Tapping diagram */}
                <div className="p-1 border border-slate-200 rounded bg-[#f8fafc] text-center mt-1">
                  <span className="text-[9px] font-mono text-slate-700 font-bold">(1.0, 0.0)</span>
                  <div className="flex justify-center items-center gap-1 my-1">
                    <svg width="80" height="20" viewBox="0 0 80 20" className="stroke-sky-600 fill-none stroke-[1.6]">
                      <line x1="5" y1="5" x2="35" y2="15" />
                      <line x1="15" y1="5" x2="40" y2="15" />
                      <line x1="25" y1="5" x2="45" y2="15" />
                      <line x1="45" y1="15" x2="75" y2="15" strokeWidth="2.5" />
                      <text x="50" y="10" className="fill-slate-800 text-[8px] font-mono stroke-none">3 2 1</text>
                    </svg>
                  </div>
                  <div className="text-[8.5px] text-sky-800 font-medium leading-tight">
                    Merging to / Tapping from Arrays
                  </div>
                </div>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Control Blocks (CSMF)')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Control Blocks & Miscellaneous Models Sub-Sheet"
                >
                  <span>More on Miscellaneous models</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Control Blocks (CSMF)');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for Miscellaneous Models"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 4: I/O DEVICES
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              I/O DEVICES
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3 pt-2">
                {/* Row 1: Slider & Switch */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center">
                    <svg width="24" height="40" viewBox="0 0 24 40" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <line x1="12" y1="4" x2="12" y2="36" />
                      <rect x="5" y="16" width="14" height="8" rx="1" className="fill-slate-200" />
                      <line x1="7" y1="20" x2="17" y2="20" strokeWidth="2" />
                    </svg>
                    <span className="text-[9.5px] text-slate-700 mt-1">Slider</span>
                  </div>

                  <div className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center">
                    <svg width="24" height="40" viewBox="0 0 24 40" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <circle cx="12" cy="14" r="9" className="fill-white stroke-slate-700" />
                      <circle cx="12" cy="14" r="3" className="fill-rose-500 stroke-none" />
                      <line x1="12" y1="23" x2="12" y2="36" />
                      <circle cx="12" cy="36" r="2" className="fill-[#1d4ed8]" />
                    </svg>
                    <span className="text-[9.5px] text-slate-700 mt-1">Switch</span>
                  </div>
                </div>

                {/* Row 2: Rotary & Push Button */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center">
                    <svg width="36" height="28" viewBox="0 0 36 28" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <circle cx="18" cy="14" r="11" className="fill-slate-100" />
                      <line x1="18" y1="14" x2="25" y2="7" strokeWidth="2.2" className="stroke-slate-900" />
                      <circle cx="18" cy="14" r="3" className="fill-slate-800" />
                    </svg>
                    <span className="text-[9px] text-slate-700 mt-0.5">Rotary Switch</span>
                  </div>

                  <div className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center">
                    <svg width="36" height="28" viewBox="0 0 36 28" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <rect x="6" y="8" width="24" height="14" rx="2" className="fill-slate-200" />
                      <circle cx="18" cy="15" r="5" className="fill-slate-500" />
                    </svg>
                    <span className="text-[9px] text-slate-700 mt-0.5">Push Button</span>
                  </div>
                </div>

                {/* Output Channel */}
                <div className="p-1.5 rounded hover:bg-[#f1f5f9] cursor-pointer border border-dashed border-slate-300 text-center flex flex-col items-center">
                  <svg width="70" height="24" viewBox="0 0 70 24" className="stroke-slate-900 fill-none stroke-[1.6]">
                    <rect x="15" y="4" width="40" height="16" className="fill-white" />
                    <line x1="4" y1="12" x2="15" y2="12" />
                    <circle cx="4" cy="12" r="2" className="fill-[#10b981]" />
                    <line x1="55" y1="12" x2="66" y2="12" />
                    <text x="25" y="16" className="fill-slate-800 text-[10px] font-mono stroke-none font-bold">k</text>
                  </svg>
                  <span className="text-[10px] font-medium text-slate-700 mt-1">Output Channel</span>
                </div>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Runtime Controls')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Runtime I/O Controls Sub-Sheet"
                >
                  <span>More on I/O Devices</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Runtime Controls');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for I/O Devices"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 5: BREAKERS & FAULTS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              BREAKERS & FAULTS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3 pt-2">
                {/* Breakers comparison */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  {/* Single Phase Breaker */}
                  <div
                    onClick={() => handleComponentClick({ type: COMPONENT_TYPES.BREAKER_1PH, name: '1-Phase Breaker' })}
                    onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.BREAKER_1PH, name: '1-Phase Breaker' })}
                    draggable
                    className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                  >
                    <span className="text-[9px] text-sky-700 font-semibold mb-0.5">Single Phase</span>
                    <svg width="40" height="30" viewBox="0 0 40 30" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <line x1="20" y1="2" x2="20" y2="10" />
                      <circle cx="20" cy="2" r="2" className="fill-[#1d4ed8]" />
                      <rect x="13" y="10" width="14" height="10" className="fill-rose-600 stroke-none" />
                      <line x1="20" y1="20" x2="20" y2="28" />
                      <circle cx="20" cy="28" r="2" className="fill-[#1d4ed8]" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-rose-700 mt-0.5">BRK</span>
                  </div>

                  {/* Three Phase Breaker */}
                  <div
                    onClick={() => handleComponentClick({ type: COMPONENT_TYPES.BREAKER_3PH, name: '3-Phase Breaker' })}
                    onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.BREAKER_3PH, name: '3-Phase Breaker' })}
                    draggable
                    className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                  >
                    <span className="text-[9px] text-sky-700 font-semibold mb-0.5">Three Phase</span>
                    <svg width="40" height="30" viewBox="0 0 40 30" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <line x1="20" y1="2" x2="20" y2="10" strokeWidth="2.5" className="stroke-sky-700" />
                      <rect x="10" y="11" width="20" height="8" className="fill-rose-600 stroke-none" />
                      <line x1="20" y1="19" x2="20" y2="28" strokeWidth="2.5" className="stroke-sky-700" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-rose-700 mt-0.5">BRK</span>
                  </div>
                </div>

                {/* Timed Fault Logic & Timed Breaker Logic */}
                <div className="space-y-2">
                  <div
                    onClick={() => handleComponentClick({ type: COMPONENT_TYPES.FAULT_BLOCK, name: 'Timed Fault Logic' })}
                    onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.FAULT_BLOCK, name: 'Timed Fault Logic' })}
                    draggable
                    className="p-1.5 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer flex items-center justify-between"
                  >
                    <div className="border border-slate-400 rounded px-1.5 py-0.5 text-[8.5px] font-medium bg-white">
                      Timed Fault Logic
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800">
                      <span>A -{'>'} G</span>
                      <svg width="12" height="16" viewBox="0 0 12 16" className="stroke-slate-900 fill-none stroke-[1.5]">
                        <line x1="6" y1="0" x2="6" y2="8" />
                        <line x1="1" y1="8" x2="11" y2="8" />
                        <line x1="3" y1="12" x2="9" y2="12" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-1.5 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer text-center">
                    <div className="border border-slate-400 rounded px-2 py-0.5 text-[8.5px] font-medium bg-white inline-block">
                      Timed Breaker Logic Closed@t0
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Switches & Faults')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Breakers & Faults Sub-Sheet"
                >
                  <span>More on Breakers & Faults</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Switches & Faults');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for Breakers & Faults"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 6: HVDC, FACTS & POWER ELECTRONICS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[400px]">
            <div className="bg-[#475569] text-white text-[10px] font-bold text-center py-1 tracking-wide rounded-t truncate px-1">
              HVDC, FACTS & POWER ELECTRONICS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 pt-1">
                {/* 6-Pulse Bridge Diagram */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.LCC_BRIDGE_6PULSE, name: '6-Pulse Bridge' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.LCC_BRIDGE_6PULSE, name: '6-Pulse Bridge' })}
                  draggable
                  className="p-1 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <div className="w-full flex justify-between text-[8.5px] font-mono text-slate-600 px-1">
                    <span>Com. Bus</span>
                    <span>AM GM</span>
                  </div>
                  <svg width="80" height="60" viewBox="0 0 80 60" className="stroke-slate-900 fill-none stroke-[1.6]">
                    <rect x="25" y="10" width="30" height="40" className="fill-slate-50" />
                    <line x1="10" y1="20" x2="25" y2="20" />
                    <line x1="10" y1="30" x2="25" y2="30" />
                    <line x1="10" y1="40" x2="25" y2="40" />
                    <line x1="55" y1="18" x2="70" y2="18" />
                    <line x1="55" y1="42" x2="70" y2="42" />
                    {/* Thyristor symbol inside */}
                    <polygon points="36,22 44,22 40,30" className="fill-slate-800" />
                    <line x1="34" y1="30" x2="46" y2="30" />
                  </svg>
                  <span className="text-[10px] font-bold text-slate-800 mt-0.5">6 Pulse Bridge</span>
                  <span className="text-[8px] font-mono text-slate-500">AO / KB</span>
                </div>

                {/* Thyristor & Diode symbols */}
                <div className="flex justify-around items-center pt-1">
                  <div
                    onClick={() => handleComponentClick({ type: COMPONENT_TYPES.THYRISTOR, name: 'Thyristor' })}
                    onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.THYRISTOR, name: 'Thyristor' })}
                    draggable
                    className="p-1 hover:bg-[#f1f5f9] rounded cursor-pointer flex flex-col items-center"
                  >
                    <svg width="36" height="24" viewBox="0 0 36 24" className="stroke-slate-900 fill-none stroke-[1.6]">
                      <line x1="4" y1="12" x2="14" y2="12" />
                      <polygon points="14,6 14,18 24,12" className="fill-slate-800" />
                      <line x1="24" y1="6" x2="24" y2="18" />
                      <line x1="24" y1="12" x2="32" y2="12" />
                      <line x1="21" y1="15" x2="25" y2="20" />
                    </svg>
                    <span className="text-[8.5px] font-mono text-slate-600">SCR</span>
                  </div>

                  <div
                    onClick={() => handleComponentClick({ type: COMPONENT_TYPES.DIODE, name: 'Diode' })}
                    onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.DIODE, name: 'Diode' })}
                    draggable
                    className="p-1 hover:bg-[#f1f5f9] rounded cursor-pointer flex flex-col items-center"
                  >
                    <svg width="36" height="24" viewBox="0 0 36 24" className="stroke-slate-900 fill-none stroke-[1.6]">
                      <line x1="4" y1="12" x2="14" y2="12" />
                      <polygon points="14,6 14,18 24,12" className="fill-slate-800" />
                      <line x1="24" y1="6" x2="24" y2="18" />
                      <line x1="24" y1="12" x2="32" y2="12" />
                    </svg>
                    <span className="text-[8.5px] font-mono text-slate-600">Diode</span>
                  </div>
                </div>
              </div>

              {/* Bottom "More on ..." Button */}
              <div className="flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Power Electronics & FACTS')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[9.5px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Power Electronics & FACTS Sub-Sheet"
                >
                  <span>More on Power Electronics</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Power Electronics & FACTS');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout for Power Electronics"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 7: IMPORTS, EXPORTS & LABELS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t truncate px-1">
              IMPORTS, EXPORTS & LABELS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden text-center">
              <div className="space-y-3 pt-2">
                {/* Node & Wire Labels */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1 border border-slate-200 rounded">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span className="text-[10px] font-bold font-mono text-blue-900">NodeName</span>
                    </div>
                    <span className="text-[8.5px] text-blue-800 leading-tight block mt-0.5">
                      Forced Connection for Elec Wires
                    </span>
                  </div>

                  <div className="p-1 border border-slate-200 rounded">
                    <div className="text-[10px] font-bold font-mono text-emerald-800">SigName</div>
                    <span className="text-[8.5px] text-emerald-700 leading-tight block mt-0.5">
                      Wire Label for Signals
                    </span>
                  </div>
                </div>

                {/* Upper Page Components Imports/Exports */}
                <div className="p-1.5 border border-slate-200 rounded bg-[#f8fafc] text-left">
                  <div className="flex items-center justify-between text-[10px] font-bold font-mono">
                    <span className="text-blue-900">XNode</span>
                    <div className="text-right text-emerald-700">
                      <div>[ IMPORT ] &gt;&gt;</div>
                      <div>[ EXPORT ] &gt;&gt;</div>
                    </div>
                  </div>
                  <div className="text-[8.5px] text-slate-600 text-center mt-1">
                    Electrical / Real / Integer Connections to Upper Page Components
                  </div>
                </div>

                {/* Transmit & Receive Wireless Page Connections */}
                <div className="p-1.5 border border-slate-200 rounded text-center">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold font-mono text-slate-800">
                    <span>▲ A1</span>
                    <span className="text-slate-500">[Main]</span>
                    <span>A1 ▲</span>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-0.5">
                    Transmit and receive wireless control connections between pages
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Meters & Probes')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Imports, Exports & Labels Sub-Sheet"
                >
                  <span>More on Labels & Routing</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Meters & Probes');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 8: TRANSFORMERS
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              TRANSFORMERS
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 pt-2">
                {/* Single Phase Transformer */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.TRANSFORMER_1PH, name: '1-Phase Transformer' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.TRANSFORMER_1PH, name: '1-Phase Transformer' })}
                  draggable
                  className="p-1.5 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer text-center"
                >
                  <span className="text-[9.5px] font-semibold text-sky-800">Single Phase</span>
                  <div className="flex items-center justify-center gap-2 py-1">
                    <svg width="70" height="34" viewBox="0 0 70 34" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <path d="M10 8 C10 14, 18 14, 18 17 C18 20, 10 20, 10 26" />
                      <line x1="26" y1="6" x2="26" y2="28" strokeWidth="1.2" />
                      <line x1="30" y1="6" x2="30" y2="28" strokeWidth="1.2" />
                      <path d="M46 8 C46 14, 38 14, 38 17 C38 20, 46 20, 46 26" />
                      <circle cx="6" cy="8" r="2" className="fill-[#1d4ed8]" />
                      <circle cx="6" cy="26" r="2" className="fill-[#1d4ed8]" />
                      <circle cx="50" cy="8" r="2" className="fill-[#1d4ed8]" />
                      <circle cx="50" cy="26" r="2" className="fill-[#1d4ed8]" />
                    </svg>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">#1 / #2 / #3</div>
                </div>

                {/* Three Phase Transformer */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.TRANSFORMER_3PH, name: '3-Phase Transformer' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.TRANSFORMER_3PH, name: '3-Phase Transformer' })}
                  draggable
                  className="p-1.5 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer text-center"
                >
                  <span className="text-[9.5px] font-semibold text-sky-800">Three Phase</span>
                  <div className="flex items-center justify-center gap-2 py-1">
                    <svg width="80" height="40" viewBox="0 0 80 40" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <circle cx="30" cy="20" r="14" className="fill-white" />
                      <circle cx="50" cy="20" r="14" className="fill-white" />
                      <text x="24" y="24" className="fill-slate-800 text-[10px] font-mono stroke-none font-bold">#1</text>
                      <text x="46" y="24" className="fill-slate-800 text-[10px] font-mono stroke-none font-bold">#2</text>
                      <line x1="30" y1="34" x2="30" y2="39" />
                      <line x1="50" y1="34" x2="50" y2="39" />
                    </svg>
                  </div>
                  <div className="text-[9px] font-mono text-slate-600 font-bold">Y - Δ</div>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Transformers & Lines')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Transformers Sub-Sheet"
                >
                  <span>More on Transformers</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Transformers & Lines');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 9: MACHINES
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              MACHINES
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden text-center">
              <div className="space-y-4 pt-1">
                {/* Synchronous Machine */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.SYNC_MACHINE_DQ, name: 'Synchronous Machine' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.SYNC_MACHINE_DQ, name: 'Synchronous Machine' })}
                  draggable
                  className="p-1 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="70" height="50" viewBox="0 0 70 50" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <circle cx="35" cy="25" r="18" className="fill-white" />
                    <text x="31" y="30" className="fill-slate-900 text-[13px] font-serif stroke-none font-bold">S</text>
                    <line x1="5" y1="15" x2="17" y2="25" />
                    <line x1="5" y1="35" x2="17" y2="25" />
                    <text x="6" y="12" className="fill-slate-700 text-[8px] font-mono stroke-none">W</text>
                    <text x="6" y="44" className="fill-slate-700 text-[8px] font-mono stroke-none">Te</text>
                  </svg>
                  <span className="text-[9.5px] font-semibold text-slate-800 mt-0.5">Synchronous</span>
                </div>

                {/* Induction Machine */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.INDUCTION_MACHINE, name: 'Induction Machine' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.INDUCTION_MACHINE, name: 'Induction Machine' })}
                  draggable
                  className="p-1 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="70" height="50" viewBox="0 0 70 50" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <circle cx="35" cy="25" r="18" className="fill-white" />
                    <circle cx="35" cy="25" r="12" strokeDasharray="3,2" />
                    <text x="27" y="29" className="fill-slate-900 text-[11px] font-mono stroke-none font-bold">IM</text>
                    <line x1="35" y1="7" x2="35" y2="2" />
                    <line x1="35" y1="43" x2="35" y2="48" />
                  </svg>
                  <span className="text-[9.5px] font-semibold text-slate-800 mt-0.5">Induction</span>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Machines & Drives')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Machines & Drives Sub-Sheet"
                >
                  <span>More on Machines & Drives</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Machines & Drives');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 10: CSMF (Control System Modeling Functions)
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              CSMF
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
              <div className="space-y-2 pt-1">
                {/* Summer and Multiplier */}
                <div className="flex justify-between items-center text-center">
                  <div className="p-1 border border-slate-200 rounded flex-1 mr-1">
                    <svg width="40" height="30" viewBox="0 0 40 30" className="stroke-slate-900 fill-none stroke-[1.6]">
                      <circle cx="20" cy="15" r="10" className="fill-white" />
                      <line x1="14" y1="15" x2="26" y2="15" />
                      <line x1="20" y1="9" x2="20" y2="21" />
                    </svg>
                    <span className="text-[8.5px] font-mono text-slate-600">+</span>
                  </div>

                  <div className="p-1 border border-slate-200 rounded flex-1 ml-1">
                    <svg width="40" height="30" viewBox="0 0 40 30" className="stroke-slate-900 fill-none stroke-[1.6]">
                      <rect x="8" y="5" width="24" height="20" className="fill-white" />
                      <line x1="14" y1="10" x2="26" y2="20" />
                      <line x1="26" y1="10" x2="14" y2="20" />
                    </svg>
                    <span className="text-[8.5px] font-mono text-slate-600">✕</span>
                  </div>
                </div>

                {/* Transfer function block */}
                <div className="p-1 border border-slate-200 rounded text-center bg-[#f8fafc]">
                  <div className="text-[10px] font-mono font-bold text-slate-800">G / (1 + sT)</div>
                  <span className="text-[8px] text-slate-500">Integrator / First Order Lag</span>
                </div>

                {/* Math function blocks */}
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="p-1 border border-slate-200 rounded font-mono text-[9px] font-bold text-slate-700">
                    x²
                  </div>
                  <div className="p-1 border border-slate-200 rounded font-mono text-[9px] font-bold text-slate-700">
                    √X
                  </div>
                  <div className="p-1 border border-slate-200 rounded font-mono text-[9px] font-bold text-slate-700">
                    |X|
                  </div>
                  <div className="p-1 border border-slate-200 rounded font-mono text-[9px] font-bold text-slate-700">
                    Sin
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Control Blocks (CSMF)')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Control Blocks (CSMF) Sub-Sheet"
                >
                  <span>More on CSMF Controls</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Control Blocks (CSMF)');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 11: TRANSMISSION LINES
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t truncate px-1">
              TRANSMISSION LINES
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden text-center">
              <div className="space-y-4 pt-2">
                {/* Bergeron T-Line Tower */}
                <div
                  onClick={() => handleComponentClick({ type: COMPONENT_TYPES.BERGERON_LINE_3PH, name: 'Transmission Line' })}
                  onDragStart={(e) => handleDragStart(e, { type: COMPONENT_TYPES.BERGERON_LINE_3PH, name: 'Transmission Line' })}
                  draggable
                  className="p-1.5 border border-slate-200 rounded hover:bg-[#f1f5f9] cursor-pointer flex flex-col items-center"
                >
                  <svg width="80" height="70" viewBox="0 0 80 70" className="stroke-slate-900 fill-none stroke-[1.8]">
                    <line x1="40" y1="10" x2="40" y2="65" strokeWidth="2.5" />
                    <line x1="20" y1="22" x2="60" y2="22" strokeWidth="2" />
                    <line x1="16" y1="36" x2="64" y2="36" strokeWidth="2" />
                    <line x1="24" y1="50" x2="56" y2="50" strokeWidth="2" />
                    {/* Tower truss lines */}
                    <line x1="20" y1="22" x2="40" y2="36" />
                    <line x1="60" y1="22" x2="40" y2="36" />
                    <circle cx="20" cy="22" r="2" className="fill-[#1d4ed8]" />
                    <circle cx="60" cy="22" r="2" className="fill-[#1d4ed8]" />
                    <circle cx="16" cy="36" r="2" className="fill-[#1d4ed8]" />
                    <circle cx="64" cy="36" r="2" className="fill-[#1d4ed8]" />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-slate-800 mt-1">Tline_1</span>
                  <span className="text-[8.5px] text-slate-500">Bergeron / Frequency Dependent</span>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Transformers & Lines')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Transmission Lines Sub-Sheet"
                >
                  <span>More on Transmission Lines</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Transformers & Lines');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 12: CABLES
              ========================================================================= */}
          <div className="border border-[#94a3b8] rounded bg-white shadow-xs flex flex-col h-[420px]">
            <div className="bg-[#475569] text-white text-[11px] font-bold text-center py-1 tracking-wide rounded-t">
              CABLES
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden text-center">
              <div className="space-y-4 pt-2">
                {/* Encompassing Pipe */}
                <div className="p-1.5 border border-slate-200 rounded">
                  <span className="text-[9.5px] font-semibold text-slate-700">Encompassing Pipe</span>
                  <div className="flex justify-center my-2">
                    <svg width="90" height="30" viewBox="0 0 90 30" className="stroke-slate-900 fill-none stroke-[1.8]">
                      <path d="M10 20 L80 20" strokeWidth="2.5" />
                      <line x1="10" y1="8" x2="10" y2="20" />
                      <line x1="80" y1="8" x2="80" y2="20" />
                      <text x="15" y="14" className="fill-slate-600 text-[8px] font-mono stroke-none">P</text>
                    </svg>
                  </div>
                </div>

                {/* Cable Models */}
                <div className="space-y-2">
                  <div className="p-1 border border-slate-200 rounded flex items-center justify-between px-2">
                    <span className="text-[9.5px] font-mono font-bold text-slate-800">Cable_1</span>
                    <svg width="50" height="18" viewBox="0 0 50 18" className="stroke-slate-900 fill-none stroke-[1.5]">
                      <rect x="5" y="4" width="40" height="10" rx="4" className="fill-slate-100" />
                      <circle cx="12" cy="9" r="2" className="fill-slate-800" />
                    </svg>
                  </div>

                  <div className="p-1 border border-slate-200 rounded flex items-center justify-between px-2">
                    <span className="text-[9.5px] font-mono font-bold text-slate-800">Cable_2</span>
                    <svg width="50" height="18" viewBox="0 0 50 18" className="stroke-slate-900 fill-none stroke-[1.5]">
                      <rect x="5" y="4" width="40" height="10" rx="4" className="fill-slate-100" />
                      <circle cx="12" cy="9" r="2" className="fill-slate-800" />
                      <circle cx="25" cy="9" r="2" className="fill-slate-800" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('Transformers & Lines')}
                  className="flex-1 py-1 px-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#cbd5e1] rounded text-[10px] font-medium text-[#334155] flex items-center justify-between transition-colors cursor-pointer"
                  title="Open Cables Sub-Sheet"
                >
                  <span>More on Cables & Lines</span>
                  <span className="p-0.5 bg-[#e2e8f0] rounded border border-[#cbd5e1]">
                    <ArrowRight className="w-3 h-3 text-[#475569]" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlyoutCategory?.('Transformers & Lines');
                  }}
                  className="p-1 bg-[#f1f5f9] hover:bg-[#dbeafe] hover:text-[#1d4ed8] border border-[#cbd5e1] rounded text-[#475569] transition-colors cursor-pointer"
                  title="Pop-out Floating Browser Flyout"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
