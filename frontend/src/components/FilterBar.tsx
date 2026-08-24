import type { Filters } from '../types';
import { SlidersHorizontal, MapPin, DollarSign, Target } from 'lucide-react';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'On-site', label: 'On-site' },
];

export default function FilterBar({ filters, onChange }: Props) {
  return (
    <section id="filter-bar" className="bg-white border border-slate-200 rounded-xl p-3.5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Label header */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b sm:border-b-0 pb-2 sm:pb-0 border-slate-100">
          <SlidersHorizontal size={14} className="text-indigo-600" />
          <span>Filters</span>
        </div>

        {/* Filter controls horizontal grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Work Mode dropdown */}
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
            <select
              id="location-filter"
              value={filters.locationPreference ?? ''}
              onChange={(e) =>
                onChange({ ...filters, locationPreference: e.target.value || null })
              }
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer"
            >
              {LOCATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Min Stipend range */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <DollarSign size={12} className="text-slate-400" />
                Min Stipend:
              </span>
              <span className="text-indigo-600 font-semibold">${filters.minStipend}/mo</span>
            </div>
            <input
              id="stipend-filter"
              type="range"
              min={0}
              max={2500}
              step={100}
              value={filters.minStipend}
              onChange={(e) =>
                onChange({ ...filters, minStipend: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Min Match % range */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                <Target size={12} className="text-slate-400" />
                Min Match:
              </span>
              <span className="text-indigo-600 font-semibold">{filters.minMatchPercentage}%</span>
            </div>
            <input
              id="match-filter"
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minMatchPercentage}
              onChange={(e) =>
                onChange({ ...filters, minMatchPercentage: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
