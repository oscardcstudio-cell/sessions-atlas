export interface AtlasSession {
  id: string;
  cwd: string;
  branch: string;
  model: string;
  firstTs: string;
  lastTs: string;
  status: 'active' | 'idle' | 'stale';
  title: string;
  topic: string;
  userMsgs: number;
  agents: { name: string; n: number }[];
  bloquante: boolean;
  agentsRunning: boolean;
  agentsRunningCount: number;
  gitBranch: string;
  dirty: number;
  suggest: null | { name: string; score: number; matched: string[] };
}

export interface AtlasProject {
  path: string;
  bucket: string;
  branch: string;
  dirty: number;
  debt: number;
  sessions: AtlasSession[];
}

export interface AtlasData {
  generatedAt: string;
  windowDays: number;
  stats: { projects: number; sessions: number; active: number; bloquante: number; agentsRunning: number; collisions: number };
  buckets: string[];
  projects: AtlasProject[];
}

export interface PlanStep {
  id: string;
  title: string;
  gate?: string;
  status: 'done' | 'in_progress' | 'todo';
  substeps?: { title: string; owner: string; status: string }[];
}

export interface LaunchPlan {
  title: string;
  subtitle?: string;
  updated: string;
  steps: PlanStep[];
}
