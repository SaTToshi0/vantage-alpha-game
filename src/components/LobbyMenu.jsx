import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi, Users, Shield, Copy, Check, ArrowLeft, Gamepad2, Mic, MicOff, Video, VideoOff, WifiOff, Monitor, Settings } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { initializeSocket } from './SocketManager';
import { IsometricLobby } from './IsometricLobby';

const FONT = "'Press Start 2P', monospace";
const GREEN = '#a8ff3e';
const PINK = '#ff6eb4';
const CYAN = '#00f3ff';
const DARK = '#040804';

// ─── Animations CSS injectées ───
const LobbyStyles = () => (
  <style>{`
    @keyframes pulse-border {
      0% { box-shadow: 0 0 10px rgba(168,255,62,0.2), inset 0 0 10px rgba(168,255,62,0.1); }
      50% { box-shadow: 0 0 25px rgba(168,255,62,0.6), inset 0 0 20px rgba(168,255,62,0.3); }
      100% { box-shadow: 0 0 10px rgba(168,255,62,0.2), inset 0 0 10px rgba(168,255,62,0.1); }
    }
    @keyframes pulse-border-pink {
      0% { box-shadow: 0 0 10px rgba(255,110,180,0.2), inset 0 0 10px rgba(255,110,180,0.1); }
      50% { box-shadow: 0 0 25px rgba(255,110,180,0.6), inset 0 0 20px rgba(255,110,180,0.3); }
      100% { box-shadow: 0 0 10px rgba(255,110,180,0.2), inset 0 0 10px rgba(255,110,180,0.1); }
    }
    @keyframes scanline-anim {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }
    @keyframes float-avatar {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
      100% { transform: translateY(0px); }
    }
    @keyframes blink-dots {
      0% { content: ''; }
      33% { content: '.'; }
      66% { content: '..'; }
      100% { content: '...'; }
    }
    .waiting-dots::after {
      content: '';
      animation: blink-dots 1.5s infinite steps(1);
    }
    .slot-filled {
      animation: pulse-border 3s infinite;
    }
    .slot-filled-pink {
      animation: pulse-border-pink 3s infinite;
    }
    .avatar-float {
      animation: float-avatar 4s ease-in-out infinite;
    }
    .scanlines-overlay {
      background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px);
      animation: scanline-anim 1s linear infinite;
    }
    
    /* Scrollbar personnalisée */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 10, 0, 0.8);
      border-left: 1px solid rgba(168, 255, 62, 0.1);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(168, 255, 62, 0.4);
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(168, 255, 62, 0.8);
    }
  `}</style>
);

// ─── Écran de base ───
const Screen = ({ children, onBack, wide = false }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 300,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(2,4,2,0.98)',
    padding: '20px',
  }}>
    <LobbyStyles />
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'linear-gradient(rgba(168,255,62,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
      opacity: 0.5,
    }} />
    <div className="scanlines-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: wide ? '1800px' : '420px',
      padding: wide ? '40px' : '30px',
      background: 'rgba(0,10,0,0.85)',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.3s ease',
      height: wide ? '95vh' : 'auto',
      maxHeight: '98vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: GREEN,
        letterSpacing: '2px', marginBottom: '20px',
        borderBottom: `1px solid ${GREEN}33`, paddingBottom: '16px',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>VANTAGE ALPHA &gt; ESCUADE</span>
        <span style={{ color: PINK }}>v0.9.5_TACTICAL</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
      {onBack && (
        <button onClick={onBack} style={{
          fontFamily: FONT, fontSize: '0.38rem',
          color: 'rgba(255,255,255,0.3)',
          background: 'transparent', border: 'none',
          cursor: 'pointer', marginTop: '20px',
          letterSpacing: '1px', textTransform: 'uppercase',
          width: '100%', textAlign: 'left'
        }}>
          [ Echap ] Retour
        </button>
      )}
    </div>
  </div>
);

// ─── Bouton Pixel ───
const Btn = ({ children, onClick, color = GREEN, icon = '', large = false, disabled = false }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        width: '100%', padding: large ? '18px' : '12px 16px',
        fontFamily: FONT, fontSize: large ? '0.6rem' : '0.45rem', letterSpacing: '2px',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `2px solid ${disabled ? '#444' : color}`,
        color: disabled ? '#444' : (hover ? '#000' : color),
        background: disabled ? 'transparent' : (hover ? color : 'rgba(0,0,0,0.5)'),
        boxShadow: disabled ? 'none' : (hover ? `0 0 20px ${color}88` : `inset -2px -2px 0 ${color}33`),
        transition: 'all 0.1s',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

const ChoiceScreen = ({ onSolo, onCreate, onJoin }) => (
  <Screen>
    <div style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#fff', marginBottom: '32px', textAlign: 'center' }}>
      DÉPLOIEMENT
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Btn onClick={onSolo} icon="▶" color={GREEN}>Mode Solo</Btn>
      <Btn onClick={onCreate} icon="+" color={GREEN}>Créer Escouade</Btn>
      <Btn onClick={onJoin} icon="→" color={PINK} >Rejoindre Escouade</Btn>
    </div>
  </Screen>
);

// ─── Écran de configuration Solo (Cam/Mic avant d'entrer) ───
const SoloSetupScreen = ({ socket, onEnter, onBack }) => {
  const localPlayer = useGameStore(state => state.localPlayer);
  const setLocalPlayerStatus = useGameStore(state => state.setLocalPlayerStatus);
  const setLocalStream = useGameStore(state => state.setLocalStream);

  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const micLevelRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);

  // Enumération des périphériques
  const fetchDevices = () => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const audios = devices.filter(d => d.kind === 'audioinput');
      const videos = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audios);
      setVideoDevices(videos);
      
      // Si on a les permissions (label non vide), on peut auto-sélectionner le premier
      if (audios.length > 0 && audios[0].label) setSelectedMic(audios[0].deviceId);
      if (videos.length > 0 && videos[0].label) setSelectedCam(videos[0].deviceId);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Démarrer/stopper le flux selon les toggles
  useEffect(() => {
    let vid;
    if (localPlayer?.cameraEnabled || localPlayer?.micEnabled) {
      const constraints = {
        audio: localPlayer?.micEnabled ? (selectedMic ? { deviceId: selectedMic } : true) : false,
        video: localPlayer?.cameraEnabled ? (selectedCam ? { deviceId: selectedCam } : true) : false,
      };
      navigator.mediaDevices?.getUserMedia(constraints).then(stream => {
        streamRef.current = stream;
        setLocalStream(stream);
        
        // Rafraîchir les périphériques maintenant qu'on a la permission
        fetchDevices();

        if (videoRef.current && localPlayer?.cameraEnabled) videoRef.current.srcObject = stream;
        if (localPlayer?.micEnabled) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const update = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const level = Math.min(100, Math.round((sum / dataArray.length) * 1.5));
            if (micLevelRef.current) micLevelRef.current.style.width = `${level}%`;
            animRef.current = requestAnimationFrame(update);
          };
          update();
        }
      }).catch(err => {
        console.error('Media error:', err);
        setLocalPlayerStatus({ micEnabled: false, cameraEnabled: false });
      });
    } else {
      // Couper le flux si rien n'est actif
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setLocalStream(null);
      }
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [localPlayer?.cameraEnabled, localPlayer?.micEnabled, selectedMic, selectedCam]);

  const toggleCamera = () => setLocalPlayerStatus({ cameraEnabled: !localPlayer?.cameraEnabled });
  const toggleMic = () => setLocalPlayerStatus({ micEnabled: !localPlayer?.micEnabled });

  return (
    <Screen onBack={onBack}>
      <div style={{ fontFamily: FONT, fontSize: '0.6rem', color: GREEN, marginBottom: '24px', textAlign: 'center' }}>CONFIGURATION SOLO</div>

      {/* Prévisualisation caméra */}
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', border: `2px solid ${localPlayer?.cameraEnabled ? PINK : '#222'}`, position: 'relative', marginBottom: '16px', overflow: 'hidden' }}>
        {localPlayer?.cameraEnabled
          ? <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexDirection: 'column', gap: '12px' }}>
              <VideoOff size={40} />
              <span style={{ fontFamily: FONT, fontSize: '0.3rem', color: '#444' }}>CAMÉRA DÉSACTIVÉE</span>
            </div>
        }
      </div>

      {/* Contrôles Cam */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
        <button onClick={toggleCamera} style={{
          padding: '10px 16px', border: `2px solid ${localPlayer?.cameraEnabled ? PINK : '#333'}`,
          background: localPlayer?.cameraEnabled ? 'rgba(255,110,180,0.15)' : '#000',
          color: localPlayer?.cameraEnabled ? PINK : '#555', cursor: 'pointer', fontFamily: FONT, fontSize: '0.35rem', flexShrink: 0
        }}>
          {localPlayer?.cameraEnabled ? '📷 CAM ACTIF' : '📷 CAM OFF'}
        </button>
        <select value={selectedCam} onChange={e => setSelectedCam(e.target.value)} style={{
          flex: 1, background: '#000', border: `1px solid ${PINK}44`, color: PINK, fontFamily: FONT, fontSize: '0.3rem', padding: '8px', minWidth: 0
        }}>
          {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Caméra'}</option>)}
        </select>
      </div>

      {/* Contrôles Mic + Niveau */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
        <button onClick={toggleMic} style={{
          padding: '10px 16px', border: `2px solid ${localPlayer?.micEnabled ? GREEN : '#333'}`,
          background: localPlayer?.micEnabled ? 'rgba(168,255,62,0.15)' : '#000',
          color: localPlayer?.micEnabled ? GREEN : '#555', cursor: 'pointer', fontFamily: FONT, fontSize: '0.35rem', flexShrink: 0
        }}>
          {localPlayer?.micEnabled ? '🎤 MIC ACTIF' : '🎤 MIC OFF'}
        </button>
        <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} style={{
          flex: 1, background: '#000', border: `1px solid ${GREEN}44`, color: GREEN, fontFamily: FONT, fontSize: '0.3rem', padding: '8px', minWidth: 0
        }}>
          {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>)}
        </select>
      </div>
      <div style={{ height: '8px', background: '#000', border: `1px solid ${GREEN}44`, marginBottom: '24px', borderRadius: '2px', overflow: 'hidden' }}>
        <div ref={micLevelRef} style={{ width: '0%', height: '100%', background: GREEN, transition: 'width 0.1s' }} />
      </div>

      {/* Bouton d'entrée */}
      <Btn large color={GREEN} onClick={onEnter}>▶ ENTRER DANS LE MONDE</Btn>
    </Screen>
  );
};


const JoinScreen = ({ socket, onJoined, onBack }) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (input.length < 6) { setStatus('Code invalide.'); return; }
    setLoading(true);
    socket.emit('join-room', input.toUpperCase());
  };

  useEffect(() => {
    if (!socket) return;
    const handleRoomJoined = ({ code }) => onJoined(code);
    const handleError = (msg) => { setStatus(msg); setLoading(false); };
    socket.once('room-joined', handleRoomJoined);
    socket.once('room-error', handleError);
    return () => { socket.off('room-joined', handleRoomJoined); socket.off('room-error', handleError); };
  }, [socket, onJoined]);

  return (
    <Screen onBack={onBack}>
      <div style={{ fontFamily: FONT, fontSize: '0.6rem', color: PINK, marginBottom: '24px', textAlign: 'center' }}>REJOINDRE</div>
      <input
        value={input}
        onChange={e => setInput(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="CODE"
        maxLength={6}
        style={{
          width: '100%', padding: '16px', fontFamily: FONT, fontSize: '1.2rem',
          letterSpacing: '10px', textAlign: 'center', color: PINK, background: '#000',
          border: `2px solid ${PINK}`, outline: 'none', marginBottom: '20px'
        }}
      />
      {status && <div style={{ color: PINK, fontSize: '0.35rem', marginBottom: '15px' }}>{status}</div>}
      <Btn onClick={handleJoin} color={PINK} icon="⚡">{loading ? 'Connexion...' : 'Connecter'}</Btn>
    </Screen>
  );
};

const WaitingRoomScreen = ({ socket, code, isHost, onStartGame, onBack }) => {
  const players = useGameStore(state => state.players);
  const localPlayer = useGameStore(state => state.localPlayer);
  const setLocalPlayerStatus = useGameStore(state => state.setLocalPlayerStatus);
  const setLocalStream = useGameStore(state => state.setLocalStream);
  const isStarting = useGameStore(state => state.isStarting);
  const setIsStarting = useGameStore(state => state.setIsStarting);
  const setIsGameStarted = useGameStore(state => state.setIsGameStarted);
  const playerCount = Object.keys(players || {}).length;

  const [copied, setCopied] = useState(false);
  const [wifiLevel, setWifiLevel] = useState(100);
  const [leftWidth, setLeftWidth] = useState(72);

  // --- MEDIA STATES ---
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [loopback, setLoopback] = useState(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null); // Ref pour le retour audio
  const micLevelRef = useRef(null); // Ref directe pour éviter le lag (re-render)
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  // Enumeration des périphériques
  const fetchDevices = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audios = devices.filter(d => d.kind === 'audioinput');
        const videos = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audios);
        setVideoDevices(videos);
        if (audios.length > 0 && audios[0].label) setSelectedMic(audios[0].deviceId);
        if (videos.length > 0 && videos[0].label) setSelectedCam(videos[0].deviceId);
      }).catch(err => console.error("Enumerate devices error:", err));
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Gestion du flux média pour le test
  useEffect(() => {
    if ((localPlayer?.cameraEnabled || localPlayer?.micEnabled) && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        audio: localPlayer?.micEnabled ? (selectedMic ? { deviceId: selectedMic } : true) : false,
        video: localPlayer?.cameraEnabled ? (selectedCam ? { deviceId: selectedCam } : true) : false,
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          streamRef.current = stream;
          setLocalStream(stream);
          fetchDevices(); // Rafraîchir avec les vrais noms

          if (videoRef.current && localPlayer?.cameraEnabled) {
            videoRef.current.srcObject = stream;
          }
          if (audioRef.current && localPlayer?.micEnabled) {
            audioRef.current.srcObject = stream;
          }

          if (localPlayer?.micEnabled) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            const updateLevel = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const level = Math.min(100, Math.round((sum / dataArray.length) * 1.5));
              if (micLevelRef.current) micLevelRef.current.style.width = `${level}%`;
              animRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          }
        }).catch(err => {
          console.error("Media error:", err);
          if (localPlayer?.micEnabled) setLocalPlayerStatus({ micEnabled: false });
          if (localPlayer?.cameraEnabled) setLocalPlayerStatus({ cameraEnabled: false });
        });
    }

    return () => {
      try {
        // Ne pas couper le stream si on est en train de lancer le jeu (transition vers 3D)
        if (streamRef.current && !useGameStore.getState().isStarting) {
          streamRef.current.getTracks().forEach(t => t.stop());
          setLocalStream(null);
        }
        if (animRef.current) cancelAnimationFrame(animRef.current);
        if (audioContextRef.current) {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.error("Audio close err:", e));
          }
          audioContextRef.current = null;
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
      if (micLevelRef.current) micLevelRef.current.style.width = '0%';
    };
  }, [localPlayer?.micEnabled, localPlayer?.cameraEnabled, selectedMic, selectedCam, setLocalPlayerStatus]);

  // Update loopback mute status dynamically without restarting stream
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !loopback;
      if (loopback) {
        audioRef.current.play().catch(e => console.error("Audio play err:", e));
      }
    }
  }, [loopback]);

  // Le déclenchement global est géré dans SocketManager.jsx

  useEffect(() => {
    const interval = setInterval(() => {
      setWifiLevel(prev => Math.max(60, Math.min(100, prev + (Math.random() - 0.5) * 5)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResize = (e) => {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth);
  };

  const startResizing = () => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', () => window.removeEventListener('mousemove', handleResize));
  };

  const toggleMic = () => {
    const newVal = !localPlayer?.micEnabled;
    setLocalPlayerStatus({ micEnabled: newVal });
    socket.emit('update-status', { micEnabled: newVal });
  };

  const toggleCamera = () => {
    const newVal = !localPlayer?.cameraEnabled;
    setLocalPlayerStatus({ cameraEnabled: newVal });
    socket.emit('update-status', { cameraEnabled: newVal });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen wide onBack={onBack}>
      <div style={{ display: 'flex', gap: '0', flex: 1, alignItems: 'stretch', width: '100%', cursor: 'default' }}>

        {/* LEFT: ISOMETRIC VIEW */}
        <div style={{ width: `${leftWidth}%`, position: 'relative', border: `2px solid ${GREEN}44`, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <IsometricLobby roomCode={code} isHost={isHost} />
          </div>
          
          <div style={{ position: 'absolute', top: '15px', left: '15px', fontFamily: FONT, fontSize: '0.4rem', color: GREEN, background: 'rgba(0,0,0,0.8)', padding: '8px 12px', border: `1px solid ${GREEN}44` }}>
            SYSTEM_LINK: ACTIVE
          </div>
        </div>

        {/* RESIZE HANDLE */}
        <div 
          onMouseDown={startResizing}
          style={{ 
            width: '15px', cursor: 'col-resize', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', zIndex: 10
          }}
          onMouseEnter={(e) => e.target.style.background = `${GREEN}22`}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <div style={{ width: '2px', height: '40px', background: `${GREEN}88` }} />
        </div>

        {/* RIGHT: CONTROL PANEL PRO */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(0,5,0,0.8)', padding: '20px', border: `2px solid ${GREEN}44`, minWidth: '350px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: '0.3rem', color: 'rgba(168,255,62,0.6)', marginBottom: '8px', letterSpacing: '2px' }}>CANAL ESCUADE</div>
              <div onClick={copyCode} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: FONT, fontSize: '0.8rem', color: GREEN,
                background: '#010501', padding: '15px', border: `2px solid ${GREEN}66`, cursor: 'pointer',
                boxShadow: `inset 0 0 10px ${GREEN}22`
              }}>
                <span style={{ letterSpacing: '5px' }}>{code}</span>
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </div>
            </div>
          </div>

          {/* DIAGNOSTIC MEDIA SECTION */}
          <div style={{ padding: '15px', background: 'rgba(0,10,0,0.6)', border: `1px solid ${CYAN}44`, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: FONT, fontSize: '0.35rem', color: CYAN, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={14} /> CONFIGURATION PÉRIPHÉRIQUES
            </div>
            
            {/* CAMERA CONFIG */}
            <div style={{ marginBottom: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <button onClick={toggleCamera} style={{
                  padding: '8px 12px', border: `2px solid ${localPlayer?.cameraEnabled ? PINK : '#333'}`,
                  background: localPlayer?.cameraEnabled ? 'rgba(255,110,180,0.2)' : '#000',
                  color: localPlayer?.cameraEnabled ? PINK : '#666', cursor: 'pointer', fontFamily: FONT, fontSize: '0.35rem'
                }}>
                  {localPlayer?.cameraEnabled ? 'CAM ACTIF' : 'CAM OFF'}
                </button>
                <select value={selectedCam} onChange={e => setSelectedCam(e.target.value)} style={{
                  flex: 1, background: '#000', border: `1px solid ${PINK}66`, color: PINK,
                  fontFamily: FONT, fontSize: '0.3rem', padding: '5px', minWidth: 0
                }}>
                  {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</option>)}
                </select>
              </div>
              
              <div style={{ flex: 1, width: '100%', minHeight: '120px', background: '#000', border: `2px solid ${localPlayer?.cameraEnabled ? PINK : '#222'}`, position: 'relative', overflow: 'hidden' }}>
                {localPlayer?.cameraEnabled ? 
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} /> 
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222' }}><VideoOff size={30}/></div>
                }
              </div>
            </div>

            {/* MIC CONFIG */}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <button onClick={toggleMic} style={{
                  padding: '8px 12px', border: `2px solid ${localPlayer?.micEnabled ? GREEN : '#333'}`,
                  background: localPlayer?.micEnabled ? 'rgba(168,255,62,0.2)' : '#000',
                  color: localPlayer?.micEnabled ? GREEN : '#666', cursor: 'pointer', fontFamily: FONT, fontSize: '0.35rem'
                }}>
                  {localPlayer?.micEnabled ? 'MIC ACTIF' : 'MIC OFF'}
                </button>
                <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} style={{
                  flex: 1, background: '#000', border: `1px solid ${GREEN}66`, color: GREEN,
                  fontFamily: FONT, fontSize: '0.3rem', padding: '5px', minWidth: 0
                }}>
                  {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Micro ${d.deviceId.slice(0,5)}`}</option>)}
                </select>
              </div>
              
              {/* Audio Visualizer & Loopback */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '12px', background: '#000', border: `1px solid ${GREEN}44`, position: 'relative' }}>
                  <div ref={micLevelRef} style={{ width: '0%', height: '100%', background: GREEN, transition: 'width 0.1s' }} />
                </div>
                <button onClick={() => setLoopback(!loopback)} style={{
                  padding: '5px 8px', background: loopback ? GREEN : 'transparent', color: loopback ? '#000' : GREEN,
                  border: `1px solid ${GREEN}`, cursor: 'pointer', fontFamily: FONT, fontSize: '0.28rem'
                }}>
                  {loopback ? 'TEST: ON' : 'TEST: OFF'}
                </button>
                <audio ref={audioRef} autoPlay playsInline />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            {isHost ? (
              <Btn large onClick={() => { 
                socket.emit('start-game');
                
                // Signal "Burst" Magique : On utilise la rotation pour contourner les filtres du serveur
                let count = 0;
                const interval = setInterval(() => {
                  socket.emit('move', { 
                    position: [0, 5, 0], 
                    rotation: [0, 999, 0] // 999 est notre signal de départ !
                  });
                  count++;
                  if (count >= 5) clearInterval(interval);
                }, 100);
                
                setIsStarting(true);
                setIsGameStarted(true);
              }} disabled={playerCount < 1} color={CYAN}>
                🚀 INITIATION SÉQUENCE DE DÉPLOIEMENT
              </Btn>
            ) : (
              <div style={{
                padding: '20px', textAlign: 'center', background: 'rgba(255,110,180,0.05)',
                border: `2px solid ${PINK}55`, color: PINK, fontFamily: FONT, fontSize: '0.45rem', letterSpacing: '4px'
              }}>
                <span className="waiting-dots">SYNCHRONISATION HÔTE</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </Screen>
  );
};

export const LobbyMenu = ({ socket, onStart }) => {
  const [screen, setScreen] = useState('choice');
  const [roomCode, setRoomCode] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const handleSolo = () => setScreen('solo_setup');
  const handleEnterSolo = () => { socket?.emit('join-solo'); onStart({ mode: 'solo', code: null }); };
  const handleEnterWorld = () => onStart({ mode: 'room', code: roomCode || socket?.roomCode });

  const handleCreateRequest = () => {
    if (!socket) return;
    setScreen('create_loading');
    socket.once('room-created', ({ code }) => {
      setRoomCode(code); socket.roomCode = code; setIsHost(true); setScreen('waiting');
    });
    if (socket.connected) socket.emit('create-room');
    else socket.once('connect', () => socket.emit('create-room'));
  };

  if (screen === 'create_loading') return <Screen><div className="waiting-dots" style={{ fontFamily: FONT, color: GREEN, fontSize: '0.6rem' }}>GÉNÉRATION...</div></Screen>;
  if (screen === 'solo_setup') return <SoloSetupScreen socket={socket} onEnter={handleEnterSolo} onBack={() => setScreen('choice')} />;
  if (screen === 'join') return <JoinScreen socket={socket} onJoined={(c) => { setRoomCode(c); setIsHost(false); setScreen('waiting'); }} onBack={() => setScreen('choice')} />;
  if (screen === 'waiting') return <WaitingRoomScreen socket={socket} code={roomCode} isHost={isHost} onStartGame={handleEnterWorld} onBack={() => setScreen('choice')} />;

  return <ChoiceScreen onSolo={handleSolo} onCreate={handleCreateRequest} onJoin={() => setScreen('join')} />;
};
