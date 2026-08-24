// ─── Shared TypeScript interfaces for the Intern Match application ────────────

/** A skill with proficiency information (from the student's perspective) */
export interface StudentSkill {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  category?: string;
}

/** A student profile returned by GET /api/students */
export interface Student {
  id: string;
  name: string;
  email: string;
  bio: string;
  gpa: number;
  city: string;
  skills: StudentSkill[];
  interests: string[];
}

/** A skill gap — skill the student is missing for a given internship */
export interface SkillGap {
  name: string;
  importance: 'Required' | 'Optional';
}

/** A matched skill — skill the student has that matches an internship requirement */
export interface MatchedSkill {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
}

/** An internship recommendation returned by POST /api/recommendations */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  location: string;
  stipend: number;
  duration: string;
  company: string;
  companyIndustry: string;
  domain: string;
  matchPercentage: number;
  matchScore: number;
  matchedSkills: MatchedSkill[];
  skillGaps: SkillGap[];
}

/** Filters for the recommendation engine */
export interface Filters {
  locationPreference: string | null;
  minStipend: number;
  minMatchPercentage: number;
}

/** A node in the graph visualization */
export interface GraphNode {
  id: string;
  label: string;
  type: 'Student' | 'Skill' | 'Internship' | 'Company' | 'Domain' | 'City';
  // Computed layout positions
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  // Optional metadata
  category?: string;
  stipend?: number;
  mode?: string;
  industry?: string;
  country?: string;
}

/** An edge in the graph visualization */
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label: string;
}

/** Graph data returned by GET /api/students/:id/graph */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
