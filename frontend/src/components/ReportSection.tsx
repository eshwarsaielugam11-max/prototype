import React from 'react';

interface ReportSectionProps {
  title: string;
  badge?: string;
  badgeVariant?: 'gold' | 'blue' | 'emerald' | 'amber' | 'muted';
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  isDisclaimer?: boolean;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  badge,
  badgeVariant = 'muted',
  icon: Icon,
  children,
  className = '',
  isDisclaimer = false,
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'gold':
      case 'amber':
        return 'bg-signal-gold/15 text-signal-gold border-signal-gold/30';
      case 'blue':
        return 'bg-signal-blue/15 text-signal-blue border-signal-blue/30';
      case 'emerald':
        return 'bg-risk-low/15 text-risk-low border-risk-low/30';
      default:
        return 'bg-bg-void text-ink-muted border-bg-panel-border';
    }
  };

  return (
    <section
      className={`rounded-lg border transition-all ${
        isDisclaimer
          ? 'bg-bg-panel border-bg-panel-border border-l-4 border-l-risk-caution shadow-panel p-6 sm:p-7'
          : 'bg-bg-panel border-bg-panel-border shadow-panel p-6 sm:p-7'
      } ${className}`}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-5 border-b border-bg-panel-border">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                isDisclaimer
                  ? 'bg-risk-caution/15 text-risk-caution'
                  : 'bg-bg-void text-signal-gold border border-bg-panel-border'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h2 className="text-base sm:text-lg font-display font-medium text-ink tracking-tight">
            {title}
          </h2>
        </div>

        {badge && (
          <span
            className={`self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-medium border ${getBadgeStyle()}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Section Content */}
      <div className={isDisclaimer ? 'text-ink text-sm leading-relaxed font-body' : 'text-ink-muted text-sm font-body'}>
        {children}
      </div>
    </section>
  );
};
