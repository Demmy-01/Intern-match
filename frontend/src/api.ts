import type { Student, Recommendation, Filters, GraphData } from './types';

const API_BASE = 'http://localhost:5000/api';

// ─── Generic fetch wrapper with error handling ───────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── GET /api/students ────────────────────────────────────────────────────────
export async function fetchStudents(): Promise<Student[]> {
  return apiFetch<Student[]>(`${API_BASE}/students`);
}

// ─── POST /api/recommendations ────────────────────────────────────────────────
export async function fetchRecommendations(
  studentId: string,
  filters: Filters
): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`${API_BASE}/recommendations`, {
    method: 'POST',
    body: JSON.stringify({
      studentId,
      locationPreference: filters.locationPreference,
      minStipend: filters.minStipend,
      maxSkillGap: 100, // We filter by minMatchPercentage on the frontend
    }),
  });
}

// ─── GET /api/students/:id/graph ──────────────────────────────────────────────
export async function fetchGraphData(studentId: string): Promise<GraphData> {
  return apiFetch<GraphData>(`${API_BASE}/students/${studentId}/graph`);
}
