import { useState, useEffect } from 'react';

export const useKeyboard = () => {
  const [actions, setActions] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setActions((prev) => ({ ...prev, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setActions((prev) => ({ ...prev, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setActions((prev) => ({ ...prev, left: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setActions((prev) => ({ ...prev, right: true }));
          break;
        case 'Space':
          setActions((prev) => ({ ...prev, jump: true }));
          break;
        case 'ShiftLeft':
          setActions((prev) => ({ ...prev, sprint: true }));
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setActions((prev) => ({ ...prev, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setActions((prev) => ({ ...prev, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setActions((prev) => ({ ...prev, left: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setActions((prev) => ({ ...prev, right: false }));
          break;
        case 'Space':
          setActions((prev) => ({ ...prev, jump: false }));
          break;
        case 'ShiftLeft':
          setActions((prev) => ({ ...prev, sprint: false }));
          break;
      }
    };

    const handleMobileAction = (e) => {
      const { action, value } = e.detail;
      setActions((prev) => ({ ...prev, [action]: value }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mobile-action', handleMobileAction);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mobile-action', handleMobileAction);
    };
  }, []);

  return actions;
};
