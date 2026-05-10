import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export const GiantScreen = ({ stream, player, position = [0, 12, -15], rotation = [0, 0, 0], scale = 1, color = '#a8ff3e', mirrored = false, isLocal = true }) => {
  const groupRef = useRef();
  const [video, setVideo] = useState(null);
  const floatOffset = useRef(0);

  // Attacher le flux vidéo à un élément HTML natif pour mapping WebGL
  useEffect(() => {
    let vid;
    if (stream) {
      vid = document.createElement('video');
      vid.srcObject = stream;
      vid.crossOrigin = 'Anonymous';
      vid.playsInline = true;
      vid.muted = isLocal;
      vid.play().catch(e => console.error('GiantScreen video play err:', e));
      setVideo(vid);
    } else {
      setVideo(null);
    }
    return () => {
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
    <group ref={groupRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>

      {/* --- VIDÉO PLEIN ÉCRAN --- */}
      {/* Le plan principale : la vidéo occupe TOUT le rectangle 16x9 */}
      <mesh scale={[mirrored ? -1 : 1, 1, 1]}>
        <planeGeometry args={[16, 9]} />
        {video ? (
          <meshBasicMaterial side={THREE.DoubleSide}>
            <videoTexture attach="map" args={[video]} />
          </meshBasicMaterial>
        ) : (
          // Écran éteint : fond sombre + texte NO SIGNAL via HTML léger
          <meshStandardMaterial color="#030308" metalness={1} roughness={0.1} side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* NO SIGNAL overlay quand pas de vidéo */}
      {!video && (
        <Html
          transform
          distanceFactor={10}
          position={[0, 0, 0.05]}
          style={{ width: '1600px', height: '900px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        >
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '60px', color: color, opacity: 0.3 }}>NO SIGNAL</div>
        </Html>
      )}

      {/* Scanlines très légères par-dessus la vidéo */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[16, 9]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* --- BORDURE NÉON --- */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[16.6, 9.6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.35} />
      </mesh>
      {/* Traits fins de bordure */}
      <lineSegments position={[0, 0, 0.03]}>
        <edgesGeometry args={[new THREE.BoxGeometry(16, 9, 0.01)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>

      {/* --- HUD INFO BAR 3D SOUS L'ÉCRAN --- */}
      <group position={[0, -5.2, 0]}>
        {/* Barre de support principale */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[16, 1.2, 0.4]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Bordure de la barre */}
        <lineSegments position={[0, 0, 0.2]}>
          <edgesGeometry args={[new THREE.BoxGeometry(16, 1.2, 0.4)]} />
          <lineBasicMaterial color={color} />
        </lineSegments>

        {/* Statut Mic (Gauche) */}
        <Text
          position={[-7, 0, 0.22]}
          fontSize={0.4}
          color={player?.micEnabled ? color : '#ff00ff'}
          anchorX="left"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff"
        >
          {player?.micEnabled ? 'MIC: ON' : 'MIC: MUTED'}
        </Text>

        {/* Nom du Joueur (Centre) */}
        <Text
          position={[0, 0, 0.22]}
          fontSize={0.5}
          color={color}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff"
        >
          {player?.name ? player.name.toUpperCase() : (player?.id?.slice(0, 8) || 'AGENT')}
        </Text>

        {/* Statut Caméra (Droite) */}
        <Text
          position={[7, 0, 0.22]}
          fontSize={0.4}
          color={player?.cameraEnabled ? color : '#555'}
          anchorX="right"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff"
        >
          {player?.cameraEnabled ? 'CAM: LIVE' : 'CAM: OFF'}
        </Text>
      </group>

      {/* Lumière émise par l'écran */}
      <pointLight distance={18} intensity={2} color={color} position={[0, 0, 1]} />
    </group>
  );
};
