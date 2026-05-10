import { Stars, Sky, Environment, Grid, BakeShadows, Sparkles } from '@react-three/drei';
import { usePlane, useBox } from '@react-three/cannon';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MedievalScenery } from './MedievalScenery';
import { GiantScreen } from './GiantScreen';
import { useGameStore } from '../store/useGameStore';
import { MapEditor } from './MapEditor';

// Gestionnaire unifié des écrans (Webcams + Partages d'écran physiques)
const NexusScreensManager = () => {
  const players = useGameStore(state => state.players);
  const localPlayer = useGameStore(state => state.localPlayer);
  const screens = useGameStore(state => state.screens);
  const streamsById = useGameStore(state => state.streamsById);
  const localScreenStream = useGameStore(state => state.localScreenStream);
  const localStream = useGameStore(state => state.localStream);

  if (screens.length === 0) return null;

  return (
    <group>
      {screens.map((s) => {
        // Déterminer la source du flux (webcam ou screen share, local ou distant)
        let stream = streamsById[s.streamId];
        let isLocal = false;
        
        if (s.streamId === localScreenStream?.id) {
          stream = localScreenStream;
          isLocal = true;
        } else if (s.streamId === localStream?.id) {
          stream = localStream;
          isLocal = true;
        }

        const isShare = s.id.startsWith('share-');
        const color = isShare ? '#00d8ff' : (isLocal ? '#a8ff3e' : '#ff00ff');
        const scale = isShare ? 2.4 : 1.8;
        
        // Faux objet joueur pour transmettre l'UI du GiantScreen
        const owner = players[s.ownerId] || (isLocal ? localPlayer : null);
        const name = isShare 
          ? (owner?.name ? `${owner.name} SHARE` : 'SCREEN SHARE')
          : (owner?.name || 'WEBCAM');

        return (
          <GiantScreen 
            key={s.id}
            id={s.id}
            stream={stream}
            player={{ name, id: s.ownerId, cameraEnabled: true }}
            position={s.position}
            rotation={s.rotation}
            scale={scale} 
            color={color}
            mirrored={!isShare && isLocal} // On miroir sa propre webcam, mais pas son propre écran
            isLocal={isLocal}
          />
        );
      })}
    </group>
  );
};

// Base d'atterrissage — Nexus Cyberpunk Haut de Gamme
const LandingBase = () => {
  // Zone de collision principale
  const [ref] = useBox(() => ({
    mass: 0, type: 'Static',
    position: [0, 0.5, 0], // Rehaussé légèrement pour correspondre au visuel
    args: [12, 1, 12],
  }));

  const coreRing1Ref = useRef();
  const coreRing2Ref = useRef();
  const coreRing3Ref = useRef();
  const dataStreamRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRing1Ref.current) {
      coreRing1Ref.current.rotation.z = t * 0.5;
      coreRing1Ref.current.position.y = 0.5 + Math.sin(t * 2) * 0.1;
    }
    if (coreRing2Ref.current) {
      coreRing2Ref.current.rotation.z = -t * 0.8;
      coreRing2Ref.current.position.y = 0.5 + Math.cos(t * 1.5) * 0.1;
    }
    if (coreRing3Ref.current) {
      coreRing3Ref.current.rotation.x = t * 1;
      coreRing3Ref.current.rotation.y = t * 1.2;
    }
    if (dataStreamRef.current) {
      // Effet de flux de données montant
      dataStreamRef.current.material.opacity = 0.1 + Math.sin(t * 5) * 0.05;
      dataStreamRef.current.rotation.y = t * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* --- PLATEFORME PRINCIPALE --- */}
      <mesh ref={ref} position={[0, 0.1, 0]} receiveShadow>
        {/* Base large en cristal blanc poli - Géométrie allégée */}
        <cylinderGeometry args={[6, 7, 0.4, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.2} />
      </mesh>
      
      {/* Couche intermédiaire en verre prismatique cyan (OPTIMISÉE ZÉRO LAG) */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[5.5, 6, 0.2, 24]} />
        <meshStandardMaterial 
          color="#00d8ff" 
          transparent={true}
          opacity={0.3} 
          metalness={0.5} 
          roughness={0.1} 
          emissive="#00d8ff"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Surface de marche : Miroir profond */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[5, 5.5, 0.1, 24]} />
        <meshStandardMaterial color="#050a15" metalness={0.8} roughness={0.1} />
      </mesh>

      {/* Lignes de circuit (Néon incrusté au sol) */}
      <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.0, 24]} />
        <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.9, 16]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.5} />
      </mesh>

      {/* --- NOYAU CENTRAL HOLOGRAPHIQUE --- */}
      {/* Pilier de données central */}
      <mesh ref={dataStreamRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 10, 16, 1, true]} />
        <meshStandardMaterial 
          color="#00d8ff" 
          emissive="#00d8ff" 
          emissiveIntensity={3}
          transparent 
          opacity={0.15} 
          wireframe 
          depthWrite={false} 
          blending={2} 
        />
      </mesh>

      {/* Cœur énergétique flottant */}
      <group position={[0, 1.5, 0]}>
        <mesh>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#ffffff" emissive="#00d8ff" emissiveIntensity={4} />
        </mesh>
        {/* Anneaux complexes autour du noyau (Géométrie allégée) */}
        <mesh ref={coreRing1Ref} rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[0.8, 0.02, 8, 32]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={3} />
        </mesh>
        <mesh ref={coreRing2Ref} rotation={[-Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[1.1, 0.015, 8, 32]} />
          <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={3} />
        </mesh>
        <mesh ref={coreRing3Ref}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#00d8ff" wireframe transparent opacity={0.5} emissive="#00d8ff" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* --- MONOLITHES PÉRIPHÉRIQUES (Cristaux lévitants) --- */}
      {[
        [-4.8, -4.8], [4.8, -4.8], [-4.8, 4.8], [4.8, 4.8]
      ].map(([x, z], i) => (
        <group key={i} position={[x, 1.5, z]}>
          {/* Base lévitante */}
          <mesh position={[0, 0, 0]}>
            <octahedronGeometry args={[0.5]} />
            <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.1} />
          </mesh>
          
          {/* Cristal principal (OPTIMISÉ ZÉRO LAG) */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.1, 0.5, 4, 6]} />
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#00d8ff" : "#ff00ff"} 
              transparent={true} 
              opacity={0.6} 
              metalness={0.5} 
              roughness={0.2}
              emissive={i % 2 === 0 ? "#00d8ff" : "#ff00ff"}
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Halo holographique tournant */}
          <mesh position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.6, 0.02, 8, 24]} />
            <meshStandardMaterial color="#ffffff" emissive={i % 2 === 0 ? "#00d8ff" : "#ff00ff"} emissiveIntensity={3} />
          </mesh>
        </group>
      ))}

      {/* Lumières intégrées à la base */}
      <pointLight color="#00d8ff" intensity={2} position={[0, 2, 0]} distance={10} />
    </group>
  );
};

export const World = () => {
  const [groundRef] = usePlane(() => ({
    mass: 0,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <>
      <Sky sunPosition={[100, 10, 100]} inclination={0} azimuth={0.25} />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
      {/* Désactivé car peut causer des écrans noirs si le chargement échoue */}
      {/* <Environment preset="night" /> */}

      <ambientLight intensity={1.5} />
      <pointLight position={[10, 20, 10]} intensity={50} color="#00d8ff" />
      <pointLight position={[-10, 20, -10]} intensity={50} color="#ff00ff" />
      <directionalLight position={[5, 10, 5]} intensity={2} castShadow />

      <Grid
        infiniteGrid
        fadeDistance={150}
        fadeStrength={2}
        cellSize={1}
        sectionSize={10}
        sectionColor="#00d8ff" // Cyberpunk Cyan
        cellColor="#9b59b6" // Deep Violet
        position={[0, 0.01, 0]}
      />

      <mesh ref={groundRef} receiveShadow frustumCulled={false}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.2} />
      </mesh>

      <LandingBase />
      <NexusScreensManager />
      {/* ── ÉDITEUR DE MAP ── */}
      <MapEditor />
      {/* <MedievalScenery /> Désactivé pour le style Cyberpunk et pour réduire drastiquement le lag (moins de lumières) */}
    </>
  );
};
