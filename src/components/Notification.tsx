import React from 'react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useMeshStore } from '../store/meshStore';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// Styles per type
// ─────────────────────────────────────────────────────────────

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; border: string; bg: string; text: string; bar: string }
> = {
  info: {
    icon: <Info size={16} />,
    border: 'border-blue-500/40',
    bg: 'bg-blue-950/80',
    text: 'text-blue-300',
    bar: 'bg-blue-500',
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    border: 'border-green-500/40',
    bg: 'bg-green-950/80',
    text: 'text-green-300',
    bar: 'bg-green-500',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    border: 'border-orange-500/40',
    bg: 'bg-orange-950/80',
    text: 'text-orange-300',
    bar: 'bg-orange-500',
  },
  error: {
    icon: <AlertCircle size={16} />,
    border: 'border-red-500/40',
    bg: 'bg-red-950/80',
    text: 'text-red-300',
    bar: 'bg-red-500',
  },
};

const AUTO_DISMISS_MS = 4000;

// ─────────────────────────────────────────────────────────────
// Single toast
// ─────────────────────────────────────────────────────────────

interface ToastProps {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
}

function Toast({ notification, onDismiss }: ToastProps) {
  const { id, type, message } = notification;
  const cfg = typeConfig[type];

  // Animate in on mount
  const [visible, setVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 300);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden',
        'rounded-2xl border backdrop-blur-md',
        'shadow-2xl shadow-black/50',
        cfg.border,
        cfg.bg,
        // Slide in/out from right
        'transition-all duration-300 ease-out',
        visible && !leaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0',
      ].join(' ')}
    >
      {/* Auto-dismiss progress bar */}
      <div
        className={`absolute top-0 left-0 h-0.5 ${cfg.bar}`}
        style={{
          animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
        }}
      />

      {/* Content */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <span className={`flex-shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>

        {/* Message */}
        <p className="flex-1 text-sm text-gray-200 leading-snug min-w-0 break-words">
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="flex-shrink-0 -mr-1 -mt-0.5 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Keyframes injected via style tag — Tailwind can't animate width % */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Notification container
// ─────────────────────────────────────────────────────────────

export function NotificationContainer() {
  const { notifications, removeNotification } = useMeshStore();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notification={n} onDismiss={removeNotification} />
        </div>
      ))}
    </div>
  );
}

export default NotificationContainer;
