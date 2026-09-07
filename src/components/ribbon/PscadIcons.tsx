import React from 'react';

// Common SVG props
interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// 1. CLIPBOARD ICONS

/**
 * Authentic PSCAD Paste Icon
 * Clipboard with warm golden board, silver top spring clamp, white document with blue margin lines
 */
export const IconPaste: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_board_grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#eed8a1" />
        <stop offset="50%" stopColor="#d8b979" />
        <stop offset="100%" stopColor="#b8934f" />
      </linearGradient>
      <linearGradient id="pscad_clip_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f1f3f5" />
        <stop offset="50%" stopColor="#cfd4da" />
        <stop offset="100%" stopColor="#9aa0a6" />
      </linearGradient>
      <linearGradient id="pscad_paper_grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f0f4f8" />
      </linearGradient>
    </defs>
    {/* Clipboard backboard */}
    <rect x="4" y="5" width="23" height="25" rx="2.5" fill="url(#pscad_board_grad)" stroke="#967232" strokeWidth="1" />
    {/* Inner shadow/bevel */}
    <rect x="5.5" y="6.5" width="20" height="22" rx="1.5" stroke="#fef3c7" strokeWidth="0.8" opacity="0.6" />
    {/* Paper sheet */}
    <path
      d="M7.5 9.5H23.5V26.5C23.5 27.05 23.05 27.5 22.5 27.5H8.5C7.95 27.5 7.5 27.05 7.5 26.5V9.5Z"
      fill="url(#pscad_paper_grad)"
      stroke="#b0bec5"
      strokeWidth="0.8"
    />
    {/* Paper text lines */}
    <line x1="10" y1="14" x2="21" y2="14" stroke="#90a4ae" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="17.5" x2="21" y2="17.5" stroke="#90a4ae" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="21" x2="18" y2="21" stroke="#90a4ae" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="24.5" x2="15" y2="24.5" stroke="#90a4ae" strokeWidth="1.2" strokeLinecap="round" />
    {/* Clipboard Top Spring Clip */}
    <rect x="9.5" y="2.5" width="12" height="6" rx="1.5" fill="url(#pscad_clip_grad)" stroke="#6b7280" strokeWidth="0.9" />
    <circle cx="15.5" cy="5.5" r="1.3" fill="#4b5563" />
    <path d="M12 4.5H19" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
  </svg>
);

/**
 * Authentic PSCAD Cut Icon (Scissors)
 */
export const IconCut: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Blades */}
    <path d="M4 4.5L13.5 12" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 11.5L13.5 4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 4.5L13 11.5" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
    {/* Central Rivet */}
    <circle cx="8" cy="8" r="1" fill="#475569" stroke="#ffffff" strokeWidth="0.4" />
    {/* Scissor Blue Handles */}
    <circle cx="3.5" cy="4" r="2.2" stroke="#1d4ed8" strokeWidth="1.5" fill="none" />
    <circle cx="3.5" cy="12" r="2.2" stroke="#1d4ed8" strokeWidth="1.5" fill="none" />
  </svg>
);

/**
 * Authentic PSCAD Copy Icon (Dual Documents)
 */
export const IconCopy: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Back document */}
    <rect x="4.5" y="1.5" width="9" height="11" rx="1" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
    {/* Front document */}
    <rect x="1.5" y="4" width="9" height="11" rx="1" fill="#ffffff" stroke="#2563eb" strokeWidth="1.1" />
    {/* Dog-ear fold */}
    <path d="M7.5 4V6.5H10.5" stroke="#2563eb" strokeWidth="0.9" fill="#dbeafe" />
    {/* Content lines */}
    <line x1="3.5" y1="8" x2="8" y2="8" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
    <line x1="3.5" y1="10.5" x2="8.5" y2="10.5" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
    <line x1="3.5" y1="12.5" x2="6.5" y2="12.5" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/**
 * Authentic PSCAD Delete Icon (Glossy Red 3D X)
 */
export const IconDelete: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_del_grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="40%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>
    {/* Drop shadow */}
    <path
      d="M3.5 2.5L2.5 3.5L6.5 8L2.5 12.5L3.5 13.5L8 9L12.5 13.5L13.5 12.5L9.5 8L13.5 3.5L12.5 2.5L8 7L3.5 2.5Z"
      fill="#7f1d1d"
      transform="translate(0.5, 0.5)"
      opacity="0.4"
    />
    {/* 3D X Shape */}
    <path
      d="M3.2 2L2 3.2L6.3 8L2 12.8L3.2 14L8 9.2L12.8 14L14 12.8L9.7 8L14 3.2L12.8 2L8 6.8L3.2 2Z"
      fill="url(#pscad_del_grad)"
      stroke="#991b1b"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Top-left Bevel Highlight */}
    <path d="M3.5 2.6L7.8 7.3L12.5 2.6" stroke="#fca5a5" strokeWidth="0.7" strokeLinecap="round" />
  </svg>
);

// 2. COMPILE AND RUN ICONS

/**
 * Authentic PSCAD Build Icon (Detailed 3D Metallic Cogwheel)
 */
export const IconBuild: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_metal_gear" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="35%" stopColor="#cbd5e1" />
        <stop offset="70%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="pscad_metal_hub" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="60%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
    </defs>
    {/* Outer Gear Cog Teeth (8 teeth) */}
    <g stroke="#475569" strokeWidth="0.8" strokeLinejoin="round">
      <path
        d="M14 3h4v4h-4zM25 6.5l2.8 2.8-2.8 2.8-2.8-2.8zM25 14h4v4h-4zM25 21.5l2.8 2.8-2.8 2.8-2.8-2.8zM14 25h4v4h-4zM6.5 21.5l2.8 2.8-2.8 2.8-2.8-2.8zM3 14h4v4H3zM6.5 6.5l2.8 2.8-2.8 2.8-2.8-2.8z"
        fill="url(#pscad_metal_gear)"
      />
      {/* Central Gear Disk */}
      <circle cx="16" cy="16" r="10.5" fill="url(#pscad_metal_gear)" />
    </g>
    {/* Rim inner groove */}
    <circle cx="16" cy="16" r="8" fill="url(#pscad_metal_hub)" stroke="#334155" strokeWidth="0.7" />
    <circle cx="16" cy="16" r="7.2" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
    {/* Center axle bore */}
    <circle cx="16" cy="16" r="3.5" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
    {/* Axle keyway notch */}
    <rect x="15" y="12" width="2" height="3" fill="#0f172a" />
    {/* Top rim sheen highlight */}
    <path
      d="M10 11C12 9 16 8.5 20 10"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

/**
 * Authentic PSCAD Build Modified Icon (Overlapping Dual Gears with Green Badge)
 */
export const IconBuildModified: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_metal_gear_sm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="pscad_green_badge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
    </defs>
    {/* Back gear (smaller) */}
    <g opacity="0.9" transform="translate(1, 0)">
      <circle cx="11" cy="11" r="7" fill="url(#pscad_metal_gear_sm)" stroke="#475569" strokeWidth="0.7" />
      <circle cx="11" cy="11" r="2.5" fill="#1e293b" />
      <rect x="10" y="2.5" width="2" height="3" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
      <rect x="10" y="16.5" width="2" height="3" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
      <rect x="2.5" y="10" width="3" height="2" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
      <rect x="16.5" y="10" width="3" height="2" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
    </g>
    {/* Main front gear */}
    <g transform="translate(3, 4)">
      <circle cx="15" cy="15" r="9" fill="url(#pscad_metal_gear_sm)" stroke="#334155" strokeWidth="0.8" />
      <circle cx="15" cy="15" r="6.5" fill="#64748b" stroke="#1e293b" strokeWidth="0.5" />
      <circle cx="15" cy="15" r="3" fill="#0f172a" />
      {/* Teeth */}
      <rect x="13.5" y="4.5" width="3" height="3.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.6" />
      <rect x="13.5" y="22" width="3" height="3.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.6" />
      <rect x="4.5" y="13.5" width="3.5" height="3" fill="#cbd5e1" stroke="#334155" strokeWidth="0.6" />
      <rect x="22" y="13.5" width="3.5" height="3" fill="#cbd5e1" stroke="#334155" strokeWidth="0.6" />
    </g>
    {/* Green Modification indicator/plus badge at bottom right */}
    <g transform="translate(19, 19)">
      <circle cx="5.5" cy="5.5" r="5.5" fill="url(#pscad_green_badge)" stroke="#ffffff" strokeWidth="1" />
      {/* Curved green reload / mod arrow */}
      <path
        d="M3 5.5A2.5 2.5 0 1 1 5.5 8"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M6 7.5L5.5 8.8L4.2 7.8" fill="#ffffff" />
    </g>
  </svg>
);

/**
 * Authentic PSCAD Clean Icon (Wooden Broom / Brush with Straw Bristles)
 */
export const IconClean: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_wood_handle" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="pscad_straw" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#fde047" />
        <stop offset="80%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    {/* Angled Wooden Handle */}
    <line
      x1="26"
      y1="5"
      x2="15"
      y2="16"
      stroke="url(#pscad_wood_handle)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <line x1="25.5" y1="5.5" x2="15.5" y2="15.5" stroke="#fde68a" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
    {/* Metal ferrule / tie band */}
    <rect
      x="12.5"
      y="14.5"
      width="5.5"
      height="3.5"
      rx="1"
      transform="rotate(-45 15 16)"
      fill="#94a3b8"
      stroke="#475569"
      strokeWidth="0.7"
    />
    {/* Straw Bristle Broom Head */}
    <path
      d="M14 16.5L18.5 21L13 27C11.5 28.5 8.5 28 6.5 26.5C4.5 25 4 22 5.5 20.5L14 16.5Z"
      fill="url(#pscad_straw)"
      stroke="#a16207"
      strokeWidth="0.8"
    />
    {/* Bristle texture lines */}
    <path d="M12 19L6.5 24.5M14 20.5L8.5 26M15.5 22L11 27" stroke="#854d0e" strokeWidth="0.7" strokeLinecap="round" />
    {/* Whisk sweep sparkles */}
    <path d="M5 29L3 30M9 29.5L9.5 31M2 25L0.5 25.5" stroke="#60a5fa" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

/**
 * Authentic PSCAD Run Icon (3D Glossy Green Orb with Play Triangle)
 */
export const IconRun: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-sm ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="pscad_run_orb" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="40%" stopColor="#22c55e" />
        <stop offset="80%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#14532d" />
      </radialGradient>
      <linearGradient id="pscad_run_glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Outer subtle shadow/bevel ring */}
    <circle cx="16" cy="16" r="14" fill="#14532d" stroke="#166534" strokeWidth="1" />
    {/* 3D Orb body */}
    <circle cx="16" cy="16" r="13" fill="url(#pscad_run_orb)" />
    {/* Top glossy reflection cap */}
    <ellipse cx="16" cy="9.5" rx="8.5" ry="5" fill="url(#pscad_run_glass)" />
    {/* White Play Triangle with subtle drop shadow */}
    <path
      d="M12.5 10.5V21.5L22 16L12.5 10.5Z"
      fill="#ffffff"
      stroke="#14532d"
      strokeWidth="0.6"
      strokeLinejoin="round"
      className="drop-shadow-xs"
    />
  </svg>
);

/**
 * Authentic PSCAD Stop Icon (3D Glossy Red Orb with Stop Square)
 */
export const IconStop: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-sm ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="pscad_stop_orb" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="40%" stopColor="#ef4444" />
        <stop offset="80%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
      <linearGradient id="pscad_stop_glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Outer ring */}
    <circle cx="16" cy="16" r="14" fill="#7f1d1d" stroke="#991b1b" strokeWidth="1" />
    {/* 3D Orb body */}
    <circle cx="16" cy="16" r="13" fill="url(#pscad_stop_orb)" />
    {/* Top glossy cap */}
    <ellipse cx="16" cy="9.5" rx="8.5" ry="5" fill="url(#pscad_stop_glass)" />
    {/* White Stop Square */}
    <rect
      x="11.5"
      y="11.5"
      width="9"
      height="9"
      rx="1.2"
      fill="#ffffff"
      stroke="#7f1d1d"
      strokeWidth="0.6"
      className="drop-shadow-xs"
    />
  </svg>
);

/**
 * Authentic PSCAD Pause Icon (3D Glossy Amber/Yellow Orb with Pause Bars)
 */
export const IconPause: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-sm ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="pscad_pause_orb" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="80%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </radialGradient>
      <linearGradient id="pscad_pause_glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Outer ring */}
    <circle cx="16" cy="16" r="14" fill="#92400e" stroke="#b45309" strokeWidth="1" />
    {/* 3D Orb body */}
    <circle cx="16" cy="16" r="13" fill="url(#pscad_pause_orb)" />
    {/* Top glossy cap */}
    <ellipse cx="16" cy="9.5" rx="8.5" ry="5" fill="url(#pscad_pause_glass)" />
    {/* Two White Pause Bars */}
    <rect x="11.5" y="11" width="3.5" height="10" rx="1" fill="#ffffff" stroke="#92400e" strokeWidth="0.5" />
    <rect x="17" y="11" width="3.5" height="10" rx="1" fill="#ffffff" stroke="#92400e" strokeWidth="0.5" />
  </svg>
);

/**
 * Authentic PSCAD Skip Run Icon (Blue Fast-Forward Glyphs)
 */
export const IconSkipRun: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_blue_ff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    {/* Circular background disc */}
    <circle cx="16" cy="16" r="13" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.2" />
    {/* Fast forward dual play triangles */}
    <path
      d="M7 10L15 16L7 22V10Z"
      fill="url(#pscad_blue_ff)"
      stroke="#1e40af"
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
    <path
      d="M15 10L23 16L15 22V10Z"
      fill="url(#pscad_blue_ff)"
      stroke="#1e40af"
      strokeWidth="0.6"
      strokeLinejoin="round"
    />
    {/* Stop bar */}
    <rect x="23.5" y="10" width="2.5" height="12" rx="0.8" fill="url(#pscad_blue_ff)" stroke="#1e40af" strokeWidth="0.6" />
  </svg>
);

/**
 * Authentic PSCAD Next Step Icon (Pair of Blue Shoe Footprints)
 */
export const IconNextStep: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_foot_grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    {/* Left footprint */}
    <g transform="translate(6, 7) rotate(-8 5 9)">
      {/* Toe / sole */}
      <path
        d="M2 1C4.5 0.5 7.5 1.5 8 4.5C8.5 7 6.5 9.5 5 11C4 11 2 10.5 1.5 8.5C0.8 6 0.8 2 2 1Z"
        fill="url(#pscad_foot_grad)"
        stroke="#1e40af"
        strokeWidth="0.6"
      />
      {/* Heel */}
      <path
        d="M2.5 13C4 12.5 6 12.8 6.5 14C7 15.5 5.5 17 4 17C2.5 17 1.5 15.5 1.8 14C2 13.5 2.2 13.1 2.5 13Z"
        fill="url(#pscad_foot_grad)"
        stroke="#1e40af"
        strokeWidth="0.6"
      />
    </g>
    {/* Right footprint (stepping higher) */}
    <g transform="translate(16, 4) rotate(8 5 9)">
      {/* Toe / sole */}
      <path
        d="M6 1C3.5 0.5 0.5 1.5 0 4.5C-0.5 7 1.5 9.5 3 11C4 11 6 10.5 6.5 8.5C7.2 6 7.2 2 6 1Z"
        fill="url(#pscad_foot_grad)"
        stroke="#1e40af"
        strokeWidth="0.6"
      />
      {/* Heel */}
      <path
        d="M5.5 13C4 12.5 2 12.8 1.5 14C1 15.5 2.5 17 4 17C5.5 17 6.5 15.5 6.2 14C6 13.5 5.8 13.1 5.5 13Z"
        fill="url(#pscad_foot_grad)"
        stroke="#1e40af"
        strokeWidth="0.6"
      />
    </g>
  </svg>
);

/**
 * Authentic PSCAD Snapshot Icon (Metallic Silver Digital Camera with Glass Lens)
 */
export const IconSnapshot: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_cam_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f1f5f9" />
        <stop offset="30%" stopColor="#cbd5e1" />
        <stop offset="80%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="pscad_cam_lens" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="40%" stopColor="#10b981" />
        <stop offset="80%" stopColor="#047857" />
        <stop offset="100%" stopColor="#064e3b" />
      </radialGradient>
    </defs>
    {/* Shutter button */}
    <rect x="7" y="6.5" width="4" height="2.5" rx="0.8" fill="#475569" stroke="#1e293b" strokeWidth="0.5" />
    {/* Flash bump */}
    <path d="M12 7.5H20L21.5 9.5H10.5L12 7.5Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
    {/* Camera main metallic body */}
    <rect x="4" y="9.5" width="24" height="17" rx="3" fill="url(#pscad_cam_body)" stroke="#475569" strokeWidth="0.9" />
    {/* Body top metallic highlight strip */}
    <line x1="5.5" y1="11" x2="26.5" y2="11" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
    {/* Grip panel */}
    <rect x="5.5" y="13" width="3.5" height="11.5" rx="1" fill="#475569" opacity="0.4" />
    {/* Flash glass window */}
    <rect x="21" y="11.5" width="4" height="2.5" rx="0.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
    {/* Sensor red dot */}
    <circle cx="19" cy="12.5" r="0.8" fill="#ef4444" />
    {/* Circular Lens Bezel */}
    <circle cx="15.5" cy="18" r="6.5" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
    <circle cx="15.5" cy="18" r="5.5" fill="url(#pscad_cam_lens)" />
    {/* Glass lens reflection highlight */}
    <ellipse cx="14" cy="16" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.65" />
  </svg>
);

// 3. SCENARIOS ICONS

/**
 * Authentic PSCAD Save Scenario Icon (Yellow Parcel Box with Green Checkmark Badge)
 */
export const IconSaveScenario: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_box_top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#facc15" />
      </linearGradient>
      <linearGradient id="pscad_box_front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="pscad_box_side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#a16207" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>
      <radialGradient id="pscad_check_badge" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#15803d" />
      </radialGradient>
    </defs>
    {/* 3D Box Top face */}
    <path d="M14 4L23 8L15 12L6 8L14 4Z" fill="url(#pscad_box_top)" stroke="#854d0e" strokeWidth="0.7" />
    {/* 3D Box Front face */}
    <path d="M6 8L15 12V23L6 19V8Z" fill="url(#pscad_box_front)" stroke="#854d0e" strokeWidth="0.7" />
    {/* 3D Box Right face */}
    <path d="M15 12L23 8V19L15 23V12Z" fill="url(#pscad_box_side)" stroke="#854d0e" strokeWidth="0.7" />
    {/* Tape strip on top */}
    <path d="M10 6L19 10" stroke="#ca8a04" strokeWidth="1.2" opacity="0.6" />
    {/* Green Checkmark Circle Badge (at bottom right) */}
    <g transform="translate(16, 15)">
      <circle cx="6.5" cy="6.5" r="6.5" fill="url(#pscad_check_badge)" stroke="#ffffff" strokeWidth="1" className="drop-shadow-xs" />
      <path
        d="M3.8 6.8L5.8 8.8L9.2 4.8"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/**
 * Authentic PSCAD Delete Scenario Icon (Yellow Parcel Box with Red X Badge)
 */
export const IconDeleteScenario: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="pscad_x_badge" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </radialGradient>
    </defs>
    {/* 3D Box faces */}
    <path d="M14 4L23 8L15 12L6 8L14 4Z" fill="#facc15" stroke="#854d0e" strokeWidth="0.7" />
    <path d="M6 8L15 12V23L6 19V8Z" fill="#eab308" stroke="#854d0e" strokeWidth="0.7" />
    <path d="M15 12L23 8V19L15 23V12Z" fill="#a16207" stroke="#854d0e" strokeWidth="0.7" />
    {/* Red X Circle Badge */}
    <g transform="translate(16, 15)">
      <circle cx="6.5" cy="6.5" r="6.5" fill="url(#pscad_x_badge)" stroke="#ffffff" strokeWidth="1" className="drop-shadow-xs" />
      <path
        d="M4.2 4.2L8.8 8.8M8.8 4.2L4.2 8.8"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

/**
 * Authentic PSCAD View Scenario Icon (Yellow Parcel Box with Inspection Magnifying Glass)
 */
export const IconViewScenario: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    {/* 3D Box faces */}
    <path d="M14 4L23 8L15 12L6 8L14 4Z" fill="#facc15" stroke="#854d0e" strokeWidth="0.7" />
    <path d="M6 8L15 12V23L6 19V8Z" fill="#eab308" stroke="#854d0e" strokeWidth="0.7" />
    <path d="M15 12L23 8V19L15 23V12Z" fill="#a16207" stroke="#854d0e" strokeWidth="0.7" />
    {/* Magnifying Glass badge */}
    <g transform="translate(15, 14)">
      <circle cx="5.5" cy="5.5" r="5" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.5" />
      <line x1="9.5" y1="9.5" x2="13.5" y2="13.5" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="4.5" cy="4.5" rx="2" ry="1" fill="#ffffff" opacity="0.8" />
    </g>
  </svg>
);

// 4. NAVIGATION ICONS (3D Glossy Light-Green Arrows)

export const IconNavBack: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_nav_grad_left" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    {/* 3D Arrow pointing Left */}
    <path
      d="M13 6L4 14L13 22V18H24V10H13V6Z"
      fill="url(#pscad_nav_grad_left)"
      stroke="#15803d"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Top Bevel Highlight */}
    <path d="M13 7.5L5.8 14L13 20.5" stroke="#bbf7d0" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    <line x1="13" y1="11" x2="23" y2="11" stroke="#bbf7d0" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

export const IconNavUp: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_nav_grad_up" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    {/* 3D Arrow pointing Up */}
    <path
      d="M6 13L14 4L22 13H18V24H10V13H6Z"
      fill="url(#pscad_nav_grad_up)"
      stroke="#15803d"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Top Highlight */}
    <path d="M7.5 13L14 5.8L20.5 13" stroke="#bbf7d0" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    <line x1="11" y1="14" x2="11" y2="23" stroke="#bbf7d0" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

export const IconNavForward: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_nav_grad_right" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
    {/* 3D Arrow pointing Right */}
    <path
      d="M15 6L24 14L15 22V18H4V10H15V6Z"
      fill="url(#pscad_nav_grad_right)"
      stroke="#15803d"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Top Highlight */}
    <path d="M15 7.5L22.2 14L15 20.5" stroke="#bbf7d0" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    <line x1="5" y1="11" x2="15" y2="11" stroke="#bbf7d0" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

// 5. EDITING ICONS

/**
 * Authentic PSCAD Undo Icon (3D Glossy Sky-Blue Curved Arrow Left)
 */
export const IconUndo: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_undo_blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <path
      d="M10 8L3 14L10 20V15.5C16 15.5 21 17.5 24 22C24.5 15 20 9.5 10 9.5V8Z"
      fill="url(#pscad_undo_blue)"
      stroke="#1e40af"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <path d="M9.5 9.5L4.8 14L9.5 18.5" stroke="#dbeafe" strokeWidth="0.9" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * Authentic PSCAD Redo Icon (3D Glossy Sky-Blue Curved Arrow Right)
 */
export const IconRedo: React.FC<IconProps> = ({ size = 28, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_redo_blue" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <path
      d="M18 8L25 14L18 20V15.5C12 15.5 7 17.5 4 22C3.5 15 8 9.5 18 9.5V8Z"
      fill="url(#pscad_redo_blue)"
      stroke="#1e40af"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <path d="M18.5 9.5L23.2 14L18.5 18.5" stroke="#dbeafe" strokeWidth="0.9" strokeLinecap="round" fill="none" />
  </svg>
);

/**
 * Authentic PSCAD Select Pointer Cursor
 */
export const IconSelectPointer: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M2.5 1.5L2.5 13L5.5 10.5L8.5 15L10.5 14L7.5 9.5L12 9.5L2.5 1.5Z"
      fill="#111827"
      stroke="#ffffff"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Authentic PSCAD Pan Hand Icon (Open Tan Palm)
 */
export const IconPanHand: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_hand_skin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fed7aa" />
        <stop offset="50%" stopColor="#fba76c" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <path
      d="M7 1.5C6.4 1.5 6 1.9 6 2.5V7C5.6 6.5 5 6.2 4.4 6.2C3.8 6.2 3.3 6.7 3.3 7.3C3.3 8.3 4.5 10 5.5 11.5C6.5 13 8 14.5 10.5 14.5C13 14.5 14 12.5 14 10V5C14 4.4 13.6 4 13 4C12.4 4 12 4.4 12 5V4.5C12 3.9 11.6 3.5 11 3.5C10.4 3.5 10 3.9 10 4.5V3C10 2.4 9.6 2 9 2C8.4 2 8 2.4 8 3V2.5C8 1.9 7.6 1.5 7 1.5Z"
      fill="url(#pscad_hand_skin)"
      stroke="#9a3412"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Authentic PSCAD Search Binoculars Icon
 */
export const IconSearchBinoculars: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Left barrel */}
    <rect x="2" y="5" width="4.5" height="8" rx="1.5" fill="#334155" stroke="#0f172a" strokeWidth="0.8" />
    <ellipse cx="4.2" cy="13" rx="2" ry="1.2" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.6" />
    {/* Right barrel */}
    <rect x="9.5" y="5" width="4.5" height="8" rx="1.5" fill="#334155" stroke="#0f172a" strokeWidth="0.8" />
    <ellipse cx="11.8" cy="13" rx="2" ry="1.2" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.6" />
    {/* Bridge & Center wheel */}
    <rect x="6.5" y="6" width="3" height="2" rx="0.5" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
    <rect x="7" y="8" width="2" height="3" fill="#cbd5e1" />
    {/* Eyepieces */}
    <rect x="3" y="2.5" width="2.5" height="2.5" rx="0.5" fill="#1e293b" />
    <rect x="10.5" y="2.5" width="2.5" height="2.5" rx="0.5" fill="#1e293b" />
  </svg>
);

// 6. WIRES ICON

/**
 * Authentic PSCAD Wire Mode Icon
 * Signature PSCAD icon: Diagonal circuit conductor wire with hollow circular solder terminal pads at both ends
 */
export const IconWireMode: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_wire_metal" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="30%" stopColor="#94a3b8" />
        <stop offset="60%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="pscad_terminal_pin" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#e2e8f0" />
        <stop offset="80%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
    </defs>
    {/* Diagonal Conductor Wire (45 degrees) */}
    <line
      x1="8"
      y1="24"
      x2="24"
      y2="8"
      stroke="#334155"
      strokeWidth="3.6"
      strokeLinecap="round"
    />
    <line
      x1="8"
      y1="24"
      x2="24"
      y2="8"
      stroke="url(#pscad_wire_metal)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <line
      x1="8.5"
      y1="23.5"
      x2="23.5"
      y2="8.5"
      stroke="#ffffff"
      strokeWidth="0.8"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* Bottom-left Solder Terminal Ring */}
    <circle cx="8" cy="24" r="4.5" fill="url(#pscad_terminal_pin)" stroke="#334155" strokeWidth="1" />
    <circle cx="8" cy="24" r="2" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
    {/* Top-right Solder Terminal Ring */}
    <circle cx="24" cy="8" r="4.5" fill="url(#pscad_terminal_pin)" stroke="#334155" strokeWidth="1" />
    <circle cx="24" cy="8" r="2" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
  </svg>
);

// 7. ZOOM ICONS

/**
 * Authentic PSCAD Zoom In Icon (Wooden-handled Magnifying Glass with Green Plus Badge)
 */
export const IconZoomIn: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <linearGradient id="pscad_zoom_wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="pscad_zoom_silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="pscad_plus_badge" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#15803d" />
      </radialGradient>
    </defs>
    {/* Wooden handle */}
    <line x1="8" y1="24" x2="2" y2="30" stroke="url(#pscad_zoom_wood)" strokeWidth="3.8" strokeLinecap="round" />
    <line x1="8" y1="24" x2="6.5" y2="25.5" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="butt" />
    {/* Outer Silver Bezel */}
    <circle cx="17" cy="13" r="10.5" fill="none" stroke="url(#pscad_zoom_silver)" strokeWidth="2.2" />
    {/* Glass Lens with tint and reflection */}
    <circle cx="17" cy="13" r="9.5" fill="#f0f9ff" stroke="#94a3b8" strokeWidth="0.5" />
    <ellipse cx="14.5" cy="9.5" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.75" />
    {/* Green Plus Badge */}
    <circle cx="17" cy="13" r="5" fill="url(#pscad_plus_badge)" stroke="#ffffff" strokeWidth="1" className="drop-shadow-xs" />
    <path d="M17 10.5V15.5M14.5 13H19.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Authentic PSCAD Zoom Out Icon (Wooden-handled Magnifying Glass with Red Minus Badge)
 */
export const IconZoomOut: React.FC<IconProps> = ({ size = 32, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-xs ${className}`}
    {...props}
  >
    <defs>
      <radialGradient id="pscad_minus_badge" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </radialGradient>
    </defs>
    {/* Wooden handle */}
    <line x1="8" y1="24" x2="2" y2="30" stroke="#78350f" strokeWidth="3.8" strokeLinecap="round" />
    <line x1="8" y1="24" x2="6.5" y2="25.5" stroke="#cbd5e1" strokeWidth="3.8" strokeLinecap="butt" />
    {/* Silver Bezel */}
    <circle cx="17" cy="13" r="10.5" fill="none" stroke="#94a3b8" strokeWidth="2.2" />
    {/* Glass Lens */}
    <circle cx="17" cy="13" r="9.5" fill="#f0f9ff" stroke="#94a3b8" strokeWidth="0.5" />
    <ellipse cx="14.5" cy="9.5" rx="4.5" ry="2.2" fill="#ffffff" opacity="0.75" />
    {/* Red Minus Badge */}
    <circle cx="17" cy="13" r="5" fill="url(#pscad_minus_badge)" stroke="#ffffff" strokeWidth="1" className="drop-shadow-xs" />
    <line x1="14.5" y1="13" x2="19.5" y2="13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Authentic PSCAD Zoom Extent Icon (Frame with Outward Corner Arrows)
 */
export const IconZoomExtent: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Dashed outer boundary */}
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 1.5" />
    {/* 4 Diagonal Outward Corner Arrows */}
    <path d="M5 2H2V5M2 2L6 6" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 2H14V5M14 2L10 6" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 14H2V11M2 14L6 10" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 14H14V11M14 14L10 10" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Authentic PSCAD Zoom Rectangle Icon (Dashed Selection Box + Magnifier)
 */
export const IconZoomRectangle: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Dashed Marquee box */}
    <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" />
    {/* Mini Magnifier inside */}
    <circle cx="7" cy="7" r="3.5" fill="#f0f9ff" stroke="#0369a1" strokeWidth="1.2" />
    <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#0369a1" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Mini Magnifier for Zoom Dropdown Combobox
 */
export const IconMiniMagnifier: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="6.5" cy="6.5" r="4.5" fill="#f8fafc" stroke="#475569" strokeWidth="1.3" />
    <line x1="10" y1="10" x2="14" y2="14" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="5.5" cy="5" rx="2" ry="1" fill="#ffffff" opacity="0.8" />
  </svg>
);
