import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useTexture, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const KENNEY_SKINS = ['criminalMaleA', 'cyborgFemaleA', 'skaterFemaleA', 'skaterMaleA'];
const CYAN = '#00d8ff';

export const AnimatedCharacter = ({ skin = 'criminalMaleA', isMoving = false, isFlying = false, isBoosting = false }) => {
  const groupRef = useRef();
  const innerGroupRef = useRef();
  const neonRef = useRef();
  const lightRef = useRef();
  const boardRef = useRef(); // Référence à la planche pour l'incliner au boost
  const materialsRef = useRef([]);

  // 1. Charger le corps
  const fbxMesh = useFBX('/assets/kenney/characterMedium.fbx');

  const safeSkin = KENNEY_SKINS.includes(skin) ? skin : 'criminalMaleA';
  const texture = useTexture(`/assets/kenney/${safeSkin}.png`);

  // 2. Cloner et sauvegarder la pose initiale
  const clone = useMemo(() => {
    if (!fbxMesh) return null;
    const c = SkeletonUtils.clone(fbxMesh);

    // Échelle FIXE
    c.scale.setScalar(0.011);
    c.position.set(0, -0.4, 0); // Positionné juste au-dessus du skate
    
    materialsRef.current = []; // Reset materials list

    c.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        const tex = texture.clone();
        tex.flipY = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        if (child.material) {
          let mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat = mat.clone();
          child.material = mat;

          mat.map = tex;
          mat.side = THREE.DoubleSide;
          
          // === EFFET CYBERPUNK (Zéro Lag) ===
          mat.emissiveMap = tex; // La texture elle-même s'illumine
          mat.emissive = new THREE.Color(CYAN);
          mat.emissiveIntensity = 0.3;
          mat.metalness = 0.6;
          mat.roughness = 0.3;
          
          mat.needsUpdate = true;
          materialsRef.current.push(mat);
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.isBone || child.type === 'Bone') {
        child.userData.originalQuaternion = child.quaternion.clone();
      }
    });

    return c;
  }, [fbxMesh, texture]);

  // Recherche robuste des os
  const bones = useMemo(() => {
    if (!clone) return {};
    const b = {};
    clone.traverse((child) => {
      const name = child.name.toLowerCase();
      if (name.includes('spine') || name.includes('hips') || name === 'body') b.spine = child;
      if (name.includes('rightupleg') || name === 'leg_r') b.rLeg = child;
      else if (name.includes('rightleg') || name === 'calf_r') b.rKnee = child;
      if (name.includes('leftupleg') || name === 'leg_l') b.lLeg = child;
      else if (name.includes('leftleg') || name === 'calf_l') b.lKnee = child;
      if (name.includes('rightarm') || name.includes('shoulder_r')) b.rArm = child;
      if (name.includes('leftarm') || name.includes('shoulder_l')) b.lArm = child;
    });
    return b;
  }, [clone]);

  // 3. Animation Procédurale Fixe : POSE HOVERBOARD
  useFrame((state) => {
    const time = state.clock.elapsedTime;

      // Animation de flottement global (Skate + Personnage)
    if (innerGroupRef.current) {
      // Flotte plus vite et plus haut en mode vol
      const hoverFreq = isFlying ? 4.5 : 2.5;
      const hoverAmp = isFlying ? 0.18 : 0.05;
      innerGroupRef.current.position.y = Math.sin(time * hoverFreq) * hoverAmp;

      // Inclinaison vers l'avant (agressive en vol + mouvement)
      const targetTiltX = isFlying ? (isMoving ? 0.35 : 0.15) : (isMoving ? 0.15 : 0);
      innerGroupRef.current.rotation.x += (targetTiltX - innerGroupRef.current.rotation.x) * 0.1;
      
      // Petit roulis (banking) fluide
      const targetTiltZ = isMoving ? Math.sin(time * 3) * 0.05 : Math.sin(time * 1.5) * 0.02;
      innerGroupRef.current.rotation.z += (targetTiltZ - innerGroupRef.current.rotation.z) * 0.1;
    }

    // Néon qui pulse — couleur dynamique selon le mode
    if (neonRef.current) {
      if (isBoosting) {
        neonRef.current.material.color.set('#ff6600'); // Orange boost
        neonRef.current.material.opacity = 0.7 + Math.sin(time * 20) * 0.3; // pulse ultra rapide
      } else if (isFlying) {
        neonRef.current.material.color.set(CYAN);
        neonRef.current.material.opacity = 0.6 + Math.sin(time * 10) * 0.4;
      } else {
        neonRef.current.material.color.set(CYAN);
        neonRef.current.material.opacity = 0.8;
      }
    }

    // Lumière réactive
    if (lightRef.current) {
      if (isBoosting) {
        lightRef.current.intensity = 4 + Math.sin(time * 20) * 2;
        lightRef.current.color.set('#ff6600'); // Orange
      } else if (isFlying) {
        lightRef.current.intensity = 2.5 + Math.sin(time * 10) * 1.5;
        lightRef.current.color.set('#ff00ff'); // Magenta
      } else {
        lightRef.current.intensity = 1.0;
        lightRef.current.color.set(CYAN);
      }
    }
    
    // === PULSATION CORPORELLE CYBERPUNK ===
    materialsRef.current.forEach((mat) => {
      if (isBoosting) {
        mat.emissive.set('#ff6600');
        mat.emissiveIntensity = 0.8 + Math.sin(time * 15) * 0.4;
      } else if (isFlying) {
        mat.emissive.set(CYAN);
        mat.emissiveIntensity = 0.4 + Math.sin(time * 5) * 0.2;
      } else {
        mat.emissive.set(CYAN);
        mat.emissiveIntensity = 0.15;
      }
    });

    if (!clone) return;
    const { rLeg, lLeg, rKnee, lKnee, rArm, lArm, spine } = bones;

    const resetBone = (b) => {
      if (b && b.userData.originalQuaternion) {
        b.quaternion.copy(b.userData.originalQuaternion);
      }
    };

    resetBone(rLeg); resetBone(lLeg); resetBone(rKnee); resetBone(lKnee);
    resetBone(rArm); resetBone(lArm); resetBone(spine);

    // --- POSE AÉRODYNAMIQUE (Glisseur Cyberpunk) ---

    // BOOST : bras tendus vers l'avant, buste penché en arrière
    if (isBoosting) {
      if (rArm) rArm.rotateX(0.9);  // Bras vers l'avant (surfer)
      if (lArm) lArm.rotateZ(0.9);
      if (rLeg) rLeg.rotateZ(0.4); // Jambes très écartées (vers l'extérieur)
      if (lLeg) lLeg.rotateZ(-0.4);
      if (rKnee) rKnee.rotateX(-1.0); // Genoux très fléchis
      if (lKnee) lKnee.rotateX(-1.0);
      if (spine) spine.rotateX(-0.3); // Buste penché en arrière (surfer)
    } else {
      // Bras plus en arrière en vol (aérodynamisme stylé)
      const armBack = isFlying ? 1.2 : 0.7;
      if (rArm) rArm.rotateX(-armBack);
      if (lArm) lArm.rotateZ(-armBack);
      
      // Bras légèrement écartés sur les côtés
      const armSide = isFlying ? 0.3 : 0.1;
      if (rArm) rArm.rotateZ(armSide);
      if (lArm) lArm.rotateX(-armSide);

      // Jambes écartées + plus fléchies en vol
      const legSpread = isFlying ? 0.35 : 0.15;
      if (rLeg) rLeg.rotateZ(legSpread);  // Vers l'extérieur
      if (lLeg) lLeg.rotateZ(-legSpread); // Vers l'extérieur

      // Genoux plus fléchis en vol
      const kneeBend = isFlying ? 0.8 : 0.3;
      if (rKnee) rKnee.rotateX(-kneeBend);
      if (lKnee) lKnee.rotateX(-kneeBend);

      // Buste (inclinaison progressive et dynamique)
      if (spine) {
        const lean = isFlying ? (isMoving ? 0.6 : 0.3) : (isMoving ? 0.2 : 0.05);
        spine.rotateX(lean);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={innerGroupRef}>
        {/* Le Hoverboard (Glisseur) */}
        <group position={[0, -0.45, 0]}>
          {/* Planche principale (Sombre et métallique) */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.05, 1.7]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.15} />
          </mesh>

          {/* Détails décoratifs sur la planche */}
          <mesh position={[0, 0.031, 0]}>
            <boxGeometry args={[0.85, 0.01, 1.6]} />
            <meshStandardMaterial color="#0a0a1a" metalness={1} roughness={0} />
          </mesh>

          {/* Néon lumineux en dessous (Underglow) — réf pour le pulse */}
          <mesh ref={neonRef} position={[0, -0.035, 0]}>
            <boxGeometry args={[0.92, 0.01, 1.72]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.8} />
          </mesh>

          {/* Lumière dynamique projetée sous le board */}
          <pointLight
            ref={lightRef}
            position={[0, -0.15, 0]}
            color={CYAN}
            intensity={1.0}
            distance={2.0}
            decay={2}
          />

          {/* Propulseurs arrière gauche/droite */}
          <mesh position={[-0.35, -0.05, -0.75]}>
            <cylinderGeometry args={[0.065, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0.1} emissive={isBoosting ? '#ff6600' : CYAN} emissiveIntensity={isBoosting ? 6 : (isFlying ? 3 : 0.5)} />
          </mesh>
          <mesh position={[0.35, -0.05, -0.75]}>
            <cylinderGeometry args={[0.065, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0.1} emissive={isBoosting ? '#ff6600' : CYAN} emissiveIntensity={isBoosting ? 6 : (isFlying ? 3 : 0.5)} />
          </mesh>
          {/* Propulseurs avant */}
          <mesh position={[-0.35, -0.05, 0.75]}>
            <cylinderGeometry args={[0.04, 0.065, 0.08, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0.1} emissive={isBoosting ? '#ffaa00' : '#ff00ff'} emissiveIntensity={isBoosting ? 4 : (isFlying ? 2 : 0.2)} />
          </mesh>
          <mesh position={[0.35, -0.05, 0.75]}>
            <cylinderGeometry args={[0.04, 0.065, 0.08, 8]} />
            <meshStandardMaterial color="#111" metalness={1} roughness={0.1} emissive={isBoosting ? '#ffaa00' : '#ff00ff'} emissiveIntensity={isBoosting ? 4 : (isFlying ? 2 : 0.2)} />
          </mesh>
        </group>

        {/* Le Personnage en pose */}
        {clone && <primitive object={clone} />}
        {/* Effets Visuels : Particules Magiques / Cyberpunk autour du joueur */}
        {isFlying && (
          <Sparkles 
            count={isBoosting ? 100 : 40} 
            scale={2.5} 
            size={isBoosting ? 6 : 3} 
            speed={isBoosting ? 0.8 : 0.3} 
            opacity={isBoosting ? 0.8 : 0.4} 
            color={isBoosting ? '#ffaa00' : CYAN} 
            position={[0, 0.5, 0]} 
          />
        )}
      </group>
    </group>
  );
};
