import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Kenney Human sprites: Human_X_Action_Frame.png
// We have 8 skin variants (0-7), Idle (1 frame), Run (0-9 frames)
const SKIN_INDEX = 0; // Default skin variant
const RUN_FRAMES = 10; // Run0 → Run9
const ANIM_FPS = 12;   // Frames per second

// Precompute texture paths for a given skin variant
function getRunPaths(skinIdx) {
  return Array.from({ length: RUN_FRAMES }, (_, i) =>
    `/assets/kenney/Characters/Human/Human_${skinIdx}_Run${i}.png`
  );
}
function getIdlePath(skinIdx) {
  return `/assets/kenney/Characters/Human/Human_${skinIdx}_Idle0.png`;
}

// --- Inner component that loads textures for one skin ---
function SpriteInner({ skinIndex, isMoving }) {
  const meshRef = useRef();
  const clock = useRef(0);
  const frameRef = useRef(0);

  // Load all run frames + idle frame
  const idleTexture = useTexture(getIdlePath(skinIndex));
  const runTextures = useTexture(getRunPaths(skinIndex));

  // Flip: make it face the right direction (sprites usually face right)
  useEffect(() => {
    [idleTexture, ...runTextures].forEach(t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    });
  }, [idleTexture, runTextures]);

  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // 1. Billboard: always face the camera
    meshRef.current.quaternion.copy(camera.quaternion);

    // 2. Animate
    if (isMoving) {
      clock.current += delta;
      frameRef.current = Math.floor(clock.current * ANIM_FPS) % RUN_FRAMES;
      meshRef.current.material.map = runTextures[frameRef.current];
    } else {
      clock.current = 0;
      frameRef.current = 0;
      meshRef.current.material.map = idleTexture;
    }
    meshRef.current.material.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      {/* 1:1 aspect — Kenney sprites are roughly square */}
      <planeGeometry args={[1.2, 1.8]} />
      <meshBasicMaterial
        map={idleTexture}
        transparent
        alphaTest={0.1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// --- Public Component ---
export function SpriteCharacter({ isMoving = false, skinVariant = 0 }) {
  const safeVariant = Math.min(7, Math.max(0, skinVariant));

  return (
    <group>
      <SpriteInner skinIndex={safeVariant} isMoving={isMoving} />
    </group>
  );
}
