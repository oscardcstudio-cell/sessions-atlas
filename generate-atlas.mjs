#!/usr/bin/env node
// generate-atlas.mjs — Sessions Atlas
// Scanne ~/.claude/projects/ + git + registres → atlas-index.json (source de vérité)
// puis rend atlas.html (vue self-contained, couleurs Claude Code).
// Dépendance zéro (Node built-ins). Cross-platform.
//
// Usage : node generate-atlas.mjs [--days N]   (défaut N=14 : sessions touchées récemment)

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import os from 'node:os';
import { execSync } from 'node:child_process';

const HOME = os.homedir();
const CLAUDE = path.join(HOME, '.claude');
const PROJECTS = path.join(CLAUDE, 'projects');
const META_ROOT = 'C:/dev/claude'; // racine des projets à scanner
const OUT_DIR = path.dirname(url.fileURLToPath(import.meta.url)); // dossier du script

const DAYS = (() => {
  const i = process.argv.indexOf('--days');
  return i > -1 ? Number(process.argv[i + 1]) || 14 : 14;
})();
const CUTOFF = Date.now() - DAYS * 86400_000;

// ---------- helpers ----------
const safe = (fn, d) => { try { return fn(); } catch { return d; } };

function bucketOf(cwd) {
  if (!cwd) return 'autre';
  const c = cwd.replace(/\//g, '\\').toLowerCase();
  if (c.includes('\\studio_descartes\\') || c.endsWith('\\studio_descartes')) return 'studio_descartes';
  if (c.includes('\\oscardcstudio\\') || c.endsWith('\\oscardcstudio')) return 'oscardcstudio';
  if (c.includes('\\dev\\claude')) return 'meta';
  return 'autre';
}

const _gitCache = new Map(); // cwd → gitInfo result
function gitInfo(cwd) {
  if (!cwd) return { branch: null, dirty: 0, repo: null };
  // Normalize to git root if already known
  const norm = cwd.replace(/\//g, '\\').toLowerCase();
  if (_gitCache.has(norm)) return _gitCache.get(norm);
  if (!safe(() => fs.existsSync(cwd), false)) {
    const r = { branch: null, dirty: 0, repo: null };
    _gitCache.set(norm, r); return r;
  }
  const run = (cmd) => safe(() => execSync(`git -C "${cwd}" ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), '');
  const inside = run('rev-parse --is-inside-work-tree');
  if (inside !== 'true') {
    const r = { branch: null, dirty: 0, repo: null };
    _gitCache.set(norm, r); return r;
  }
  const repo = (run('rev-parse --show-toplevel') || cwd).replace(/\//g, '\\');
  const repoNorm = repo.toLowerCase();
  // If repo root already cached, reuse (avoids running git multiple times for same repo)
  if (_gitCache.has(repoNorm)) {
    const r = _gitCache.get(repoNorm);
    _gitCache.set(norm, r); return r;
  }
  const branch = run('branch --show-current') || '(detached)';
  const status = run('status --porcelain');
  const dirty = status ? status.split('\n').filter(Boolean).length : 0;
  const r = { branch, dirty, repo };
  _gitCache.set(norm, r);
  _gitCache.set(repoNorm, r);
  return r;
}

function statusFromTs(lastTs) {
  if (!lastTs) return 'stale';
  const age = Date.now() - new Date(lastTs).getTime();
  if (age < 30 * 60_000) return 'active';
  if (age < 12 * 3600_000) return 'idle';
  return 'stale';
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter(c => c.type === 'text' || typeof c === 'string')
    .map(c => (typeof c === 'string' ? c : c.text || '')).join(' ');
  return '';
}

// ---------- 1. parse sessions ----------
function parseSession(file) {
  const stat = safe(() => fs.statSync(file), null);
  if (!stat || stat.mtimeMs < CUTOFF) return null;
  const lines = safe(() => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean), []);
  if (!lines.length) return null;

  let cwd, branch, model, firstTs, lastTs, title, lastUser = '';
  const agents = new Map(); // subagent_type -> count
  let userMsgs = 0;
  let lastMsgType = null; // 'user' | 'assistant' — pour détecter sessions bloquantes
  const openAgents = new Set(); // tool_use IDs d'agents sans tool_result correspondant

  for (const l of lines) {
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.cwd) cwd = o.cwd;
    if (o.gitBranch !== undefined && o.gitBranch) branch = o.gitBranch;
    if (o.timestamp) { if (!firstTs) firstTs = o.timestamp; lastTs = o.timestamp; }
    if (o.type === 'custom-title') {
      const t = o.title || o.customTitle || (o.message && o.message.title);
      if (t) title = t;
    }
    const msg = o.message;
    if (msg && msg.model) model = msg.model;
    if (o.type === 'user' && msg) {
      const t = textOf(msg.content).trim();
      if (t && !t.startsWith('<') && t.length > 1) { lastUser = t; userMsgs++; }
      // Détecter les tool_results (retours d'agents) vs vrais messages utilisateur
      let hasText = false;
      if (Array.isArray(msg.content)) {
        for (const c of msg.content) {
          if (c.type === 'tool_result' && c.tool_use_id) openAgents.delete(c.tool_use_id);
          if (c.type === 'text' && c.text && !c.text.startsWith('<')) hasText = true;
        }
      } else if (typeof msg.content === 'string' && msg.content && !msg.content.startsWith('<')) {
        hasText = true;
      }
      if (hasText) lastMsgType = 'user';
    }
    if (o.type === 'assistant' && msg && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'text' && c.text && c.text.trim().length > 0) lastMsgType = 'assistant';
        if (c.type === 'tool_use' && c.name === 'Agent') {
          const a = (c.input && (c.input.subagent_type || c.input.description)) || 'agent';
          agents.set(a, (agents.get(a) || 0) + 1);
          if (c.id) openAgents.add(c.id);
        }
      }
    }
    // tool_use dans d'autres types de messages (legacy)
    if (o.type !== 'assistant' && msg && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'tool_use' && c.name === 'Agent' && o.type !== 'assistant') {
          const a = (c.input && (c.input.subagent_type || c.input.description)) || 'agent';
          agents.set(a, (agents.get(a) || 0) + 1);
        }
      }
    }
  }
  if (!cwd) return null;
  const status = statusFromTs(lastTs);
  const bloquante = lastMsgType === 'assistant' && status !== 'stale';
  const agentsRunningCount = status !== 'stale' ? openAgents.size : 0;
  return {
    id: path.basename(file, '.jsonl'),
    cwd, branch, model: model || '?',
    firstTs, lastTs,
    status,
    title: title || (lastUser ? lastUser.slice(0, 80) : '(sans titre)'),
    topic: lastUser.slice(0, 400),
    userMsgs,
    agents: [...agents.entries()].map(([name, n]) => ({ name, n })),
    bloquante,
    agentsRunning: agentsRunningCount > 0,
    agentsRunningCount,
  };
}

function collectSessions() {
  const out = [];
  for (const dir of safe(() => fs.readdirSync(PROJECTS), [])) {
    const full = path.join(PROJECTS, dir);
    if (!safe(() => fs.statSync(full).isDirectory(), false)) continue;
    for (const f of safe(() => fs.readdirSync(full), [])) {
      if (!f.endsWith('.jsonl')) continue;
      const s = parseSession(path.join(full, f));
      if (s) out.push(s);
    }
  }
  return out;
}

// ---------- 2. agent registry (le "router") ----------
function loadAgentRegistry() {
  const agents = [];
  const dir = path.join(CLAUDE, 'agents');
  for (const f of safe(() => fs.readdirSync(dir), [])) {
    if (!f.endsWith('.md')) continue;
    const txt = safe(() => fs.readFileSync(path.join(dir, f), 'utf8'), '');
    const nameM = txt.match(/^name:\s*(.+)$/m);
    const descM = txt.match(/description:\s*([\s\S]*?)(?:\n[a-zA-Z_]+:|---)/);
    const name = (nameM ? nameM[1] : path.basename(f, '.md')).trim();
    const desc = (descM ? descM[1] : '').replace(/\s+/g, ' ').slice(0, 400).trim();
    agents.push({ name, desc, kw: keywords(desc + ' ' + name) });
  }
  return agents;
}

const STOP = new Set('le la les un une des de du et ou a à pour dans sur avec sans par au aux ce cette est sont être the and for with you your toute tout tous quoi quand agent meta'.split(' '));
function keywords(s) {
  return [...new Set((s.toLowerCase().match(/[a-zàâçéèêëîïôûùü]{4,}/g) || [])
    .filter(w => !STOP.has(w)))];
}

function suggestAgent(topic, registry) {
  if (!topic || !registry.length) return null;
  const tk = new Set(keywords(topic));
  let best = null, bestScore = 0;
  for (const a of registry) {
    let score = 0;
    for (const k of a.kw) if (tk.has(k)) score++;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  if (!best || bestScore < 2) return null;
  const matched = best.kw.filter(k => tk.has(k)).slice(0, 6);
  return { name: best.name, score: bestScore, matched };
}

// ---------- 3. registres "ce qui existe" ----------
function scanRegistry() {
  const list = (p, filt) => safe(() => fs.readdirSync(p), []).filter(filt || (() => true));
  const skills = list(path.join(CLAUDE, 'skills'), n =>
    safe(() => fs.statSync(path.join(CLAUDE, 'skills', n)).isDirectory(), false));
  const agents = list(path.join(CLAUDE, 'agents'), n => n.endsWith('.md')).map(n => n.replace(/\.md$/, ''));
  const hooks = list(path.join(CLAUDE, 'hooks'), n => n.endsWith('.js'));
  const packages = list(path.join(META_ROOT, 'packages'), n =>
    safe(() => fs.statSync(path.join(META_ROOT, 'packages', n)).isDirectory(), false));
  const dashTxt = safe(() => fs.readFileSync(path.join(CLAUDE, 'DASHBOARDS.md'), 'utf8'), '');
  const dashboards = (dashTxt.match(/^### .+$/gm) || []).map(s => s.replace(/^###\s*/, '').trim());
  return { skills, agents, hooks, packages, dashboards };
}

// ---------- 4. dette doc par projet ----------
function docDebt() {
  const dbt = safe(() => JSON.parse(fs.readFileSync(path.join(CLAUDE, 'meta_debt.json'), 'utf8')), { entries: [] });
  const byProj = {};
  for (const e of dbt.entries || []) {
    if (e.resolved) continue;
    const k = e.project || 'autre';
    byProj[k] = (byProj[k] || 0) + (e.items ? e.items.length : 0);
  }
  return byProj;
}

// ---------- 4b. load chantiers ----------
function loadChantiers() {
  const chf = path.join(OUT_DIR, 'chantiers.json');
  const txt = safe(() => fs.readFileSync(chf, 'utf8'), null);
  if (!txt) return [];
  try {
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

// ---------- 5. assemble ----------
function build() {
  const sessions = collectSessions();
  const registry = loadAgentRegistry();
  const debt = docDebt();
  const chantiers = loadChantiers();

  // group by repo (or cwd if no git)
  const projects = {};
  for (const s of sessions) {
    const gi = gitInfo(s.cwd);
    s.gitBranch = gi.branch || s.branch || null;
    s.dirty = gi.dirty;
    const key = gi.repo || s.cwd;
    if (!projects[key]) {
      projects[key] = {
        path: key, bucket: bucketOf(key),
        branch: s.gitBranch, dirty: gi.dirty,
        debt: debt[path.basename(key)] || 0,
        sessions: [],
      };
    }
    if (s.status === 'active') {
      s.suggest = suggestAgent(s.topic, registry);
    }
    projects[key].sessions.push(s);
  }

  // collision detection
  for (const p of Object.values(projects)) {
    p.sessions.sort((a, b) => new Date(b.lastTs) - new Date(a.lastTs));
    const live = p.sessions.filter(s => s.status === 'active' || s.status === 'idle').length;
    p.collision = (p.sessions.filter(s => s.status === 'active').length > 1)
      || (live > 1 && p.dirty > 0);
  }

  const projList = Object.values(projects).sort((a, b) => {
    const sa = Math.max(...a.sessions.map(s => +new Date(s.lastTs) || 0));
    const sb = Math.max(...b.sessions.map(s => +new Date(s.lastTs) || 0));
    return sb - sa;
  });

  const index = {
    generatedAt: new Date().toISOString(),
    windowDays: DAYS,
    stats: {
      projects: projList.length,
      sessions: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      bloquante: sessions.filter(s => s.bloquante).length,
      agentsRunning: sessions.filter(s => s.agentsRunning).length,
      collisions: projList.filter(p => p.collision).length,
    },
    buckets: ['meta', 'studio_descartes', 'oscardcstudio', 'autre'],
    projects: projList,
    registry: scanRegistry(),
    chantiers: chantiers,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'atlas-index.json'), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'atlas.html'), renderHtml(index));
  return index;
}

// ---------- 6. render — chrome Claude Code (sidebar + board kanban) ----------
function renderHtml(data) {
  // Escape </script> in JSON to prevent premature script tag closure
  const json = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sessions Atlas</title>
<style>
:root{
  --bg:#1f1e1d; --panel:#262624; --panel2:#2d2c2a; --col:#1c1b1a;
  --side:#181716; --side2:#211f1e; --side-hov:#2a2826;
  --fg:#ece8e1; --muted:#a39d92; --faint:#726c62;
  --border:#39362f; --border2:#2c2a26;
  --clay:#d97757; --clay-dim:#b35f44; --amber:#e0a458; --green:#8aa872; --blue:#7fa6c9;
  --radius:9px;
}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);
  font:13.5px/1.5 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif;display:flex;overflow:hidden}
code,.mono{font-family:ui-monospace,"SF Mono","Cascadia Code",Menlo,monospace}
::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:#3a3733;border-radius:6px}
::-webkit-scrollbar-track{background:transparent}

/* ---- sidebar façon Claude Code ---- */
.side{width:268px;flex:none;background:var(--side);border-right:1px solid var(--border2);
  height:100vh;display:flex;flex-direction:column}
.side-top{padding:16px 16px 12px;border-bottom:1px solid var(--border2)}
.brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--fg)}
.brand .ast{color:var(--clay);font-size:16px}
.brand .ver{margin-left:auto;font-size:10px;color:var(--faint);font-weight:400}
.search{margin-top:11px;width:100%;background:var(--side2);border:1px solid var(--border2);
  color:var(--fg);border-radius:7px;padding:7px 10px;font:inherit;font-size:12.5px}
.search::placeholder{color:var(--faint)}
.side-list{flex:1;overflow-y:auto;padding:8px 8px 20px}
.grp{margin:8px 0 2px}
.grp-h{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:6px;cursor:pointer;
  font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
.grp-h:hover{background:var(--side-hov)} .grp-h.on{color:var(--fg)}
.grp-h .bdot{width:7px;height:7px;border-radius:2px;flex:none}
.grp-h .gn{margin-left:auto;font-size:10px;color:var(--faint);font-weight:400}
.grp-h .coll{color:var(--clay);font-size:11px}
.srow{display:flex;align-items:center;gap:8px;padding:5px 8px 5px 14px;border-radius:6px;cursor:pointer;
  font-size:12.5px;color:var(--muted);overflow:hidden}
.srow:hover{background:var(--side-hov);color:var(--fg)}
.srow .dot{width:7px;height:7px;border-radius:50%;flex:none}
.srow .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.s-active .dot{background:var(--clay);box-shadow:0 0 6px var(--clay)}
.s-idle .dot{background:var(--amber)} .s-stale .dot{background:#4f4b44}
.s-bloquante .dot{background:var(--amber);animation:blq 1.6s ease-in-out infinite}
@keyframes blq{0%,100%{opacity:1;box-shadow:0 0 5px var(--amber)}50%{opacity:.45;box-shadow:none}}
.side-foot{padding:11px 16px;border-top:1px solid var(--border2);font-size:11px;color:var(--faint);
  display:flex;align-items:center;gap:8px}
.side-foot .av{width:20px;height:20px;border-radius:50%;background:var(--clay-dim);color:#1f1e1d;
  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}

/* ---- main ---- */
.main{flex:1;height:100vh;overflow-y:auto;padding:22px 26px 70px}
h1{font-size:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:0 0 2px}
.sub{font-size:12px;color:var(--faint);margin:0 0 18px}
.bar{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px}
.kpi{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:10px 15px;min-width:92px}
.kpi .v{font-size:22px;font-weight:600} .kpi .l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.kpi.alert .v{color:var(--clay)}
.filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.fbtn{font-size:12px;padding:4px 11px;border-radius:20px;background:var(--panel);border:1px solid var(--border);
  color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px}
.fbtn.on{color:var(--fg);border-color:var(--clay-dim);background:var(--panel2)}
.fbtn .bdot{width:7px;height:7px;border-radius:2px}
.fclear{font-size:11.5px;color:var(--faint);cursor:pointer;margin-left:4px}.fclear:hover{color:var(--clay)}
.b-meta{background:var(--blue)} .b-studio_descartes{background:var(--clay)}
.b-oscardcstudio{background:var(--green)} .b-autre{background:var(--faint)}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:start}
.cl{background:var(--col);border:1px solid var(--border);border-radius:var(--radius);padding:11px 11px 14px;min-height:110px}
.chead{display:flex;align-items:center;gap:8px;margin:2px 4px 11px;font-size:11.5px;text-transform:uppercase;
  letter-spacing:.07em;color:var(--muted);font-weight:600}
.chead .n{margin-left:auto;font-size:11.5px;color:var(--faint);background:var(--panel);border:1px solid var(--border);
  border-radius:20px;padding:1px 8px}
.cdot{width:9px;height:9px;border-radius:50%}
.c-active .cdot{background:var(--clay);box-shadow:0 0 7px var(--clay)}
.c-idle .cdot{background:var(--amber)} .c-stale .cdot{background:#4f4b44}
.chantiers-section{margin-bottom:30px}
.chantiers-board{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:start}
.chantier-col{background:var(--col);border:1px solid var(--border);border-radius:var(--radius);padding:11px 11px 14px;min-height:110px}
.chantier-chead{display:flex;align-items:center;gap:8px;margin:2px 4px 11px;font-size:11.5px;text-transform:uppercase;
  letter-spacing:.07em;color:var(--muted);font-weight:600}
.chantier-chead .n{margin-left:auto;font-size:11.5px;color:var(--faint);background:var(--panel);border:1px solid var(--border);
  border-radius:20px;padding:1px 8px}
.chantier-card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:10px 11px;margin-bottom:9px;scroll-margin:80px}
.chantier-card.fait{border-color:#3fb950;box-shadow:0 0 0 1px #3fb950 inset}
.chantier-card.en-cours{border-color:var(--clay-dim);box-shadow:0 0 0 1px var(--clay-dim) inset}
.chantier-card.backlog{border-color:#4f4b44}
.chantier-prio{display:inline-block;font-size:10px;font-weight:700;color:#fff;background:var(--clay);padding:2px 6px;border-radius:4px;margin-right:6px}
.chantier-title{font-size:12.5px;color:var(--fg);margin-bottom:7px;line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chantier-desc{font-size:10.5px;color:var(--faint);margin-bottom:7px;line-height:1.35}
.chantier-deps{font-size:10px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)}
.chantier-badge{display:inline-block;font-size:9.5px;color:var(--fg);background:var(--panel2);border:1px solid var(--border);
  border-radius:3px;padding:2px 5px;margin:2px 2px 0 0}
.card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:10px 11px;margin-bottom:9px;scroll-margin:80px}
.card.coll{border-color:var(--clay-dim);box-shadow:0 0 0 1px var(--clay-dim) inset}
.card.bloquante{border-color:var(--amber);border-top-width:2px}
.card.agents-live{border-color:#3a7070}
.card.flash{animation:fl 1.1s ease}@keyframes fl{0%,100%{box-shadow:0 0 0 0 var(--clay)}30%{box-shadow:0 0 0 2px var(--clay)}}
.attend-badge{font-size:10px;background:#26200d;color:var(--amber);border:1px solid #5a4a1a;border-radius:4px;padding:2px 7px;font-weight:600;flex:none}
.agents-live-badge{font-size:10px;background:#0d2020;color:#6ec6c6;border:1px solid #2a5050;border-radius:4px;padding:2px 7px;font-weight:600;flex:none}
/* attention section */
.attn-wrap{margin-bottom:18px;display:flex;flex-direction:column;gap:12px}
.attn-section{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px}
.attn-section.attn-blq{border-color:#5a4a1a}
.attn-section.attn-agts{border-color:#2a5050}
.attn-h{font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:0 0 10px;display:flex;align-items:center;gap:7px}
.attn-blq .attn-h{color:var(--amber)}
.attn-agts .attn-h{color:#6ec6c6}
.attn-list{display:flex;flex-wrap:wrap;gap:8px}
.attn-card{background:var(--col);border:1px solid var(--border);border-radius:7px;padding:7px 11px;cursor:pointer;min-width:160px;max-width:240px}
.attn-blq .attn-card:hover{border-color:var(--amber)}
.attn-agts .attn-card:hover{border-color:#3a7070}
.attn-card .at{font-size:11px;font-weight:600;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.attn-blq .attn-card .at{color:var(--amber)}
.attn-agts .attn-card .at{color:#6ec6c6}
.attn-card .ap{font-size:11px;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.attn-card .am{font-size:10px;color:var(--faint);margin-top:2px}
.ctop{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.ctop .bdot{width:7px;height:7px;border-radius:2px;flex:none}
.proj{font-weight:600;font-size:12px;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.coll-badge{margin-left:auto;font-size:10px;color:var(--clay);border:1px solid var(--clay-dim);border-radius:5px;padding:1px 6px;font-weight:600;flex:none}
.ctitle{font-size:12.5px;color:var(--fg);margin-bottom:7px;line-height:1.35;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cmeta{display:flex;gap:8px;flex-wrap:wrap;font-size:10.5px;color:var(--faint)}
.cmeta .branch::before{content:"⎇ "} .cmeta .model{color:var(--muted)}
.cmeta .dirty{color:var(--amber)} .cmeta .debt{color:var(--blue)}
.agents{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chip{font-size:10.5px;padding:2px 8px;border-radius:20px;background:var(--panel2);border:1px solid var(--border);color:var(--fg);cursor:pointer;transition:.12s}
.chip:hover{border-color:var(--clay)} .chip.sug{background:#3a2a22;border-color:var(--clay-dim);color:var(--clay)}
.chip .n{color:var(--faint);margin-left:3px}
.why{display:none;font-size:11px;color:var(--muted);margin-top:8px;padding:8px 10px;background:var(--side);border-left:2px solid var(--clay);border-radius:0 6px 6px 0}
.why.open{display:block} .why b{color:var(--clay)}
.reg{margin-top:30px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px}
.reg h2{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 13px}
.regrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:16px}
.regcol h3{font-size:11px;color:var(--clay);margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}
.regcol .c{font-size:10px;color:var(--faint);margin-left:5px}
.regcol ul{margin:0;padding:0;list-style:none}
.regcol li{font-size:11px;color:var(--muted);padding:1.5px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.foot{margin-top:26px;font-size:11px;color:var(--faint)}
.empty{color:var(--faint);font-size:12px;padding:12px;text-align:center}
@media(max-width:760px){body{flex-direction:column;overflow:auto}.side{width:100%;height:auto}.main{height:auto}.board{grid-template-columns:1fr}}

.copy-id-btn{font-size:10px;color:var(--muted);border:1px solid var(--border);background:var(--panel2);
  border-radius:4px;padding:2px 6px;cursor:pointer;flex:none;white-space:nowrap;line-height:1.5}
.copy-id-btn:hover{color:var(--fg);border-color:var(--faint)}
.refresh-btn{font-size:13px;background:none;border:none;color:var(--faint);cursor:pointer;padding:2px 6px;border-radius:4px;margin-left:auto}
.refresh-btn:hover{color:var(--clay);background:var(--side2)}
.refresh-btn.spinning{animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body>
<aside class="side">
  <div class="side-top">
    <div class="brand"><span class="ast">✱</span> Sessions Atlas <span class="ver">atlas</span><button class="refresh-btn" id="refreshBtn" style="display:none">↻</button></div>
    <input class="search" id="search" placeholder="Filtrer projets / sessions…">
  </div>
  <div class="side-list" id="sidelist"></div>
  <div class="side-foot"><span class="av">O</span> oscar · <span id="footstat"></span></div>
</aside>
<main class="main">
  <h1>Sessions Atlas</h1>
  <p class="sub" id="sub"></p>
  <div class="bar" id="kpis"></div>
  <div id="attnSection"></div>
  <div class="chantiers-section" id="chantiersSection"></div>
  <div class="filters" id="filters"></div>
  <div class="board" id="board"></div>
  <div class="reg" id="reg"></div>
  <p class="foot" id="foot"></p>
</main>
<script>
const D=${json};
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const base=s=>(s||'').split(/[\\\\/]/).filter(Boolean).pop()||s;
const ago=ts=>{if(!ts)return'?';const m=(Date.now()-new Date(ts))/60000;if(m<60)return Math.round(m)+'min';if(m<1440)return Math.round(m/60)+'h';return Math.round(m/1440)+'j';};
const shortModel=m=>(m||'?').replace('claude-','').replace(/-\\d{8}$/,'');
const BL={meta:'Meta',studio_descartes:'Studio Descartes',oscardcstudio:'Perso',autre:'Autre'};
const sid=s=>'card-'+s.id;

document.getElementById('sub').textContent='Généré '+new Date(D.generatedAt).toLocaleString('fr-FR')+' · fenêtre '+D.windowDays+' jours';
const K=D.stats;
document.getElementById('footstat').textContent=K.sessions+' sessions';
document.getElementById('kpis').innerHTML=[
  ['projets',K.projects,0],['sessions',K.sessions,0],['actives',K.active,0],
  ['bloquantes',K.bloquante,K.bloquante>0?1:0],
  ['agents actifs',K.agentsRunning,K.agentsRunning>0?1:0],
  ['collisions',K.collisions,K.collisions>0?1:0]
].map(([l,v,a])=>'<div class="kpi'+(a?' alert':'')+'"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>').join('');

let bucketF='all', projF=null, q='';
const buckets=[...new Set(D.projects.map(p=>p.bucket))];

function projVisible(p){return (bucketF==='all'||p.bucket===bucketF)&&(!q||base(p.path).toLowerCase().includes(q)||p.sessions.some(s=>(s.title||'').toLowerCase().includes(q)));}

// ---- attention section (bloquantes + agents actifs) ----
function renderAttention(){
  const vis=c=>cardVisible(c.p);
  const blq=CARDS.filter(c=>c.s.bloquante&&vis(c));
  const agts=CARDS.filter(c=>c.s.agentsRunning&&vis(c));
  if(!blq.length&&!agts.length){document.getElementById('attnSection').innerHTML='';return;}
  let html='<div class="attn-wrap">';
  if(blq.length){
    html+='<div class="attn-section attn-blq"><div class="attn-h">⏸ Attend ta réponse ('+blq.length+')</div><div class="attn-list">';
    for(const {s,p} of blq){
      html+='<div class="attn-card" data-card="'+sid(s)+'" data-proj="'+esc(p.path)+'">'+
        '<div class="at" style="display:flex;align-items:center;gap:6px">'+esc(base(p.path))+
        '<button class="copy-id-btn" data-session-id="'+esc(s.id)+'" title="Copier l\'ID de session">⎘</button></div>'+
        '<div class="ap">'+esc(s.title)+'</div>'+
        '<div class="am">'+ago(s.lastTs)+' · '+esc(shortModel(s.model))+'</div></div>';
    }
    html+='</div></div>';
  }
  if(agts.length){
    html+='<div class="attn-section attn-agts"><div class="attn-h">⚙ Agents en cours ('+agts.length+')</div><div class="attn-list">';
    for(const {s,p} of agts){
      html+='<div class="attn-card" data-card="'+sid(s)+'" data-proj="'+esc(p.path)+'">'+
        '<div class="at">'+esc(base(p.path))+'</div>'+
        '<div class="ap">'+esc(s.title)+'</div>'+
        '<div class="am">'+(s.agentsRunningCount||'?')+' agent(s) · '+ago(s.lastTs)+'</div></div>';
    }
    html+='</div></div>';
  }
  html+='</div>';
  document.getElementById('attnSection').innerHTML=html;
}

// ---- chantiers section ----
function renderChantiers(){
  if(!D.chantiers || !D.chantiers.length){document.getElementById('chantiersSection').innerHTML='';return;}
  const cols={};
  for(const ch of D.chantiers){if(!cols[ch.statut])cols[ch.statut]=[];cols[ch.statut].push(ch);}
  const order=['en-cours','backlog','fait'];
  const labels={a:'en-cours','en-cours':'En cours','backlog':'Backlog','fait':'Fait'};
  let html='<h2 style="font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 13px">Chantiers</h2><div class="chantiers-board">';
  for(const st of order){
    const ch=cols[st]||[];
    const colBg=st==='en-cours'?'var(--clay)':st==='backlog'?'#4f4b44':'#3fb950';
    html+='<div class="chantier-col"><div class="chantier-chead" style="border-bottom:2px solid '+colBg+';padding-bottom:8px"><span style="width:8px;height:8px;border-radius:50%;background:'+colBg+'"></span>'+labels[st]+'<span class="n">'+ch.length+'</span></div>';
    for(const c of ch.sort((a,b)=>a.priorite-b.priorite)){
      html+='<div class="chantier-card '+c.statut+'"><div><span class="chantier-prio">P'+c.priorite+'</span><span style="color:var(--fg);font-weight:600;font-size:11.5px">'+esc(c.titre)+'</span></div>'+
        '<div class="chantier-desc">'+esc(c.description)+'</div>';
      if(c.dependances && c.dependances.length){
        html+='<div class="chantier-deps">⬸ dépend de : '+c.dependances.map(d=>esc(d)).join(', ')+'</div>';
      }
      html+='</div>';
    }
    if(!ch.length)html+='<div class="empty">—</div>';
    html+='</div>';
  }
  html+='</div>';
  document.getElementById('chantiersSection').innerHTML=html;
}

// ---- sidebar : projets -> sessions (façon CC) ----
function renderSide(){
  let h='';
  for(const b of D.buckets){
    const ps=D.projects.filter(p=>p.bucket===b&&projVisible(p));
    if(!ps.length)continue;
    for(const p of ps){
      const on=projF===p.path;
      h+='<div class="grp"><div class="grp-h'+(on?' on':'')+'" data-proj="'+esc(p.path)+'">'+
        '<span class="bdot b-'+p.bucket+'"></span>'+esc(base(p.path))+
        (p.collision?'<span class="coll">⚠</span>':'')+'<span class="gn">'+p.sessions.length+'</span></div>';
      for(const s of p.sessions.slice(0,8)){
        const t=q?(s.title||'').toLowerCase().includes(q)||base(p.path).toLowerCase().includes(q):true;
        if(!t)continue;
        const sExtra=s.bloquante?'<span style="font-size:10px;color:var(--amber);margin-left:auto;flex:none">⏸</span>':s.agentsRunning?'<span style="font-size:10px;color:#6ec6c6;margin-left:auto;flex:none">⚙</span>':'';
        h+='<div class="srow s-'+s.status+(s.bloquante?' s-bloquante':'')+'" data-card="'+sid(s)+'" data-proj="'+esc(p.path)+'"><span class="dot"></span><span class="t">'+esc(s.title)+'</span>'+sExtra+'</div>';
      }
      if(p.sessions.length>8)h+='<div class="srow s-stale"><span class="dot"></span><span class="t" style="color:var(--faint)">+'+(p.sessions.length-8)+' autres</span></div>';
      h+='</div>';
    }
  }
  document.getElementById('sidelist').innerHTML=h||'<div class="empty">Rien.</div>';
}

// ---- filtres bucket ----
function renderFilters(){
  const opts=[['all','Tous',null]].concat(buckets.map(b=>[b,BL[b]||b,b]));
  document.getElementById('filters').innerHTML=opts.map(([id,lab,b])=>
    '<div class="fbtn'+(bucketF===id?' on':'')+'" data-f="'+id+'">'+(b?'<span class="bdot b-'+b+'"></span>':'')+esc(lab)+'</div>').join('')+
    (projF?'<span class="fclear" id="clearproj">✕ projet: '+esc(base(projF))+'</span>':'');
}

// ---- board kanban ----
const CARDS=[];for(const p of D.projects)for(const s of p.sessions)CARDS.push({s,p});
const COLS=[['active','Active'],['idle','Idle'],['stale','Stale']];
function cardVisible(p){return (bucketF==='all'||p.bucket===bucketF)&&(!projF||p.path===projF);}
function renderBoard(){
  let html='';
  for(const [st,lab] of COLS){
    const items=CARDS.filter(c=>c.s.status===st&&cardVisible(c.p));
    html+='<div class="cl c-'+st+'"><div class="chead"><span class="cdot"></span>'+lab+'<span class="n">'+items.length+'</span></div>';
    for(const {s,p} of items){
      const cardClass='card'+(p.collision?' coll':'')+(s.bloquante?' bloquante':s.agentsRunning?' agents-live':'');
      const copyIdBtn=s.bloquante?'<button class="copy-id-btn" data-session-id="'+esc(s.id)+'" title="Copier l\'ID de session">⎘</button>':'';
      const statusBadge=s.bloquante?'<span class="attend-badge">⏸ attend</span>':s.agentsRunning?'<span class="agents-live-badge">⚙ '+s.agentsRunningCount+'</span>':'';
      html+='<div class="'+cardClass+'" id="'+sid(s)+'"><div class="ctop"><span class="bdot b-'+p.bucket+'"></span>'+
        '<span class="proj">'+esc(base(p.path))+'</span>'+(p.collision?'<span class="coll-badge">⚠ collision</span>':'')+statusBadge+copyIdBtn+'</div>'+
        '<div class="ctitle">'+esc(s.title)+'</div><div class="cmeta">'+
        (p.branch?'<span class="branch">'+esc(p.branch)+'</span>':'')+'<span class="model">'+esc(shortModel(s.model))+'</span>'+
        '<span>'+ago(s.lastTs)+'</span><span>'+s.userMsgs+' msg</span>'+
        (p.dirty?'<span class="dirty">'+p.dirty+' modifs</span>':'')+(p.debt?'<span class="debt">dette '+p.debt+'</span>':'')+'</div>';
      const chips=[];
      for(const a of (s.agents||[]))chips.push('<span class="chip" data-why="agent déjà invoqué dans cette conv">'+esc(a.name)+'<span class="n">×'+a.n+'</span></span>');
      if(s.suggest)chips.push('<span class="chip sug" data-why="suggéré pour la tâche en cours · '+s.suggest.score+' mots-clés communs: '+esc(s.suggest.matched.join(', '))+'">▶ '+esc(s.suggest.name)+'</span>');
      if(chips.length)html+='<div class="agents">'+chips.join('')+'</div><div class="why"></div>';
      html+='</div>';
    }
    if(!items.length)html+='<div class="empty">—</div>';
    html+='</div>';
  }
  document.getElementById('board').innerHTML=html;
}

function rerender(){renderAttention();renderChantiers();renderSide();renderFilters();renderBoard();}
rerender();

document.getElementById('search').addEventListener('input',e=>{q=e.target.value.toLowerCase().trim();renderSide();});

document.addEventListener('click',e=>{
  const copyBtn=e.target.closest('.copy-id-btn');
  if(copyBtn){
    const id=copyBtn.getAttribute('data-session-id');
    navigator.clipboard.writeText(id).then(()=>{copyBtn.textContent='✓';setTimeout(()=>copyBtn.textContent='⎘',1500);}).catch(()=>{copyBtn.textContent='!';setTimeout(()=>copyBtn.textContent='⎘',1500);});
    return;
  }
  const attn=e.target.closest('.attn-card[data-card]');
  if(attn){projF=attn.getAttribute('data-proj');rerender();
    const el=document.getElementById(attn.getAttribute('data-card'));
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}return;}
  const grp=e.target.closest('.grp-h');
  if(grp){const pth=grp.getAttribute('data-proj');projF=(projF===pth?null:pth);rerender();return;}
  const row=e.target.closest('.srow[data-card]');
  if(row){projF=row.getAttribute('data-proj');rerender();
    const el=document.getElementById(row.getAttribute('data-card'));
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}return;}
  const fb=e.target.closest('.fbtn');
  if(fb){bucketF=fb.getAttribute('data-f');if(projF&&!cardVisibleProj())projF=null;rerender();return;}
  if(e.target.id==='clearproj'){projF=null;rerender();return;}
  const chip=e.target.closest('.chip');
  if(chip){const why=chip.closest('.card').querySelector('.why');if(!why)return;
    const txt=chip.getAttribute('data-why');
    if(why.classList.contains('open')&&why.dataset.src===txt){why.classList.remove('open');return;}
    why.innerHTML='<b>'+esc(chip.textContent.trim())+'</b> — '+esc(txt);why.dataset.src=txt;why.classList.add('open');}
});
function cardVisibleProj(){const p=D.projects.find(x=>x.path===projF);return p&&(bucketF==='all'||p.bucket===bucketF);}

const R=D.registry;
document.getElementById('reg').innerHTML='<h2>Ce qui existe (registre — vérifier avant de créer)</h2><div class="regrid">'+
  [['skills',R.skills],['agents',R.agents],['packages',R.packages],['hooks',R.hooks],['dashboards',R.dashboards]]
  .map(([t,a])=>'<div class="regcol"><h3>'+t+'<span class="c">'+a.length+'</span></h3><ul>'+
    a.slice(0,14).map(x=>'<li>'+esc(x)+'</li>').join('')+(a.length>14?'<li>…+'+(a.length-14)+'</li>':'')+'</ul></div>').join('')+'</div>';
document.getElementById('foot').textContent='atlas-index.json = source de vérité (lisible par Claude aussi). Regen : node sessions-atlas/generate-atlas.mjs';

// ---- server-mode: refresh button ----
if(window.__SERVER__){
  const refreshBtn=document.getElementById('refreshBtn');
  refreshBtn.style.display='block';
  refreshBtn.addEventListener('click',async ()=>{
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled=true;
    try{await fetch('/api/regen');location.reload();}
    catch(e){refreshBtn.classList.remove('spinning');refreshBtn.disabled=false;}
  });
}
</script></body></html>`;
}

const idx = build();
console.log(`Atlas généré : ${idx.stats.projects} projets, ${idx.stats.sessions} sessions, ${idx.stats.active} actives, ${idx.stats.bloquante} bloquantes, ${idx.stats.agentsRunning} agents en cours, ${idx.stats.collisions} collisions`);
console.log(`→ ${path.join(OUT_DIR, 'atlas.html')}`);
