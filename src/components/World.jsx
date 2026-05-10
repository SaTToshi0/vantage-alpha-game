import { Stars, Sky, Environment, Grid, BakeShadows } from '@react-three/drei';
import { usePlane, useBox } from '@react-three/cannon';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MedievalScenery } from './MedievalScenery';
import { GiantScreen } from './GiantScreen';
import { useGameStore } from '../store/useGameStore';

// Gestionnaire dynamique des écrans centraux
const ScreenManager = () => {
  const localPlayer = useGameStore(state => state.localPlayer);
  const localStream = useGameStore(state => state.localStream);
  const players = useGameStore(state => state.players);
  const remoteStreams = useGameStore(state => state.remoteStreams);

  // Rassembler tous les joueurs avec une caméra active
  const activeScreens = [];

  if (localPlayer?.cameraEnabled && localStream) {
    activeScreens.push({
      id: 'local',
      isLocal: true,
      player: localPlayer,
      stream: localStream,
      color: '#a8ff3e', // Vert pour le joueur local
      mirrored: true
    });
  }

  Object.values(players || {}).forEach((p) => {
    if (p.cameraEnabled && remoteStreams[p.id]) {
      activeScreens.push({
        id: p.id,
        isLocal: false,
        player: p,
        stream: remoteStreams[p.id],
        color: '#ff00ff', // Rose pour les joueurs distants
        mirrored: false
      });
    }
  });

  if (activeScreens.length === 0) return null;

  // Placement spécifique
  const radius = 15;
  const height = 20; // Bien surelevé
  const screenScale = 0.55; // Plus petit et plus élégant

  // Cas spécial : 2 écrans face à face
  if (activeScreens.length === 2) {
    return (
      <group>
        <GiantScreen 
          key={activeScreens[0].id}
          stream={activeScreens[0].stream}
          player={activeScreens[0].player}
          position={[-radius, height, 0]}
          rotation={[0, Math.PI / 2, 0]} // Fait face à la droite
          scale={screenScale}
          color={activeScreens[0].color}
          mirrored={activeScreens[0].mirrored}
          isLocal={activeScreens[0].isLocal}
        />
        <GiantScreen 
          key={activeScreens[1].id}
          stream={activeScreens[1].stream}
          player={activeScreens[1].player}
          position={[radius, height, 0]}
          rotation={[0, -Math.PI / 2, 0]} // Fait face à la gauche
          scale={screenScale}
          color={activeScreens[1].color}
          mirrored={activeScreens[1].mirrored}
          isLocal={activeScreens[1].isLocal}
        />
      </group>
    );
  }

  // Cas générique (1 écran ou 3+ écrans) en arc
  const angleStep = Math.PI / 6;
  return (
    <group>
      {activeScreens.map((screenData, index) => {
        const angle = (index - (activeScreens.length - 1) / 2) * angleStep;
        const x = Math.sin(angle) * radius;
        const z = -Math.cos(angle) * radius;
        const rotationY = -angle;

        return (
          <GiantScreen 
            key={screenData.id}
            stream={screenData.stream}
            player={screenData.player}
            position={[x, height, z]}
            rotation={[0, rotationY, 0]}
            scale={screenScale}
            color={screenData.color}
            mirrored={screenData.mirrored}
            isLocal={screenData.isLocal}
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
        {/* Base large métallique */}
        <cylinderGeometry args={[6, 7, 0.4, 16]} />
        <meshStandardMaterial color="#0a0b10" metalness={0.9} roughness={0.2} />
      </mesh>
      
      {/* Couche intermédiaire en verre fumé */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[5.5, 6, 0.2, 16]} />
        <meshStandardMaterial color="#11111a" metalness={1} roughness={0.05} transparent opacity={0.8} />
      </mesh>

      {/* Surface de marche détaillée */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[5, 5.5, 0.1, 16]} />
        <meshStandardMaterial color="#050508" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Lignes de circuit (Néon incrusté au sol) */}
      <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.0, 32]} />
        <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={2} />
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
        {/* Anneaux complexes autour du noyau */}
        <mesh ref={coreRing1Ref} rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[0.8, 0.02, 16, 64]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={2} />
        </mesh>
        <mesh ref={coreRing2Ref} rotation={[-Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[1.1, 0.015, 16, 64]} />
          <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={2} />
        </mesh>
        <mesh ref={coreRing3Ref}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#00d8ff" wireframe transparent opacity={0.3} emissive="#00d8ff" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* --- MONOLITHES PÉRIPHÉRIQUES --- */}
      {/* 4 Piliers massifs technologiques */}
      {[
        [-4.8, -4.8], [4.8, -4.8], [-4.8, 4.8], [4.8, 4.8]
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]}>
          {/* Base du pilier */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.2, 1, 1.2]} />
            <meshStandardMaterial color="#050508" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Corps principal biseauté (simulé avec cylindre octogonal) */}
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.4, 0.6, 3, 4]} />
            <meshStandardMaterial color="#11111a" metalness={1} roughness={0.1} />
          </mesh>
          {/* Bande LED montante */}
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.41, 0.61, 3, 4]} />
            <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.5} wireframe transparent opacity={0.5} />
          </mesh>
          {/* Orbe sommital de projection */}
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive={i % 2 === 0 ? "#00d8ff" : "#ff00ff"} emissiveIntensity={3} />
          </mesh>
          {/* Halo holographique */}
          <mesh position={[0, 4.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.6, 16]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#00d8ff" : "#ff00ff"} transparent opacity={0.3} side={2} />
          </mesh>
        </group>
      ))}

      {/* Lumières intégrées à la base pour éclairer les joueurs sans utiliser de pointLight massifs */}
      <rectAreaLight width={5} height={5} color="#00d8ff" intensity={2} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
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
      <Environment preset="night" />

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 20, 10]} intensity={2.5} color="#3498db" />
      <pointLight position={[-10, 20, -10]} intensity={2} color="#e74c3c" />

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
        <meshStandardMaterial color="#020205" roughness={0.9} metalness={0.1} />
      </mesh>

      <LandingBase />
      <ScreenManager />
      {/* <MedievalScenery /> Désactivé pour le style Cyberpunk et pour réduire drastiquement le lag (moins de lumières) */}
    </>
  );
};
