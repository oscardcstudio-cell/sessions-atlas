import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { normalizeWindowsPath } from "../utils/pathUtils";
import type { AtlasSession, LaunchPlan } from "../types/atlas";

interface ConvHeaderProps {
  modelOverride?: string | null;
}

export function ConvHeader({ modelOverride }: ConvHeaderProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [sessionMeta, setSessionMeta] = useState<AtlasSession | null>(null);
  const [plan, setPlan] = useState<LaunchPlan | null>(null);

  const workingDirectory = normalizeWindowsPath(
    decodeURIComponent(location.pathname.replace("/projects", ""))
  );
  const projectName = workingDirectory?.split(/[/\\]/).filter(Boolean).pop() ?? "";

  useEffect(() => {
    if (!workingDirectory) return;
    // Fetch session metadata from atlas
    fetch("/api/atlas").then(r => r.json()).then(data => {
      for (const project of data.projects ?? []) {
        const norm = project.path.replace(/\\/g, "/").toLowerCase();
        const wd = workingDirectory.replace(/\\/g, "/").toLowerCase();
        if (norm === wd || norm.endsWith(wd) || wd.endsWith(norm)) {
          const s = sessionId ? project.sessions?.find((s: AtlasSession) => s.id === sessionId) : project.sessions?.[0];
          if (s) setSessionMeta(s);
          break;
        }
      }
    }).catch(() => {});

    // Fetch plan
    fetch(`/api/plan?path=${encodeURIComponent(workingDirectory)}`).then(r => r.json()).then(setPlan).catch(() => {});
  }, [workingDirectory, sessionId]);

  if (!workingDirectory) return null;

  const activeStep = plan?.steps?.find(s => s.status === 'in_progress');
  const model = modelOverride ?? sessionMeta?.model;
  const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '').replace('-latest', '') ?? '';
  const agents = sessionMeta?.agents ?? [];

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] text-xs overflow-hidden flex-shrink-0">
      <span className="text-[#ececec] font-medium flex-shrink-0">{projectName}</span>
      {sessionMeta?.gitBranch && sessionMeta.gitBranch !== 'main' && (
        <span className="text-[#555] font-mono flex-shrink-0">{sessionMeta.gitBranch}</span>
      )}
      {modelShort && <span className="text-[#555] flex-shrink-0">{modelShort}</span>}
      {activeStep && (
        <span className="flex items-center gap-1 text-[#d4a843] min-w-0 flex-shrink">
          <span className="flex-shrink-0">▶ {activeStep.id}</span>
          <span className="truncate text-[#7a7a7a]">{activeStep.title.replace(/\s*\[.*?\]\s*/g, ' ').trim()}</span>
        </span>
      )}
      {agents.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {agents.map(a => (
            <span key={a.name} className="px-1.5 py-0.5 bg-[#252525] rounded text-[10px] text-[#6a6a6a]">
              {a.name}×{a.n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
