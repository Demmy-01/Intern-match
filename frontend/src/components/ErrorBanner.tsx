import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  return (
    <div
      id="error-banner"
      role="alert"
      className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm"
    >
      <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rose-900">{message}</p>
        <p className="text-[11px] text-rose-700/80 mt-0.5">
          Check if CognoDB database and backend API are running.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200
                       px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-600 text-lg leading-none px-1 cursor-pointer transition-colors"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
