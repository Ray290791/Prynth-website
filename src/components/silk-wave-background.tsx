import { useEffect, useRef } from "react";
import * as THREE from "three";

export function SilkWaveBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    let animId: number | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let ribbonMesh: THREE.Mesh | null = null;
    let geom: THREE.PlaneGeometry | null = null;
    let mat: THREE.MeshBasicMaterial | null = null;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 7);

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Plane geometry spanning full screen
      geom = new THREE.PlaneGeometry(24, 15, 76, 56);
      mat = new THREE.MeshBasicMaterial({
        color: 0x00d4c3,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });

      ribbonMesh = new THREE.Mesh(geom, mat);
      ribbonMesh.rotation.x = -Math.PI / 3.8;
      scene.add(ribbonMesh);

      let mouseX = 0;
      let mouseY = 0;
      let targetMouseX = 0;
      let targetMouseY = 0;

      const onMouseMove = (e: MouseEvent) => {
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener("mousemove", onMouseMove, { passive: true });

      const onResize = () => {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      const pos = geom.attributes.position;
      const count = pos.count;
      const origZ = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        origZ[i] = pos.getZ(i);
      }

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime() * 1.5;

        // Smooth cursor interpolation
        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;

        for (let i = 0; i < count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const wave = Math.sin(u * 0.45 + time) * 0.5 + Math.cos(v * 0.55 + time) * 0.4;
          const dist = Math.hypot(u - mouseX * 10, v - mouseY * 6);
          const cursorRipple = Math.sin(dist * 1.2 - time * 2) * Math.exp(-dist * 0.22) * 0.95;
          pos.setZ(i, origZ[i] + wave + cursorRipple);
        }
        pos.needsUpdate = true;

        if (ribbonMesh) {
          ribbonMesh.rotation.z = mouseX * 0.1;
        }

        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      return () => {
        if (animId !== null) cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        if (geom) geom.dispose();
        if (mat) mat.dispose();
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
        }
      };
    } catch (err) {
      console.error("Three.js Silk Wave error:", err);
    }
  }, []);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}>
      {/* Three.js Silk Wave Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-75" />
      {/* Soft Vignette Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0c0e12]/25 to-[#0c0e12]" />
    </div>
  );
}
