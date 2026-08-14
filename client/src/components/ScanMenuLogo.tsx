import React from 'react';

export interface ScanMenuLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'monochrome' | 'brand' | 'dark' | 'white' | 'gold';
  reticleColor?: string;
  symbolColor?: string;
}

/**
 * ScanMenuLogo - Scalable SVG Vector Logo for The Scan Menu
 * Features 4 scanner reticles and the intertwined S-M continuous ribbon monogram.
 */
export const ScanMenuLogo: React.FC<ScanMenuLogoProps> = ({
  size = 32,
  variant = 'monochrome',
  reticleColor,
  symbolColor,
  className = '',
  style,
  ...props
}) => {
  // Determine stroke colors based on variant
  let finalReticle = 'currentColor';
  let finalSymbol = 'currentColor';

  if (variant === 'brand') {
    finalReticle = '#F59E0B'; // Amber accent
    finalSymbol = '#0F172A';  // Deep slate
  } else if (variant === 'dark') {
    finalReticle = '#0F172A';
    finalSymbol = '#0F172A';
  } else if (variant === 'white') {
    finalReticle = '#FFFFFF';
    finalSymbol = '#FFFFFF';
  } else if (variant === 'gold') {
    finalReticle = '#F59E0B';
    finalSymbol = '#F59E0B';
  }

  // Allow explicit color overrides
  if (reticleColor) finalReticle = reticleColor;
  if (symbolColor) finalSymbol = symbolColor;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1254 1254"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...props}
    >
      {/* Four Scanner Reticle Corners */}
      <g stroke={finalReticle} strokeWidth="74" strokeLinecap="round" strokeLinejoin="round">
        {/* Top-Left */}
        <path d="M 436 215 L 245 215 A 84 84 0 0 0 161 299 L 161 415" />
        {/* Top-Right */}
        <path d="M 818 215 L 1009 215 A 84 84 0 0 1 1093 299 L 1093 415" />
        {/* Bottom-Left */}
        <path d="M 161 839 L 161 955 A 84 84 0 0 0 245 1039 L 436 1039" />
        {/* Bottom-Right */}
        <path d="M 1093 839 L 1093 955 A 84 84 0 0 1 1009 1039 L 818 1039" />
      </g>

      {/* Central 'S-M' Intertwined Monogram */}
      <g stroke={finalSymbol} strokeWidth="74" strokeLinecap="round" strokeLinejoin="round">
        {/* Continuous S Stroke */}
        <path
          d="
            M 640 380
            L 365 380
            A 120 120 0 0 0 365 620
            L 570 620
            A 80 80 0 0 1 570 780
            L 275 780
          "
        />

        {/* Continuous M Stroke */}
        <path
          d="
            M 410 500
            L 635 500
            L 810 670
            L 987 415
            L 987 780
          "
        />
      </g>
    </svg>
  );
};

export interface BrandHeaderProps {
  size?: number;
  title?: string;
  subtitle?: string;
  variant?: 'monochrome' | 'brand' | 'dark' | 'white' | 'gold';
  className?: string;
}

/**
 * BrandHeader - Logo mark paired with "The Scan Menu" / Pixora typography
 */
export const BrandHeader: React.FC<BrandHeaderProps> = ({
  size = 36,
  title = 'The Scan Menu',
  subtitle,
  variant = 'brand',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="p-2 rounded-2xl bg-slate-900 shadow-sm flex items-center justify-center">
        <ScanMenuLogo size={size} variant={variant === 'brand' ? 'brand' : variant} reticleColor="#F59E0B" symbolColor="#FFFFFF" />
      </div>
      <div>
        <h1 className="font-display tracking-tight text-2xl font-bold text-slate-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-slate-500 font-sans font-medium tracking-wide">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default ScanMenuLogo;
