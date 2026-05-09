import { useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

const GREEN = '#a8ff3e';

export const MobileControls = () => {
  const isMobile = useGameStore((state) => state.isMobile);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Utilisation directe du store pour injecter les actions
  // (On modifiera useKeyboard pour qu'il fusionne ces états)
  const setMobileAction = useCallback((action, value) => {
    window.dispatchEvent(new CustomEvent('mobile-action', { detail: { action, value } }));
  }, []);

  if (!isMobile) return null;

  const handleJoystickMove = (e) => {
    if (!isJoystickActive) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let x = (touch.clientX - centerX) / (rect.width / 2);
    let y = (touch.clientY - centerY) / (rect.height / 2);
    
    const distance = Math.sqrt(x*x + y*y);
    if (distance > 1) {
      x /= distance;
      y /= distance;
    }
    
    setJoystickPos({ x, y });
    
    // Déclenchement des actions simulées
    setMobileAction('forward',  y < -0.3);
    setMobileAction('backward', y > 0.3);
    setMobileAction('left',     x < -0.3);
    setMobileAction('right',    x > 0.3);
  };

  const stopJoystick = () => {
    setIsJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    setMobileAction('forward',  false);
    setMobileAction('backward', false);
    setMobileAction('left',     false);
    setMobileAction('right',    false);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      pointerEvents: 'none', userSelect: 'none',
      touchAction: 'none',
    }}>
      {/* Joystick (Zone de gauche) */}
      <div 
        onTouchStart={() => setIsJoystickActive(true)}
        onTouchMove={handleJoystickMove}
        onTouchEnd={stopJoystick}
        style={{
          position: 'absolute', bottom: '40px', left: '40px',
          width: '150px', height: '150px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.1)',
          pointerEvents: 'auto', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: isJoystickActive ? GREEN : 'rgba(255,255,255,0.2)',
          boxShadow: isJoystickActive ? `0 0 20px ${GREEN}` : 'none',
          transform: `translate(${joystickPos.x * 40}px, ${joystickPos.y * 40}px)`,
          transition: isJoystickActive ? 'none' : 'transform 0.1s ease',
        }} />
      </div>

      {/* Boutons d'action (Zone de droite) */}
      <div style={{
        position: 'absolute', bottom: '40px', right: '40px',
        display: 'flex', gap: '20px', pointerEvents: 'auto'
      }}>
        {/* Saut */}
        <div 
          onTouchStart={() => setMobileAction('jump', true)}
          onTouchEnd={() => setMobileAction('jump', false)}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(168,255,62,0.1)', border: `2px solid ${GREEN}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: GREEN,
            boxShadow: `0 0 15px ${GREEN}44`
          }}
        >
          UP
        </div>

        {/* Sprint */}
        <div 
          onTouchStart={() => setMobileAction('sprint', true)}
          onTouchEnd={() => setMobileAction('sprint', false)}
          style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#fff',
          }}
        >
          FAST
        </div>
      </div>
    </div>
  );
};
