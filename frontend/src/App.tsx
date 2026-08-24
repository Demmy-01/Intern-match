import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Database } from 'lucide-react';
import type { Student, Recommendation, Filters, GraphData } from './types';
import { fetchStudents, fetchRecommendations, fetchGraphData } from './api';
import Logo from './components/Logo';
import StudentSwitcher from './components/StudentSwitcher';
import FilterBar from './components/FilterBar';
import InternshipCard from './components/InternshipCard';
import GraphVisualizer from './components/GraphVisualizer';
import SkeletonCard from './components/SkeletonCard';
import EmptyState from './components/EmptyState';
import ErrorBanner from './components/ErrorBanner';

const DEFAULT_FILTERS: Filters = {
  locationPreference: null,
  minStipend: 0,
  minMatchPercentage: 0,
};

function App() {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch students on mount ─────────────────────────────────────────────────
  useEffect(() => {
    setLoadingStudents(true);
    fetchStudents()
      .then((data) => {
        setStudents(data);
        if (data.length > 0) setSelectedStudentId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStudents(false));
  }, []);

  // ─── Fetch recommendations when student or filters change ────────────────────
  const loadRecommendations = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoadingRecs(true);
    setError(null);
    try {
      const data = await fetchRecommendations(selectedStudentId, filters);
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, [selectedStudentId, filters]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // ─── Fetch graph data when student changes ───────────────────────────────────
  const loadGraph = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoadingGraph(true);
    try {
      const data = await fetchGraphData(selectedStudentId);
      setGraphData(data);
    } catch {
      setGraphData(null);
    } finally {
      setLoadingGraph(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Filter recommendations on frontend by minMatchPercentage
  const filteredRecs = recommendations.filter(
    (rec) => rec.matchPercentage >= filters.minMatchPercentage
  );

  const handleRetry = () => {
    setError(null);
    loadRecommendations();
    loadGraph();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* ─── Bespoke SaaS Header ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={34} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  InternMatch
                </h1>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Graph Match Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-hop graph recommendation & skill gap analysis
              </p>
            </div>
          </div>

          {/* Active Matches Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
            <BarChart3 size={14} className="text-indigo-600" />
            <span>
              <strong className="text-slate-900 font-bold">{filteredRecs.length}</strong> matching roles
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ──────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Loading state for students */}
        {loadingStudents ? (
          <div className="space-y-4">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div key={selectedStudentId} className="space-y-6 animate-fadeIn">
            {/* Top Persona Switcher */}
            <StudentSwitcher
              students={students}
              selectedId={selectedStudentId}
              onSelect={(id) => {
                setSelectedStudentId(id);
                setFilters(DEFAULT_FILTERS);
              }}
            />

            {/* Responsive 2-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Interactive Knowledge Graph (lg:col-span-5) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
                <GraphVisualizer data={graphData} loading={loadingGraph} />
              </div>

              {/* RIGHT COLUMN: Filter Toolbar & Recommended Roles Feed (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Filter Toolbar */}
                <FilterBar filters={filters} onChange={setFilters} />

                {/* Recommendations Feed */}
                <section id="recommendations">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database size={15} className="text-indigo-600" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Recommended Roles ({filteredRecs.length})
                      </h2>
                    </div>
                    {!loadingRecs && filteredRecs.length > 0 && (
                      <span className="text-xs text-slate-400">
                        Ranked by multi-hop graph score
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4">
                    {loadingRecs ? (
                      <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                      </>
                    ) : filteredRecs.length === 0 ? (
                      <EmptyState
                        message={
                          recommendations.length > 0
                            ? `All ${recommendations.length} matches fall below your ${filters.minMatchPercentage}% threshold.`
                            : 'No matching internships found for this student profile.'
                        }
                      />
                    ) : (
                      filteredRecs.map((rec, index) => (
                        <InternshipCard
                          key={rec.id}
                          recommendation={rec}
                          rank={index + 1}
                        />
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bespoke SaaS Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span>© 2026 InternMatch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;