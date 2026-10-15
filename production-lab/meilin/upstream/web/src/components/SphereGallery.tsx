import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

export type SphereItem = { key: string; title: string; sub?: string; url?: string | null; palette?: string[]; badge?: string; ratio?: number };

const VERT = /* glsl */ `
varying vec2 vUv; varying float vFacing;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 toCam = normalize(cameraPosition - wp.xyz);
  vFacing = clamp(dot(n, toCam), 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uHover; uniform float uAspect; uniform float uFade; uniform float uImgAspect;
varying vec2 vUv; varying float vFacing;
float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float d = rbox(p, vec2(uAspect, 1.0) * 0.5, 0.045);
  float mask = 1.0 - smoothstep(-0.003, 0.003, d);
  // cover-fit the image inside the card
  vec2 uv = vUv - 0.5;
  float k = uImgAspect / uAspect;
  if (k > 1.0) uv.x /= k; else uv.y *= k;
  vec4 c = texture2D(uMap, uv + 0.5);
  float rim = smoothstep(-0.012, -0.002, d) * (0.2 + 0.8 * uHover);
  // daylight: tiles at the edge of view wash toward the porcelain backdrop instead of into darkness
  vec3 col = mix(vec3(0.93, 0.95, 0.98), c.rgb, 0.6 + 0.4 * vFacing);
  col = mix(col, vec3(0.17, 0.27, 1.0), rim * 0.85);
  col += vec3(0.04) * uHover;
  float a = mask * uFade * (0.45 + 0.55 * smoothstep(0.1, 0.8, vFacing));
  gl_FragColor = vec4(col, a);
}`;

function placeholder(item: SphereItem) {
  const W = 512, H = 288;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const pal = item.palette?.length ? [...item.palette, ...item.palette].slice(0, 4) : ['#c9d2ff', '#9fe3ff', '#ffd2bd', '#7a6bff'];
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.55, pal[1] + '66'); grad.addColorStop(1, pal[0] + 'aa');
  g.fillStyle = '#f4f6fb'; g.fillRect(0, 0, W, H);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.72, H * 0.3, 10, W * 0.72, H * 0.3, 220);
  glow.addColorStop(0, pal[2] + 'aa'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const words = item.title.split(/\s+/).filter(Boolean);
  const mono = /[A-Za-z]/.test(item.title) ? words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() : item.title.slice(0, 1);
  g.strokeStyle = 'rgba(12,16,36,.18)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(W - 110, 120, 62, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(12,16,36,.82)'; g.font = 'italic 72px "Instrument Serif", serif'; g.textAlign = 'center';
  g.fillText(mono, W - 110, 144); g.textAlign = 'left';
  g.fillStyle = '#0c1024'; g.font = '600 30px "Space Grotesk", "Noto Sans SC", sans-serif';
  g.fillText(item.title.slice(0, 16), 24, H - 56);
  g.fillStyle = 'rgba(12,16,36,.55)'; g.font = '20px "Space Grotesk", "Noto Sans SC", sans-serif';
  g.fillText((item.sub || '').slice(0, 22), 24, H - 26);
  // viewfinder corners
  g.strokeStyle = 'rgba(12,16,36,.35)'; g.lineWidth = 2;
  for (const [x, y, dx, dy] of [[14, 14, 1, 1], [W - 14, 14, -1, 1], [14, H - 14, 1, -1], [W - 14, H - 14, -1, -1]]) { g.beginPath(); g.moveTo(x + dx * 18, y); g.lineTo(x, y); g.lineTo(x, y + dy * 18); g.stroke(); }
  if (item.badge) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(24, 22, 62, 30); g.fillStyle = '#464d6b'; g.font = '18px "Noto Sans SC", sans-serif'; g.fillText(item.badge, 36, 43); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: W / H };
}

type Props = { items: SphereItem[]; onPick: (key: string) => void; label: string; minTiles?: number };
// minTiles is kept for API compatibility; density now comes from the row layout.

export default function SphereGallery({ items, onPick, label, minTiles = 72 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<SphereItem | null>(null);
  const [full, setFull] = useState(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // rebuild the scene only when what is shown actually changes (polling re-renders keep the same signature)
  const sig = items.map((i) => `${i.key}:${i.url || ''}:${i.title}:${i.badge || ''}`).join('|');

  useEffect(() => {
    const el = host.current!;
    const items = itemsRef.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { el.classList.add('sphere-fallback'); return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    // Tiles sit in latitude rows on the inside of the sphere, all facing the centre where the camera floats.
    // Real items cycle (offset per row) so the planet always feels dense.
    const R = 10;
    const textures = new Map<string, { tex: THREE.Texture; aspect: number }>();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const meshes: THREE.Mesh[] = [];
    const H = 1.5;
    const rowStep = (H * 1.32) / R;
    const rows = Math.floor(1.0 / rowStep);
    let idx = 0;
    const textureFor = (item: SphereItem) => {
      let entry = textures.get(item.key);
      if (entry) return entry;
      entry = placeholder(item);
      textures.set(item.key, entry);
      if (item.url) {
        const holder = entry;
        loader.load(item.url, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          holder.tex = t;
          holder.aspect = (t.image.width || 3) / (t.image.height || 4);
          meshes.forEach((m) => { if (m.userData.key === item.key) { const uu = (m.material as THREE.ShaderMaterial).uniforms; uu.uMap.value = t; uu.uImgAspect.value = holder.aspect; } });
        });
      }
      return entry;
    };
    for (let r = -rows; r <= rows && items.length; r++) {
      const lat = r * rowStep;
      const ringLen = 2 * Math.PI * R * Math.cos(lat);
      const tileW = (items[0]?.ratio || 0.75) > 1 ? H * 0.78 * (items[0]?.ratio || 1.78) : H * 0.75;
      const cols = Math.max(6, Math.floor(ringLen / (tileW * 1.12)));
      for (let c = 0; c < cols; c++) {
        const item = items[(idx + Math.abs(r) * 3) % items.length];
        idx++;
        const lon = (c / cols) * Math.PI * 2 + (r % 2) * (Math.PI / cols);
        const pos = new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat)).multiplyScalar(R);
        const ratio = item.ratio || 0.75;
        const h = ratio > 1 ? H * 0.78 : H, w = h * ratio;
        const entry = textureFor(item);
        const u = { uMap: { value: entry.tex as THREE.Texture | null }, uHover: { value: 0 }, uAspect: { value: w / h }, uFade: { value: 0 }, uImgAspect: { value: entry.aspect } };
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.userData = { key: item.key, item, delay: 0.15 + Math.abs(r) * 0.06 + Math.random() * 0.35 };
        world.add(mesh);
        meshes.push(mesh);
      }
    }

    const resize = () => {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // look-around controls: drag rotates the planet, wheel dives in (narrower fov + forward dolly)
    const view = { yaw: 0, pitch: 0, ty: 0, tp: 0, vy: 0, vp: 0, fov: 96, tf: 68, dolly: 0, td: 0 };
    let dragging = false, moved = 0, lx = 0, ly = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    let hovered: THREE.Mesh | null = null;
    const down = (e: PointerEvent) => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      const k = 0.0032 * (view.fov / 68);
      view.ty += dx * k; view.tp += dy * k;
      view.vy = dx * k; view.vp = dy * k;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
      if (moved < 6 && hovered) pickRef.current(hovered.userData.key);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      view.tf = THREE.MathUtils.clamp(view.tf + e.deltaY * 0.03, 26, 84);
      view.td = THREE.MathUtils.clamp(((68 - view.tf) / 42) * 6.4, 0, 6.4);
    };
    const leave = () => { ndc.set(9, 9); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });

    const clock = new THREE.Clock();
    let raf = 0, t = 0;
    const dir = new THREE.Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      if (!dragging) {
        view.ty += view.vy; view.tp += view.vp;
        view.vy *= 0.94; view.vp *= 0.94;
        if (!reduce && Math.abs(view.vy) < 0.0004) view.ty += dt * 0.035;
      }
      view.tp = THREE.MathUtils.clamp(view.tp, -0.75, 0.75);
      const k = 1 - Math.pow(0.0008, dt);
      view.yaw += (view.ty - view.yaw) * k;
      view.pitch += (view.tp - view.pitch) * k;
      view.fov += (view.tf - view.fov) * k;
      view.dolly += (view.td - view.dolly) * k;
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
      dir.set(Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), -Math.cos(view.yaw) * Math.cos(view.pitch));
      camera.position.copy(dir).multiplyScalar(view.dolly);
      camera.lookAt(dir.clone().multiplyScalar(view.dolly + 1));

      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0]?.object as THREE.Mesh | undefined;
      if ((hit || null) !== hovered) {
        hovered = hit || null;
        setHover(hovered ? hovered.userData.item : null);
        el.style.cursor = hovered ? 'pointer' : 'grab';
      }
      for (const m of meshes) {
        const uu = (m.material as THREE.ShaderMaterial).uniforms;
        uu.uFade.value = Math.min(1, Math.max(0, (t - m.userData.delay) * 2.2));
        const target = m === hovered ? 1 : 0;
        uu.uHover.value += (target - uu.uHover.value) * Math.min(1, dt * 10);
        const s = 1 + uu.uHover.value * 0.12;
        m.scale.setScalar(s);
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
      meshes.forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      textures.forEach((x) => x.tex.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [sig, minTiles, full]);

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', k);
    document.body.classList.add('immersive');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('immersive'); };
  }, [full]);

  const node = (
    <div className={`sphere ${full ? 'full' : ''}`} role={full ? 'dialog' : undefined} aria-modal={full || undefined} aria-label={full ? `${label}沉浸查看` : undefined}>
      <div ref={host} className="sphere-gl" role="application" aria-label={`${label}星球：拖动旋转，滚轮钻进，点击打开`} />
      <div className="sphere-core" aria-hidden={!hover}>
        <span className="sphere-core-ring" />
        {hover ? (
          <><b>{hover.title}</b><small>{hover.sub}</small></>
        ) : (
          <><b>{label}</b><small>{items.length} 个</small></>
        )}
      </div>
      <div className="sphere-bar">
        {full && <span className="sphere-title">{label} · {items.length}</span>}
        <button className="icon-btn sphere-full" onClick={() => setFull((v) => !v)} aria-pressed={full} title={full ? '退出全屏（Esc）' : '全屏沉浸'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
          <span className="sr-only">{full ? '退出全屏' : '全屏沉浸'}</span>
        </button>
      </div>
      <span className="sphere-hint">拖动旋转 · 滚轮钻进 · 点击打开{full ? ' · Esc 退出' : ''}</span>
      {!items.length && <p className="sphere-empty">这里还没有内容。</p>}
    </div>
  );
  // Fullscreen is portalled to <body> so no transformed or blurred ancestor can clip it.
  return full ? createPortal(node, document.body) : node;
}
