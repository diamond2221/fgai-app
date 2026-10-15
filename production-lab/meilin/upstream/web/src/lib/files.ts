export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
    r.readAsDataURL(file);
  });
}

// Sample an image in the browser and return up to 5 dominant, distinct colours.
export async function extractPalette(src: string, count = 5): Promise<string[]> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    const w = (c.width = 64), h = (c.height = Math.max(1, Math.round((64 * img.naturalHeight) / img.naturalWidth)));
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data;
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const k = `${data[i] >> 5}-${data[i + 1] >> 5}-${data[i + 2] >> 5}`;
      const b = buckets.get(k) || { r: 0, g: 0, b: 0, n: 0 };
      b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; b.n++;
      buckets.set(k, b);
    }
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);
    const out: number[][] = [];
    for (const col of sorted) {
      if (out.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 48)) out.push(col);
      if (out.length >= count) break;
    }
    return out.map((c2) => `#${c2.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`);
  } catch {
    return [];
  }
}

export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve([...(input.files || [])]);
    input.click();
  });
}
