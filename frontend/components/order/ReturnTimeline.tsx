'use client';

import { useI18n } from '../../lib/i18n';

export type ReturnTimelineStatus =
  | 'INITIATED'
  | 'DROPPED_OFF'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DEPOT'
  | 'COMPLETED';

interface ReturnTimelineProps {
  status: ReturnTimelineStatus | string;
  timestamps?: {
    initiatedAt?: string | null;
    droppedOffAt?: string | null;
    arrivedAtDepotAt?: string | null;
    completedAt?: string | null;
  };
}

interface Step {
  key: ReturnTimelineStatus;
  label: string;
  icon: string;
}

/**
 * Visual stepper for return shipments — mirror of OrderTimeline but for the
 * customer's "I want my money back" journey.
 *
 * Steps: barcode created → dropped at carrier → in transit → arrived at depot → refund completed
 */
export function ReturnTimeline({ status, timestamps }: ReturnTimelineProps) {
  const t = useI18n((s) => s.t);

  const steps: Step[] = [
    { key: 'INITIATED',        label: t('returnTimeline.initiated'),       icon: '🏷️' },
    { key: 'DROPPED_OFF',      label: t('returnTimeline.droppedOff'),      icon: '📤' },
    { key: 'IN_TRANSIT',       label: t('returnTimeline.inTransit'),       icon: '🚚' },
    { key: 'ARRIVED_AT_DEPOT', label: t('returnTimeline.arrivedAtDepot'),  icon: '🏭' },
    { key: 'COMPLETED',        label: t('returnTimeline.completed'),       icon: '✅' },
  ];

  const currentIdx = Math.max(0, steps.findIndex((s) => s.key === status));

  return (
    <div className="w-full">
      {/* Mobile: vertical list */}
      <div className="sm:hidden space-y-3">
        {steps.map((step, idx) => {
          const reached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = pickTs(step.key, timestamps);
          return (
            <div key={step.key} className="flex items-start gap-3">
              <Dot reached={reached} isCurrent={isCurrent} icon={step.icon} />
              <div className="flex-1 pt-0.5">
                <p className={`text-sm font-medium ${reached ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {step.label}
                </p>
                {ts && reached && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatTs(ts)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:block">
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-amber-500 transition-all duration-700"
            style={{ width: currentIdx <= 0 ? '0%' : `calc((100% - 2.5rem) * ${currentIdx / Math.max(1, steps.length - 1)})` }}
          />
          <div className="relative flex justify-between">
            {steps.map((step, idx) => {
              const reached = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const ts = pickTs(step.key, timestamps);
              return (
                <div key={step.key} className="flex flex-col items-center text-center" style={{ width: `${100 / steps.length}%` }}>
                  <Dot reached={reached} isCurrent={isCurrent} icon={step.icon} />
                  <p className={`mt-2 text-xs font-medium ${reached ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {step.label}
                  </p>
                  {ts && reached && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatTs(ts)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ reached, isCurrent, icon }: { reached: boolean; isCurrent: boolean; icon: string }) {
  const bg = reached ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500';
  return (
    <span
      className={`relative shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm shadow-sm transition-all ${bg} ${
        isCurrent ? 'ring-4 ring-amber-200 dark:ring-amber-900/40 animate-pulse-ring scale-110' : ''
      }`}
    >
      <span aria-hidden>{icon}</span>
    </span>
  );
}

function pickTs(key: ReturnTimelineStatus, ts?: ReturnTimelineProps['timestamps']): string | null | undefined {
  if (!ts) return undefined;
  switch (key) {
    case 'INITIATED':        return ts.initiatedAt;
    case 'DROPPED_OFF':      return ts.droppedOffAt;
    case 'IN_TRANSIT':       return null; // no separate timestamp — carrier event-based
    case 'ARRIVED_AT_DEPOT': return ts.arrivedAtDepotAt;
    case 'COMPLETED':        return ts.completedAt;
    default:                 return null;
  }
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return iso; }
}
