import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { PointerLockControls } from '@react-three/drei';
import { World } from './components/World';
import { Player } from './components/Player';
import { RemotePlayer } from './components/RemotePlayer';
import { SocketManager, initializeSocket, getSocket } from './components/SocketManager';
import { MainMenu } from './components/MainMenu';
import { LobbyMenu } from './components/LobbyMenu';
import { MobileControls } from './components/MobileControls';
import { useGameStore } from './store/useGameStore';
import { Users, Wifi, Shield, Zap, Mic, MicOff, Video, VideoOff } from 'lucide-react';

// ─── HUD en jeu ───
function HUD({ roomCode }) {
  const { players, isMobile } = useGameStore();
  const localPlayer = useGameStore(state => state.localPlayer);
  const setLocalPlayerStatus = useGameStore(state => state.setLocalPlayerStatus);
  const localStream = useGameStore(state => state.localStream);
  const setLocalStream = useGameStore(state => state.setLocalStream);
  const playerCount = Object.keys(players).length;

  const toggleMic = () => {
    const newVal = !localPlayer?.micEnabled;
    setLocalPlayerStatus({ micEnabled: newVal });
    getSocket()?.emit('update-status', { micEnabled: newVal });

    if (localStream && localStream.getAudioTracks().length > 0) {
      localStream.getAudioTracks().forEach(t => { t.enabled = newVal; });
    } else if (newVal) {
      navigator.mediaDevices?.getUserMedia({ audio: true, video: localPlayer?.cameraEnabled || false })
        .then(stream => setLocalStream(stream))
        .catch(err => {
          console.error('Mic error:', err);
          setLocalPlayerStatus({ micEnabled: false });
          getSocket()?.emit('update-status', { micEnabled: false });
        });
    }
  };

  const toggleCamera = () => {
    const newVal = !localPlayer?.cameraEnabled;
    setLocalPlayerStatus({ cameraEnabled: newVal });
    getSocket()?.emit('update-status', { cameraEnabled: newVal });

    if (localStream && localStream.getVideoTracks().length > 0) {
      localStream.getVideoTracks().forEach(t => { t.enabled = newVal; });
    } else if (newVal) {
      navigator.mediaDevices?.getUserMedia({ audio: localPlayer?.micEnabled || false, video: true })
        .then(stream => setLocalStream(stream))
        .catch(err => {
          console.error('Camera error:', err);
          setLocalPlayerStatus({ cameraEnabled: false });
          getSocket()?.emit('update-status', { cameraEnabled: false });
        });
    }
  };

  const btnStyle = (active, color) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px',
    background: active ? `${color}22` : 'rgba(0,0,0,0.6)',
    border: `1.5px solid ${active ? color : '#333'}`,
    color: active ? color : '#555',
    cursor: 'pointer',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '0.35rem',
    letterSpacing: '1px',
    transition: 'all 0.15s',
    backdropFilter: 'blur(4px)',
  });

  return (
    <div className={`hud ${isMobile ? 'mobile' : ''}`}>
      <div className="top-bar">
        <div className="glass-panel stats" style={{ padding: isMobile ? '8px 12px' : '10px 16px' }}>
          <div className="stat-item" style={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
            <Users size={isMobile ? 12 : 14} /> <span>{playerCount}</span>
          </div>
          <div className="stat-item" style={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
            <Wifi size={isMobile ? 12 : 14} /> <span>24ms</span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: isMobile ? '8px 12px' : '10px 16px' }}>
          <div className="stat-item" style={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
            <Shield size={isMobile ? 12 : 14} />
            <span>{roomCode ? roomCode : 'Solo'}</span>
          </div>
        </div>
      </div>

      {!isMobile && <div className="crosshair" />}

      {/* Contrôles Cam/Mic en bas à gauche */}
      <div style={{
        position: 'fixed', bottom: isMobile ? '200px' : '2rem', left: '2rem',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100,
      }}>
        <button style={btnStyle(localPlayer?.cameraEnabled, '#ff6eb4')} onClick={toggleCamera}>
          {localPlayer?.cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
          {localPlayer?.cameraEnabled ? 'CAM ON' : 'CAM OFF'}
        </button>
        <button style={btnStyle(localPlayer?.micEnabled, '#a8ff3e')} onClick={toggleMic}>
          {localPlayer?.micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          {localPlayer?.micEnabled ? 'MIC ON' : 'MIC OFF'}
        </button>
      </div>

      <div className="bottom-bar" style={{ bottom: isMobile ? '160px' : '2rem' }}>
        <div className="glass-panel" style={{ width: isMobile ? '200px' : '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span className="stat-item" style={{ fontSize: isMobile ? '0.55rem' : '0.7rem' }}><Zap size={12} />&nbsp;Énergie</span>
            <span style={{ color: 'var(--neon-cyan)', fontSize: '0.6rem' }}>100%</span>
          </div>
          <div className="energy-bar-track">
            <div className="energy-bar-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ───
function App() {
  const players = useGameStore(state => state.players);
  const localPlayer = useGameStore(state => state.localPlayer);
  const isGameStarted = useGameStore(state => state.isGameStarted);
  const roomCodeFromStore = useGameStore(state => state.roomCode);
  const setIsMobile = useGameStore(state => state.setIsMobile);

  // 'main' → écran d'accueil pixel-art
  // 'lobby' → choix solo / créer / rejoindre
  // 'game'  → monde 3D
  const [screen,   setScreen]   = useState('main');
  const [roomCode, setRoomCode] = useState(null);
  const [socket,   setSocket]   = useState(null);

  // Initialiser le socket dès le démarrage (le monde charge en arrière-plan)
  useEffect(() => {
    const s = initializeSocket();
    setSocket(s);

    // Détection Mobile plus stricte (évite les PC portables tactiles)
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 800;
    setIsMobile(isMobileUA || (isSmallScreen && ('ontouchstart' in window)));

    // Si l'URL contient ?room=CODE → passer directement au lobby "rejoindre"
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) setScreen('lobby');
  }, []);

  // Déclenchement automatique du jeu pour tous
  useEffect(() => {
    if (isGameStarted && screen !== 'game') {
      if (roomCodeFromStore && !roomCode) {
        setRoomCode(roomCodeFromStore);
      }
      setScreen('game');
    }
  }, [isGameStarted, screen, roomCodeFromStore, roomCode]);

  const handleMainStart = () => setScreen('lobby');

  const handleLobbyStart = ({ mode, code }) => {
    setRoomCode(code);
    setScreen('game');
  };

  const hasStarted = screen === 'game';

  return (
    <>
      <SocketManager />

      {/* Monde 3D — charge en arrière-plan dès le départ */}
      <Canvas
        shadows={false}
        dpr={[0.8, 1.2]}
        camera={{ position: [0, 5, 10], fov: 70 }}
        style={{ background: '#05050a' }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} broadphase="SAP" iterations={5}>
            <World />
            {hasStarted && <Player />}
            {hasStarted && Object.values(players).map((p) =>
              p.id !== localPlayer?.id && (
                <RemotePlayer key={p.id} id={p.id} position={p.position} rotation={p.rotation} cameraEnabled={p.cameraEnabled} />
              )
            )}
          </Physics>
        </Suspense>
        {hasStarted && <PointerLockControls />}
      </Canvas>

      {/* HUD en jeu */}
      {hasStarted && <HUD roomCode={roomCode} />}

      {/* ── Écrans superposés ── */}
      {screen === 'main'  && <MainMenu onStart={handleMainStart} />}
      {screen === 'lobby' && <LobbyMenu socket={socket} onStart={handleLobbyStart} />}

      {/* Contrôles mobiles */}
      {hasStarted && <MobileControls />}
    </>
  );
}

export default App;
