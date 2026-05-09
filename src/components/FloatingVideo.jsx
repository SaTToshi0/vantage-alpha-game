import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const FloatingVideo = ({ stream, mirrored = false }) => {
  const meshRef = useRef();
  const [video, setVideo] = useState(null);

  useEffect(() => {
    if (!stream) {
      setVideo(null);
      return;
    }

    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.crossOrigin = 'Anonymous';
    vid.playsInline = true;
    vid.muted = true;
    vid.play().catch(e => console.error("FloatingVideo play err:", e));
    
    setVideo(vid);

    return () => {
      vid.pause();
      vid.srcObject = null;
    };
  }, [stream]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Flottement doux
      meshRef.current.position.y = 2 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      // Rotation légère
      meshRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  if (!video) return null;

  return (
    <group>
      {/* Écran flottant */}
      <mesh ref={meshRef} position={[0, 2, 0]} scale={[mirrored ? -1.6 : 1.6, 0.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.9} side={THREE.DoubleSide}>
          <videoTexture attach="map" args={[video]} />
        </meshBasicMaterial>
      </mesh>

      {/* Bordure néon / Support */}
      <mesh position={[0, 2, -0.01]} scale={[1.7, 1, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color="#a8ff3e" 
          emissive="#a8ff3e" 
          emissiveIntensity={2} 
          transparent 
          opacity={0.3} 
        />
      </mesh>
    </group>
  );
};
