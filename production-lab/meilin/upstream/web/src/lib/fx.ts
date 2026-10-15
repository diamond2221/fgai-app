const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Small particle burst from an element (used when something gets locked / approved).
export function burst(el: Element | null, colors = ['#b9a8ff', '#7ef0ff', '#ffd59a', '#ffffff']) {
  if (!el || reduce()) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('i');
    p.className = 'spark';
    const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
    const dist = 40 + Math.random() * 70;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    document.body.appendChild(p);
    window.setTimeout(() => p.remove(), 900);
  }
}

// One global listener drives cursor spotlights (.glow) and 3D tilt (.tilt).
export function installPointerFx() {
  const move = (e: PointerEvent) => {
    const t = e.target as HTMLElement | null;
    const glow = t?.closest?.('.glow') as HTMLElement | null;
    if (glow) {
      const r = glow.getBoundingClientRect();
      glow.style.setProperty('--mx', `${e.clientX - r.left}px`);
      glow.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    if (reduce()) return;
    const tilt = t?.closest?.('.tilt') as HTMLElement | null;
    if (tilt) {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      tilt.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
      tilt.style.setProperty('--sx', `${(x + 0.5) * 100}%`);
      tilt.style.setProperty('--sy', `${(y + 0.5) * 100}%`);
    }
  };
  const leave = (e: PointerEvent) => {
    const t = (e.target as HTMLElement | null)?.closest?.('.tilt') as HTMLElement | null;
    if (t && !t.contains(e.relatedTarget as Node)) { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerout', leave, { passive: true });
}

export function countUp(el: HTMLElement | null, to: number, ms = 900) {
  if (!el) return;
  if (reduce()) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
