import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface RibbonGroupProps {
  title: string;
  children: React.ReactNode;
  onLaunchDialog?: () => void;
  dialogTitle?: string;
  className?: string;
}

export const RibbonGroup: React.FC<RibbonGroupProps> = ({
  title,
  children,
  onLaunchDialog,
  dialogTitle,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col justify-between h-[84px] px-1.5 py-0.5 border-r border-[#26334a]/80 shrink-0 relative select-none ${className}`}
    >
      {/* Group Controls Body */}
      <div className="flex items-center gap-1 flex-1 overflow-visible">
        {children}
      </div>

      {/* Group Bottom Caption Bar */}
      <div className="flex items-center justify-between h-4 mt-0.5 px-0.5 border-t border-[#1e273a]/60">
        <span className="text-[9.5px] font-semibold tracking-wide text-slate-400/90 uppercase font-sans truncate select-none text-center flex-1">
          {title}
        </span>

        {onLaunchDialog && (
          <button
            type="button"
            onClick={onLaunchDialog}
            title={dialogTitle || `Open ${title} options`}
            className="p-0.5 text-slate-500 hover:text-slate-200 hover:bg-[#253248] rounded transition-colors cursor-pointer"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
