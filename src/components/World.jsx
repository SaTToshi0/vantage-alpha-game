import { Stars, Sky, Environment, Grid, BakeShadows } from '@react-three/drei';
import { usePlane, useBox } from '@react-three/cannon';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MedievalScenery } from './MedievalScenery';

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
      <MedievalScenery />
    </>
  );
};
