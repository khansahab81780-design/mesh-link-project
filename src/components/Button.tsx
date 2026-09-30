import React from 'react';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600',
    'text-gray-950 font-semibold',
    'border border-cyan-400',
    'shadow-lg shadow-cyan-500/20',
    'focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
  ].join(' '),

  secondary: [
    'bg-gray-800 hover:bg-gray-700 active:bg-gray-900',
    'text-gray-100',
    'border border-gray-700 hover:border-gray-600',
    'focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
  ].join(' '),

  danger: [
    'bg-red-600 hover:bg-red-500 active:bg-red-700',
    'text-white font-semibold',
    'border border-red-500',
    'shadow-lg shadow-red-500/20',
    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
  ].join(' '),

  ghost: [
    'bg-transparent hover:bg-white/5 active:bg-white/10',
    'text-gray-300 hover:text-white',
    'border border-transparent hover:border-white/10',
    'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: '[&>svg]:w-3.5 [&>svg]:h-3.5',
  md: '[&>svg]:w-4 [&>svg]:h-4',
  lg: '[&>svg]:w-5 [&>svg]:h-5',
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center',
        'transition-all duration-150',
        'select-none outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        iconSizeClasses[size],
        className,
      ].join(' ')}
    >
      {/* Left icon / loader */}
      {loading ? (
        <Loader2 className="animate-spin flex-shrink-0" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}

      {/* Label */}
      {children && <span className="truncate">{children}</span>}

      {/* Right icon */}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
