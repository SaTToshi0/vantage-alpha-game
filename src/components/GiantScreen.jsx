import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mic, MicOff } from 'lucide-react';

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
          <meshBasicMaterial>
            <videoTexture attach="map" args={[video]} />
          </meshBasicMaterial>
        ) : (
          // Écran éteint : fond sombre + texte NO SIGNAL via HTML léger
          <meshStandardMaterial color="#030308" metalness={1} roughness={0.1} />
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
        <edgesGeometry args={[new (require('three').BoxGeometry)(16, 9, 0.01)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>

      {/* --- HUD INFO BAR EN DESSOUS DE L'ÉCRAN --- */}
      <Html
        transform
        distanceFactor={10}
        position={[0, -5.2, 0]}
        style={{
          width: '1600px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          gap: '40px',
          background: `rgba(0,0,0,0.85)`,
          border: `2px solid ${color}`,
          fontFamily: "'Press Start 2P', monospace",
          color: color,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Mic status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          {player.micEnabled
            ? <Mic size={40} color={color} />
            : <MicOff size={40} color='#ff00ff' />}
          <span style={{ fontSize: '22px', color: player.micEnabled ? color : '#ff00ff' }}>
            {player.micEnabled ? 'ON' : 'MUTED'}
          </span>
        </div>

        {/* Ligne de séparation */}
        <div style={{ width: '2px', height: '60px', background: `${color}55`, flexShrink: 0 }} />

        {/* Nom du joueur */}
        <div style={{ flex: 1, fontSize: '32px', letterSpacing: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name ? player.name.toUpperCase() : (player.id?.slice(0, 8) || 'AGENT')}
        </div>

        {/* Indicateur cam */}
        <div style={{ fontSize: '22px', color: player.cameraEnabled ? color : '#555', flexShrink: 0 }}>
          {player.cameraEnabled ? '📷 CAM LIVE' : '📷 CAM OFF'}
        </div>
      </Html>

      {/* Lumière émise par l'écran */}
      <pointLight distance={18} intensity={2} color={color} position={[0, 0, 1]} />
    </group>
  );
};
