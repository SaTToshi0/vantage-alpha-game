import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Composant pour afficher du texte en 3D via une texture Canvas ultra rapide
const CanvasText = ({ text, color, fontSize = 60, position, scale = 1 }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
  }, [text, color, fontSize]);

  return (
    <mesh position={position} scale={[10 * scale, 1.25 * scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const GiantScreen = ({ stream, player, position = [0, 12, -15], rotation = [0, 0, 0], scale = 1, color = '#a8ff3e', mirrored = false, isLocal = true, id }) => {
  const groupRef = useRef();
  const [videoMat, setVideoMat] = useState(null);

  // Attacher le flux vidéo à un élément HTML natif pour mapping WebGL
  useEffect(() => {
    let vid;
    let texture;
    if (stream) {
      vid = document.createElement('video');
      vid.srcObject = stream;
      vid.crossOrigin = 'Anonymous';
      vid.playsInline = true;
      vid.muted = true; // DOIT être muted pour autoplay sur Chrome/Safari
      vid.autoplay = true;
      
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
      vid.play().catch(e => console.error('GiantScreen video play err:', e));
    } else {
      setVideoMat(null);
    }
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
      }
    };
  }, [stream, isLocal]);

  // Animation de flottement légère — relative à la position initiale
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
    }
  });

  if (!player?.cameraEnabled && !player?.micEnabled) return null;

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation} 
      scale={[scale, scale, scale]}
      userData={{ type: 'interactable-screen', id, ownerId: player?.id }}
    >

      {/* --- VIDÉO PLEIN ÉCRAN --- */}
      {/* Le plan principale : la vidéo occupe TOUT le rectangle 16x9 */}
      <mesh scale={[mirrored ? -1 : 1, 1, 1]}>
        <planeGeometry args={[16, 9]} />
        {videoMat ? (
          <meshBasicMaterial key="vid-mat" map={videoMat} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshBasicMaterial key="no-vid-mat" color="#030308" side={THREE.DoubleSide} toneMapped={false} />
        )}
      </mesh>

      {/* NO SIGNAL overlay quand pas de vidéo (ZÉRO LAG via CanvasText) */}
      {!videoMat && (
        <CanvasText
          position={[0, 0, 0.05]}
          text="AWAITING SIGNAL..."
          color={color}
          fontSize={60}
          scale={1.5}
        />
      )}

      {/* Scanlines très légères par-dessus la vidéo */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[16, 9]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* --- BORDURE NÉON HOLOGRAPHIQUE --- */}
      {/* Lueur de fond douce */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[16.8, 9.8]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      
      {/* Lignes fines lumineuses externes */}
      <lineSegments position={[0, 0, 0.03]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(16.2, 9.2)]} />
        <lineBasicMaterial color={color} transparent opacity={0.8} />
      </lineSegments>
      <lineSegments position={[0, 0, 0.04]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(16.5, 9.5)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </lineSegments>

      {/* --- HUD INFO BAR 3D MAGIQUE (AU DESSUS DE L'ÉCRAN) --- */}
      <group position={[0, 5.8, 0]}>
        
        {/* Barre de verre holographique */}
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[16.5, 1.4, 0.2]} />
          <meshPhysicalMaterial 
            color={color} 
            transmission={0.9} 
            opacity={1} 
            metalness={0.1} 
            roughness={0.2} 
            ior={1.5} 
            thickness={2} 
            transparent 
          />
        </mesh>

        {/* Aura lumineuse douce derrière la barre */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[17, 1.8]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Cadre ultra fin tech */}
        <lineSegments position={[0, 0, 0.21]}>
          <edgesGeometry args={[new THREE.BoxGeometry(16.5, 1.4, 0.2)]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </lineSegments>

        {/* Statut Mic (Gauche) */}
        <CanvasText
          position={[-6, 0, 0.22]}
          text={player?.micEnabled ? 'MIC: ON' : 'MIC: MUTED'}
          color={player?.micEnabled ? color : '#ff00ff'}
          fontSize={60}
          scale={0.5}
        />

        {/* Nom du Joueur (Centre) */}
        <CanvasText
          position={[0, 0, 0.22]}
          text={player?.name ? player.name.toUpperCase() : (player?.id?.slice(0, 8) || 'AGENT')}
          color={color}
          fontSize={80}
          scale={0.8}
        />

        {/* Statut Caméra (Droite) */}
        <CanvasText
          position={[6, 0, 0.22]}
          text={player?.cameraEnabled ? 'CAM: LIVE' : 'CAM: OFF'}
          color={player?.cameraEnabled ? color : '#555'}
          fontSize={60}
          scale={0.5}
        />
      </group>

      {/* Lumière émise par l'écran */}
      <pointLight distance={18} intensity={2} color={color} position={[0, 0, 1]} />
    </group>
  );
};
