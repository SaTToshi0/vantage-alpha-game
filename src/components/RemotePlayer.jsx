import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Vector3, Euler } from 'three';

// ========== CONSTANTES ==========
const POSITION_LERP = 0.15;
const ROTATION_LERP = 0.1;
const VERY_FAR_DISTANCE = 150; 
const FAR_DISTANCE = 80;       

export const RemotePlayer = ({ id, position, rotation }) => {
  const groupRef = useRef();
  
  const targetPosition = useRef(new Vector3(...(Array.isArray(position) ? position : [0, 0, 0])));
  const targetRotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const distanceToCamera = useRef(0);
  
  const [shouldRender, setShouldRender] = useState(true);
  const [isLowQuality, setIsLowQuality] = useState(false);

  // Mettre à jour les cibles quand les props changent
  if (Array.isArray(position)) {
    targetPosition.current.set(...position);
  }
  if (Array.isArray(rotation) && rotation.length >= 2) {
    targetRotation.current.set(rotation[0], rotation[1], rotation[2] || 0, 'YXZ');
  }

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    // ========== 1. CALCULER DISTANCE À LA CAMÉRA ==========
    const dist = camera.position.distanceTo(groupRef.current.position);
    distanceToCamera.current = dist;

    // ========== 2. FRUSTUM CULLING ==========
    const newShouldRender = dist <= VERY_FAR_DISTANCE;
    if (newShouldRender !== shouldRender) setShouldRender(newShouldRender);
    
    if (!newShouldRender) return;

    // ========== 3. LEVEL OF DETAIL ==========
    const newIsLowQuality = dist > FAR_DISTANCE;
    if (newIsLowQuality !== isLowQuality) {
      setIsLowQuality(newIsLowQuality);
    }

    // ========== 4. INTERPOLATION DE POSITION ==========
    groupRef.current.position.lerp(targetPosition.current, POSITION_LERP);

    // ========== 5. INTERPOLATION DE ROTATION ==========
    let rotDiff = targetRotation.current.y - groupRef.current.rotation.y;
    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    groupRef.current.rotation.y += rotDiff * ROTATION_LERP;
  });

  if (!shouldRender) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* CORPS (Sphère Orange) */}
      <mesh castShadow>
        {isLowQuality ? (
          <sphereGeometry args={[0.5, 16, 16]} />
        ) : (
          <sphereGeometry args={[0.5, 32, 32]} />
        )}
        <meshStandardMaterial
          color="#f39c12"
          emissive="#f39c12"
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* ANNEAU AUTOUR (Orange) */}
      {!isLowQuality && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.05, 16, 100]} />
          <meshStandardMaterial
            color="#f39c12"
            emissive="#f39c12"
            emissiveIntensity={4}
            metalness={1}
            roughness={0}
            transparent
            opacity={1}
          />
        </mesh>
      )}

      {/* SAC À DOS (Blanc, comme vous) */}
      <mesh position={[0, 0, -0.6]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
      </mesh>

      {/* DISQUE AU SOL (Vert, comme vous) */}
      {!isLowQuality && (
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={2}
            transparent
            opacity={1}
          />
        </mesh>
      )}
    </group>
  );
};
