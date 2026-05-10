import { useState, useEffect, useRef, Suspense } from 'react';
import { useGameStore } from '../store/useGameStore';
import { IsometricLobby } from './IsometricLobby';
import { SkinViewer3D } from './SkinViewer3D';

const GREEN = '#a8ff3e';
const PINK = '#ff00ff';
const CYAN = '#00d8ff';
const FONT = "'Press Start 2P', cursive";

const AVAILABLE_SKINS = [
  { id: 'criminalMaleA', label: 'CRIMINAL', emoji: '🕵️', file: '/assets/kenney/criminalMaleA.png' },
  { id: 'cyborgFemaleA', label: 'CYBORG', emoji: '🤖', file: '/assets/kenney/cyborgFemaleA.png' },
  { id: 'skaterFemaleA', label: 'SKATER_F', emoji: '🛹', file: '/assets/kenney/skaterFemaleA.png' },
  { id: 'skaterMaleA', label: 'SKATER_M', emoji: '🛹', file: '/assets/kenney/skaterMaleA.png' },
];

// ── Scanlines + animations globales ──
const LobbyStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    @keyframes grid-move {
      from { background-position: 0 0; }
      to   { background-position: 0 60px; }
    }
    @keyframes flicker {
      0%, 95%, 100% { opacity: 1; }
      96% { opacity: 0.8; }
      97% { opacity: 1; }
      98% { opacity: 0.6; }
    }
    @keyframes pulse-border {
      0%, 100% { box-shadow: 0 0 6px 1px currentColor; }
      50%       { box-shadow: 0 0 18px 4px currentColor; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes bounce-char {
      0%, 100% { transform: translateY(0px) scaleX(-1); }
      50%       { transform: translateY(-8px) scaleX(-1); }
    }
    @keyframes shadow-pulse {
      0%, 100% { opacity: 0.4; transform: scaleX(1); }
      50%       { opacity: 0.1; transform: scaleX(0.6); }
    }
    @keyframes scanline-scroll {
      from { background-position: 0 0; }
      to   { background-position: 0 100px; }
    }
    .scanlines {
      position: absolute; inset: 0; pointer-events: none; z-index: 5;
      background: repeating-linear-gradient(
        0deg,
        rgba(0,0,0,0.07) 0px,
        rgba(0,0,0,0.07) 1px,
        transparent 1px,
        transparent 4px
      );
      animation: scanline-scroll 8s linear infinite;
    }
    .btn-pixel-lobby {
      cursor: pointer;
      transition: all 0.08s steps(2);
      text-transform: uppercase;
      display: flex; align-items: center; gap: 15px;
      padding: 18px 24px;
      margin-bottom: 14px;
      position: relative;
      font-family: 'Press Start 2P', cursive;
    }
    .btn-pixel-lobby:hover {
      transform: translate(-3px, -3px);
      filter: brightness(1.2);
    }
    .btn-pixel-lobby:active {
      transform: translate(0, 0);
    }
    .waiting-dots::after {
      content: '';
      animation: dots 1.5s steps(4, end) infinite;
    }
    @keyframes dots {
      0%,20% { content: ''; }
      40%     { content: '.'; }
      60%     { content: '..'; }
      80%     { content: '...'; }
    }
    .skin-card {
      cursor: pointer;
      transition: transform 0.08s steps(2);
    }
    .skin-card:hover { transform: translate(-2px,-2px) scale(1.04); }
    .skin-card.selected { outline: 3px solid; outline-offset: 3px; }
  `}</style>
);

// ── Coin pixel-art ──
const PixelCorner = ({ color = GREEN, size = 5 }) => (
  <>
    <div style={{ position: 'absolute', top: 0, left: 0, width: size * 3, height: size, background: color }} />
    <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size * 3, background: color }} />
    <div style={{ position: 'absolute', top: 0, right: 0, width: size * 3, height: size, background: color }} />
    <div style={{ position: 'absolute', top: 0, right: 0, width: size, height: size * 3, background: color }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: size * 3, height: size, background: color }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size * 3, background: color }} />
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: size * 3, height: size, background: color }} />
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size * 3, background: color }} />
  </>
);

// SkinViewer2D supprimé — remplacé par SkinViewer3D (composant isolé)

// ── Chat de Salon stylé ──
const LobbyChat = ({ socket }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg) => {
      setMessages(prev => [...prev, msg].slice(-40));
    };
    socket.on('lobby-chat-message', handleMessage);
    return () => socket.off('lobby-chat-message', handleMessage);
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    const msg = { text: input, senderId: socket.id };
    socket.emit('lobby-chat-message', msg);
    // Pas d'echo local : le serveur renvoie le message à tout le monde y compris l'expéditeur
    setInput('');
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', 
      background: 'rgba(0,15,0,0.75)', 
      border: `1px solid ${CYAN}`,
      height: '280px',
      marginTop: '12px',
      boxShadow: `0 0 12px ${CYAN}22`
    }}>
      <div style={{ 
        background: `${CYAN}22`, padding: '5px 10px', 
        fontFamily: FONT, fontSize: '0.25rem', color: CYAN,
        borderBottom: `1px solid ${CYAN}44`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>{'>'} CANAL_CHAT_SECURISE</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <div style={{ width: 6, height: 6, background: CYAN, borderRadius: '50%', opacity: 0.7 }} />
          <div style={{ width: 6, height: 6, background: PINK, borderRadius: '50%', opacity: 0.5 }} />
        </div>
      </div>
      
      <div style={{ 
        flex: 1, overflowY: 'auto', padding: '15px',
        background: 'linear-gradient(180deg, rgba(0,216,255,0.05) 0%, transparent 100%)',
        scrollbarWidth: 'thin',
        scrollbarColor: `${CYAN} transparent`
      }}>
        {messages.length === 0 && (
          <div style={{ 
            fontFamily: FONT, fontSize: '0.28rem', color: `${CYAN}33`, 
            textAlign: 'center', marginTop: '70px',
            letterSpacing: '2px'
          }}>
            [ EN_ATTENTE_DE_MESSAGES ]
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.senderId === socket.id;
          return (
            <div key={i} style={{ 
              marginBottom: '8px', 
              fontFamily: FONT, 
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start'
            }}>
              <div style={{ 
                fontSize: '0.22rem', 
                color: isMe ? GREEN : PINK,
                marginBottom: '3px',
                opacity: 0.7
              }}>
                {isMe ? 'VOUS' : `AGENT_${m.senderId?.slice(0, 4)}`}
              </div>
              <div style={{ 
                background: isMe ? `${GREEN}18` : `${PINK}12`,
                border: `1px solid ${isMe ? GREEN : PINK}33`,
                padding: '6px 10px',
                borderRadius: isMe ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
                fontSize: '0.32rem',
                color: '#e8ffe8',
                maxWidth: '88%',
                wordBreak: 'break-word',
              }}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: 'flex', borderTop: `1px solid ${CYAN}33`, background: 'rgba(0,0,0,0.5)' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="> TAPER_MESSAGE..."
          style={{ 
            flex: 1, background: 'transparent', border: 'none', 
            color: CYAN, fontFamily: FONT, fontSize: '0.28rem',
            padding: '10px 12px', outline: 'none' 
          }}
        />
        <button onClick={sendMessage} style={{ 
          background: `${CYAN}22`, color: CYAN, border: 'none',
          borderLeft: `1px solid ${CYAN}44`,
          fontFamily: FONT, fontSize: '0.28rem', padding: '0 14px',
          cursor: 'pointer', letterSpacing: '1px'
        }}>
          ENVOYER
        </button>
      </div>
    </div>
  );
};

// ── Cartes de sélection de skin ──
const SkinSelector = ({ current, onChange }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      marginTop: '14px',
    }}>
      {AVAILABLE_SKINS.map(skin => {
        const isSelected = skin.id === current;
        return (
          <div
            key={skin.id}
            className={`skin-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onChange(skin.id)}
            style={{
              background: isSelected ? `rgba(168,255,62,0.12)` : 'rgba(0,0,0,0.6)',
              border: `2px solid ${isSelected ? GREEN : '#333'}`,
              outlineColor: isSelected ? GREEN : 'transparent',
              padding: '8px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <img
              src={skin.file}
              alt={skin.label}
              style={{
                height: '32px', width: 'auto',
                imageRendering: 'pixelated',
                filter: isSelected ? `drop-shadow(0 0 4px ${GREEN})` : 'grayscale(0.5)',
              }}
            />
            <div style={{
              fontFamily: FONT, fontSize: '0.35rem',
              color: isSelected ? GREEN : '#666',
              textAlign: 'center',
              width: '100%',
              letterSpacing: '1px'
            }}>
              {skin.label.toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Écran principal du lobby ──
const ChoiceScreen = ({ onSolo, onCreate, onJoin }) => {
  const localPlayer = useGameStore(state => state.localPlayer);
  const setLocalPlayerStatus = useGameStore(state => state.setLocalPlayerStatus);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 500);
    return () => clearInterval(t);
  }, []);

  const currentSkin = localPlayer?.skin || 'criminalMaleA';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <LobbyStyles />

      {/* ── Fond : même style que la page d'accueil ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <img
          src="/assets/wp12850307.gif"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(1.4) contrast(1.05) saturate(1.2)',
          }}
        />
        {/* Overlay sombre transparent comme la page d'accueil */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(4,8,4,0.96) 0%, rgba(4,8,4,0.85) 28%, rgba(4,8,4,0.3) 48%, rgba(4,8,4,0.02) 65%, rgba(4,8,4,0) 100%)',
        }} />
        {/* Scanlines subtiles */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Scanlines sur tout l'écran */}
      <div className="scanlines" />

      {/* ── Layout principal ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '90%', maxWidth: '960px',
        display: 'flex', gap: '28px',
        alignItems: 'flex-start',
      }}>

        {/* ── Colonne gauche : Visualiseur de skin ── */}
        <div style={{
          width: '320px', flexShrink: 0,
          background: 'rgba(2, 8, 2, 0.82)',
          backdropFilter: 'blur(4px)',
          border: `2px solid ${GREEN}`,
          position: 'relative',
          padding: '0 0 16px 0',
          overflow: 'hidden',
        }}>
          <PixelCorner color={GREEN} size={5} />

          {/* En-tête */}
          <div style={{
            fontFamily: FONT, fontSize: '0.3rem',
            color: CYAN, padding: '12px 16px',
            borderBottom: `1px solid rgba(168,255,62,0.2)`,
            marginBottom: '0',
          }}>
            {'>'} AGENT_VIEW_3D
          </div>

          {/* Vrai visualiseur 3D interactif */}
          <SkinViewer3D key={currentSkin} skin={currentSkin} />

          {/* Séparateur */}
          <div style={{
            height: 2, margin: '0',
            background: `repeating-linear-gradient(90deg, ${GREEN} 0px, ${GREEN} 6px, ${PINK} 6px, ${PINK} 12px, transparent 12px, transparent 18px)`,
            boxShadow: `0 0 8px ${GREEN}66`,
          }} />

          {/* Label agent sélectionné */}
          <div style={{ padding: '12px 16px 4px' }}>
            <div style={{
              fontFamily: FONT, fontSize: '0.28rem',
              color: '#555', marginBottom: '4px',
            }}>IDENTITÉ_AGENT :</div>
            <div style={{
              fontFamily: FONT, fontSize: '0.5rem',
              color: GREEN,
              textShadow: `0 0 10px ${GREEN}`,
            }}>
              {AVAILABLE_SKINS.find(s => s.id === currentSkin)?.label || 'AGENT'}
            </div>
          </div>

          {/* Sélecteur de skins */}
          <div style={{ padding: '0 16px' }}>
            <SkinSelector
              current={currentSkin}
              onChange={(id) => setLocalPlayerStatus({ skin: id })}
            />
          </div>
        </div>

        {/* ── Colonne droite : Titre + Modes ── */}
        <div style={{ flex: 1 }}>

          {/* Titre VANTAGE ALPHA */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              fontFamily: FONT, fontSize: '0.35rem',
              color: PINK, letterSpacing: '4px', marginBottom: '8px',
              textShadow: `0 0 10px ${PINK}`,
            }}>
              [ MISSION_TERMINAL_V.2 ]
            </div>
            <h1 style={{
              fontFamily: FONT,
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              color: GREEN,
              margin: '0 0 4px',
              letterSpacing: '4px',
              textShadow: `4px 4px 0 #000, 0 0 30px ${GREEN}88`,
              lineHeight: 1.1,
            }}>
              VANTAGE
            </h1>
            <h1 style={{
              fontFamily: FONT,
              fontSize: 'clamp(1.6rem, 4vw, 3rem)',
              color: PINK,
              margin: 0,
              letterSpacing: '4px',
              textShadow: `4px 4px 0 #000, 0 0 30px ${PINK}88`,
              lineHeight: 1.1,
            }}>
              ALPHA{tick % 2 === 0 ? '_' : ' '}
            </h1>
            <div style={{
              fontFamily: FONT, fontSize: '0.3rem',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '10px', letterSpacing: '2px',
            }}>
              OPEN WORLD · MULTIPLAYER
            </div>
          </div>

          {/* Séparateur bicolore */}
          <div style={{
            width: '100%', height: 2, marginBottom: '24px',
            background: `repeating-linear-gradient(90deg, ${GREEN} 0px, ${GREEN} 8px, ${PINK} 8px, ${PINK} 16px, transparent 16px, transparent 22px)`,
          }} />

          {/* ── Boutons de mode ── */}
          <div style={{
            fontFamily: FONT, fontSize: '0.3rem',
            color: `${GREEN}aa`, marginBottom: '16px', letterSpacing: '2px',
          }}>
            {'>'} SÉLECTION_DU_MODE
          </div>

          {[
            { icon: '▣', label: 'MODE_SOLO', sub: 'SIMULATION PRIVÉE', color: GREEN, action: onSolo, key: 'S' },
            { icon: '◈', label: 'CRÉER_NODE', sub: 'MULTIJOUEUR_LOCAL', color: CYAN, action: onCreate, key: 'C' },
            { icon: '⇢', label: 'JOIN_NODE', sub: 'ACCÈS_À_DISTANCE', color: PINK, action: onJoin, key: 'R' },
          ].map((m) => (
            <div
              key={m.label}
              onClick={m.action}
              className="btn-pixel-lobby"
              style={{
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(6px)',
                border: `2px solid ${m.color}`,
                color: m.color,
                boxShadow: `inset 0 0 0 1px ${m.color}22, 0 0 0px 0px ${m.color}00`,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: '0.48rem', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontFamily: FONT, fontSize: '0.22rem', opacity: 0.6 }}>{m.sub}</div>
              </div>
              <div style={{
                fontFamily: FONT, fontSize: '0.28rem',
                border: `2px solid ${m.color}`,
                padding: '5px 8px',
                background: `${m.color}18`,
              }}>
                [{m.key}]
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{
            fontFamily: FONT, fontSize: '0.25rem',
            color: 'rgba(255,255,255,0.2)',
            marginTop: '20px',
          }}>
            © 2025 VANTAGE SYSTEMS · ALL_RIGHTS_RESERVED
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Wrapper écran générique ──
const Screen = ({ children, onBack, color = '#fff', wide = false }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  }}>
    <LobbyStyles />

    {/* GIF de fond pour les sous-écrans aussi */}
    <div style={{ position: 'absolute', inset: 0 }}>
      <img src="/assets/wp12850307.gif" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3) saturate(1.2)' }} />
    </div>
    <div className="scanlines" />

    <div style={{
      position: 'relative', zIndex: 10,
      width: '100%', maxWidth: wide ? '960px' : '560px',
      background: 'rgba(0,4,0,0.88)',
      backdropFilter: 'blur(8px)',
      border: `2px solid ${color}`,
      padding: '40px',
      display: 'flex', flexDirection: 'column',
    }}>
      <PixelCorner color={color} size={6} />
      {children}
      {onBack && (
        <button onClick={onBack} style={{
          fontFamily: FONT, fontSize: '0.28rem', color: '#555',
          background: 'transparent', border: 'none',
          cursor: 'pointer', marginTop: '20px',
          display: 'block', width: '100%', textAlign: 'center',
        }}>
          [ ESC ] RETOUR AU MENU
        </button>
      )}
    </div>
  </div>
);

const JoinScreen = ({ socket, onJoined, onBack }) => {
  const [code, setCode] = useState('');
  const handleJoin = () => {
    if (!code || !socket) return;
    socket.emit('join-room', code);
    socket.once('room-joined', ({ code: joinedCode }) => onJoined(joinedCode));
  };
  return (
    <Screen onBack={onBack} color={PINK}>
      <h2 style={{ fontFamily: FONT, color: PINK, fontSize: '0.6rem', marginBottom: '24px' }}>REJOINDRE_NODE</h2>
      <input
        value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="CODE_SALON"
        style={{ width: '100%', background: '#000', border: `2px solid ${PINK}`, color: '#fff', padding: '14px', fontFamily: FONT, marginBottom: '20px', textAlign: 'center', fontSize: '0.5rem', letterSpacing: '4px' }}
      />
      <button onClick={handleJoin} className="btn-pixel-lobby" style={{ width: '100%', background: PINK, color: '#000', border: 'none', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: '0.45rem' }}>CONNEXION</div>
      </button>
    </Screen>
  );
};

const WaitingRoomScreen = ({ socket, code, isHost, onBack }) => {
  const players = useGameStore(state => state.players);
  const setIsStarting = useGameStore(state => state.setIsStarting);
  const setIsGameStarted = useGameStore(state => state.setIsGameStarted);
  const playerCount = Object.keys(players || {}).length;

  return (
    <Screen onBack={onBack} color={CYAN} wide={true}>
      <div style={{ display: 'flex', gap: '24px', minHeight: '440px' }}>
        {/* Colonne Gauche : Status et Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            border: `1px solid ${CYAN}55`, 
            padding: '14px', 
            background: 'rgba(0,216,255,0.05)',
            marginBottom: '10px'
          }}>
            <h2 style={{ fontFamily: FONT, color: CYAN, fontSize: '0.5rem', marginBottom: '8px' }}>NODE: {code}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                background: GREEN, boxShadow: `0 0 8px ${GREEN}` 
              }} />
              <div style={{ fontFamily: FONT, color: '#ccc', fontSize: '0.32rem' }}>
                AGENTS_ACTIFS: <span style={{ color: GREEN }}>{playerCount}</span>
              </div>
            </div>
            
            {/* Liste des agents connectés */}
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {Object.keys(players).map((pid, i) => (
                <div key={pid} style={{ 
                  fontSize: '0.24rem', fontFamily: FONT, 
                  background: pid === socket.id ? `${GREEN}22` : 'rgba(255,255,255,0.07)',
                  padding: '3px 8px', border: `1px solid ${pid === socket.id ? GREEN : 'rgba(255,255,255,0.2)'}`,
                  color: pid === socket.id ? GREEN : '#aaa',
                  borderRadius: '3px'
                }}>
                  {pid === socket.id ? '▶ VOUS' : `AGENT_${i + 1}`}
                </div>
              ))}
            </div>
          </div>

          {/* Le Chat */}
          <LobbyChat socket={socket} />

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            {isHost ? (
              <button
                onClick={() => { socket.emit('start-game'); setIsStarting(true); setIsGameStarted(true); }}
                className="btn-pixel-lobby"
                style={{ width: '100%', background: CYAN, color: '#000', border: 'none', justifyContent: 'center' }}
              >
                <div style={{ fontFamily: FONT, fontSize: '0.45rem' }}>DÉPLOYER_ESCOUADE</div>
              </button>
            ) : (
              <div style={{ 
                fontFamily: FONT, color: PINK, fontSize: '0.35rem', 
                textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '14px',
                border: `1px dashed ${PINK}88`
              }} className="waiting-dots">
                ATTENTE_SIGNAL_HÔTE
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite : Visualisation 3D du salon */}
        <div style={{ flex: 1.5, border: `2px solid ${CYAN}`, position: 'relative', background: '#000' }}>
          <IsometricLobby roomCode={code} isHost={isHost} />
          <div style={{ 
            position: 'absolute', top: '10px', right: '10px', 
            fontFamily: FONT, fontSize: '0.35rem', color: CYAN, 
            background: 'rgba(0,0,0,0.85)', padding: '6px 12px',
            border: `1px solid ${CYAN}`
          }}>
            FLUX_TACTIQUE_ISO
          </div>
          
          <div style={{ 
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)'
          }} />
        </div>
      </div>
    </Screen>
  );
};

export const LobbyMenu = ({ socket, onStart }) => {
  const [screen, setScreen] = useState('choice');
  const [roomCode, setRoomCode] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const handleCreateRequest = () => {
    if (!socket) return;
    setScreen('loading');
    socket.once('room-created', ({ code }) => { setRoomCode(code); setIsHost(true); setScreen('waiting'); });
    socket.emit('create-room');
  };

  if (screen === 'loading') return <Screen color={GREEN}><div style={{ fontFamily: FONT, color: GREEN }} className="waiting-dots">GÉNÉRATION_NODE</div></Screen>;
  if (screen === 'join') return <JoinScreen socket={socket} onJoined={(c) => { setRoomCode(c); setIsHost(false); setScreen('waiting'); }} onBack={() => setScreen('choice')} />;
  if (screen === 'waiting') return <WaitingRoomScreen socket={socket} code={roomCode} isHost={isHost} onBack={() => setScreen('choice')} />;

  return <ChoiceScreen onSolo={() => onStart({ mode: 'solo' })} onCreate={handleCreateRequest} onJoin={() => setScreen('join')} />;
};
