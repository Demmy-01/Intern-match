import type { Student, Recommendation, Filters, GraphData } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://intern-match-atrv.onrender.com/api';


async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    if (errMessage.includes('Failed to fetch') || errMessage.includes('NetworkError')) {
      throw new Error(
        `Unable to reach backend API at ${url}. This is typically caused by CORS blocking or the Render server spinning up.`
      );
    }
    throw new Error(`Network Error (${url}): ${errMessage}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error || `HTTP ${res.status} (${res.statusText}) while requesting ${url}`
    );
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
