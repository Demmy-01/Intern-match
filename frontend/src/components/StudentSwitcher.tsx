import type { Student } from '../types';
import { User, MapPin, Award, Sparkles, BookOpen } from 'lucide-react';

interface Props {
  students: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function getAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export default function StudentSwitcher({ students, selectedId, onSelect }: Props) {
  const activeStudent = students.find((s) => s.id === selectedId) || students[0];

  return (
    <section id="student-switcher" className="mb-6 space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm flex items-center gap-2 overflow-x-auto">
        <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 flex-shrink-0 border-r border-slate-100 mr-1">
          <User size={14} className="text-slate-500" />
          <span>Student:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {students.map((student) => {
            const isActive = student.id === selectedId;
            return (
              <button
                key={student.id}
                id={`student-tab-${student.id}`}
                onClick={() => onSelect(student.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 cursor-pointer
                  ${isActive
                    ? 'bg-indigo-600 text-white font-semibold ring-2 ring-indigo-500 shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <img
                  src={getAvatarUrl(student.name)}
                  alt={student.name}
                  className={`w-6 h-6 rounded-full bg-slate-100 border ${
                    isActive ? 'border-white/50' : 'border-slate-200'
                  }`}
                  loading="lazy"
                />
                <span>{student.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Student Banner */}
      {activeStudent && (
        <div
          key={activeStudent.id}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-fadeIn"
        >
          <div className="flex items-start md:items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <img
                src={getAvatarUrl(activeStudent.name)}
                alt={activeStudent.name}
                className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-100 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-slate-900 font-bold text-base leading-tight">
                  {activeStudent.name}
                </h2>
                <span className="text-xs text-slate-400">({activeStudent.email})</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl line-clamp-1">
                {activeStudent.bio}
              </p>
            </div>
          </div>

          {/* Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs text-slate-700 font-medium">
              <MapPin size={12} className="text-slate-400" />
              <span>{activeStudent.city}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs text-slate-700 font-medium">
              <Award size={12} className="text-amber-500" />
              <span>GPA: <strong className="text-slate-900">{activeStudent.gpa}</strong></span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md text-xs text-indigo-700 font-medium">
              <Sparkles size={12} className="text-indigo-500" />
              <span>{activeStudent.skills.length} Skills</span>
            </div>

            {activeStudent.interests.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs text-slate-600 font-medium">
                <BookOpen size={12} className="text-slate-400" />
                <span>{activeStudent.interests.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
