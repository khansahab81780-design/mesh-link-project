import React from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'elevated' | 'bordered';

export interface CardProps {
  variant?: CardVariant;
  className?: string;
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Element rendered in the top-right of the header */
  action?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────

const variantClasses: Record<CardVariant, string> = {
  default: [
    'bg-gray-900/60 backdrop-blur-sm',
    'border border-white/10',
    'rounded-2xl',
  ].join(' '),

  elevated: [
    'bg-gray-800/70 backdrop-blur-md',
    'border border-white/15',
    'rounded-2xl',
    'shadow-xl shadow-black/40',
  ].join(' '),

  bordered: [
    'bg-white/5 backdrop-blur-sm',
    'border border-cyan-500/30',
    'rounded-2xl',
    'shadow-lg shadow-cyan-500/5',
  ].join(' '),
};

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────

export function Card({
  variant = 'default',
  className = '',
  children,
  title,
  description,
  action,
}: CardProps) {
  const hasHeader = title || description || action;

  return (
    <div className={`${variantClasses[variant]} overflow-hidden ${className}`}>
      {/* Header */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-white leading-snug truncate">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {action && (
            <div className="flex-shrink-0 mt-0.5">{action}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={hasHeader ? 'px-5 pt-4 pb-5' : 'p-5'}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CardDivider (utility)
// ─────────────────────────────────────────────────────────────

export function CardDivider() {
  return <div className="h-px w-full bg-white/10 my-4" />;
}
