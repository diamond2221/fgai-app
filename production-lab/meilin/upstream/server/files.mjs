// Uploaded files (style references, asset images, scripts) stored under data/files and served at /files/.
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

export const FILES_DIR = process.env.MEILIN_FILES_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'files');
const MAX = 25 * 1024 * 1024;
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'text/plain': '.txt', 'text/markdown': '.md' };

export async function saveDataUrl(dataUrl, name = 'file') {
  const m = String(dataUrl).match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!m) throw new Error('上传内容格式不正确');
  const mime = m[1] || 'application/octet-stream';
  if(!/^(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|quicktime)|audio\/(?:mpeg|wav|mp4|ogg|flac)|text\/(?:plain|markdown)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/.test(mime))throw Error('不支持此文件类型');
  const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
  if (buf.length > MAX) throw new Error('单个文件不能超过 25MB');
  const ext = (extname(name) || EXT[mime] || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  if(!/^\.(?:png|jpe?g|webp|gif|mp4|mov|mp3|wav|m4a|ogg|flac|txt|md|docx|srt|fountain)$/.test(ext))throw Error('不支持此文件扩展名');
  const file = `${randomUUID()}${ext}`;
  await mkdir(FILES_DIR, { recursive: true });
  await writeFile(join(FILES_DIR, file), buf);
  return { id: file.split('.')[0], name: String(name).slice(0, 120), mime, size: buf.length, url: `/files/${file}`, buf };
}

export function textOf(upload) {
  const n = upload.name.toLowerCase();
  if (n.endsWith('.docx')) return docxText(upload.buf);
  if (/\.(txt|md|srt|fountain|text)$/.test(n) || upload.mime.startsWith('text/')) return upload.buf.toString('utf8').replace(/^\uFEFF/, '');
  throw new Error('剧本支持 .txt / .md / .docx / .srt / .fountain');
}

// Minimal .docx reader: locate word/document.xml in the zip and keep paragraph breaks.
function docxText(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('无法读取 Word 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    if (name === 'word/document.xml') {
      const lnlen = buf.readUInt16LE(off + 26), lxlen = buf.readUInt16LE(off + 28);
      const data = buf.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
      const xml = (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nlen + xlen + clen;
  }
  throw new Error('Word 文件里没有正文');
}
