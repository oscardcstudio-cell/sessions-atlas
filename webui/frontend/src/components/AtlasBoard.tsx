import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { AtlasData, AtlasProject, AtlasSession } from "../types/atlas";

const base = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() || p;
const ago = (ts: string) => {
  if (!ts) return "?";
  const m = (Date.now() - new Date(ts).getTime()) / 60000;
  if (m < 60) return Math.round(m) + "min";
  if (m < 1440) return Math.round(m / 60) + "h";
  return Math.round(m / 1440) + "j";
};
const shortModel = (m: string) =>
  (m || "?").replace("claude-", "").replace(/-\d{8}$/, "");

const BUCKET_COLOR: Record<string, string> = {
  meta: "bg-[#7fa6c9]",
  studio_descartes: "bg-[#d97757]",
  oscardcstudio: "bg-[#8aa872]",
  autre: "bg-[#726c62]",
};
const BUCKET_LABEL: Record<string, string> = {
  meta: "Meta",
  studio_descartes: "Studio Descartes",
  oscardcstudio: "Perso",
  autre: "Autre",
};

function SessionCard({
  s,
  p,
  onClick,
}: {
  s: AtlasSession;
  p: AtlasProject;
  onClick: () => void;
}) {
  const borderClass = s.bloquante
    ? "border-[#e0a458] border-t-2"
    : s.agentsRunning
      ? "border-[#3a7070]"
      : p.collision
        ? "border-[#b35f44]"
        : "border-[#39362f]";

  return (
    <div
      className={`bg-[#262624] border rounded-lg p-[10px_11px] mb-[9px] cursor-pointer hover:bg-[#2d2c2a] transition-colors ${borderClass}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-[7px] mb-[6px]">
        <span
          className={`w-[7px] h-[7px] rounded-[2px] flex-none ${BUCKET_COLOR[p.bucket] || "bg-[#726c62]"}`}
        />
        <span className="font-semibold text-[12px] text-[#ece8e1] overflow-hidden text-ellipsis whitespace-nowrap">
          {base(p.path)}
        </span>
        {p.collision && (
          <span className="ml-auto text-[10px] text-[#d97757] border border-[#b35f44] rounded-[5px] px-[6px] py-[1px] font-semibold flex-none">
            ⚠ collision
          </span>
        )}
        {s.bloquante && (
          <span className="ml-auto text-[10px] bg-[#26200d] text-[#e0a458] border border-[#5a4a1a] rounded-[4px] px-[7px] py-[2px] font-semibold flex-none">
            ⏸ attend
          </span>
        )}
        {!s.bloquante && s.agentsRunning && (
          <span className="ml-auto text-[10px] bg-[#0d2020] text-[#6ec6c6] border border-[#2a5050] rounded-[4px] px-[7px] py-[2px] font-semibold flex-none">
            ⚙ {s.agentsRunningCount}
          </span>
        )}
      </div>
      <div
        className="text-[13px] text-[#ece8e1] mb-[7px] leading-[1.35]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {s.title}
      </div>
      <div className="flex gap-[8px] flex-wrap font-mono text-[10.5px] text-[#726c62]">
        {p.branch && (
          <span className="before:content-['⎇_']">{p.branch}</span>
        )}
        <span className="text-[#a39d92]">{shortModel(s.model)}</span>
        <span>{ago(s.lastTs)}</span>
        <span>{s.userMsgs} msg</span>
        {p.dirty > 0 && (
          <span className="text-[#e0a458]">{p.dirty} modifs</span>
        )}
        {p.debt > 0 && <span className="text-[#7fa6c9]">dette {p.debt}</span>}
      </div>
      {s.agents && s.agents.length > 0 && (
        <div className="flex gap-[6px] flex-wrap mt-[8px]">
          {s.agents.map((a) => (
            <span
              key={a.name}
              className="text-[10.5px] px-[8px] py-[2px] rounded-[20px] bg-[#2d2c2a] border border-[#39362f] text-[#ece8e1]"
            >
              {a.name}
              <span className="text-[#726c62] ml-[3px]">×{a.n}</span>
            </span>
          ))}
          {s.suggest && (
            <span className="text-[10.5px] px-[8px] py-[2px] rounded-[20px] bg-[#3a2a22] border border-[#b35f44] text-[#d97757]">
              ▶ {s.suggest.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function AtlasBoard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AtlasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bucketF, setBucketF] = useState("all");
  const [regen, setRegen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/atlas");
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const handleRegen = async () => {
    setRegen(true);
    try {
      await fetch("/api/atlas/regen", { method: "POST" });
      await load();
    } catch {}
    setRegen(false);
  };

  const openSession = (p: AtlasProject, s: AtlasSession) => {
    const normPath = p.path.replace(/\\/g, "/");
    navigate(`/projects/${normPath}?sessionId=${encodeURIComponent(s.id)}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1f1e1d]">
        <span className="text-[#726c62] text-sm animate-pulse">
          Chargement atlas…
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1f1e1d]">
        <span className="text-[#726c62] text-sm">Atlas non disponible</span>
      </div>
    );
  }

  const K = data.stats;
  const allCards = data.projects.flatMap((p) => p.sessions.map((s) => ({ s, p })));
  const visible = (p: AtlasProject) => bucketF === "all" || p.bucket === bucketF;
  const bloquantes = allCards.filter((c) => c.s.bloquante && visible(c.p));
  const agtsLive = allCards.filter((c) => c.s.agentsRunning && visible(c.p));
  const COLS: [AtlasSession["status"], string][] = [
    ["active", "Active"],
    ["idle", "Idle"],
    ["stale", "Stale"],
  ];
  const colDot: Record<string, string> = {
    active: "bg-[#d97757] shadow-[0_0_7px_var(--tw-shadow-color)] shadow-[#d97757]",
    idle: "bg-[#e0a458]",
    stale: "bg-[#4f4b44]",
  };
  const buckets = [...new Set(data.projects.map((p) => p.bucket))];
  const chantiers = data.chantiers || [];
  const registry = data.registry;

  return (
    <div className="h-full overflow-y-auto bg-[#1f1e1d] text-[#ece8e1] text-[13.5px]">
      <div className="px-[26px] py-[22px] pb-[70px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[14px] font-semibold tracking-[.12em] uppercase text-[#ece8e1] m-0">
            Sessions Atlas
          </h1>
          <button
            onClick={handleRegen}
            className={`text-[13px] bg-none border-none text-[#726c62] cursor-pointer px-[6px] py-[2px] rounded-[4px] hover:text-[#d97757] hover:bg-[#211f1e] ml-auto ${regen ? "animate-spin" : ""}`}
          >
            ↻
          </button>
        </div>
        <p className="font-mono text-[11px] text-[#726c62] tracking-[.08em] mb-[24px]">
          Généré {new Date(data.generatedAt).toLocaleString("fr-FR")} · fenêtre{" "}
          {data.windowDays} jours
        </p>

        {/* KPIs */}
        <div className="flex gap-[9px] flex-wrap mb-[16px]">
          {[
            ["projets", K.projects, false],
            ["sessions", K.sessions, false],
            ["actives", K.active, false],
            ["bloquantes", K.bloquante, K.bloquante > 0],
            ["agents actifs", K.agentsRunning, K.agentsRunning > 0],
            ["collisions", K.collisions, K.collisions > 0],
          ].map(([l, v, alert]) => (
            <div
              key={l as string}
              className="bg-[#262624] border border-[#39362f] rounded-[9px] px-[15px] py-[10px] min-w-[92px]"
            >
              <div
                className={`text-[22px] font-semibold leading-none ${alert ? "text-[#d97757]" : "text-[#ece8e1]"}`}
              >
                {v as number}
              </div>
              <div className="font-mono text-[11px] text-[#726c62] uppercase tracking-[.18em] mt-[6px]">
                {l as string}
              </div>
            </div>
          ))}
        </div>

        {/* Attention section */}
        {(bloquantes.length > 0 || agtsLive.length > 0) && (
          <div className="flex flex-col gap-[12px] mb-[18px]">
            {bloquantes.length > 0 && (
              <div className="bg-[#262624] border border-[#5a4a1a] rounded-[9px] px-[16px] py-[12px]">
                <div className="text-[12px] font-semibold text-[#e0a458] mb-[4px]">
                  ⏸ Attend ta réponse
                </div>
                <div className="font-mono text-[10px] text-[#726c62] uppercase tracking-[.16em] mb-[10px]">{bloquantes.length} sessions
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {bloquantes.map(({ s, p }) => (
                    <div
                      key={s.id}
                      className="bg-[#1c1b1a] border-l-2 border-l-[#d97757] border border-[#39362f] hover:border-[#e0a458] rounded-[7px] pl-[10px] pr-[11px] py-[8px] cursor-pointer min-w-[160px] max-w-[240px]"
                      onClick={() => openSession(p, s)}
                    >
                      <div className="text-[12px] font-semibold text-[#c4c4c4] mb-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {base(p.path)}
                      </div>
                      <div className="text-[11px] text-[#8a8a8a] overflow-hidden text-ellipsis whitespace-nowrap leading-snug">
                        {s.title}
                      </div>
                      <div className="font-mono text-[10px] text-[#4a4a4a] mt-[6px]">
                        {ago(s.lastTs)} · {shortModel(s.model)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {agtsLive.length > 0 && (
              <div className="bg-[#262624] border border-[#2a5050] rounded-[9px] px-[16px] py-[12px]">
                <div className="text-[12px] font-semibold text-[#6ec6c6] mb-[4px]">
                  ⚙ Agents en cours
                </div>
                <div className="font-mono text-[10px] text-[#726c62] uppercase tracking-[.16em] mb-[10px]">{agtsLive.length} sessions
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {agtsLive.map(({ s, p }) => (
                    <div
                      key={s.id}
                      className="bg-[#1c1b1a] border-l-2 border-l-[#3a7070] border border-[#39362f] hover:border-[#3a7070] rounded-[7px] pl-[10px] pr-[11px] py-[8px] cursor-pointer min-w-[160px] max-w-[240px]"
                      onClick={() => openSession(p, s)}
                    >
                      <div className="text-[12px] font-semibold text-[#c4c4c4] mb-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {base(p.path)}
                      </div>
                      <div className="text-[11px] text-[#8a8a8a] overflow-hidden text-ellipsis whitespace-nowrap leading-snug">
                        {s.title}
                      </div>
                      <div className="font-mono text-[10px] text-[#4a4a4a] mt-[6px]">
                        {s.agentsRunningCount || "?"} agent(s) · {ago(s.lastTs)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chantiers */}
        {chantiers.length > 0 && (
          <div className="mb-[30px]">
            <h2 className="text-[11.5px] uppercase tracking-[.06em] text-[#a39d92] mb-[13px]">
              Chantiers
            </h2>
            <div className="grid grid-cols-3 gap-[14px] items-start">
              {(["en-cours", "backlog", "fait"] as const).map((st) => {
                const items = chantiers
                  .filter((c) => c.statut === st)
                  .sort((a, b) => a.priorite - b.priorite);
                const colColor =
                  st === "en-cours"
                    ? "#d97757"
                    : st === "fait"
                      ? "#3fb950"
                      : "#4f4b44";
                const label =
                  st === "en-cours"
                    ? "En cours"
                    : st === "fait"
                      ? "Fait"
                      : "Backlog";
                return (
                  <div
                    key={st}
                    className="bg-[#1c1b1a] border border-[#39362f] rounded-[9px] p-[11px_11px_14px] min-h-[110px]"
                  >
                    <div
                      className="flex items-center gap-[8px] mx-[4px] mb-[11px] text-[11.5px] uppercase tracking-[.07em] text-[#a39d92] font-semibold pb-[8px]"
                      style={{ borderBottom: `2px solid ${colColor}` }}
                    >
                      <span
                        className="w-[8px] h-[8px] rounded-full"
                        style={{ background: colColor }}
                      />
                      {label}
                      <span className="ml-auto text-[11.5px] text-[#726c62] bg-[#262624] border border-[#39362f] rounded-[20px] px-[8px] py-[1px]">
                        {items.length}
                      </span>
                    </div>
                    {items.map((c, i) => (
                      <div
                        key={i}
                        className={`bg-[#262624] border rounded-[8px] p-[10px_11px] mb-[9px] ${st === "fait" ? "border-[#3fb950]" : st === "en-cours" ? "border-[#b35f44]" : "border-[#4f4b44]"}`}
                      >
                        <div className="mb-[7px]">
                          <span className="inline-block text-[10px] font-bold text-white bg-[#d97757] px-[6px] py-[2px] rounded-[4px] mr-[6px]">
                            P{c.priorite}
                          </span>
                          <span className="text-[#ece8e1] font-semibold text-[11.5px]">
                            {c.titre}
                          </span>
                        </div>
                        {c.description && (
                          <div className="text-[10.5px] text-[#726c62] mb-[7px] leading-[1.35]">
                            {c.description}
                          </div>
                        )}
                        {c.dependances && c.dependances.length > 0 && (
                          <div className="text-[10px] text-[#a39d92] mt-[6px] pt-[6px] border-t border-[#39362f]">
                            ⬸ {c.dependances.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-[#726c62] text-[12px] p-[12px] text-center">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bucket filters */}
        <div className="flex gap-[7px] flex-wrap mb-[16px] items-center">
          {[["all", "Tous", null], ...buckets.map((b) => [b, BUCKET_LABEL[b] || b, b])].map(
            ([id, lab, b]) => (
              <button
                key={id as string}
                onClick={() => setBucketF(id as string)}
                className={`text-[12px] px-[11px] py-[4px] rounded-[20px] border cursor-pointer flex items-center gap-[6px] transition-colors ${bucketF === id ? "text-[#ece8e1] border-[#b35f44] bg-[#2d2c2a]" : "text-[#a39d92] border-[#39362f] bg-[#262624] hover:bg-[#2d2c2a]"}`}
              >
                {b && (
                  <span
                    className={`w-[7px] h-[7px] rounded-[2px] ${BUCKET_COLOR[b as string] || "bg-[#726c62]"}`}
                  />
                )}
                {lab as string}
              </button>
            ),
          )}
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-3 gap-[14px] items-start">
          {COLS.map(([st, lab]) => {
            const items = allCards.filter(
              (c) => c.s.status === st && visible(c.p),
            );
            return (
              <div
                key={st}
                className={`bg-[#1c1b1a] border border-[#39362f] rounded-[9px] p-[11px_11px_14px] min-h-[110px] c-${st}`}
              >
                <div className="flex items-center gap-[8px] mx-[4px] mb-[14px] text-[12px] uppercase tracking-[.1em] text-[#ece8e1] font-semibold">
                  <span className={`w-[9px] h-[9px] rounded-full ${colDot[st]}`} />
                  {lab}
                  <span className="ml-auto font-mono text-[11px] text-[#726c62] bg-[#262624] border border-[#39362f] rounded-[20px] px-[8px] py-[1px]">
                    {items.length}
                  </span>
                </div>
                {items.map(({ s, p }) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    p={p}
                    onClick={() => openSession(p, s)}
                  />
                ))}
                {items.length === 0 && (
                  <div className="text-[#726c62] text-[12px] p-[12px] text-center">
                    —
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Registry */}
        {registry && (
          <div className="mt-[30px] bg-[#262624] border border-[#39362f] rounded-[9px] p-[16px_18px]">
            <h2 className="text-[11.5px] uppercase tracking-[.06em] text-[#a39d92] mb-[13px]">
              Ce qui existe (registre — vérifier avant de créer)
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-[16px]">
              {(
                [
                  ["skills", registry.skills],
                  ["agents", registry.agents],
                  ["packages", registry.packages],
                  ["hooks", registry.hooks],
                  ["dashboards", registry.dashboards],
                ] as [string, string[]][]
              ).map(([t, a]) => (
                <div key={t}>
                  <h3 className="text-[11px] text-[#d97757] mb-[6px] uppercase tracking-[.04em]">
                    {t}{" "}
                    <span className="text-[#726c62] ml-[5px]">{a.length}</span>
                  </h3>
                  <ul className="m-0 p-0 list-none">
                    {a.slice(0, 14).map((x) => (
                      <li
                        key={x}
                        className="text-[11px] text-[#a39d92] py-[1.5px] whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {x}
                      </li>
                    ))}
                    {a.length > 14 && (
                      <li className="text-[11px] text-[#726c62] py-[1.5px]">
                        …+{a.length - 14}
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-[26px] text-[11px] text-[#726c62]">
          atlas-index.json = source de vérité · Regen : node
          sessions-atlas/generate-atlas.mjs
        </p>
      </div>
    </div>
  );
}
