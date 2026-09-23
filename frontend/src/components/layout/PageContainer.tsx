import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  maxWidth?: 'narrow' | 'standard' | 'wide' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  maxWidth = 'standard',
}) => {
  const maxWMap = {
    narrow: 'max-w-4xl',
    standard: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 ${maxWMap[maxWidth]} ${className}`}>
      {(title || actions) && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-bg-panel-border pb-6">
          <div className="space-y-1.5">
            {title && (
              <h1 className="text-2xl sm:text-3xl font-display font-medium text-ink tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-ink-muted font-body leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </main>
  );
};
