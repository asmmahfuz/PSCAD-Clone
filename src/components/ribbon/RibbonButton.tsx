import React from 'react';

export interface RibbonButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  size?: 'large' | 'small' | 'compact';
  active?: boolean;
  disabled?: boolean;
  title?: string;
  shortcut?: string;
  keytip?: string;
  showKeytip?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'accent' | 'success' | 'warning';
  onClick?: () => void;
  hasDropdown?: boolean;
  onDropdownClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const RibbonButton: React.FC<RibbonButtonProps> = ({
  icon,
  label,
  sublabel,
  size = 'small',
  active = false,
  disabled = false,
  title,
  shortcut,
  keytip,
  showKeytip = false,
  variant = 'default',
  onClick,
  hasDropdown = false,
  onDropdownClick,
  className = '',
}) => {
  const tooltip = title || (shortcut ? `${label} (${shortcut})` : label);

  // Variant accent styles
  const getVariantStyles = () => {
    if (disabled) return 'opacity-40 cursor-not-allowed text-slate-500';
    if (active) {
      return 'bg-blue-600/90 text-white shadow-sm border border-blue-400/50';
    }
    switch (variant) {
      case 'primary':
        return 'text-emerald-300 hover:text-white hover:bg-emerald-600/30 border border-transparent hover:border-emerald-500/40';
      case 'danger':
        return 'text-rose-300 hover:text-white hover:bg-rose-600/30 border border-transparent hover:border-rose-500/40';
      case 'accent':
        return 'text-amber-300 hover:text-white hover:bg-amber-600/30 border border-transparent hover:border-amber-500/40';
      case 'success':
        return 'text-cyan-300 hover:text-white hover:bg-cyan-600/30 border border-transparent hover:border-cyan-500/40';
      case 'warning':
        return 'text-amber-400 hover:text-white hover:bg-amber-500/30 border border-transparent hover:border-amber-500/40';
      default:
        return 'text-slate-200 hover:text-white hover:bg-[#222d42] border border-transparent hover:border-[#303f5c]';
    }
  };

  if (size === 'large') {
    return (
      <div className="relative group inline-flex flex-col items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          title={tooltip}
          aria-label={tooltip}
          className={`flex flex-col items-center justify-center px-2 py-1 min-w-[56px] h-[68px] rounded transition-all cursor-pointer select-none text-center ${getVariantStyles()} ${className}`}
        >
          <div className="w-8 h-8 flex items-center justify-center mb-0.5 shrink-0 text-current transition-transform duration-100 group-hover:scale-105">
            {icon}
          </div>
          <span className="text-[10.5px] font-medium leading-tight max-w-[68px] truncate">
            {label}
          </span>
          {sublabel && (
            <span className="text-[9px] text-slate-400 leading-tight max-w-[68px] truncate">
              {sublabel}
            </span>
          )}
        </button>

        {hasDropdown && (
          <button
            type="button"
            disabled={disabled}
            onClick={onDropdownClick}
            className="w-full h-3.5 flex items-center justify-center hover:bg-[#2a3750] text-slate-400 hover:text-white rounded-b -mt-1 cursor-pointer transition-colors"
            title="More options"
          >
            <svg viewBox="0 0 8 4" className="w-2 h-1 fill-current">
              <path d="M0 0l4 4 4-4z" />
            </svg>
          </button>
        )}

        {/* KeyTip Badge */}
        {showKeytip && keytip && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[10px] font-mono px-1 py-0.2 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
            {keytip}
          </div>
        )}
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <div className="relative group inline-flex items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          title={tooltip}
          aria-label={tooltip}
          className={`p-1.5 h-6.5 w-6.5 flex items-center justify-center rounded transition-all cursor-pointer select-none ${getVariantStyles()} ${className}`}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {icon}
          </span>
        </button>

        {showKeytip && keytip && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
            {keytip}
          </div>
        )}
      </div>
    );
  }

  // size === 'small' (stacked horizontal item)
  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={tooltip}
        aria-label={tooltip}
        className={`flex items-center gap-1.5 px-2 py-0.5 h-[22px] min-w-[72px] rounded transition-all cursor-pointer select-none text-left ${getVariantStyles()} ${className}`}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="text-[11px] font-medium leading-none truncate flex-1">
          {label}
        </span>
        {hasDropdown && (
          <svg viewBox="0 0 8 4" className="w-1.5 h-1 fill-current opacity-70 ml-0.5">
            <path d="M0 0l4 4 4-4z" />
          </svg>
        )}
      </button>

      {showKeytip && keytip && (
        <div className="absolute -bottom-1 left-3 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
          {keytip}
        </div>
      )}
    </div>
  );
};
