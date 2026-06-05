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
    if (workingDirectory) {
      fetch(`/api/plan?path=${encodeURIComponent(workingDirectory)}`).then(r => r.json()).then(setPlan).catch(() => {});
    }
  }, [workingDirectory, sessionId]);

  if (!workingDirectory) return null;

  const activeStep = plan?.steps?.find(s => s.status === 'in_progress');
  const model = modelOverride ?? sessionMeta?.model;
  const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '').replace('-latest', '') ?? '';
  const agents = sessionMeta?.agents ?? [];

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden flex-shrink-0 min-w-0">
      <span className="font-mono text-[12px] text-[#c4c4c4] font-medium flex-shrink-0">{projectName}</span>
      {sessionMeta?.gitBranch && sessionMeta.gitBranch !== 'main' && (
        <>
          <span className="text-[#333] flex-shrink-0">/</span>
          <span className="font-mono text-[11px] text-[#d4a843] flex-shrink-0">{sessionMeta.gitBranch}</span>
        </>
      )}
      {modelShort && (
        <>
          <span className="text-[#333] flex-shrink-0">/</span>
          <span className="font-mono text-[11px] text-[#7fa6c9] flex-shrink-0">{modelShort}</span>
        </>
      )}
      {activeStep && (
        <>
          <span className="text-[#333] flex-shrink-0">/</span>
          <span className="flex items-center gap-1 min-w-0 flex-shrink">
            <span className="font-mono text-[11px] text-[#d4a843] flex-shrink-0">▶ {activeStep.id}</span>
            <span className="text-[11px] text-[#666] truncate">{activeStep.title.replace(/\s*\[.*?\]\s*/g, ' ').trim()}</span>
          </span>
        </>
      )}
      {agents.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {agents.slice(0, 3).map(a => {
            const shortName = a.name.split(/[-\s]/)[0].slice(0, 12);
            return (
              <span key={a.name} title={`${a.name} ×${a.n}`} className="px-1.5 py-0.5 bg-[#252525] rounded font-mono text-[10px] text-[#5a5a5a]">
                {shortName}<span className="text-[#3a3a3a]">×{a.n}</span>
              </span>
            );
          })}
          {agents.length > 3 && (
            <span className="font-mono text-[10px] text-[#3a3a3a]">+{agents.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
