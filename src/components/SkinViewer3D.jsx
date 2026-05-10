import { useRef, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFBX, useTexture, OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

const CYAN = '#00d8ff';
const GREEN = '#a8ff3e';
const PINK = '#ff00ff';

// ── Le modèle 3D réel du personnage ──
const CharacterModel = ({ skin }) => {
  const groupRef = useRef();
  const materialsRef = useRef([]);

  const fbxMesh = useFBX('/assets/kenney/characterMedium.fbx');
  const texture = useTexture(`/assets/kenney/${skin}.png`);

  const clone = useMemo(() => {
    if (!fbxMesh) return null;
    const c = SkeletonUtils.clone(fbxMesh);
    c.scale.setScalar(0.013);
    c.position.set(0, -1, 0); // Parfaitement centré verticalement (hips au centre)

    materialsRef.current = [];

    c.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        const tex = texture.clone();
        tex.flipY = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        let mat = Array.isArray(child.material) ? child.material[0] : child.material;
        mat = mat.clone();
        child.material = mat;

        mat.map = tex;
        mat.side = THREE.DoubleSide;
        mat.emissiveMap = tex;
        mat.emissive = new THREE.Color(CYAN);
        mat.emissiveIntensity = 0.05; // Réduit pour laisser les lumières donner de la profondeur
        mat.metalness = 0.4;
        mat.roughness = 0.7; // Plus de roughness pour mieux voir les volumes
        mat.envMapIntensity = 1;
        mat.needsUpdate = true;
        materialsRef.current.push(mat);

        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.isBone) {
        child.userData.originalQuaternion = child.quaternion.clone();
      }
    });

    return c;
  }, [fbxMesh, texture]);

  // Animation idle douce : léger flottement + rotation automatique lente
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.04;
    }
    // Pulse émissif subtil
    materialsRef.current.forEach((mat) => {
      mat.emissiveIntensity = 0.12 + Math.sin(t * 2) * 0.06;
    });
  });

  return (
    <group ref={groupRef}>
      {clone && <primitive object={clone} />}
    </group>
  );
};

// ── Plateforme holographique sous le perso ──
const HoloPlatform = () => {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) ringRef.current.rotation.y = t * 0.8;
  });
  return (
    <group position={[0, -2, 0]}>
      {/* Disque principal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#050a10" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Anneau externe néon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.88, 0.92, 32]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.8} />
      </mesh>
      {/* Anneau interne rose */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.52, 32]} />
        <meshBasicMaterial color={PINK} transparent opacity={0.6} />
      </mesh>
      {/* Anneau tournant */}
      <group ref={ringRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.68, 0.7, 32]} />
          <meshBasicMaterial color={GREEN} transparent opacity={0.5} />
        </mesh>
      </group>
      {/* Lumière holographique */}
      <pointLight color={CYAN} intensity={1.5} distance={3} position={[0, 0.5, 0]} />
    </group>
  );
};

// ── Fallback pendant le chargement ──
const LoadingFallback = () => {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 2;
  });
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <octahedronGeometry args={[0.4]} />
      <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={2} wireframe />
    </mesh>
  );
};

// ── Composant principal exporté ──
export const SkinViewer3D = ({ skin = 'criminalMaleA' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        height: '320px',
        position: 'relative',
        background: 'linear-gradient(180deg, #020810 0%, #040d1a 60%, #030508 100%)',
        overflow: 'hidden',
        cursor: isHovered ? 'grab' : 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Grille holographique en fond (CSS pur, zéro lag) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,216,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,216,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      {/* Effets de coin lumineux */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 40, height: 40, pointerEvents: 'none',
        background: `radial-gradient(circle at 0% 0%, ${CYAN}33 0%, transparent 70%)`
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, pointerEvents: 'none',
        background: `radial-gradient(circle at 100% 100%, ${PINK}33 0%, transparent 70%)`
      }} />

      {/* Badge interaction */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '0.22rem',
        color: isHovered ? GREEN : `${CYAN}88`,
        background: 'rgba(0,0,0,0.6)',
        padding: '3px 8px',
        border: `1px solid ${isHovered ? GREEN : CYAN}44`,
        pointerEvents: 'none',
        transition: 'color 0.2s, border-color 0.2s',
        zIndex: 2,
        whiteSpace: 'nowrap',
      }}>
        {/* Instructions de navigation */}
        {isHovered ? '🖱️ CLIC G: TOURNER | 🖱️ CLIC D: MONTER/DESCENDRE | 🎡 ZOOM' : '● AGENT_VIEW_3D_FREE_NAV'}
      </div>

      {/* Canvas Three.js isolé */}
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Éclairage haute fidélité pour donner de la profondeur */}
        <ambientLight intensity={0.4} />
        <spotLight position={[5, 5, 5]} intensity={2} angle={0.3} penumbra={1} castShadow />
        <pointLight position={[-3, 2, 2]} intensity={2} color={CYAN} />
        <pointLight position={[3, 1, -2]} intensity={1.5} color={PINK} />
        
        {/* Rim Light (Lumière de contour pour détacher le perso du fond) */}
        <pointLight position={[0, 2, -5]} intensity={3} color="#ffffff" />

        {/* Environnement pour les reflets métalliques */}
        <Environment preset="city" />

        {/* Ombres de contact au sol pour l'ancrage */}
        <ContactShadows 
          position={[0, -2, 0]} 
          opacity={0.6} 
          scale={10} 
          blur={2.5} 
          far={4} 
        />

        {/* OrbitControls : contrôles complets (Pan avec Clic Droit) */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          screenSpacePanning={true}
          minDistance={0.5}
          maxDistance={40}
          autoRotate={!isHovered}
          autoRotateSpeed={2.5}
        />

        {/* Modèle + Plateforme dans Suspense */}
        <Suspense fallback={<LoadingFallback />}>
          <CharacterModel key={skin} skin={skin} />
          <HoloPlatform />
        </Suspense>
      </Canvas>
    </div>
  );
};
