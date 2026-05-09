import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useGameStore } from '../store/useGameStore';
import { Mic, MicOff, Wifi } from 'lucide-react';
import * as THREE from 'three';

export const GiantScreen = ({ stream, player, position = [0, 12, -15], rotation = [0, 0, 0], scale = 1, color = '#a8ff3e', mirrored = false }) => {
  const screenRef = useRef();
  const [video, setVideo] = useState(null);

  // Attach stream to a native HTMLVideoElement for WebGL Texture mapping
  useEffect(() => {
    if (stream) {
      const vid = document.createElement('video');
      vid.srcObject = stream;
      vid.crossOrigin = 'Anonymous';
      vid.playsInline = true;
      vid.muted = true;
      vid.play().catch(e => console.error("GiantScreen video play err:", e));
      setVideo(vid);
    } else {
      setVideo(null);
    }
  }, [stream]);

  useFrame(({ clock }) => {
    if (screenRef.current) {
      screenRef.current.position.y = 12 + Math.sin(clock.getElapsedTime() * 0.5) * 0.5;
      screenRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  if (!player?.cameraEnabled && !player?.micEnabled) return null;

  return (
    <group ref={screenRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* Cadre de l'écran avec Texture Vidéo WebGL (ZÉRO LAG) */}
      <mesh castShadow scale={[mirrored ? -1 : 1, 1, 1]}>
        <planeGeometry args={[16, 9]} />
        {video ? (
          <meshBasicMaterial color="#ffffff">
            <videoTexture attach="map" args={[video]} />
          </meshBasicMaterial>
        ) : (
          <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
        )}
      </mesh>

      {/* Bordure Néon */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[16.5, 9.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.3} />
      </mesh>

      {/* Interface HUD allégée */}
      <Html
        transform
        distanceFactor={10}
        position={[0, 0, 0.1]}
        style={{
          width: '1600px',
          height: '900px',
          display: 'flex',
          flexDirection: 'column',
          border: `4px solid ${color}`,
          fontFamily: "'Press Start 2P', monospace",
          color: color,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {/* Overlay Scanlines */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 4px)',
          pointerEvents: 'none',
          zIndex: 10
        }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {!video && (
            <div style={{ fontSize: '80px', opacity: 0.2 }}>NO SIGNAL</div>
          )}
        </div>

        {/* Barre de statut basse */}
        <div style={{
          height: '150px', background: `${color}1A`,
          display: 'flex', alignItems: 'center', padding: '0 50px', gap: '50px',
          borderTop: `2px solid ${color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {player.micEnabled ? <Mic size={60} /> : <MicOff size={60} color="#ff00ff" />}
            <span style={{ fontSize: '30px' }}>{player.micEnabled ? 'VOICE_ON' : 'VOICE_MUTED'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
            <Wifi size={60} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>WIFI_STRENGTH</div>
              <div style={{ width: '100%', height: '15px', background: '#222' }}>
                <div style={{ width: '92%', height: '100%', background: color }} />
              </div>
            </div>
            <span style={{ fontSize: '30px' }}>92%</span>
          </div>

          <div style={{ fontSize: '40px', color: '#ffffff' }}>{player.name ? player.name.toUpperCase() : (player.id?.slice(0, 8) || 'UNKNOWN')}</div>
        </div>
      </Html>

      {/* Lumière émise par l'écran */}
      <pointLight distance={20} intensity={3} color={color} position={[0, 0, 2]} />
    </group>
  );
};
