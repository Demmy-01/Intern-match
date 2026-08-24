import { useEffect, useState } from 'react';
import type { Recommendation } from '../types';
import { Building2, MapPin, Clock, CheckCircle2, AlertCircle, Sparkles, Info } from 'lucide-react';

interface Props {
  recommendation: Recommendation;
  rank: number;
}

function AnimatedMatchBadge({ percentage }: { percentage: number }) {
  const [animatedOffset, setAnimatedOffset] = useState(2 * Math.PI * 26);
  const circumference = 2 * Math.PI * 26;

  useEffect(() => {
    // Trigger progress animation after initial paint
    const targetOffset = circumference * (1 - percentage / 100);
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 80);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  const ringColor =
    percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="flex flex-col items-center justify-center flex-shrink-0">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke={ringColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-extrabold text-slate-900 leading-none">
            {percentage}%
          </span>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter mt-0.5">
            Match
          </span>
        </div>
      </div>
    </div>
  );
}

export default function InternshipCard({ recommendation: rec, rank }: Props) {
  return (
    <article
      id={`internship-${rec.id}`}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row gap-5 relative overflow-hidden group"
    >
      {/* Rank pill */}
      <div className="absolute top-3 right-3 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
        #{rank}
      </div>

      {/* Animated Match Ring */}
      <AnimatedMatchBadge percentage={rec.matchPercentage} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title & Company */}
        <div className="pr-8">
          <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
            {rec.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Building2 size={13} className="text-slate-400" /> {rec.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-slate-400" /> {rec.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-slate-400" /> {rec.duration}
            </span>
          </div>
        </div>

        {/* Stipend & Domain */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2.5 py-1 rounded-md">
            ${rec.stipend.toLocaleString()}/mo
          </span>
          {rec.domain && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-md">
              {rec.domain}
            </span>
          )}
        </div>

        {/* Matched Skills */}
        {rec.matchedSkills.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-500" />
              Matched Skills ({rec.matchedSkills.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rec.matchedSkills.map((skill) => (
                <span
                  key={skill.name}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-medium"
                >
                  <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                  <span>{skill.name}</span>
                  <span className="text-emerald-600/70 text-[10px]">({skill.proficiency})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skill Gaps with Tooltips */}
        {rec.skillGaps.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertCircle size={12} className="text-rose-500" />
              Skill Gaps ({rec.skillGaps.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rec.skillGaps.map((gap) => {
                const tooltipText = `${gap.importance} skill for ${rec.title} at ${rec.company}. Acquire this to boost match score!`;

                return (
                  <div key={gap.name} className="relative group/tooltip">
                    <span
                      className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-help transition-colors
                        ${gap.importance === 'Required'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }
                      `}
                    >
                      <AlertCircle size={12} className="flex-shrink-0" />
                      <span>{gap.name}</span>
                      <span className="opacity-75 text-[10px]">({gap.importance})</span>
                      <Info size={10} className="opacity-50 ml-0.5" />
                    </span>

                    {/* Tooltip Popup */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block w-48 p-2 bg-slate-900 text-white text-[11px] leading-tight rounded-md shadow-lg z-30 pointer-events-none text-center">
                      {tooltipText}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
