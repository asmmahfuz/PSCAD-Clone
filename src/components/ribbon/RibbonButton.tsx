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
  const tooltip = title || (shortcut ? `${label.replace('\n', ' ')} (${shortcut})` : label.replace('\n', ' '));

  const handleButtonClick = (e: React.MouseEvent) => {
    if (disabled) return;
    if (hasDropdown && onDropdownClick) {
      onDropdownClick(e);
    } else if (onClick) {
      onClick();
    }
  };

  // Authentic PSCAD/Office Ribbon Button Styles
  const getVariantStyles = () => {
    if (disabled) return 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600 border border-transparent';
    if (active) {
      return 'cad-ribbon-btn-active ribbon-btn-active bg-[#cce4f7] dark:bg-[#1e3256] text-[#002b66] dark:text-sky-200 border border-[#6ba5db] dark:border-sky-500/60 shadow-2xs font-semibold';
    }
    switch (variant) {
      case 'primary':
        return 'text-slate-800 dark:text-slate-200 hover:text-blue-900 dark:hover:text-white hover:bg-[#e5f1fb] dark:hover:bg-[#1e2a3f] border border-transparent hover:border-[#9ac5f4] dark:hover:border-[#334b6e]';
      case 'danger':
        return 'text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-300 dark:hover:border-rose-700/50';
      case 'accent':
        return 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-300 dark:hover:border-amber-700/50';
      default:
        return 'text-slate-800 dark:text-slate-200 hover:text-[#002b66] dark:hover:text-white hover:bg-[#e5f1fb] dark:hover:bg-[#1e2a3f] border border-transparent hover:border-[#9ac5f4] dark:hover:border-[#334b6e]';
    }
  };

  if (size === 'large') {
    const labelLines = label.split('\n');

    return (
      <div className="relative group inline-flex flex-col items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={handleButtonClick}
          title={tooltip}
          aria-label={tooltip}
          className={`flex flex-col items-center justify-center px-1.5 py-1 min-w-[44px] h-[66px] rounded-[3px] transition-colors cursor-pointer select-none text-center ${getVariantStyles()} ${className}`}
        >
          {/* Icon Area */}
          <div className="w-[30px] h-[30px] flex items-center justify-center mb-0.5 shrink-0 transition-transform duration-75 group-hover:scale-102">
            {icon}
          </div>

          {/* Label (Supports 1 or 2 lines) */}
          <div className="flex flex-col items-center justify-center leading-[11.5px] text-[10px] text-slate-800 dark:text-slate-200 font-sans">
            {labelLines.map((line, idx) => (
              <span key={idx} className="flex items-center gap-0.5 whitespace-nowrap">
                <span>{line}</span>
                {/* If last line and has dropdown, show downward chevron */}
                {hasDropdown && idx === labelLines.length - 1 && (
                  <svg viewBox="0 0 8 5" className="w-1.5 h-1 fill-current opacity-75 inline-block ml-0.5">
                    <path d="M0 0l4 4.5 4-4.5z" />
                  </svg>
                )}
              </span>
            ))}
            {sublabel && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                {sublabel}
              </span>
            )}
          </div>
        </button>

        {/* KeyTip Badge */}
        {showKeytip && keytip && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-50 bg-[#fff176] text-black font-extrabold text-[9.5px] font-mono px-1 py-0.2 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
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
          onClick={handleButtonClick}
          title={tooltip}
          aria-label={tooltip}
          className={`p-1 h-[22px] w-[24px] flex items-center justify-center rounded-[3px] transition-colors cursor-pointer select-none ${getVariantStyles()} ${className}`}
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
        onClick={handleButtonClick}
        title={tooltip}
        aria-label={tooltip}
        className={`flex items-center gap-1.5 px-1.5 py-0.5 h-[21px] min-w-[66px] rounded-[3px] transition-colors cursor-pointer select-none text-left ${getVariantStyles()} ${className}`}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="text-[10.5px] font-normal text-slate-800 dark:text-slate-200 leading-none truncate flex-1">
          {label}
        </span>
        {hasDropdown && (
          <span
            onClick={(e) => {
              if (onDropdownClick) {
                e.stopPropagation();
                onDropdownClick(e);
              }
            }}
            className="p-0.5 hover:bg-slate-300/40 dark:hover:bg-slate-600/40 rounded transition-colors"
          >
            <svg viewBox="0 0 8 5" className="w-1.5 h-1 fill-current opacity-70 ml-0.5 shrink-0">
              <path d="M0 0l4 4.5 4-4.5z" />
            </svg>
          </span>
        )}
      </button>

      {showKeytip && keytip && (
        <div className="absolute -bottom-1 left-2 z-50 bg-[#fff176] text-black font-extrabold text-[9px] font-mono px-0.8 py-0.1 rounded shadow-md border border-black/50 pointer-events-none uppercase tracking-wider animate-in fade-in zoom-in-75 duration-100">
          {keytip}
        </div>
      )}
    </div>
  );
};
