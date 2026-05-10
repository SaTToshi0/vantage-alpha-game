import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { emitMove } from './SocketManager';

const GREEN  = '#a8ff3e';
const PINK   = '#ff00ff';
const CYAN   = '#00f3ff';
const ORANGE = '#ff6a00';

const SCALE = 1.8;
const TILE_W = 32 * SCALE;
const TILE_H = 16 * SCALE;
const MAP_SIZE = 12;
const WALL_H = 40 * SCALE;

const DECORATIONS = [
  { type: 'server',    x: 1.5, y: 1.5 },
  { type: 'server',    x: 2.5, y: 1.5 },
  { type: 'server',    x: 1.5, y: 2.5 },
  { type: 'cableLine', x: 4, y: 1.5 },
  { type: 'cableLine', x: 5, y: 1.5 },
  { type: 'hologram',  x: 6.5, y: 6.5 },
  { type: 'terminal',  x: 10, y: 3 },
  { type: 'terminal',  x: 10, y: 4 },
  { type: 'neonPillar', x: 1,  y: 11, color: PINK },
  { type: 'neonPillar', x: 11, y: 1,  color: PINK },
  { type: 'neonPillar', x: 11, y: 11, color: CYAN },
  { type: 'floorGlow', x: 5, y: 2 },
  { type: 'floorGlow', x: 2, y: 5 },
  { type: 'floorGlow', x: 8, y: 8 },
  { type: 'floorLamp', x: 4, y: 10 },
  { type: 'floorLamp', x: 10, y: 8 },
  { type: 'crate', x: 10, y: 10 },
  { type: 'crate', x: 9, y: 11 },
];

export const IsometricLobby = ({ roomCode, isHost }) => {
  const canvasRef = useRef(null);
  const localPosRef = useRef({ x: 6, y: 6 }); // Position initiale centre de la map
  const playersRef = useRef({});
  const localPlayerRef = useRef({});
  const keysRef = useRef({});
  const particlesRef = useRef([]);

  // High-performance store sync
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      playersRef.current = state.players;
      localPlayerRef.current = state.localPlayer;
    });
    
    // Init particles
    const pts = [];
    for (let i = 0; i < 20; i++) {
      pts.push({
        x: Math.random() * MAP_SIZE,
        y: Math.random() * MAP_SIZE,
        speed: 0.001 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        size: 0.8 + Math.random() * 1.2,
        color: [GREEN, CYAN, PINK][Math.floor(Math.random() * 3)]
      });
    }
    particlesRef.current = pts;

    // Émettre la position initiale pour que les autres joueurs nous voient tout de suite
    emitMove([localPosRef.current.x, 5, localPosRef.current.y], [0, 0, 0]);

    return () => unsub();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const handleKeyDown = (e) => (keysRef.current[e.key.toLowerCase()] = true);
    const handleKeyUp = (e) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const worldToScreen = (wx, wy) => ({
      x: (wx - wy) * (TILE_W / 2) + canvas.width / 2,
      y: (wx + wy) * (TILE_H / 2) + canvas.height / 2 - (MAP_SIZE * TILE_H / 2) + 40
    });

    const drawIsoTile = (wx, wy) => {
      const p = worldToScreen(wx, wy);
      const isAlt = (wx + wy) % 2 === 0;
      
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2);
      ctx.lineTo(p.x, p.y + TILE_H);
      ctx.lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2);
      ctx.closePath();
      
      ctx.fillStyle = isAlt ? '#0a0a14' : '#07070d';
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const drawWall = (wx, wy, side) => {
      const p = worldToScreen(wx, wy);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(p.x - TILE_W / 2, p.y + TILE_H / 2);
        ctx.lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2 - WALL_H);
        ctx.lineTo(p.x, p.y - WALL_H);
        ctx.lineTo(p.x, p.y);
      } else {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - WALL_H);
        ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2 - WALL_H);
        ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2);
      }
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(p.x, p.y - WALL_H, p.x, p.y);
      grad.addColorStop(0, side === 'left' ? '#080812' : '#0c0c1a');
      grad.addColorStop(1, '#020205');
      ctx.fillStyle = grad;
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawObject = (obj) => {
      const p = worldToScreen(obj.x, obj.y);
      const cy = p.y + TILE_H / 2;
      const time = Date.now();

      if (obj.type === 'player') {
        const float = Math.sin(time / 250) * 2 * SCALE;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(p.x, cy, 7 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2); ctx.fill();
        
        // Body
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = 12 * SCALE; ctx.shadowColor = obj.color;
        ctx.fillRect(p.x - 6 * SCALE, cy - 22 * SCALE + float, 12 * SCALE, 22 * SCALE);
        ctx.shadowBlur = 0;
        
        // Armor/Visor detail
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x - 6 * SCALE, cy - 12 * SCALE + float, 12 * SCALE, 1 * SCALE);
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 4 * SCALE, cy - 19 * SCALE + float, 8 * SCALE, 2 * SCALE);
        
        // Indicators
        if (obj.micEnabled) {
          ctx.fillStyle = CYAN;
          ctx.beginPath(); ctx.arc(p.x - 10 * SCALE, cy - 26 * SCALE + float, 2 * SCALE, 0, Math.PI * 2); ctx.fill();
        }
        if (obj.cameraEnabled) {
          ctx.fillStyle = PINK;
          ctx.beginPath(); ctx.arc(p.x + 10 * SCALE, cy - 26 * SCALE + float, 2 * SCALE, 0, Math.PI * 2); ctx.fill();
        }
        
        // Name Label
        ctx.font = `${6 * SCALE}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.fillStyle = obj.color;
        ctx.fillText(obj.name, p.x, cy - 32 * SCALE + float);

      } else if (obj.type === 'server') {
        ctx.fillStyle = '#050505';
        ctx.fillRect(p.x - 10 * SCALE, cy - 35 * SCALE, 20 * SCALE, 35 * SCALE);
        ctx.strokeStyle = '#1a1a2a';
        ctx.strokeRect(p.x - 10 * SCALE, cy - 35 * SCALE, 20 * SCALE, 35 * SCALE);
        const on = Math.sin(time / 400 + obj.x) > 0;
        ctx.fillStyle = on ? GREEN : '#111';
        ctx.fillRect(p.x - 7 * SCALE, cy - 30 * SCALE, 2 * SCALE, 2 * SCALE);
        ctx.fillStyle = on ? CYAN : '#111';
        ctx.fillRect(p.x - 7 * SCALE, cy - 25 * SCALE, 2 * SCALE, 2 * SCALE);

      } else if (obj.type === 'neonPillar') {
        const col = obj.color || PINK;
        ctx.fillStyle = '#020202';
        ctx.fillRect(p.x - 3 * SCALE, cy - 50 * SCALE, 6 * SCALE, 50 * SCALE);
        ctx.fillStyle = col;
        ctx.shadowBlur = 15 * SCALE; ctx.shadowColor = col;
        ctx.fillRect(p.x - 0.5 * SCALE, cy - 45 * SCALE, 1 * SCALE, 40 * SCALE);
        ctx.shadowBlur = 0;

      } else if (obj.type === 'hologram') {
        const pulse = (Math.sin(time / 500) + 1) / 2;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1 * SCALE;
        ctx.beginPath(); ctx.ellipse(p.x, cy, 14 * SCALE, 7 * SCALE, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(0, 243, 255, ${0.05 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(p.x - 12 * SCALE, cy - 4 * SCALE); ctx.lineTo(p.x + 12 * SCALE, cy - 4 * SCALE);
        ctx.lineTo(p.x + 16 * SCALE, cy - 40 * SCALE); ctx.lineTo(p.x - 16 * SCALE, cy - 40 * SCALE);
        ctx.closePath(); ctx.fill();
        // Floating core
        ctx.fillStyle = CYAN;
        ctx.beginPath(); ctx.arc(p.x, cy - 20 * SCALE + pulse * 5 * SCALE, 2 * SCALE, 0, Math.PI * 2); ctx.fill();

      } else if (obj.type === 'terminal') {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(p.x - 12 * SCALE, cy - 10 * SCALE, 24 * SCALE, 10 * SCALE);
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x - 7 * SCALE, cy - 25 * SCALE, 14 * SCALE, 16 * SCALE);
        ctx.strokeStyle = GREEN;
        ctx.strokeRect(p.x - 7 * SCALE, cy - 25 * SCALE, 14 * SCALE, 16 * SCALE);
        ctx.fillStyle = GREEN;
        for (let i = 0; i < 4; i++) {
          const w = (4 + Math.sin(time / 200 + i) * 4) * SCALE;
          ctx.fillRect(p.x - 5 * SCALE, cy - 22 * SCALE + i * 3 * SCALE, w, 1 * SCALE);
        }

      } else if (obj.type === 'floorGlow') {
        const pulse = (Math.sin(time / 600 + obj.x * 2) + 1) / 2;
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.1 + pulse * 0.3})`;
        ctx.shadowBlur = 10 * pulse * SCALE; ctx.shadowColor = CYAN;
        ctx.lineWidth = 1 * SCALE;
        ctx.beginPath(); ctx.moveTo(p.x - 12 * SCALE, cy); ctx.lineTo(p.x + 12 * SCALE, cy); ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (obj.type === 'floorLamp') {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(p.x - 1.5 * SCALE, cy - 20 * SCALE, 3 * SCALE, 20 * SCALE);
        const pulse = (Math.sin(time / 400 + obj.x) + 1) / 2;
        ctx.fillStyle = ORANGE;
        ctx.shadowBlur = (12 + pulse * 10) * SCALE; ctx.shadowColor = ORANGE;
        ctx.beginPath(); ctx.arc(p.x, cy - 22 * SCALE, 3.5 * SCALE, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

      } else if (obj.type === 'crate') {
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(p.x - 10 * SCALE, cy - 16 * SCALE, 20 * SCALE, 16 * SCALE);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(p.x - 10 * SCALE, cy - 16 * SCALE, 20 * SCALE, 16 * SCALE);
        ctx.beginPath(); ctx.moveTo(p.x - 10 * SCALE, cy - 16 * SCALE); ctx.lineTo(p.x + 10 * SCALE, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x + 10 * SCALE, cy - 16 * SCALE); ctx.lineTo(p.x - 10 * SCALE, cy); ctx.stroke();

      } else if (obj.type === 'cableLine') {
        ctx.strokeStyle = 'rgba(168, 255, 62, 0.08)';
        ctx.setLineDash([2 * SCALE, 4 * SCALE]);
        ctx.lineWidth = 1 * SCALE;
        ctx.beginPath(); ctx.moveTo(p.x - 40 * SCALE, cy); ctx.lineTo(p.x + 40 * SCALE, cy); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    let animationFrame;
    const render = () => {
      // Input handling
      const keys = keysRef.current;
      const pos = localPosRef.current;
      let dx = 0, dy = 0;
      const speed = 0.12; // Increased speed for snappier movement
      if (keys['w'] || keys['z'] || keys['arrowup']) { dx -= speed; dy -= speed; }
      if (keys['s'] || keys['arrowdown']) { dx += speed; dy += speed; }
      if (keys['a'] || keys['q'] || keys['arrowleft']) { dx -= speed; dy += speed; }
      if (keys['d'] || keys['arrowright']) { dx += speed; dy -= speed; }

      if (dx !== 0 || dy !== 0) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (nx >= 0.2 && nx < MAP_SIZE - 0.2 && ny >= 0.2 && ny < MAP_SIZE - 0.2) {
          pos.x = nx;
          pos.y = ny;
          emitMove([nx, 5, ny], [0, 0, 0]);
        }
      }

      // DRAWING
      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid backdrop
      ctx.strokeStyle = 'rgba(168, 255, 62, 0.02)';
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }

      // Tiles
      for (let x = 0; x < MAP_SIZE; x++) {
        for (let y = 0; y < MAP_SIZE; y++) {
          drawIsoTile(x, y);
          if (x === 0) drawWall(x, y, 'left');
          if (y === 0) drawWall(x, y, 'right');
        }
      }

      // Entities
      const players = playersRef.current || {};
      const localPlayer = localPlayerRef.current || {};
      const entities = [];

      Object.values(players).forEach(p => {
        if (p.id !== localPlayer?.id) {
          entities.push({
            type: 'player', x: p.position[0], y: p.position[2],
            color: PINK, name: (p.name || 'AMI').toUpperCase(),
            micEnabled: p.micEnabled, cameraEnabled: p.cameraEnabled
          });
        }
      });

      entities.push({
        type: 'player', x: pos.x, y: pos.y,
        color: GREEN, name: 'VOUS',
        micEnabled: localPlayer?.micEnabled, cameraEnabled: localPlayer?.cameraEnabled
      });

      DECORATIONS.forEach(d => entities.push(d));
      entities.sort((a, b) => (a.x + a.y) - (b.x + b.y));
      entities.forEach(drawObject);

      // Particles
      const time = Date.now();
      ctx.globalAlpha = 0.3;
      particlesRef.current.forEach(pt => {
        const floatY = Math.sin(time * pt.speed + pt.phase) * 30;
        const p = worldToScreen(pt.x, pt.y);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(p.x, p.y + floatY, pt.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      if (canvas.parentElement) resizeObserver.unobserve(canvas.parentElement);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Run once on mount!

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#020204', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }} />
      {/* Subtle Scanlines Overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
        opacity: 0.5
      }} />
    </div>
  );
};
