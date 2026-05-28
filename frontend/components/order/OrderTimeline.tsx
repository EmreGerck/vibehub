'use client';

import { useI18n } from '../../lib/i18n';

export type OrderTimelineStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

interface TimelineStep {
  key: OrderTimelineStatus;
  label: string;
  icon: string;
}

interface OrderTimelineProps {
  /** Current order status from the backend. */
  status: OrderTimelineStatus | string;
  /** Optional per-stage timestamps (ISO strings) — pulled from order audit/events. */
  timestamps?: Partial<Record<OrderTimelineStatus, string | null>>;
  /** Optional estimated delivery date for the SHIPPED stage. */
  estimatedDelivery?: string | null;
}

/**
 * Hepsiburada-style horizontal order status stepper.
 *
 * - Each step gets a circle + label + (optional) timestamp.
 * - Past steps are filled (purple), current step pulses, future steps muted.
 * - Refund / cancel branches replace the happy path when triggered.
 */
export function OrderTimeline({ status, timestamps, estimatedDelivery }: OrderTimelineProps) {
  const t = useI18n((s) => s.t);

  // Refund / cancel branch — show a 4-step refund track
  if (status === 'REFUND_REQUESTED' || status === 'REFUNDED') {
    const refundSteps: TimelineStep[] = [
      { key: 'PLACED',            label: t('orderTimeline.placed'),         icon: '🛒' },
      { key: 'DELIVERED',         label: t('orderTimeline.delivered'),      icon: '📬' },
      { key: 'REFUND_REQUESTED',  label: t('orderTimeline.refundRequested'), icon: '↩️' },
      { key: 'REFUNDED',          label: t('orderTimeline.refunded'),       icon: '✅' },
    ];
    return <StepperRow steps={refundSteps} currentStatus={status} timestamps={timestamps} />;
  }

  if (status === 'CANCELLED') {
    const cancelSteps: TimelineStep[] = [
      { key: 'PLACED',    label: t('orderTimeline.placed'),    icon: '🛒' },
      { key: 'CANCELLED', label: t('orderTimeline.cancelled'), icon: '🚫' },
    ];
    return <StepperRow steps={cancelSteps} currentStatus={status} timestamps={timestamps} />;
  }

  // Happy path
  const happySteps: TimelineStep[] = [
    { key: 'PLACED',    label: t('orderTimeline.placed'),    icon: '🛒' },
    { key: 'CONFIRMED', label: t('orderTimeline.confirmed'), icon: '✅' },
    { key: 'SHIPPED',   label: t('orderTimeline.shipped'),   icon: '📦' },
    { key: 'DELIVERED', label: t('orderTimeline.delivered'), icon: '🎉' },
  ];

  return (
    <StepperRow
      steps={happySteps}
      currentStatus={status}
      timestamps={timestamps}
      estimatedDelivery={estimatedDelivery}
    />
  );
}

interface StepperRowProps {
  steps: TimelineStep[];
  currentStatus: string;
  timestamps?: Partial<Record<OrderTimelineStatus, string | null>>;
  estimatedDelivery?: string | null;
}

function StepperRow({ steps, currentStatus, timestamps, estimatedDelivery }: StepperRowProps) {
  const t = useI18n((s) => s.t);
  const currentIdx = steps.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const isRefundFlow = currentStatus === 'REFUND_REQUESTED' || currentStatus === 'REFUNDED';

  return (
    <div className="w-full">
      {/* Mobile: vertical list */}
      <div className="sm:hidden space-y-3">
        {steps.map((step, idx) => {
          const reached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = timestamps?.[step.key];
          return (
            <div key={step.key} className="flex items-start gap-3">
              <StepDot reached={reached} isCurrent={isCurrent} isCancel={isCancelled && idx === currentIdx} icon={step.icon} />
              <div className="flex-1 pt-0.5">
                <p className={`text-sm font-medium ${reached ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  {step.label}
                </p>
                {ts && reached && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatTs(ts)}</p>
                )}
                {isCurrent && estimatedDelivery && step.key === 'SHIPPED' && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                    {t('orderTimeline.estimatedDelivery')}: {formatDateOnly(estimatedDelivery)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Connector line behind dots */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div
            className={`absolute top-5 left-5 h-0.5 transition-all duration-700 ${
              isCancelled ? 'bg-red-500' : isRefundFlow ? 'bg-amber-500' : 'bg-purple-500'
            }`}
            style={{
              width: currentIdx <= 0 ? '0%' : `calc((100% - 2.5rem) * ${currentIdx / Math.max(1, steps.length - 1)})`,
            }}
          />
          <div className="relative flex justify-between">
            {steps.map((step, idx) => {
              const reached = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const ts = timestamps?.[step.key];
              return (
                <div key={step.key} className="flex flex-col items-center text-center" style={{ width: `${100 / steps.length}%` }}>
                  <StepDot
                    reached={reached}
                    isCurrent={isCurrent}
                    isCancel={isCancelled && idx === currentIdx}
                    isRefund={isRefundFlow && idx === currentIdx}
                    icon={step.icon}
                  />
                  <p className={`mt-2 text-xs font-medium ${reached ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {step.label}
                  </p>
                  {ts && reached && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatTs(ts)}</p>
                  )}
                  {isCurrent && estimatedDelivery && step.key === 'SHIPPED' && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 max-w-[8rem]">
                      {t('orderTimeline.estimatedDelivery')}<br />
                      <span className="font-semibold">{formatDateOnly(estimatedDelivery)}</span>
                    </p>
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

function StepDot({
  reached,
  isCurrent,
  isCancel,
  isRefund,
  icon,
}: {
  reached: boolean;
  isCurrent: boolean;
  isCancel?: boolean;
  isRefund?: boolean;
  icon: string;
}) {
  let bg = 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500';
  if (reached) bg = 'bg-purple-600 text-white';
  if (isCancel) bg = 'bg-red-500 text-white';
  if (isRefund) bg = 'bg-amber-500 text-white';
  return (
    <span
      className={`relative shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm shadow-sm transition-all ${bg} ${
        isCurrent ? 'ring-4 ring-purple-200 dark:ring-purple-900/40 animate-pulse-ring scale-110' : ''
      }`}
    >
      <span aria-hidden>{icon}</span>
    </span>
  );
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
