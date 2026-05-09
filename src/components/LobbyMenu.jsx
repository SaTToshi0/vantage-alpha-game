import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/useGameStore';

const FONT = "'Press Start 2P', monospace";
const GREEN = '#a8ff3e';
const PINK  = '#ff6eb4';
const DARK  = '#040804';

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
  `}</style>
);

// ─── Écran de base ───
const Screen = ({ children, onBack, wide = false }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 300,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(2,4,2,0.98)',
    padding: '20px', // Ajout de padding pour mobile
  }}>
    <LobbyStyles />
    
    {/* Fond type grille Cyberpunk */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'linear-gradient(rgba(168,255,62,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
      opacity: 0.5,
    }} />

    {/* Scanlines */}
    <div className="scanlines-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

    {/* Panneau */}
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: wide ? '800px' : '420px', // Adaptatif
      border: `2px solid ${GREEN}`,
      boxShadow: `0 0 30px ${GREEN}44, inset 0 0 20px rgba(168,255,62,0.04)`,
      padding: '36px 5vw', // Padding horizontal adaptatif
      background: 'rgba(0,10,0,0.85)',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.3s ease',
      maxHeight: '90vh',
      overflowY: 'auto',
    }}>
      {/* Barre titre */}
      <div style={{
        fontFamily: FONT, fontSize: 'clamp(0.35rem, 2vw, 0.45rem)', color: GREEN,
        letterSpacing: '2px', marginBottom: '28px',
        borderBottom: `1px solid ${GREEN}33`, paddingBottom: '16px',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>VANTAGE ALPHA &gt; SYSTEM</span>
        <span style={{ color: PINK }}>v0.9.2</span>
      </div>

      {children}

      {onBack && (
        <button onClick={onBack} style={{
          fontFamily: FONT, fontSize: '0.38rem',
          color: 'rgba(255,255,255,0.3)',
          background: 'transparent', border: 'none',
          cursor: 'pointer', marginTop: '30px',
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
        width: '100%', padding: large ? '20px' : '14px 18px',
        fontFamily: FONT, fontSize: large ? '0.65rem' : '0.52rem', letterSpacing: '2px',
        textTransform: 'uppercase', 
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `2px solid ${disabled ? '#555' : color}`,
        color: disabled ? '#555' : (hover ? '#0a0a0a' : color),
        background: disabled ? 'transparent' : (hover ? color : 'rgba(0,0,0,0.4)'),
        boxShadow: disabled ? 'none' : (hover ? `0 0 25px ${color}aa` : `inset -3px -3px 0 ${color}44`),
        transition: 'all 0.1s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon && <span style={{ fontSize: large ? '0.9rem' : '0.75rem' }}>{icon}</span>}
      {children}
    </button>
  );
};

// ─────────────────────────────────────────────────────
// Écran 1 : Choix
// ─────────────────────────────────────────────────────
const ChoiceScreen = ({ onSolo, onCreate, onJoin }) => (
  <Screen>
    <div style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#fff', marginBottom: '32px', textShadow: `0 0 20px ${GREEN}` }}>
      DÉPLOIEMENT
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Btn onClick={onSolo}   icon="▶" color={GREEN}>Mode Solo</Btn>
      <Btn onClick={onCreate} icon="+" color={GREEN}>Créer Escouade</Btn>
      <Btn onClick={onJoin}   icon="→" color={PINK} >Rejoindre Escouade</Btn>
    </div>
  </Screen>
);

// ─────────────────────────────────────────────────────
// Écran 2 : Rejoindre (Saisie du code)
// ─────────────────────────────────────────────────────
const JoinScreen = ({ socket, onJoined, onBack }) => {
  const [input,  setInput]  = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setInput(roomParam.toUpperCase());
  }, []);

  const handleJoin = () => {
    if (input.length < 6) { setStatus('Code trop court.'); return; }
    setLoading(true);
    setStatus('Connexion en cours...');
    socket.emit('join-room', input.toUpperCase());
  };

  useEffect(() => {
    if (!socket) return;
    
    const handleRoomJoined = ({ code }) => {
      socket.roomCode = code;
      onJoined(code); // Passe à WaitingRoomScreen
    };

    const handleError = (msg) => {
      setStatus(msg);
      setLoading(false);
    };

    socket.once('room-joined', handleRoomJoined);
    socket.once('room-error', handleError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-error', handleError);
    };
  }, [socket, onJoined]);

  return (
    <Screen onBack={onBack}>
      <div style={{ fontFamily: FONT, fontSize: '0.6rem', color: PINK, marginBottom: '24px' }}>
        REJOINDRE
      </div>
      <div style={{ fontFamily: FONT, fontSize: '0.38rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
        Liaison sécurisée (6 caractères) :
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="CODE"
        maxLength={6}
        style={{
          width: '100%', padding: '16px',
          fontFamily: FONT, fontSize: '1.5rem',
          letterSpacing: '12px', textAlign: 'center',
          color: PINK, background: 'rgba(0,0,0,0.8)',
          border: `2px solid ${PINK}`,
          boxShadow: `inset -4px -4px 0 ${PINK}44, 0 0 15px ${PINK}22`,
          outline: 'none', marginBottom: '24px',
          caretColor: PINK,
        }}
      />
      {status && (
        <div style={{
          fontFamily: FONT, fontSize: '0.35rem',
          color: PINK, marginBottom: '20px', lineHeight: 1.8,
        }}>
          &gt; {status}
        </div>
      )}
      <Btn onClick={handleJoin} color={PINK} icon="⚡">
        {loading ? 'Liaison...' : 'Connecter'}
      </Btn>
    </Screen>
  );
};

// ─────────────────────────────────────────────────────
// Écran 3 : Salon d'Attente (Waiting Room)
// ─────────────────────────────────────────────────────
// Affiche l'état de l'escouade (Hôte + Ami)
const WaitingRoomScreen = ({ socket, code, isHost, onStartGame, onBack }) => {
  const players = useGameStore(state => state.players);
  
  // Filtrer les joueurs actuellement dans ce salon
  const roomPlayers = Object.values(players).filter(p => p.roomCode === code);
  const friendJoined = roomPlayers.length > 1;

  useEffect(() => {
    if (!socket) return;
    
    // Écouter le signal de démarrage du jeu
    const handleGameStarted = () => {
      onStartGame();
    };
    
    socket.on('game-started', handleGameStarted);
    return () => socket.off('game-started', handleGameStarted);
  }, [socket, onStartGame]);

  const handleLaunch = () => {
    if (isHost && socket) {
      socket.emit('start-game');
    }
  };

  return (
    <Screen wide onBack={onBack}>
      {/* En-tête du salon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: '0.8rem', color: '#fff', textShadow: `0 0 15px ${GREEN}` }}>
            SALON D'ATTENTE
          </div>
          <div style={{ fontFamily: FONT, fontSize: '0.35rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            STATUT : {friendJoined ? 'ESCOUADE COMPLÈTE' : 'RECHERCHE EN COURS...'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT, fontSize: '0.35rem', color: GREEN, marginBottom: '8px' }}>CODE D'ACCÈS</div>
          <div style={{ 
            fontFamily: FONT, fontSize: '1.2rem', color: GREEN, 
            background: 'rgba(168,255,62,0.1)', padding: '8px 16px',
            border: `1px solid ${GREEN}55`, letterSpacing: '4px'
          }}>
            {code}
          </div>
        </div>
      </div>

      {/* Cartes des joueurs */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        marginBottom: '40px',
        flexWrap: 'wrap' // Permet l'empilement sur mobile
      }}>
        
        {/* Emplacement 1 : Hôte */}
        <div className="slot-filled" style={{
          flex: '1 1 280px', // Largeur min 280px avant d'empiler
          height: '220px', border: `2px solid ${GREEN}`,
          background: 'rgba(0,20,0,0.6)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, padding: '8px', background: GREEN, color: '#000', fontFamily: FONT, fontSize: '0.3rem' }}>
            JOUEUR 1 (HÔTE)
          </div>
          <div className="avatar-float" style={{
            width: '60px', height: '60px', background: GREEN,
            boxShadow: `0 0 20px ${GREEN}`, marginBottom: '16px',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
          }} />
          <div style={{ fontFamily: FONT, fontSize: '0.45rem', color: '#fff' }}>PRÊT</div>
        </div>

        {/* Emplacement 2 : Ami */}
        <div className={friendJoined ? "slot-filled-pink" : ""} style={{
          flex: '1 1 280px', // Largeur min 280px
          height: '220px', 
          border: `2px ${friendJoined ? 'solid' : 'dashed'} ${friendJoined ? PINK : 'rgba(255,255,255,0.2)'}`,
          background: friendJoined ? 'rgba(20,0,10,0.6)' : 'rgba(0,0,0,0.4)', 
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', position: 'relative'
        }}>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, padding: '8px', 
            background: friendJoined ? PINK : 'rgba(255,255,255,0.2)', 
            color: '#000', fontFamily: FONT, fontSize: '0.3rem' 
          }}>
            JOUEUR 2
          </div>
          
          {friendJoined ? (
            <>
              <div className="avatar-float" style={{
                width: '60px', height: '60px', background: PINK,
                boxShadow: `0 0 20px ${PINK}`, marginBottom: '16px',
                clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
              }} />
              <div style={{ fontFamily: FONT, fontSize: '0.45rem', color: '#fff' }}>PRÊT</div>
            </>
          ) : (
            <div className="waiting-dots" style={{ fontFamily: FONT, fontSize: '0.4rem', color: 'rgba(255,255,255,0.4)' }}>
              ATTENTE
            </div>
          )}
        </div>
      </div>

      {/* Bouton d'action (Lancer / Attendre) */}
      {isHost ? (
        <Btn large icon="🚀" onClick={handleLaunch}>
          LANCER LA PARTIE
        </Btn>
      ) : (
        <div style={{
          width: '100%', padding: '20px', textAlign: 'center',
          background: 'rgba(255,110,180,0.1)', border: `1px solid ${PINK}55`,
          color: PINK, fontFamily: FONT, fontSize: '0.5rem',
          boxShadow: `inset 0 0 20px ${PINK}22`
        }}>
          <span className="waiting-dots">EN ATTENTE DE L'HÔTE</span>
        </div>
      )}
    </Screen>
  );
};

// ─────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────
export const LobbyMenu = ({ socket, onStart }) => {
  const [screen, setScreen] = useState('choice'); // 'choice' | 'create_loading' | 'join' | 'waiting'
  const [roomCode, setRoomCode] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const handleSolo = () => {
    socket?.emit('join-solo');
    onStart({ mode: 'solo', code: null });
  };

  const handleEnterWorld = () => {
    onStart({ mode: 'room', code: roomCode || socket?.roomCode });
  };

  const handleCreateRequest = () => {
    if (!socket) return;
    setScreen('create_loading');
    
    const handleCreated = ({ code: c }) => {
      setRoomCode(c);
      socket.roomCode = c;
      setIsHost(true);
      setScreen('waiting');
    };

    socket.once('room-created', handleCreated);
    
    if (socket.connected) {
      socket.emit('create-room');
    } else {
      socket.once('connect', () => socket.emit('create-room'));
    }
  };

  const handleJoinSuccess = (code) => {
    setRoomCode(code);
    setIsHost(false);
    setScreen('waiting');
  };

  // Écran de chargement intermédiaire pour la création
  if (screen === 'create_loading') return (
    <Screen>
      <div className="waiting-dots" style={{ fontFamily: FONT, color: GREEN, fontSize: '0.6rem' }}>
        GÉNÉRATION DU SALON
      </div>
    </Screen>
  );

  if (screen === 'join') return (
    <JoinScreen
      socket={socket}
      onJoined={handleJoinSuccess}
      onBack={() => setScreen('choice')}
    />
  );

  if (screen === 'waiting') return (
    <WaitingRoomScreen
      socket={socket}
      code={roomCode}
      isHost={isHost}
      onStartGame={handleEnterWorld}
      onBack={() => {
        // En vrai, il faudrait émettre un 'leave-room' au serveur, 
        // mais pour l'instant on revient juste au choix.
        setScreen('choice');
        setRoomCode(null);
      }}
    />
  );

  return (
    <ChoiceScreen
      onSolo={handleSolo}
      onCreate={handleCreateRequest}
      onJoin={() => setScreen('join')}
    />
  );
};
