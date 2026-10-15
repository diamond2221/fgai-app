// 美林 · FG 超级导演 — local orchestration server.
import { createServer } from 'node:http';
import { readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { join, dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (values are never logged).
const envFile = join(ROOT, '.env');
if (process.env.MEILIN_MODE !== 'mock' && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const P = await import('./presets.mjs');
const store = await import('./store.mjs');
const brain = await import('./brain.mjs');
const models = await import('./models.mjs');
const skills = await import('./skills.mjs');
const styles = await import('./styles.mjs');
const files = await import('./files.mjs');
const media = await import('./media.mjs');
const insp = await import('./inspirations.mjs');
const { liveText } = await import('./llm.mjs');

const PORT = Number(process.env.FG_DIRECTOR_PORT || 5310);
const DIST = join(ROOT, 'web', 'dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

function aiStudioPack() {
  const md = readFileSync(join(ROOT, 'skills', 'fg-overseas-drama-script', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const sec2 = md.split('## 2.')[1]?.split('## 3.')[0] || '';
  const steps = sec2.split('\n').filter((l) => /^\d+\.\s/.test(l)).map((l) => l.replace(/^\d+\.\s*/, ''));
  const prompts = [...md.matchAll(/### (Prompt [①②③④][^\n]*)\n+```text\n([\s\S]*?)```/g)].map((m) => ({ name: m[1].trim(), text: m[2].trim() }));
  return { steps, prompts };
}
const CONFIG = {
  mode: liveText ? 'live' : 'mock',
  media: media.mediaMode(),
  directions: P.DIRECTIONS,
  models: models.publicCatalog(),
  skills: skills.catalog(),
  styles: styles.allPresets(),
  dramaStages: [{ id: 'brief', name: '立项' }, { id: 'bible', name: '圣经与画风' }],
  episodeStages: [{ id: 'script', name: '剧本' }, { id: 'cast', name: '本集资产' }, { id: 'segments', name: '分段提示词' }, { id: 'shoot', name: '拍摄' }, { id: 'post', name: '后期' }],
  aiStudio: aiStudioPack(),
  inspirations: Boolean(insp.CANVAS_PUBLIC),
};

const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
async function readBody(req, limit = 2_000_000) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('请求内容过大');
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
function view(d) {
  brain.refreshJobs(d);
  for (const e of d.episodes) for (const j of e.jobs) j.progress = brain.progressOf(j);
  const { _pending, _trace, _focus, ...rest } = d;
  return { ...rest, music: brain.musicCues(d) };
}

const locks = new Map();
async function withDrama(id, fn) {
  const prev = locks.get(id) || Promise.resolve();
  let release;
  const next = new Promise((r) => (release = r));
  locks.set(id, prev.then(() => next));
  await prev;
  try {
    const d = await store.get(id);
    if (!d) return null;
    brain.migrate(d);
    brain.refreshJobs(d);
    const out = await fn(d);
    const pending = d._pending;
    const trace = d._trace || [];
    const focus = [...new Set(d._focus || [])];
    delete d._pending; delete d._trace; delete d._focus;
    if (out && typeof out === 'object' && 'project' in out) {
      out.trace = trace;
      out.focus = focus;
      const episode = out.nav ? out.nav.episode || null : out.ctxEpisode ?? null;
      out.next = brain.nextSteps(d, { episode });
      delete out.ctxEpisode;
    }
    await store.save(d);
    if (pending?.length) runPending(id, pending);
    return out;
  } finally {
    release();
  }
}
function runPending(id, jobs) {
  for (const job of jobs) {
    media.generateImage(job).then(
      (url) => withDrama(id, (d) => { const a = d.assets.items.find((x) => x.code === job.code); const v = a?.versions.find((x) => x.id === job.version); if (v) v.url = url; if (a) { a.realPending = false; a.status = 'ready'; } }),
      (err) => withDrama(id, (d) => { const a = d.assets.items.find((x) => x.code === job.code); if (a) { a.realPending = false; a.status = 'draft'; a.versions = a.versions.filter((v) => v.id !== job.version); } d.messages.push({ id: job.version, role: 'agent', text: `${job.code} 出图失败：${err.message}`, at: new Date().toISOString() }); }),
    );
  }
}

function serveFile(res, base, rel) {
  const root = resolve(base);
  const file = resolve(root, normalize(decodeURIComponent(rel)).replace(/^([/\\])+/, ''));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) return send(res, 404, '文件不存在', 'text/plain; charset=utf-8');
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'public, max-age=86400' });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const path = url.pathname;
  try {
    if (path === '/api/config') return send(res, 200, CONFIG);
    if (path === '/api/inspirations') return send(res, 200, insp.search({ q: url.searchParams.get('q') || '', mode: url.searchParams.get('mode') || '', offset: Number(url.searchParams.get('offset') || 0), limit: 48 }));
    if (path === '/api/dramas' && req.method === 'GET') return send(res, 200, await store.list());
    if (path === '/api/dramas' && req.method === 'POST') {
      const body = await readBody(req);
      const d = brain.createDrama(body.direction);
      await store.save(d);
      return send(res, 200, view(d));
    }
    const m = path.match(/^\/api\/dramas\/([a-z0-9-]+)(?:\/(\w+))?$/);
    if (m) {
      const [, id, sub] = m;
      if (!sub && req.method === 'GET') {
        const d = await store.get(id);
        return d ? send(res, 200, view(brain.migrate(d))) : send(res, 404, { error: '剧不存在' });
      }
      if (!sub && req.method === 'DELETE') { await store.remove(id); return send(res, 200, { ok: true }); }
      if (sub === 'turn' && req.method === 'POST') {
        const body = await readBody(req);
        const out = await withDrama(id, async (d) => ({ ...(await brain.turn(d, String(body.text || '').slice(0, 4000), body.ctx || {})), ctxEpisode: body.ctx?.episode ?? null, project: view(d) }));
        return out ? send(res, 200, out) : send(res, 404, { error: '剧不存在' });
      }
      if (sub === 'action' && req.method === 'POST') {
        const body = await readBody(req, 4_000_000);
        const out = await withDrama(id, async (d) => ({ ...(await brain.act(d, body.type, body.payload || {}, body.ctx || {})), ctxEpisode: body.ctx?.episode ?? null, project: view(d) }));
        return out ? send(res, 200, out) : send(res, 404, { error: '剧不存在' });
      }
      if (sub === 'upload' && req.method === 'POST') {
        const body = await readBody(req, 36_000_000);
        const out = await withDrama(id, async (d) => {
          const up = await files.saveDataUrl(body.dataUrl, body.name);
          const meta = { id: up.id, name: up.name, mime: up.mime, size: up.size, url: up.url, purpose: body.purpose || 'asset', palette: body.palette || [], at: new Date().toISOString() };
          d.uploads.push(meta);
          let result = { reply: '' };
          if (meta.purpose === 'script') result = await brain.act(d, 'script.upload', { text: files.textOf(up), name: up.name, episode: body.episode }, body.ctx || {});
          if (meta.purpose === 'asset' && (body.code || body.kind)) result = await brain.act(d, 'assets.upload', { upload: meta.id, code: body.code, kind: body.kind, name: body.assetName, episode: body.episode }, body.ctx || {});
          return { ...result, upload: meta, ctxEpisode: body.ctx?.episode ?? null, project: view(d) };
        });
        return out ? send(res, 200, out) : send(res, 404, { error: '剧不存在' });
      }
      if (sub === 'next' && req.method === 'GET') {
        const d = await store.get(id);
        if (!d) return send(res, 404, { error: '剧不存在' });
        brain.migrate(d);
        const e = Number(url.searchParams.get('episode') || 0) || null;
        return send(res, 200, { next: brain.nextSteps(d, { episode: e }), memory: d.memory.length });
      }
      if (sub === 'srt' || sub === 'prompts') {
        const d = await store.get(id);
        if (!d) return send(res, 404, { error: '剧不存在' });
        const n = Number(url.searchParams.get('episode') || 1);
        const name = encodeURIComponent(`${d.title || 'drama'}-EP${n}.${sub === 'srt' ? 'srt' : 'txt'}`);
        return send(res, 200, '﻿' + (sub === 'srt' ? brain.srt(d, n) : brain.promptsText(d, n)), 'text/plain; charset=utf-8', { 'content-disposition': `attachment; filename*=UTF-8''${name}` });
      }
    }
    if (path.startsWith('/api/')) return send(res, 404, { error: '接口不存在' });
    if (path.startsWith('/files/')) return serveFile(res, files.FILES_DIR, path.slice(7));
    if (path.startsWith('/fg-public/inspiration-thumbs/') && insp.CANVAS_PUBLIC) return serveFile(res, join(insp.CANVAS_PUBLIC, 'inspiration-thumbs'), path.slice('/fg-public/inspiration-thumbs/'.length));
    if (existsSync(DIST)) {
      const rel = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, '');
      const file = join(DIST, rel);
      if (rel && file.startsWith(DIST) && existsSync(file) && !statSync(file).isDirectory()) return serveFile(res, DIST, rel);
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      return createReadStream(join(DIST, 'index.html')).pipe(res);
    }
    return send(res, 404, '前端尚未构建：运行 npm run build，或开发时用 npm run dev。', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error('[meilin]', err.message);
    return send(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[meilin] http://127.0.0.1:${PORT}  text=${liveText ? 'live' : 'mock'}  media=${media.mediaMode()}  skills=${skills.SKILLS_DIR}  inspirations=${insp.CANVAS_PUBLIC || 'not connected'}`);
});
export {server};
