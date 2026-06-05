#!/usr/bin/env node
// server.mjs — Atlas server with Claude CLI bridge (SSE)
// Zero npm deps — Node built-ins only.
// Usage : node server.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = 5199;

// Sync regen — only used when atlas.html doesn't exist yet (first run)
function regenSync() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'generate-atlas.mjs')], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
  } catch (e) {
    console.error('[regen-sync]', e.message);
  }
}

// Async regen — spawns the generator, doesn't block the server
let regenInProgress = false;
function regenAsync() {
  if (regenInProgress) return;
  regenInProgress = true;
  const child = spawn(process.execPath, [path.join(__dirname, 'generate-atlas.mjs')], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  child.stdout.on('data', d => process.stdout.write('[regen] ' + d));
  child.stderr.on('data', d => process.stderr.write('[regen] ' + d));
  child.on('close', () => { regenInProgress = false; });
  child.on('error', e => { console.error('[regen]', e.message); regenInProgress = false; });
}

function serveAtlas(res) {
  const htmlPath = path.join(__dirname, 'atlas.html');
  if (!fs.existsSync(htmlPath)) {
    res.writeHead(503);
    res.end('Atlas not generated yet — try reloading in a moment.');
    return;
  }
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Inject __SERVER__ flag right after <script>\n so chat panel JS activates
  html = html.replace('<script>\n', '<script>\nwindow.__SERVER__=true;\n');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const reqUrl = new URL(req.url, 'http://localhost:' + PORT);

  // GET / — serve existing atlas instantly, trigger async regen for next visit
  if (req.method === 'GET' && reqUrl.pathname === '/') {
    const htmlPath = path.join(__dirname, 'atlas.html');
    if (!fs.existsSync(htmlPath)) {
      // First run: must generate before serving
      console.log('[regen] First run — generating atlas.html...');
      regenSync();
    }
    serveAtlas(res);
    regenAsync(); // background update for next visit
    return;
  }

  // GET /api/regen — explicit regen + wait (for Refresh button)
  if (req.method === 'GET' && reqUrl.pathname === '/api/regen') {
    regenSync();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    return;
  }

  // POST /api/send — spawn claude -p, stream as SSE
  // Body: { message: string, cwd?: string, sessionId?: string }
  if (req.method === 'POST' && reqUrl.pathname === '/api/send') {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); }
      catch { res.writeHead(400); res.end('Bad JSON'); return; }

      const { message, cwd, sessionId } = body;
      if (!message) { res.writeHead(400); res.end('message required'); return; }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();

      const args = ['-p', message, '--output-format', 'stream-json', '--verbose'];
      if (sessionId) args.push('--resume', sessionId);

      const label = sessionId ? 'resume ' + sessionId.slice(0, 8) + '…' : 'new';
      console.log('[send]', label, '| cwd:', cwd || __dirname);

      const child = spawn('claude', args, {
        cwd: cwd || __dirname,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      function sse(data) {
        if (!res.writableEnded) res.write('data: ' + JSON.stringify(data) + '\n\n');
      }

      let buf = '';
      child.stdout.on('data', chunk => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev;
          try { ev = JSON.parse(line); } catch { continue; }

          // New session ID from init
          if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) {
            sse({ type: 'session', sessionId: ev.session_id });
          }

          // Text chunks from assistant
          if (ev.type === 'assistant' && ev.message) {
            if (ev.session_id) sse({ type: 'session', sessionId: ev.session_id });
            const content = ev.message.content;
            if (Array.isArray(content)) {
              for (const c of content) {
                if (c.type === 'text' && c.text) sse({ type: 'text', text: c.text });
              }
            }
          }

          // Final result
          if (ev.type === 'result') {
            sse({ type: 'done', sessionId: ev.session_id, cost: ev.total_cost_usd });
          }
        }
      });

      child.stderr.on('data', chunk => {
        const s = chunk.toString().trim();
        if (s) console.error('[claude]', s);
      });

      child.on('close', code => {
        // Flush any remaining buffered line
        if (buf.trim()) {
          try {
            const ev = JSON.parse(buf);
            if (ev.type === 'result') sse({ type: 'done', sessionId: ev.session_id, cost: ev.total_cost_usd });
          } catch {}
        }
        sse({ type: 'end', code });
        if (!res.writableEnded) res.end();
      });

      // Kill child if client disconnects
      req.on('close', () => { if (!child.killed) child.kill('SIGTERM'); });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Atlas server → http://localhost:' + PORT);
  console.log('Ctrl+C to stop');
});
