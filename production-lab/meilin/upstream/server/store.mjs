import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {integrated} from './fg-context.mjs';
import * as fg from './fg-store.mjs';

const DIR = process.env.FG_DIRECTOR_DATA || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'dramas');
const safe = (id) => /^[a-z0-9-]{8,64}$/.test(id);

export async function list() {
  if(integrated)return (await fg.list()).map(p=>({id:p.id,title:p.title||'',titleZh:p.titleZh||'',premise:p.brief?.premiseZh||'',stage:p.stage,updatedAt:p.updatedAt,episodes:p.episodes.length,done:p.episodes.filter(e=>e.done).length,planned:p.brief?.episodes||0,cover:p.bible?.style?.image||'',palette:p.bible?.style?.palette||[]}));
  await mkdir(DIR, { recursive: true });
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json'));
  const items = [];
  for (const f of files) {
    try {
      const p = JSON.parse(await readFile(join(DIR, f), 'utf8'));
      if (!Array.isArray(p.episodes)) continue; // v0.1 projects are not dramas
      items.push({ id: p.id, title: p.title || '', titleZh: p.titleZh || '', premise: p.brief?.premiseZh || '', direction: p.direction, stage: p.stage, updatedAt: p.updatedAt, episodes: p.episodes.length, done: p.episodes.filter((e) => e.done).length, planned: p.brief?.episodes || 0, cover: p.bible?.style?.image || '', palette: p.bible?.style?.palette || [] });
    } catch { /* skip broken file */ }
  }
  return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function get(id,write=false) {
  if(integrated)return fg.get(id,write);
  if (!safe(id)) return null;
  try { return JSON.parse(await readFile(join(DIR, `${id}.json`), 'utf8')); } catch { return null; }
}

export async function save(p) {
  if(integrated)return fg.save(p);
  await mkdir(DIR, { recursive: true });
  p.updatedAt = new Date().toISOString();
  const tmp = join(DIR, `${p.id}.json.tmp`);
  await writeFile(tmp, JSON.stringify(p, null, 2));
  const { rename } = await import('node:fs/promises');
  await rename(tmp, join(DIR, `${p.id}.json`));
  return p;
}

export async function remove(id) {
  if(integrated)return fg.remove(id);
  if (!safe(id)) return;
  await rm(join(DIR, `${id}.json`), { force: true });
}

export const newId = () => randomUUID();
