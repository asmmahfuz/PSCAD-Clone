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
      className={`flex flex-col justify-between h-[88px] px-1.5 pt-0.5 pb-1 border-r border-[#dcdfe4] dark:border-[#232d3f] shrink-0 relative select-none ${className}`}
    >
      {/* Group Controls Body */}
      <div className="flex items-center gap-0.5 flex-1 overflow-visible">
        {children}
      </div>

      {/* Group Bottom Caption Bar */}
      <div className="flex items-center justify-center h-3.5 mt-0.5 px-1 relative">
        <span className="text-[10px] font-normal text-[#64748b] dark:text-slate-400 font-sans tracking-tight truncate select-none text-center">
          {title}
        </span>

        {onLaunchDialog && (
          <button
            type="button"
            onClick={onLaunchDialog}
            title={dialogTitle || `Open ${title} options`}
            className="absolute right-0 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-[#e2e8f0] dark:hover:bg-[#253248] rounded transition-colors cursor-pointer"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
