import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import * as THREE from "three";

export function ModelViewer({ file }: { file: File }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let url = "";
    try {
      url = URL.createObjectURL(file);
      const loader = new STLLoader();
      loader.load(
        url,
        (geo) => {
          setGeometry(geo);
          setError(false);
        },
        undefined,
        (err) => {
          console.error("Failed to load STL", err);
          setError(true);
        }
      );
    } catch {
      setError(true);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  if (error) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">
        Preview not available for this file
      </div>
    );
  }

  if (!geometry) {
    return (
      <div className="flex h-64 w-full animate-pulse items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">
        Loading 3D preview...
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl bg-surface-2 shadow-inner">
      <Canvas camera={{ position: [0, 0, 100], fov: 50 }}>
        <color attach="background" args={["#161616"]} />
        <ambientLight intensity={1.5} />
        <spotLight position={[100, 100, 100]} angle={0.15} penumbra={1} intensity={2} />
        
        <Center>
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#3ddc84" roughness={0.4} metalness={0.1} />
          </mesh>
        </Center>
        
        <OrbitControls makeDefault autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}
