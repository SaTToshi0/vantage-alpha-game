import { useGLTF, Clone } from '@react-three/drei';
import { useBox } from '@react-three/cannon';
import { useMemo } from 'react';
import * as THREE from 'three';
import { NPC } from './NPC';

// Collision invisible
const StaticBox = ({ position, args, rotation = [0, 0, 0] }) => {
  useBox(() => ({ type: 'Static', position, args, rotation }));
  return null;
};

// ——————————————————————————————————————
// Génère une rangée de dalles de chemin
// ——————————————————————————————————————
const Path = ({ start, end, width = 2, color = '#2a2a3a' }) => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const cx = (start[0] + end[0]) / 2;
  const cz = (start[2] + end[2]) / 2;

  return (
    <>
      {/* Surface du chemin */}
      <mesh
        position={[cx, 0.02, cz]}
        rotation={[-Math.PI / 2, 0, angle]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Bandes lumineuses latérales (néon Cyan) */}
      <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, angle]}>
        <planeGeometry args={[0.08, length]} />
        <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={3} />
      </mesh>
    </>
  );
};

// ——————————————————————————————————————
// Jardin sans arbres (sol + banc uniquement)
// ——————————————————————————————————————
const Garden = ({ position, radius = 6 }) => {
  return (
    <group>
      {/* Sol du jardin */}
      <mesh position={[position[0], 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 16]} />
        <meshStandardMaterial color="#0d1f0d" roughness={1} />
      </mesh>
      {/* Bordure lumineuse néon verte */}
      <mesh position={[position[0], 0.03, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.1, radius, 32]} />
        <meshStandardMaterial color="#00ff44" emissive="#00ff44" emissiveIntensity={2} />
      </mesh>
      {/* Banc */}
      <mesh position={[position[0], 0.28, position[2]]}>
        <boxGeometry args={[2, 0.12, 0.45]} />
        <meshStandardMaterial color="#6b3a2a" roughness={0.9} />
      </mesh>
    </group>
  );
};



// ——————————————————————————————————————
// Place (Fontaine centrale néon)
// ——————————————————————————————————————
const Plaza = ({ position, label, npcName, npcMsg, npcColor }) => {
  return (
    <group>
      {/* Dalles de la place */}
      <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[8, 8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Fontaine centrale */}
      <group position={[position[0], 0, position[2]]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[2, 2.2, 0.3, 16]} />
          <meshStandardMaterial color="#111122" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.7, 8]} />
          <meshStandardMaterial color="#222233" metalness={1} />
        </mesh>
        {/* Eau holographique */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 0.05, 16]} />
          <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={1.5} transparent opacity={0.6} />
        </mesh>
        {/* Jet holographique */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.2, 1.5, 8, 1, true]} />
          <meshStandardMaterial color="#00d8ff" emissive="#00d8ff" emissiveIntensity={2} transparent opacity={0.4} wireframe />
        </mesh>
      </group>

      {/* Lanternes aux coins */}
      {[[-5, -5], [5, -5], [-5, 5], [5, 5]].map(([ox, oz], i) => (
        <group key={i} position={[position[0] + ox, 0, position[2] + oz]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 3]} />
            <meshStandardMaterial color="#222" metalness={1} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color={npcColor} emissive={npcColor} emissiveIntensity={4} />
          </mesh>
          <pointLight position={[position[0] + ox, 3.5, position[2] + oz]} color={npcColor} intensity={0.8} distance={12} />
        </group>
      ))}

      {/* NPC */}
      <NPC position={[position[0] + 3, 1.5, position[2]]} name={npcName} message={npcMsg} color={npcColor} />

      {/* Collision au niveau de la fontaine */}
      <StaticBox position={[position[0], 0.3, position[2]]} args={[4, 0.6, 4]} />
    </group>
  );
};

// ——————————————————————————————————————
// Prop : Pile de caisses (sans modèle GLTF pour éviter le lag)
// ——————————————————————————————————————
const CrateStack = ({ position }) => (
  <group position={position}>
    {[[0, 0.5, 0], [0.9, 0.5, 0], [0.45, 1.4, 0]].map((p, i) => (
      <mesh key={i} position={p} castShadow>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} metalness={0.1} />
      </mesh>
    ))}
    <StaticBox position={[position[0] + 0.45, 1, position[2]]} args={[1.8, 2, 1]} />
  </group>
);

// ——————————————————————————————————————
// Composant principal
// ——————————————————————————————————————
export const MedievalScenery = () => {
  return (
    <group>
      {/* ——— CHEMINS NÉON ——— */}
      {/* Centre → Est */}
      <Path start={[8, 0, 0]} end={[32, 0, 0]} width={3} />
      {/* Centre → Ouest */}
      <Path start={[-8, 0, 0]} end={[-32, 0, 0]} width={3} />
      {/* Centre → Nord */}
      <Path start={[0, 0, -8]} end={[0, 0, -32]} width={3} />
      {/* Centre → Sud */}
      <Path start={[0, 0, 8]} end={[0, 0, 32]} width={3} />
      {/* Diagonales */}
      <Path start={[6, 0, 6]} end={[22, 0, 22]} width={2} color="#1e1a2a" />
      <Path start={[-6, 0, 6]} end={[-22, 0, 22]} width={2} color="#1e1a2a" />
      <Path start={[6, 0, -6]} end={[22, 0, -22]} width={2} color="#1e1a2a" />
      <Path start={[-6, 0, -6]} end={[-22, 0, -22]} width={2} color="#1e1a2a" />

      {/* ——— JARDINS (entre les chemins) ——— */}
      <Garden position={[16, 0, 16]} radius={7} />
      <Garden position={[-16, 0, 16]} radius={7} />
      <Garden position={[16, 0, -16]} radius={7} />
      <Garden position={[-16, 0, -16]} radius={7} />
      {/* Petits jardins le long des chemins */}
      <Garden position={[20, 0, 0]} radius={4} />
      <Garden position={[-20, 0, 0]} radius={4} />
      <Garden position={[0, 0, 20]} radius={4} />
      <Garden position={[0, 0, -20]} radius={4} />

      {/* ——— PLACES ——— */}
      <Plaza
        position={[35, 0, 0]}
        npcName="Nexus-7"
        npcMsg="Bienvenue à la Place Est. Repos autorisé ici."
        npcColor="#00d8ff"
      />
      <Plaza
        position={[-35, 0, 0]}
        npcName="Gardien IA"
        npcMsg="Secteur Ouest sécurisé. Bonne promenade."
        npcColor="#ff8c00"
      />
      <Plaza
        position={[0, 0, -35]}
        npcName="Écho-9"
        npcMsg="Les archives du nord sont accessibles au public."
        npcColor="#ff00ff"
      />
      <Plaza
        position={[0, 0, 35]}
        npcName="Aubergiste 3.0"
        npcMsg="Place du Sud. Bières de synthèse disponibles."
        npcColor="#9b59b6"
      />

      {/* ——— PROPS ——— */}
      <CrateStack position={[12, 0, 15]} />
      <CrateStack position={[-14, 0, -12]} />
      <CrateStack position={[8, 0, -18]} />
      <CrateStack position={[-10, 0, 14]} />
    </group>
  );
};
