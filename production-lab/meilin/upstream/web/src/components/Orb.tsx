import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<4;i++){s+=a*snoise(p);p*=2.02;a*=0.5;}return s;}
`;

const VERT = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uSpeed;
varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying float vDisp;
${NOISE}
void main(){
  vec3 p = position;
  float d = snoise(normal*0.95 + vec3(uTime*0.22*uSpeed)) * 0.75 + snoise(normal*2.0 - vec3(uTime*0.35*uSpeed)) * 0.25;
  vDisp = d;
  p += normal * d * uAmp;
  vObj = p;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  vView = normalize(-mv.xyz);
  // approximate displaced normal by bending with the noise gradient direction
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

// Daylight pearl: an iridescent liquid-glass sphere that reads on white backgrounds.
const FRAG = /* glsl */ `
uniform float uTime; uniform float uThink; uniform float uListen; uniform float uSpeak; uniform float uLevel; uniform float uSpeed;
varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying float vDisp;
${NOISE}
vec3 holo(float t){
  // lavender → ice blue → mint → peach → lavender
  vec3 a = vec3(0.72, 0.66, 1.00), b = vec3(0.58, 0.88, 1.00), c = vec3(0.66, 0.97, 0.84), d = vec3(1.00, 0.80, 0.70);
  t = fract(t) * 4.0;
  if (t < 1.0) return mix(a, b, smoothstep(0.0, 1.0, t));
  if (t < 2.0) return mix(b, c, smoothstep(1.0, 2.0, t));
  if (t < 3.0) return mix(c, d, smoothstep(2.0, 3.0, t));
  return mix(d, a, smoothstep(3.0, 4.0, t));
}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(vView);
  float facing = clamp(dot(N,V),0.0,1.0);
  float fres = pow(1.0 - facing, 2.2);
  float t = uTime * (0.10 + 0.22*uThink) * uSpeed;

  vec3 p = vObj * 0.9;
  vec3 q = vec3(snoise(p + vec3(0.0, t, 0.0)), snoise(p + vec3(5.2, 1.3 - t, 2.8)), snoise(p + vec3(1.7, 9.2, t)));
  float n1 = snoise(p*0.9 + 0.9*q + vec3(t*1.1));
  float n2 = snoise(p*1.3 - V*0.8 + vec3(0.0, -t*1.3, t));

  vec3 pearl = vec3(0.965, 0.972, 1.0);
  vec3 film = holo(n1*0.45 + fres*0.6 + uTime*0.02);
  vec3 col = mix(pearl, film, 0.55 + 0.25*smoothstep(-0.3, 0.9, n1));
  // inky liquid currents give the orb depth and contrast on white
  vec3 ink = mix(vec3(0.20, 0.16, 0.62), vec3(0.05, 0.42, 0.78), 0.5 + 0.5*n2);
  float current = smoothstep(0.35, 0.95, n2) * (0.35 + 0.35*uThink + 0.4*uSpeak*uLevel);
  col = mix(col, ink, current * (0.55 + 0.45*facing));
  float vein = pow(1.0 - abs(n1), 26.0);
  col = mix(col, vec3(1.0), vein*0.8);

  // studio light: big soft key from upper left, crisp specular, cool rim that defines the silhouette
  vec3 L = normalize(vec3(-0.5, 0.75, 0.6));
  vec3 H = normalize(L + V);
  col += vec3(1.0) * pow(max(dot(N,H),0.0), 120.0) * 1.2;
  col += vec3(1.0) * pow(max(dot(N,H),0.0), 12.0) * 0.18;
  vec3 R = reflect(-V, N);
  col = mix(col, vec3(1.0), smoothstep(0.55, 0.95, R.y) * smoothstep(0.9, 0.2, abs(R.x + 0.2)) * 0.35);
  col = mix(col, vec3(0.30, 0.24, 0.85), smoothstep(0.55, 1.0, fres) * 0.55);
  col *= 1.0 - smoothstep(0.82, 1.0, fres) * 0.25;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const HALO_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vView = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`;
const HALO_FRAG = /* glsl */ `
uniform float uLevel; uniform float uThink; varying vec3 vN; varying vec3 vView;
void main(){
  float d = clamp(-dot(vN, vView) / 0.66, 0.0, 1.0);
  float i = pow(d, 2.4) * (0.42 + 0.5*uLevel + 0.2*uThink);
  vec3 c = mix(vec3(0.62, 0.55, 1.0), vec3(0.45, 0.85, 1.0), pow(d, 2.0));
  gl_FragColor = vec4(c, i);
}`;

const DUST_VERT = /* glsl */ `
uniform float uTime; uniform float uPx; attribute float aSeed; varying float vA;
void main(){
  vec3 p = position;
  float a = uTime*0.03*(0.4+aSeed);
  p.xz = mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
  p.y += sin(uTime*0.4 + aSeed*20.0)*0.05;
  vec4 mv = modelViewMatrix*vec4(p,1.0);
  vA = 0.25 + 0.75*fract(aSeed*7.13);
  gl_PointSize = uPx * (0.6 + 1.6*fract(aSeed*3.7)) * (3.0 / -mv.z);
  gl_Position = projectionMatrix*mv;
}`;
const DUST_FRAG = /* glsl */ `
uniform float uLevel; varying float vA;
void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c); float a = smoothstep(0.5,0.0,d) * vA * (0.3+0.4*uLevel);
  gl_FragColor = vec4(mix(vec3(0.30,0.26,0.85), vec3(0.10,0.55,0.85), vA), a); }`;

const RING_VERT = /* glsl */ `
varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const RING_FRAG = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uSeed; uniform vec3 uColor; varying vec2 vUv;
void main(){
  float a = vUv.x;                                  // around the ring
  float head = fract(uTime*0.08*(0.6+uSeed) + uSeed);
  float d = fract(a - head);
  float trail = smoothstep(0.0, 0.02, d) * pow(1.0 - d, 6.0);
  float base = 0.10 + 0.08*sin(a*6.2831*3.0 + uTime*0.7 + uSeed*9.0);
  float edge = 1.0 - abs(vUv.y - 0.5)*2.0;
  float i = (base*0.8 + trail*1.3) * edge * (0.7 + 1.0*uLevel);
  gl_FragColor = vec4(uColor, clamp(i, 0.0, 1.0));
}`;

type Props = { state: OrbState; levelRef: React.MutableRefObject<number>; fill?: number };

export default function Orb({ state, levelRef, fill = 0.56 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const fillRef = useRef(fill);
  stateRef.current = state;
  fillRef.current = fill;

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      el.classList.add('orb-fallback');
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const group = new THREE.Group();
    scene.add(group);

    const u = {
      uTime: { value: 0 }, uAmp: { value: 0.05 }, uSpeed: { value: reduce ? 0.25 : 1 },
      uThink: { value: 0 }, uListen: { value: 0 }, uSpeak: { value: 0 }, uLevel: { value: 0 },
    };
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 64), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG }));
    group.add(sphere);

    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 64), new THREE.ShaderMaterial({
      uniforms: { uLevel: u.uLevel, uThink: u.uThink }, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
      side: THREE.BackSide, transparent: true, blending: THREE.NormalBlending, depthWrite: false,
    }));
    group.add(halo);

    const rings: THREE.Mesh[] = [];
    const ringDefs: [number, number, number, THREE.Color][] = [[1.3, 1.15, 0.0, new THREE.Color('#4b3bff')], [1.44, -0.55, 0.37, new THREE.Color('#0aa5d8')], [1.58, 0.35, 0.71, new THREE.Color('#ff7a59')]];
    for (const [radius, tilt, seed, color] of ringDefs) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 8, 220), new THREE.ShaderMaterial({
        uniforms: { uTime: u.uTime, uLevel: u.uLevel, uSeed: { value: seed }, uColor: { value: color } },
        vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, blending: THREE.NormalBlending, depthWrite: false,
      }));
      m.rotation.x = Math.PI / 2 + tilt;
      m.rotation.y = seed * 2.2;
      group.add(m);
      rings.push(m);
    }

    const COUNT = reduce ? 260 : 700;
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.45 + Math.pow(Math.random(), 1.6) * 2.4;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.55, r * Math.sin(ph) * Math.sin(th)], i * 3);
      seed[i] = Math.random();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
      uniforms: { uTime: u.uTime, uLevel: u.uLevel, uPx: { value: 3.2 * renderer.getPixelRatio() } },
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, blending: THREE.NormalBlending, depthWrite: false,
    }));
    scene.add(dust);

    let w = 1, h = 1;
    const resize = () => {
      w = Math.max(1, el.clientWidth);
      h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = (e.clientY / window.innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', onMove, { passive: true });

    const clock = new THREE.Clock();
    let raf = 0;
    let smoothLevel = 0;
    let dist = 6;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = stateRef.current;
      const k = 1 - Math.pow(0.002, dt);
      const ease = (cur: number, to: number) => cur + (to - cur) * k;
      u.uThink.value = ease(u.uThink.value, s === 'thinking' ? 1 : 0);
      u.uListen.value = ease(u.uListen.value, s === 'listening' ? 1 : 0);
      u.uSpeak.value = ease(u.uSpeak.value, s === 'speaking' ? 1 : 0);
      const target = s === 'listening' || s === 'speaking' ? levelRef.current : s === 'thinking' ? 0.35 + 0.15 * Math.sin(u.uTime.value * 3) : 0.12;
      smoothLevel += (target - smoothLevel) * Math.min(1, dt * 10);
      u.uLevel.value = smoothLevel;
      const breathe = 0.5 + 0.5 * Math.sin(u.uTime.value * 0.9);
      u.uAmp.value = 0.008 + 0.008 * breathe + smoothLevel * (0.07 + 0.05 * u.uListen.value) + 0.02 * u.uThink.value;
      u.uTime.value += dt * (1 + 1.6 * u.uThink.value);

      // keep the orb at a fixed fraction of the smaller side
      const f = fillRef.current;
      const vFov = (camera.fov * Math.PI) / 180;
      const tanV = Math.tan(vFov / 2);
      const tanH = tanV * camera.aspect;
      const want = 1 / (f * Math.min(tanV, tanH));
      dist += (want - dist) * Math.min(1, dt * 6);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);

      group.rotation.y += ((pointer.x * 0.35) - group.rotation.y) * dt * 1.5 + dt * 0.04;
      group.rotation.x += ((pointer.y * 0.2) - group.rotation.x) * dt * 1.5;
      rings.forEach((rg, i) => { rg.rotation.z += dt * (0.05 + i * 0.03) * (1 + 2 * u.uThink.value); rg.scale.setScalar(1 + smoothLevel * 0.06 * (i + 1) * u.uListen.value); });
      const pulse = 1 + smoothLevel * 0.05 * (u.uSpeak.value + u.uListen.value);
      sphere.scale.setScalar(pulse);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
      sphere.geometry.dispose();
      halo.geometry.dispose();
      dg.dispose();
      rings.forEach((rg) => rg.geometry.dispose());
      renderer.domElement.remove();
    };
  }, [levelRef]);

  return <div ref={host} className="orb" data-state={state} aria-hidden="true" />;
}
