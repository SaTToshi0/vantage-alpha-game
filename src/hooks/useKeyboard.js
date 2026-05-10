import { useRef, useEffect } from 'react';

/**
 * useKeyboard — Zéro lag garanti via useRef.
 * useState déclenchait un re-render à chaque touche, causant le délai.
 * useRef est synchrone et ne déclenche aucun re-render.
 * 
 * Touches :
 *   W / ArrowUp    → forward
 *   S / ArrowDown  → backward
 *   A / ArrowLeft  → left
 *   D / ArrowRight → right
 *   Space          → jump
 *   E              → boost (ancien Shift)
 *   F              → fly (monter)
 *   Ctrl           → descend (descendre)
 */
export const useKeyboard = () => {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,   // E = Boost hoverboard
    fly: false,      // F = monter en vol
    descend: false,  // Ctrl = descendre
    transform: false, // T = Transformer en ballon
    grab: false,      // R = Attraper/Poser un écran
  });

  useEffect(() => {
    const setKey = (code, value) => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = value; break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = value; break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = value; break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = value; break;
        case 'Space':
          keys.current.jump = value; break;
        case 'KeyE':              // ← Boost sur E (plus accessible)
        case 'ShiftLeft':         // ← Boost classique sur Shift
        case 'ShiftRight':
          keys.current.sprint = value; break;
        case 'KeyF':
          keys.current.fly = value; break;
        case 'ControlLeft':
        case 'ControlRight':
          keys.current.descend = value; break;
        case 'KeyT':
          keys.current.transform = value; break;
        case 'KeyR':
          keys.current.grab = value; break;
      }
    };

    const handleKeyDown = (e) => {
      // Empêcher le scroll de la page avec Espace/flèches
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      setKey(e.code, true);
    };

    const handleKeyUp   = (e) => setKey(e.code, false);

    // Contrôles mobiles (inchangés)
    const handleMobileAction = (e) => {
      const { action, value } = e.detail;
      if (action in keys.current) keys.current[action] = value;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup',   handleKeyUp);
    window.addEventListener('mobile-action', handleMobileAction);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup',   handleKeyUp);
      window.removeEventListener('mobile-action', handleMobileAction);
    };
  }, []);

  // Retourne la REF (pas .current) pour que useFrame puisse lire les valeurs en temps réel
  return keys;
};
