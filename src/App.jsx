import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { PointerLockControls, Html } from '@react-three/drei';
import { World } from './components/World';
import { Player } from './components/Player';
import { RemotePlayer } from './components/RemotePlayer';
import { SocketManager, initializeSocket, getSocket } from './components/SocketManager';
import { MainMenu } from './components/MainMenu';
import { LobbyMenu } from './components/LobbyMenu';
import { MobileControls } from './components/MobileControls';
import { useGameStore } from './store/useGameStore';
import { Users, Wifi, Shield, Zap, Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, Hammer } from 'lucide-react';
import { EditorSidebar } from './components/EditorSidebar';

// ─── HUD en jeu ───
function HUD({ roomCode }) {
  const { players, isMobile } = useGameStore();
  const localPlayer = useGameStore(state => state.localPlayer);
  const setLocalPlayerStatus = useGameStore(state => state.setLocalPlayerStatus);
  const localStream = useGameStore(state => state.localStream);
  const setLocalStream = useGameStore(state => state.setLocalStream);
  const localScreenStream = useGameStore(state => state.localScreenStream);
  const setLocalScreenStream = useGameStore(state => state.setLocalScreenStream);
  const addScreen = useGameStore(state => state.addScreen);
  const removeScreen = useGameStore(state => state.removeScreen);
  const isEditorMode = useGameStore(state => state.isEditorMode);
  const setIsEditorMode = useGameStore(state => state.setIsEditorMode);
  const playerCount = Object.keys(players).length;

  const toggleScreenShare = async () => {
    if (localScreenStream) {
      localScreenStream.getTracks().forEach(t => t.stop());
      setLocalScreenStream(null);
      removeScreen(localPlayer.id); // Retirer localement
      getSocket()?.emit('remove-screen');
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30, width: 1280, height: 720 },
          audio: true
        });
        
        stream.getVideoTracks()[0].onended = () => {
          setLocalScreenStream(null);
          removeScreen(localPlayer.id);
          getSocket()?.emit('remove-screen');
        };
        
        setLocalScreenStream(stream);
        
        // Placer l'écran devant le joueur, bien en hauteur
        const pos = localPlayer.position || [0, 5, 0];
        const screenPos = [pos[0], pos[1] + 12, pos[2] - 15]; 
        
        const screenData = {
          id: `share-${localPlayer.id}`,
          ownerId: localPlayer.id,
          streamId: stream.id,
          position: screenPos,
          rotation: [0, Math.PI, 0], // Tourné de 180° pour faire face à la caméra
          scale: 2.8 // Plus grand par défaut pour le share
        };

        addScreen(screenData); // Ajouter localement immédiatement
        getSocket()?.emit('create-screen', screenData);
        
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  const toggleMic = () => {
    const newVal = !localPlayer?.micEnabled;
    setLocalPlayerStatus({ micEnabled: newVal });
    getSocket()?.emit('update-status', { micEnabled: newVal });

    if (localStream && localStream.getAudioTracks().length > 0) {
      localStream.getAudioTracks().forEach(t => { t.enabled = newVal; });
    } else if (newVal) {
      navigator.mediaDevices?.getUserMedia({ audio: true, video: localPlayer?.cameraEnabled || false })
        .then(stream => {
          setLocalStream(stream);
        })
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
      if (!newVal) {
        removeScreen(`cam-${localPlayer.id}`);
        getSocket()?.emit('remove-screen', `cam-${localPlayer.id}`);
      } else {
        const pos = localPlayer.position || [0, 5, 0];
        const screenPos = [pos[0] + 8, pos[1] + 10, pos[2] - 12]; // Décalé sur le côté et en hauteur
        const screenData = {
          id: `cam-${localPlayer.id}`,
          ownerId: localPlayer.id,
          streamId: localStream.id,
          position: screenPos,
          rotation: [0, Math.PI, 0],
          scale: 1.8
        };
        addScreen(screenData);
        getSocket()?.emit('create-screen', screenData);
      }
    } else if (newVal) {
      navigator.mediaDevices?.getUserMedia({ audio: localPlayer?.micEnabled || false, video: true })
        .then(stream => {
          setLocalStream(stream);
          const pos = localPlayer.position || [0, 5, 0];
          const screenPos = [pos[0] + 8, pos[1] + 10, pos[2] - 12]; 
          const screenData = {
            id: `cam-${localPlayer.id}`,
            ownerId: localPlayer.id,
            streamId: stream.id,
            position: screenPos,
            rotation: [0, Math.PI, 0],
            scale: 1.8
          };
          addScreen(screenData);
          getSocket()?.emit('create-screen', screenData);
        })
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

      {!isMobile && (
        <>
          <div className="crosshair" />
          <div id="grab-prompt" style={{
            position: 'absolute',
            top: '55%', left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'none',
            color: '#a8ff3e',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.4rem',
            textShadow: '0 0 5px #000, 0 0 10px #a8ff3e',
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 8px',
            border: '1px solid #a8ff3e',
            borderRadius: '2px',
            pointerEvents: 'none'
          }}>
            [R] DÉPLACER
          </div>
        </>
      )}

      {/* Contrôles Cam/Mic en bas à gauche */}
      <div style={{
        position: 'fixed', bottom: isMobile ? '200px' : '2rem', left: '2rem',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100,
        pointerEvents: 'auto'
      }}>
        <button style={btnStyle(localPlayer?.cameraEnabled, '#ff6eb4')} onClick={toggleCamera}>
          {localPlayer?.cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
          {localPlayer?.cameraEnabled ? 'CAM ON' : 'CAM OFF'}
        </button>
        <button style={btnStyle(localPlayer?.micEnabled, '#a8ff3e')} onClick={toggleMic}>
          {localPlayer?.micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
          {localPlayer?.micEnabled ? 'MIC ON' : 'MIC OFF'}
        </button>
        <button style={btnStyle(localScreenStream !== null, '#00d8ff')} onClick={toggleScreenShare}>
          {localScreenStream ? <MonitorX size={14} /> : <MonitorUp size={14} />}
          {localScreenStream ? 'STOP SHARE' : 'SHARE SCREEN'}
        </button>
        <button style={btnStyle(isEditorMode, '#ff8c00')} onClick={() => setIsEditorMode(!isEditorMode)}>
          <Hammer size={14} />
          BUILD MODE
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
  const [screen, setScreen] = useState('main');
  const [roomCode, setRoomCode] = useState(null);
  const [socket, setSocket] = useState(null);

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
        {/* Lumières de secours et grille — Toujours visibles même pendant le chargement */}
        <ambientLight intensity={1.5} />
        <pointLight position={[0, 10, 0]} intensity={10} color="#00d8ff" />

        {/* Repère visuel (un petit cube au centre) pour confirmer que le rendu fonctionne */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </mesh>

        <Suspense fallback={<mesh position={[0, 1, 0]}><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#00d8ff" wireframe /></mesh>}>
          <Physics gravity={[0, -9.81, 0]} broadphase="SAP" iterations={5}>
            <World />
            {hasStarted && <Player />}
            {hasStarted && Object.values(players).map((p) =>
              p.id !== localPlayer?.id && (
                <RemotePlayer key={p.id} id={p.id} position={p.position} rotation={p.rotation} cameraEnabled={p.cameraEnabled} skin={p.skin || 'criminalMaleA'} />
              )
            )}
          </Physics>
        </Suspense>
        {hasStarted && <PointerLockControls />}
      </Canvas>

      {/* HUD en jeu */}
      {hasStarted && <HUD roomCode={roomCode} />}

      {/* ── Écrans superposés ── */}
      {screen === 'main' && <MainMenu onStart={handleMainStart} />}
      {screen === 'lobby' && <LobbyMenu socket={socket} onStart={handleLobbyStart} />}
      
      {/* ── Outils d'édition ── */}
      {hasStarted && <EditorSidebar />}

      {/* Contrôles mobiles */}
      {hasStarted && <MobileControls />}
    </>
  );
}

export default App;
