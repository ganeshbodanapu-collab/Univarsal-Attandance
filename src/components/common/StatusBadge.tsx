import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showDot = true,
}) => {
  const getBadgeConfig = (stat: string) => {
    switch (stat.toLowerCase()) {
      case 'present':
      case 'active':
      case 'paid':
        return {
          pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
          dot: 'bg-emerald-500',
        };
      case 'pending':
      case 'halfday':
      case 'warning':
      case 'unpaid':
        return {
          pill: 'bg-amber-50 text-amber-700 ring-amber-600/20',
          dot: 'bg-amber-500',
        };
      case 'partiallypaid':
      case 'partially_paid':
        return {
          pill: 'bg-purple-50 text-purple-700 ring-purple-600/20',
          dot: 'bg-purple-500',
        };
      case 'processing':
        return {
          pill: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          dot: 'bg-blue-500',
        };
      case 'closed':
        return {
          pill: 'bg-slate-100 text-slate-700 ring-slate-400/20',
          dot: 'bg-slate-400',
        };
      case 'absent':
      case 'danger':
      case 'left':
      case 'inactive':
      case 'rejected':
        return {
          pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
          dot: 'bg-rose-500',
        };
      case 'leave':
      case 'holiday':
      case 'neutral':
      default:
        return {
          pill: 'bg-slate-50 text-slate-700 ring-slate-600/20',
          dot: 'bg-slate-400',
        };
    }
  };

  const getLabel = (stat: string) => {
    switch (stat) {
      case 'halfDay':
      case 'halfday':
        return 'Half Day';
      case 'partiallyPaid':
      case 'partially_paid':
      case 'partiallypaid':
        return 'Partially Paid';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'unpaid':
        return 'Unpaid';
      case 'paid':
        return 'Paid';
      default:
        return stat.charAt(0).toUpperCase() + stat.slice(1);
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset tracking-tight shadow-2xs ${config.pill} ${className}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      )}
      <span>{getLabel(status)}</span>
    </span>
  );
};
export default StatusBadge;
