import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const FloatingVideo = ({ stream, mirrored = false }) => {
  const meshRef = useRef();
  const [videoMat, setVideoMat] = useState(null);

  useEffect(() => {
    let vid;
    let texture;
    if (!stream) {
      setVideoMat(null);
      return;
    }

    vid = document.createElement('video');
    vid.srcObject = stream;
    vid.crossOrigin = 'Anonymous';
    vid.playsInline = true;
    vid.muted = true;
    
    const handleLoadedData = () => {
      if (!texture) {
        texture = new THREE.VideoTexture(vid);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.colorSpace = THREE.SRGBColorSpace;
        setVideoMat(texture);
      }
    };
    vid.addEventListener('loadeddata', handleLoadedData);
    
    vid.play().catch(e => console.error("FloatingVideo play err:", e));

    return () => {
      setVideoMat(null);
      if (texture) {
        texture.dispose();
      }
      if (vid) {
        vid.pause();
        vid.srcObject = null;
        vid.removeAttribute('src');
        vid.load();
        vid.removeEventListener('loadeddata', handleLoadedData);
      }
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

  if (!videoMat) return null;

  return (
    <group>
      {/* Écran flottant */}
      <mesh ref={meshRef} position={[0, 2, 0]} scale={[mirrored ? -1.6 : 1.6, 0.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial key="floating-vid-mat" map={videoMat} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
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
