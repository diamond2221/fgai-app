import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./inspiration-sphere.css";
import { bundledInspirationCover } from "@/lib/inspiration-cover";

export type SphereEntry = { id: string; title: string; cover: string; sourceName?: string };
export function InspirationSphere({ items, onSelect, compact = false }: { items: SphereEntry[]; onSelect: (item: SphereEntry) => void; compact?: boolean }) {
    const host = useRef<HTMLDivElement>(null);
    const select = useRef(onSelect);
    select.current = onSelect;
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState<SphereEntry>();
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    pausedRef.current = paused;
    const available = items.filter((item) => item.cover).map((item) => ({ ...item, cover: bundledInspirationCover(item.cover, import.meta.env.BASE_URL) }));
    const bundled = available.filter((item) => !item.cover.startsWith("https:"));
    // Prefer the locally shipped selection for a dependable first view; smaller or personal
    // collections can still use their external covers through the authenticated proxy.
    const entries = (bundled.length >= 8 ? bundled : available).slice(0, 72);
    const key = entries.map((item) => item.id + item.cover).join("|");
    useEffect(() => {
        const element = host.current;
        if (!element || !entries.length) return;
        setFailed(false);
        setActive(undefined);
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        } catch {
            setFailed(true);
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        element.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
        camera.position.set(0, 0, 8.8);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.075;
        controls.enablePan = false;
        controls.minDistance = 0.4;
        controls.maxDistance = 17;
        controls.rotateSpeed = 0.4;
        controls.zoomSpeed = 0.65;
        // Scrolling moves from an external globe into its interior; double-sided cards remain visible inside.
        controls.autoRotateSpeed = 0.25;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const group = new THREE.Group();
        scene.add(group);
        const geometry = new THREE.PlaneGeometry(2.0, 1.45);
        const textures: THREE.Texture[] = [],
            materials: THREE.MeshBasicMaterial[] = [];
        const cards: THREE.Mesh[] = [];
        const loader = new THREE.TextureLoader();
        let disposed = false,
            visible = true;
        let settled = 0, loaded = 0;
        const center = new THREE.Vector3();
        entries.forEach((item, index) => {
            const y = 1 - (2 * (index + 0.5)) / entries.length,
                ring = Math.sqrt(1 - y * y),
                angle = index * Math.PI * (3 - Math.sqrt(5));
            const material = new THREE.MeshBasicMaterial({ color: "#dfe1d8", side: THREE.DoubleSide });
            materials.push(material);
            const card = new THREE.Mesh(geometry, material);
            card.visible = false;
            card.position.set(Math.cos(angle) * ring * 5.2, y * 5.2, Math.sin(angle) * ring * 5.2);
            card.lookAt(center);
            card.userData.item = item;
            group.add(card);
            cards.push(card);
            // Use the existing authenticated media proxy for remote textures, never a cross-origin canvas.
            const url = item.cover.startsWith("https:") ? `/api/creator/prompt-image?url=${encodeURIComponent(item.cover)}` : item.cover;
            loader.load(
                url,
                (texture) => {
                    if (disposed) {
                        texture.dispose();
                        return;
                    }
                    texture.colorSpace = THREE.SRGBColorSpace;
                    textures.push(texture);
                    material.map = texture;
                    material.color.set("white");
                    material.needsUpdate = true;
                    card.visible = true; settled++; loaded++;
                    const image = texture.image as { width: number; height: number };
                    if (image.width && image.height) card.scale.x = Math.min(1.7, Math.max(0.5, image.width / image.height / (2.0 / 1.45)));
                },
                undefined,
                () => {
                    if(disposed)return;
                    settled++;
                    card.visible = false;
                    if (settled === entries.length && loaded === 0) setFailed(true);
                },
            );
        });
        const resize = new ResizeObserver(() => {
            const { width, height } = element.getBoundingClientRect();
            if (!width || !height) return;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
        resize.observe(element);
        const visibility = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
        });
        visibility.observe(element);
        const ray = new THREE.Raycaster(),
            point = new THREE.Vector2();
        let down = { x: 0, y: 0 };
        const pick = (event: PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            point.set(((event.clientX - rect.left) / rect.width) * 2 - 1, (-(event.clientY - rect.top) / rect.height) * 2 + 1);
            ray.setFromCamera(point, camera);
            return ray.intersectObjects(cards.filter((card) => card.visible))[0]?.object.userData.item as SphereEntry | undefined;
        };
        const move = (event: PointerEvent) => {
            const item = pick(event);
            setActive(item);
            renderer.domElement.style.cursor = item ? "pointer" : "grab";
        };
        const start = (event: PointerEvent) => {
            down = { x: event.clientX, y: event.clientY };
        };
        const end = (event: PointerEvent) => {
            if (Math.hypot(event.clientX - down.x, event.clientY - down.y) < 5) {
                const item = pick(event);
                if (item) select.current(item);
            }
        };
        const contextLost = (event: Event) => {
            event.preventDefault();
            setFailed(true);
        };
        renderer.domElement.addEventListener("pointermove", move);
        renderer.domElement.addEventListener("pointerdown", start);
        renderer.domElement.addEventListener("pointerup", end);
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        renderer.setAnimationLoop(() => {
            if (!visible || document.hidden) return;
            controls.autoRotate = !reduced.matches && !pausedRef.current;
            controls.update();
            renderer.render(scene, camera);
        });
        return () => {
            disposed = true;
            renderer.setAnimationLoop(null);
            resize.disconnect();
            visibility.disconnect();
            controls.dispose();
            geometry.dispose();
            textures.forEach((texture) => texture.dispose());
            materials.forEach((material) => material.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
        // Stable identity keys prevent recreation while hover titles change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return (
        <section className={`fg-sphere ${compact ? "is-compact" : ""}`} aria-label="灵感星球">
            <div className="fg-sphere-heading">
                <span>FG / INSPIRATION ORBIT</span>
                <h2>进入画面的另一面。</h2>
                <p>拖动环顾 · 滚轮进入星球 · 点击作品查看提示词</p>
            </div>
            <div ref={host} className="fg-sphere-stage" style={{display: failed || !entries.length ? "none" : undefined}} />
            {failed || !entries.length ? <div className="fg-sphere-fallback">{failed ? "当前设备暂时无法显示星球视图，可在下方浏览作品。" : "当前筛选没有可展示的图片，试试其他分类。"}</div> : null}
            <div className="fg-sphere-caption" aria-live="polite">
                {active ? (
                    <>
                        <strong>{active.title}</strong>
                        <span>{active.sourceName}</span>
                    </>
                ) : (
                    <>
                        <strong>每个画面，都是一个起点</strong>
                        <span>{entries.length} 个精选画面</span>
                    </>
                )}
            </div>
            <Button className="fg-sphere-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
                {paused ? "继续旋转" : "暂停旋转"}
            </Button>
            <details className="fg-sphere-accessible">
                <summary>按作品名称浏览</summary>
                <div>
                    {entries.map((item) => (
                        <button key={item.id} onClick={() => onSelect(item)}>
                            {item.title}
                        </button>
                    ))}
                </div>
            </details>
        </section>
    );
}
