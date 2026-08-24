import { SearchX } from 'lucide-react';

interface Props {
  message?: string;
}

export default function EmptyState({ message = 'No matching internships found.' }: Props) {
  return (
    <div id="empty-state" className="bg-white border border-slate-200 rounded-xl py-14 px-6 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        <SearchX size={32} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No Matches Found</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-1">
        {message}
      </p>
      <p className="text-[11px] text-slate-400">
        Try lowering your minimum match threshold or clearing location filters.
      </p>
    </div>
  );
}
