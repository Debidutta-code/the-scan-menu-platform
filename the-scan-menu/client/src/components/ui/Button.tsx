import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'amber'
  | 'emerald'
  | 'danger'
  | 'ghost';

export type ButtonSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'icon-sm'
  | 'icon-md'
  | 'icon-lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-950 hover:bg-slate-800 text-white border border-transparent shadow-xs',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-2xs',
  outline:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-slate-300 shadow-2xs',
  amber:
    'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border border-transparent shadow-xs',
  emerald:
    'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-xs',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white border border-transparent shadow-xs',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7.5 px-3 text-[11px] font-semibold rounded-md gap-1.5',
  md: 'h-9 px-4 text-xs font-semibold rounded-lg gap-2',
  lg: 'h-10.5 px-5 text-sm font-semibold rounded-lg gap-2.5',
  'icon-sm': 'h-7.5 w-7.5 p-0 rounded-md justify-center',
  'icon-md': 'h-9 w-9 p-0 rounded-lg justify-center',
  'icon-lg': 'h-10.5 w-10.5 p-0 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconButton = size.startsWith('icon-');
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          inline-flex items-center select-none font-bold font-sans tracking-tight transition-all duration-150
          cursor-pointer active:scale-95 disabled:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full justify-center' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={`${size === 'sm' || size === 'icon-sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin shrink-0`} />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}

        {!isIconButton && children && <span>{children}</span>}

        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
