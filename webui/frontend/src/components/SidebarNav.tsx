import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import type { AtlasData, AtlasProject, AtlasSession } from "../types/atlas";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'maintenant';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function base(p: string) { return p.split(/[/\\]/).filter(Boolean).pop() ?? p; }

export function SidebarNav() {
  const [atlas, setAtlas] = useState<AtlasData | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [regenLoading, setRegenLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSessionId = searchParams.get("sessionId");

  const fetchAtlas = useCallback(async () => {
    try {
      const res = await fetch("/api/atlas");
      if (res.ok) setAtlas(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAtlas();
    const iv = setInterval(fetchAtlas, 30000);
    return () => clearInterval(iv);
  }, [fetchAtlas]);

  const toggleProject = (path: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const openSession = (project: AtlasProject, session: AtlasSession) => {
    const p = project.path.replace(/\\/g, '/');
    navigate(`/projects/${p}?sessionId=${encodeURIComponent(session.id)}`);
  };

  const newChat = (e: React.MouseEvent, project: AtlasProject) => {
    e.stopPropagation();
    navigate(`/projects/${project.path.replace(/\\/g, '/')}`);
  };

  const regen = async () => {
    setRegenLoading(true);
    try {
      await fetch("/api/atlas/regen", { method: "POST" });
      await fetchAtlas();
    } finally { setRegenLoading(false); }
  };

  const sortedProjects = atlas ? [...atlas.projects].sort((a, b) => {
    const latest = (p: AtlasProject) => Math.max(...p.sessions.map(s => new Date(s.lastTs).getTime()));
    return latest(b) - latest(a);
  }) : [];

  return (
    <div className="w-[260px] flex-shrink-0 bg-[#171717] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2 flex-shrink-0">
        <span className="text-[#c96442] font-bold text-base select-none">✱</span>
        <span className="text-[#ececec] font-semibold text-sm">Claude</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!atlas ? (
          <div className="px-4 py-3 text-[#555] text-xs">Chargement…</div>
        ) : sortedProjects.map(project => {
          const isOpen = !collapsed.has(project.path);
          const sessions = [...project.sessions]
            .sort((a, b) => new Date(b.lastTs).getTime() - new Date(a.lastTs).getTime())
            .slice(0, 25);
          const hasBloquante = sessions.some(s => s.bloquante);

          return (
            <div key={project.path}>
              <button
                onClick={() => toggleProject(project.path)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#1e1e1e] transition-colors group"
              >
                <span className={`text-[9px] text-[#444] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-[#8a8a8a] text-xs font-medium truncate flex-1">{base(project.path)}</span>
                {hasBloquante && <span className="text-[10px] text-[#d4a843] flex-shrink-0">⏸</span>}
                <span
                  onClick={(e) => newChat(e, project)}
                  className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ececec] text-sm leading-none transition-opacity flex-shrink-0 px-0.5"
                  title="Nouvelle conversation"
                >+</span>
              </button>

              {isOpen && sessions.map(session => {
                const isActive = session.id === activeSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => openSession(project, session)}
                    className={`w-full flex items-start gap-2 pl-7 pr-3 py-1.5 text-left transition-colors border-l-2 ${
                      isActive
                        ? 'bg-[#2a2a2a] border-[#c96442]'
                        : 'hover:bg-[#1e1e1e] border-transparent'
                    }`}
                  >
                    <span className={`mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      session.bloquante ? 'bg-[#d4a843] animate-pulse' :
                      session.status === 'active' ? 'bg-[#4caf88]' :
                      session.status === 'idle' ? 'bg-[#444]' : 'bg-[#2a2a2a]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs truncate leading-tight ${isActive ? 'text-[#ececec]' : 'text-[#9a9a9a]'}`}>
                        {session.title || '(sans titre)'}
                      </div>
                      <div className="text-[10px] text-[#444] mt-0.5 flex items-center gap-1">
                        {timeAgo(session.lastTs)}
                        {session.agentsRunning && <span className="text-[#6ec6c6]">⚙</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-[#2a2a2a] flex-shrink-0">
        <button
          onClick={regen}
          disabled={regenLoading}
          className="text-[10px] text-[#444] hover:text-[#9a9a9a] transition-colors disabled:opacity-50"
        >
          {regenLoading ? '…' : '↻'} actualiser
        </button>
      </div>
    </div>
  );
}
