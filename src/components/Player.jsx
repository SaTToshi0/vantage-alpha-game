import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { useKeyboard } from '../hooks/useKeyboard';
import { Vector3, Euler } from 'three';
import { emitMove } from './SocketManager';
import { useGameStore } from '../store/useGameStore';
import { FloatingVideo } from './FloatingVideo';

// ========== PARAMÈTRES (Hardcodés pour stabilité temporaire) ==========
const WALK_SPEED = 8;
const SPRINT_SPEED = 15;
const JUMP_FORCE = 8;
const JUMP_THRESHOLD = 0.05;
const ACCELERATION = 0.2;
const CAMERA_DISTANCE = 3;
const CAMERA_HEIGHT = 1.5;
const CAMERA_LERP = 0.15;
const ROTATION_SPEED = 0.15;

export const Player = () => {
  const { forward, backward, left, right, jump, sprint } = useKeyboard();
  const { camera } = useThree();

  // ========== PHYSIQUE ==========
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 5, 0],
    args: [0.5],
    linearDamping: 0.3,
    angularDamping: 0.99,
  }));

  // ========== RÉFÉRENCES ==========
  const velocity = useRef([0, 0, 0]);
  const pos = useRef([0, 0, 0]);
  const isGrounded = useRef(false);
  const lastEmitTime = useRef(0);
  
  const playerRotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const targetRotation = useRef(0);
  const currentVelocity = useRef(new Vector3());
  const uiOpacity = useRef(1);
  const ringMaterialRef = useRef();
  const diskMaterialRef = useRef();

  // ========== SOUSCRIPTIONS PHYSIQUES ==========
  useEffect(() => {
    const unsubVel = api.velocity.subscribe((v) => (velocity.current = v));
    const unsubPos = api.position.subscribe((p) => (pos.current = p));
    return () => {
      unsubVel();
      unsubPos();
    };
  }, [api.velocity, api.position]);

  useFrame((state) => {
    const now = state.clock.elapsedTime;

    // 1. Détection du sol
    isGrounded.current = Math.abs(velocity.current[1]) < JUMP_THRESHOLD;

    // 2. Calcul des directions par rapport à la caméra
    const cameraForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraForward.y = 0;
    cameraRight.y = 0;
    cameraForward.normalize();
    cameraRight.normalize();

    // 3. Input de mouvement
    const moveInput = new Vector3(
      (left ? -1 : 0) + (right ? 1 : 0),
      0,
      (forward ? -1 : 0) + (backward ? 1 : 0)
    );

    const direction = new Vector3();
    if (moveInput.length() > 0) {
      moveInput.normalize();
      direction
        .addScaledVector(cameraRight, moveInput.x)
        .addScaledVector(cameraForward, moveInput.z)
        .normalize()
        .multiplyScalar(sprint ? SPRINT_SPEED : WALK_SPEED);
      
      // Update target rotation visual
      targetRotation.current = Math.atan2(direction.x, direction.z);
    }

    // 4. Application de la vélocité
    const targetVel = new Vector3(direction.x, velocity.current[1], direction.z);
    currentVelocity.current.lerp(targetVel, ACCELERATION);

    api.velocity.set(
      currentVelocity.current.x,
      velocity.current[1],
      currentVelocity.current.z
    );

    // 5. Saut
    if (jump && isGrounded.current) {
      api.velocity.set(velocity.current[0], JUMP_FORCE, velocity.current[2]);
      isGrounded.current = false;
    }

    // 6. Rotation visuelle du joueur
    let rotDiff = targetRotation.current - playerRotation.current.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    playerRotation.current.y += rotDiff * ROTATION_SPEED;

    // 7. Caméra Orbitale
    const playerPos = new Vector3(pos.current[0], pos.current[1], pos.current[2]);
    const cameraDir = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const targetCameraPos = playerPos.clone()
      .sub(cameraDir.clone().multiplyScalar(CAMERA_DISTANCE))
      .add(new Vector3(0, CAMERA_HEIGHT, 0));

    camera.position.lerp(targetCameraPos, CAMERA_LERP);

    // 8. UI Opacity (Fade)
    const speed = direction.length(); // Utiliser la direction d'input pour plus de réactivité
    const targetUiOpacity = speed > 0.1 ? 0 : 1;
    uiOpacity.current += (targetUiOpacity - uiOpacity.current) * 0.1;

    if (ringMaterialRef.current) ringMaterialRef.current.opacity = uiOpacity.current;
    if (diskMaterialRef.current) diskMaterialRef.current.opacity = uiOpacity.current;

    // 9. Clipping sol
    if (camera.position.y < playerPos.y + 0.5) {
      camera.position.y = playerPos.y + 0.5;
    }

    // 10. Réseau
    if (now - lastEmitTime.current > 0.05) {
      emitMove(pos.current, [0, playerRotation.current.y, 0]);
      lastEmitTime.current = now;
    }
  });

  // ========== TOUCH LOOK (MOBILE) ==========
  const touchPos = useRef({ x: 0, y: 0 });
  const isMobile = useGameStore(state => state.isMobile);
  const localStream = useGameStore(state => state.localStream);
  const cameraEnabled = useGameStore(state => state.localPlayer.cameraEnabled);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      // Éviter de tourner si on touche les contrôles de gauche (joystick)
      if (e.touches[0].clientX < window.innerWidth / 2) return;
      touchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e) => {
      if (e.touches[0].clientX < window.innerWidth / 2) return;
      
      const dx = e.touches[0].clientX - touchPos.current.x;
      const dy = e.touches[0].clientY - touchPos.current.y;
      
      // Sensibilité mobile pro
      const sensitivity = 0.005;
      camera.rotation.y -= dx * sensitivity;
      camera.rotation.x -= dy * sensitivity;
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x));
      
      touchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isMobile, camera]);

  return (
    <>
      <group ref={ref} rotation={[0, playerRotation.current.y, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color="#3498db"
            emissive="#3498db"
            emissiveIntensity={1.5}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.05, 16, 100]} />
          <meshStandardMaterial
            ref={ringMaterialRef}
            color="#3498db"
            emissive="#3498db"
            emissiveIntensity={4}
            metalness={1}
            roughness={0}
            transparent
            opacity={1}
          />
        </mesh>

        <mesh position={[0, 0, -0.6]} castShadow>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>

        {isGrounded.current && (
          <mesh position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
            <meshStandardMaterial
              ref={diskMaterialRef}
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={2}
              transparent
              opacity={1}
            />
          </mesh>
        )}
        {cameraEnabled && localStream && (
          <FloatingVideo stream={localStream} mirrored />
        )}
      </group>
    </>
  );
};
