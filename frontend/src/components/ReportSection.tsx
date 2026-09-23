import React from 'react';

interface ReportSectionProps {
  title: string;
  badge?: string;
  badgeVariant?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  isDisclaimer?: boolean;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  badge,
  badgeVariant = 'slate',
  icon: Icon,
  children,
  className = '',
  isDisclaimer = false,
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section
      className={`rounded-2xl border transition-all ${
        isDisclaimer
          ? 'bg-amber-50/90 border-amber-300 shadow-sm p-6 sm:p-7'
          : 'bg-white border-slate-200 shadow-card p-6 sm:p-7'
      } ${className}`}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDisclaimer
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h2
            className={`text-base sm:text-lg font-bold tracking-tight ${
              isDisclaimer ? 'text-amber-950' : 'text-slate-900'
            }`}
          >
            {title}
          </h2>
        </div>

        {badge && (
          <span
            className={`self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getBadgeStyle()}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Section Content */}
      <div className={isDisclaimer ? 'text-amber-950 text-sm leading-relaxed' : 'text-slate-700 text-sm'}>
        {children}
      </div>
    </section>
  );
};
