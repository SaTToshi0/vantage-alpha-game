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
  const height = 16; // Plus de hauteur
  const screenScale = 0.7; // Plus petit

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
          />
        );
      })}
    </group>
  );
};

// Base d'atterrissage — version complète et animée
const LandingBase = () => {
  const [ref] = useBox(() => ({
    mass: 0, type: 'Static',
    position: [0, 0.2, 0],
    args: [10, 0.4, 10],
  }));

  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const beamRef  = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) ring1Ref.current.rotation.z =  t * 0.8;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.5;
    if (beamRef.current)  beamRef.current.material.opacity = 0.15 + Math.sin(t * 2) * 0.05;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Plateforme principale */}
      <mesh ref={ref} position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[5, 5.5, 0.4, 8]} />
        <meshStandardMaterial color="#05050a" metalness={1} roughness={0.05} />
      </mesh>

      {/* Anneaux Tech rotatifs */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={ring1Ref}>
          <ringGeometry args={[3.8, 4, 32, 1, 0, Math.PI * 1.5]} />
          <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={3} side={2} />
        </group>
        <group ref={ring2Ref}>
          <ringGeometry args={[3.2, 3.4, 32, 1, Math.PI / 2, Math.PI * 1.2]} />
          <meshStandardMaterial color="#ff8c42" emissive="#ff8c42" emissiveIntensity={3} side={2} />
        </group>
      </mesh>

      {/* Motif géométrique interne */}
      <mesh position={[0, 0.405, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 4.8, 8]} />
        <meshStandardMaterial color="#00d8ff" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Centre violet */}
      <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#9b59b6" emissive="#5e35b1" emissiveIntensity={1} />
      </mesh>

      {/* Rayon holographique vertical */}
      <mesh ref={beamRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 10, 32, 1, true]} />
        <meshStandardMaterial color="#9b59b6" emissive="#9b59b6" emissiveIntensity={2}
          transparent opacity={0.2} depthWrite={false} blending={2} />
      </mesh>

      {/* 4 Piliers avec orbes */}
      {[[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].map(([x, z], i) => (
        <group key={i} position={[x, 1, z]}>
          <mesh castShadow position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 1.2, 8]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={4} />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.03, 8, 32]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.1} />
          </mesh>
          <pointLight color="#00d8ff" intensity={2} distance={15} position={[0, 1, 0]} />
        </group>
      ))}
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
      <BakeShadows />
      <Sky sunPosition={[100, 10, 100]} inclination={0} azimuth={0.25} />
      <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" />

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 20, 10]} intensity={2.5} color="#3498db" />
      <pointLight position={[-10, 20, -10]} intensity={2} color="#e74c3c" />

      <Grid
        infiniteGrid
        fadeDistance={80}
        fadeStrength={5}
        cellSize={1}
        sectionSize={10}
        sectionColor="#333"
        cellColor="#1a1a1a"
        position={[0, 0.01, 0]}
      />

      <mesh ref={groundRef} receiveShadow frustumCulled={false}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a1f3c" roughness={0.8} metalness={0.2} />
      </mesh>

      <LandingBase />
      <ScreenManager />
      <MedievalScenery />
    </>
  );
};
