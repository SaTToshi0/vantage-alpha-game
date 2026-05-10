import { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { useKeyboard } from '../hooks/useKeyboard';
import { Vector3, Euler, Vector2 } from 'three';
import { emitMove, getSocket } from './SocketManager';
import { useGameStore } from '../store/useGameStore';
import { FloatingVideo } from './FloatingVideo';
import { AnimatedCharacter } from './AnimatedCharacter';

// ========== PARAMÈTRES (Vitesses augmentées logiquement) ==========
const WALK_SPEED = 14;     // Vitesse de base augmentée
const SPRINT_SPEED = 24;   // Vitesse en vol/hover normal
const BOOST_SPEED = 45;    // Vitesse de boost très rapide
const JUMP_FORCE = 10;
const JUMP_THRESHOLD = 0.15;
const ACCELERATION = 0.45; // Plus d'accélération pour une meilleure réactivité
const CAMERA_DISTANCE = 3;
const CAMERA_HEIGHT = 1.5;
const CAMERA_LERP = 0.15;
const ROTATION_SPEED = 0.35; // Rotation plus rapide pour une meilleure maniabilité
const FLY_SPEED = 12;
const HOVER_DAMPING = 0.85; // Amortissement vertical en vol (pour flotter doucement)

export const Player = () => {
  const keysRef = useKeyboard(); // useRef — lecture en temps réel dans useFrame
  const isHoverMode = useRef(false); // true = hoverboard en mode vol
  const boostCount = useRef(0);
  const wasBoosting = useRef(false);
  const skateAudioCtx = useRef(null);
  const skateGainNode = useRef(null);
  const skateIsPlaying = useRef(false);
  const wasTransforming = useRef(false);

  // === SONS ===
  const comboSound1 = useRef(null);
  const comboSound3 = useRef(null);
  
  // === SON BALLON ===
  const balloonAudioCtx = useRef(null);
  const balloonOsc = useRef(null);
  const balloonGain = useRef(null);

  useEffect(() => {
    // Sons Tony Hawk
    comboSound1.current = new Audio('/assets/audio/tony-hawk-trick-combo-1.mp3');
    comboSound1.current.volume = 0.85;
    comboSound3.current = new Audio('/assets/audio/tony-hawk-trick-combo-3.mp3');
    comboSound3.current.volume = 0.85;

    // Son de skate synthétique (Web Audio API - bruit blanc filtré)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      skateAudioCtx.current = ctx;

      // Buffer de bruit blanc
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      // Source + filtre passe-bas (donne un son de roulement sourd)
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 320;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.value = 0; // Démarre silencieux
      skateGainNode.current = gain;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      
      // === Son du ballon (Drone doux) ===
      const bCtx = new (window.AudioContext || window.webkitAudioContext)();
      balloonAudioCtx.current = bCtx;
      
      const bOsc = bCtx.createOscillator();
      bOsc.type = 'sine';
      bOsc.frequency.value = 100;
      
      const bGain = bCtx.createGain();
      bGain.gain.value = 0; // Silencieux au début
      
      bOsc.connect(bGain);
      bGain.connect(bCtx.destination);
      bOsc.start();
      balloonOsc.current = bOsc;
      balloonGain.current = bGain;
      
    } catch (e) {
      console.warn('Web Audio API non disponible:', e);
    }

    return () => {
      if (skateAudioCtx.current) skateAudioCtx.current.close();
      if (balloonAudioCtx.current) balloonAudioCtx.current.close();
    };
  }, []);

  const { camera, raycaster, scene } = useThree();
  const updateScreen = useGameStore(state => state.updateScreen);
  const localPlayerId = useGameStore(state => state.localPlayer.id);

  // ========== PHYSIQUE ==========
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 5, 0],
    args: [0.5],
    linearDamping: 0.92,   // ↑ Élevé pour s'arrêter NET quand on lâche les touches
    angularDamping: 1.0,
    material: { friction: 0.0, restitution: 0.0 },
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
  // Groupe séparé pour le personnage 3D: suit la position mais PAS la rotation de la sphère
  const characterGroupRef = useRef();
  const balloonGroupRef = useRef();
  const transformProgress = useRef(0); // 0 = Character, 1 = Balloon
  
  // Variables pour le grab
  const hoveredScreen = useRef(null);
  const draggedScreenId = useRef(null);
  const wasGrabbing = useRef(false);
  const lastScreenEmitTime = useRef(0);

  // ========== SOUSCRIPTIONS PHYSIQUES ==========
  useEffect(() => {
    const unsubVel = api.velocity.subscribe((v) => (velocity.current = v));
    const unsubPos = api.position.subscribe((p) => (pos.current = p));
    return () => {
      unsubVel();
      unsubPos();
    };
  }, [api.velocity, api.position]);

  // ========== ÉVÉNEMENTS (SCROLL) ==========
  useEffect(() => {
    const handleWheel = (e) => {
      if (draggedScreenId.current) {
        // Redimensionner l'écran tenu en main
        const screens = useGameStore.getState().screens;
        const currentScreen = screens.find(s => s.id === draggedScreenId.current);
        if (currentScreen) {
          let newScale = (currentScreen.scale || 2.4) + (e.deltaY > 0 ? -0.2 : 0.2);
          // Limites du scale (1 min, 8 max)
          newScale = Math.max(1, Math.min(8, newScale));
          
          updateScreen(draggedScreenId.current, { scale: newScale });
          getSocket()?.emit('update-screen', { id: draggedScreenId.current, position: currentScreen.position, rotation: currentScreen.rotation, scale: newScale });
        }
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    // Lire les touches EN TEMPS RÉEL (pas de re-render, zéro lag)
    const { forward, backward, left, right, jump, sprint, fly, descend, transform, grab } = keysRef.current;
    isGrounded.current = Math.abs(velocity.current[1]) < JUMP_THRESHOLD;
    
    // Toggle Transformation
    if (transform && !wasTransforming.current) {
      setIsTransformed(prev => !prev);
    }
    wasTransforming.current = transform;

    // 2. Calcul des directions par rapport à la caméra
    const cameraForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraForward.y = 0;
    cameraRight.y = 0;
    cameraForward.normalize();
    cameraRight.normalize();

    // 3. Input de mouvement (direction brute, sans vitesse encore)
    const moveInput = new Vector3(
      (left ? -1 : 0) + (right ? 1 : 0),
      0,
      (forward ? -1 : 0) + (backward ? 1 : 0)
    );

    // 4. Calcul vitesse + direction (boost Shift > vol > marche)
    const isBoosting = sprint && skin !== 'robot';
    let speed;
    if (isBoosting) speed = BOOST_SPEED;
    else if (isHoverMode.current) speed = SPRINT_SPEED;
    else speed = WALK_SPEED;

    const direction = new Vector3();
    if (moveInput.length() > 0) {
      moveInput.normalize();
      direction
        .addScaledVector(cameraRight, moveInput.x)
        .addScaledVector(cameraForward, moveInput.z)
        .normalize()
        .multiplyScalar(speed);
      targetRotation.current = Math.atan2(direction.x, direction.z);
    }

    const targetVel = new Vector3(direction.x, velocity.current[1], direction.z);
    currentVelocity.current.lerp(targetVel, isBoosting ? 0.6 : ACCELERATION);

    // 5. Son de boost (Tony Hawk) — déclenché au premier frame du boost
    if (isBoosting && !wasBoosting.current && (comboSound1.current || comboSound3.current)) {
      const snd = boostCount.current % 2 === 0 ? comboSound1.current : comboSound3.current;
      if (snd) {
        snd.currentTime = 0;
        // On force le volume pour s'assurer qu'il s'entend bien
        snd.volume = 1.0;
        snd.play().catch((e) => console.warn("Son bloqué par le navigateur (cliquez d'abord sur le jeu)", e));
      }
      boostCount.current++;
    }
    wasBoosting.current = isBoosting;

    // === SON DE SKATE (bruit de roulement) ===
    if (skateGainNode.current && skateAudioCtx.current) {
      // On coupe le son de skate si le joueur est transformé en ballon
      const isRolling = direction.length() > 0.5 && !isHoverMode.current && !isTransformed;
      const targetGain = isRolling ? (isBoosting ? 0.6 : 0.35) : 0;
      // Fondu progressif (evite les clics audio)
      skateGainNode.current.gain.setTargetAtTime(
        targetGain,
        skateAudioCtx.current.currentTime,
        0.08
      );
    }
    
    // === SON DU BALLON ===
    if (balloonGain.current && balloonAudioCtx.current) {
      const targetGain = isTransformed ? (direction.length() > 0.5 ? 0.5 : 0.2) : 0;
      balloonGain.current.gain.setTargetAtTime(targetGain, balloonAudioCtx.current.currentTime, 0.2);
      
      if (balloonOsc.current && isTransformed) {
        // La fréquence augmente subtilement avec la vitesse
        const targetFreq = 100 + (direction.length() * 2);
        balloonOsc.current.frequency.setTargetAtTime(targetFreq, balloonAudioCtx.current.currentTime, 0.1);
      }
    }

    // 5. Vol / Hoverboard
    // Activer le mode vol si on monte (F) ou si on est déjà en l'air
    if (fly) isHoverMode.current = true;
    // Désactiver le mode vol si on atterrit (proche du sol et pas de touche vol)
    if (isGrounded.current && !fly && !descend && pos.current[1] < 1.5) {
      isHoverMode.current = false;
    }

    let verticalVel = velocity.current[1];

    if (isHoverMode.current) {
      // En mode vol: contrer la gravité + contrôle vertical
      if (fly) {
        verticalVel = FLY_SPEED; // Monter
      } else if (descend) {
        verticalVel = -FLY_SPEED; // Descendre
      } else {
        // Flotter sur place : amortir la vélocité verticale doucement
        verticalVel *= HOVER_DAMPING;
      }
      // Contrer la gravité physique en mode vol
      api.applyForce([0, 9.81, 0], [0, 0, 0]);
    } else {
      // Mode sol : saut normal
      if (jump && isGrounded.current) {
        verticalVel = JUMP_FORCE;
        isGrounded.current = false;
      }
    }

    api.velocity.set(
      currentVelocity.current.x,
      verticalVel,
      currentVelocity.current.z
    );

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
    const moveSpeed = direction.length();
    const targetUiOpacity = moveSpeed > 0.1 ? 0 : 1;
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

    // --- 10.b RAYCASTING POUR GRAB ÉCRANS ---
    // Ne faire le raycast que 10 fois par seconde pour optimiser
    if (state.clock.elapsedTime % 0.1 < 0.016) {
      raycaster.setFromCamera(new Vector2(0, 0), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      let target = null;
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj) {
          if (obj.userData?.type === 'interactable-screen') {
            target = obj;
            break;
          }
          obj = obj.parent;
        }
        if (target) break;
      }
      
      if (target && target.userData.ownerId === localPlayerId) {
        hoveredScreen.current = target.userData;
      } else {
        hoveredScreen.current = null;
      }
    }

    // --- LOGIQUE DE SAISIE (GRAB) ---
    if (grab && !wasGrabbing.current) {
      if (draggedScreenId.current) {
        // Relâcher l'écran
        draggedScreenId.current = null;
      } else if (hoveredScreen.current) {
        // Attraper l'écran
        draggedScreenId.current = hoveredScreen.current.id;
      }
    }
    wasGrabbing.current = grab;

    if (draggedScreenId.current) {
      // Calculer la nouvelle position (10 unités devant la caméra)
      const grabDist = 12;
      const tPos = camera.position.clone().add(cameraForward.clone().multiplyScalar(grabDist));
      // On fixe un peu plus bas que la caméra pour éviter que ça obstrue complètement la vue
      tPos.y = Math.max(0, tPos.y - 2); 
      
      // La rotation fait face au joueur (+ Math.PI pour regarder vers la caméra)
      const tRot = [0, playerRotation.current.y + Math.PI, 0];

      // Mise à jour locale (la position et la rotation, le scale est géré par la molette)
      updateScreen(draggedScreenId.current, { position: tPos.toArray(), rotation: tRot });

      // Envoi réseau limité à 10 FPS pour ne pas surcharger
      if (now - lastScreenEmitTime.current > 0.1) {
        // Récupérer le scale actuel depuis le store pour l'envoi réseau
        const currentScale = useGameStore.getState().screens.find(s => s.id === draggedScreenId.current)?.scale || 2.4;
        getSocket()?.emit('update-screen', { id: draggedScreenId.current, position: tPos.toArray(), rotation: tRot, scale: currentScale });
        lastScreenEmitTime.current = now;
      }
    }

    // Mise à jour de l'UI (DOM) directement sans re-render
    const grabUi = document.getElementById('grab-prompt');
    if (grabUi) {
      if (draggedScreenId.current) {
        grabUi.style.display = 'block';
        grabUi.innerText = '[R] POSER | [MOLETTE] DIMENSIONNER';
      } else if (hoveredScreen.current) {
        grabUi.style.display = 'block';
        grabUi.innerText = '[R] DÉPLACER';
      } else {
        grabUi.style.display = 'none';
      }
    }

    // 11. Détecter le mouvement pour l'animation
    const spd = Math.sqrt(
      velocity.current[0] ** 2 + velocity.current[2] ** 2
    );
    const moving = spd > 0.8;
    if (moving !== isMoving) setIsMoving(moving);

    // Mettre à jour l'état de vol
    if (isHoverMode.current !== isFlying) setIsFlying(isHoverMode.current);

    // Mettre à jour l'état de boost (isBoosting déjà déclaré plus haut)
    if (isBoosting !== isBoosted) setIsBoosted(isBoosting);

    // 12. Mettre à jour le groupe du personnage (position + rotation Y seulement)
    if (characterGroupRef.current) {
      // +0.35 pour flotter au-dessus du sol (ne jamais le toucher)
      characterGroupRef.current.position.set(pos.current[0], pos.current[1] + 0.35, pos.current[2]);
      characterGroupRef.current.rotation.set(0, playerRotation.current.y, 0);
    }
    
    // 13. Mettre à jour le groupe du ballon
    if (balloonGroupRef.current) {
      balloonGroupRef.current.position.set(pos.current[0], pos.current[1] + 0.35, pos.current[2]);
      // Rotation propre du ballon pour l'effet d'énergie
      balloonGroupRef.current.rotation.y += 0.05;
      balloonGroupRef.current.rotation.x += 0.02;
    }

    // 14. Animation de transition fluide (Zéro lag)
    const targetProgress = isTransformed ? 1 : 0;
    transformProgress.current += (targetProgress - transformProgress.current) * 0.15; // Smooth LERP
    
    if (characterGroupRef.current) {
      // Scale down character smoothly
      const charScale = Math.max(0.001, 1 - transformProgress.current);
      characterGroupRef.current.scale.setScalar(charScale);
    }
    
    if (balloonGroupRef.current) {
      // Scale up balloon smoothly
      const balloonScale = Math.max(0.001, transformProgress.current);
      balloonGroupRef.current.scale.setScalar(balloonScale);
    }
  });

  // ========== TOUCH LOOK (MOBILE) ==========
  const touchPos = useRef({ x: 0, y: 0 });
  const isMobile = useGameStore(state => state.isMobile);
  const localStream = useGameStore(state => state.localStream);
  const cameraEnabled = useGameStore(state => state.localPlayer.cameraEnabled);
  const skin = useGameStore(state => state.localPlayer?.skin || 'robot');
  const [isMoving, setIsMoving] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isTransformed, setIsTransformed] = useState(false);

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

        {/* === SPHERE SKIN === */}
        {skin === 'robot' && (
          <>
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
          </>
        )}

        {/* Shadow disk on ground - always visible */}
        {isGrounded.current && (
          <mesh position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
            <meshStandardMaterial
              ref={diskMaterialRef}
              color={skin === 'robot' ? '#00ff00' : '#3498db'}
              emissive={skin === 'robot' ? '#00ff00' : '#3498db'}
              emissiveIntensity={2}
              transparent
              opacity={1}
            />
          </mesh>
        )}
      </group>

      {/* === KENNEY ANIMATED SKIN (groupe séparé, position only, sans rolling) === */}
      {skin !== 'robot' && (
        <group ref={characterGroupRef}>
          <Suspense fallback={null}>
            <AnimatedCharacter skin={skin || 'criminalMaleA'} isMoving={isMoving} isFlying={isFlying} isBoosting={isBoosted} />
          </Suspense>
        </group>
      )}

      {/* === BALLOON/SPHERE TRANSFORMATION === */}
      <group ref={balloonGroupRef}>
        {/* Main Balloon / Energy Sphere */}
        <mesh castShadow position={[0, isFlying ? 0.5 : 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial 
            color="#00d8ff" 
            emissive="#0055ff"
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
            roughness={0.1}
            metalness={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        {/* Inner Energy Core */}
        <mesh position={[0, isFlying ? 0.5 : 0, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Orbital rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, isFlying ? 0.5 : 0, 0]}>
          <torusGeometry args={[0.7, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00d8ff" transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]} position={[0, isFlying ? 0.5 : 0, 0]}>
          <torusGeometry args={[0.6, 0.015, 16, 100]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} />
        </mesh>
      </group>

      {cameraEnabled && localStream && (
        <FloatingVideo stream={localStream} mirrored />
      )}
    </>
  );
};
