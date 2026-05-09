import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';

export const NPC = ({ position, name, message, color = "#00d8ff" }) => {
  const meshRef = useRef();
  const { camera } = useThree();
  const [isNear, setIsNear] = useState(false);
  
  // L'NPC est une position fixe
  const npcPos = new Vector3(...position);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Animation de lévitation
    const time = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.2;
    meshRef.current.rotation.y = time * 0.5;

    // Détection de proximité (la caméra est à ~3m du joueur)
    const distance = camera.position.distanceTo(npcPos);
    const near = distance < 6; // Si la caméra est à moins de 6m, le joueur est très proche
    
    if (near !== isNear) {
      setIsNear(near);
    }
  });

  return (
    <group position={position}>
      {/* Modèle visuel de l'NPC (Drone / Hologramme) */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} wireframe />
        
        {/* Orbe central */}
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
        </mesh>
      </mesh>

      {/* Lumière très faible pour le drone */}
      <pointLight color={color} intensity={0.5} distance={3} />

      {/* Bulle de Dialogue (HTML) */}
      {isNear && (
        <Html position={[0, 1.5, 0]} center>
          <div style={{
            background: 'rgba(0, 20, 40, 0.8)',
            border: `1px solid ${color}`,
            borderRadius: '8px',
            padding: '10px 15px',
            color: '#fff',
            fontFamily: 'Outfit, sans-serif',
            width: '200px',
            textAlign: 'center',
            boxShadow: `0 0 15px ${color}88`,
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}>
            <strong style={{ color: color, display: 'block', marginBottom: '5px' }}>{name}</strong>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{message}</p>
          </div>
        </Html>
      )}
    </group>
  );
};
