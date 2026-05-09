import { useState, useEffect } from 'react';

// ─── Curseur clignotant ───
const Cursor = ({ color }) => {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 530);
    return () => clearInterval(t);
  }, []);
  return <span style={{ color, opacity: on ? 1 : 0, marginLeft: 2 }}>█</span>;
};

// ─── Typewriter terminal ───
const Typewriter = ({ lines, onDone }) => {
  const FONT = "'Press Start 2P', monospace";
  const [displayed, setDisplayed] = useState([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx >= lines.length) { setDone(true); onDone?.(); return; }
    if (charIdx === 0) setDisplayed(d => [...d, '']);
    const t = setTimeout(() => {
      if (charIdx < lines[lineIdx].length) {
        setDisplayed(d => d.map((l, i) => i === lineIdx ? l + lines[lineIdx][charIdx] : l));
        setCharIdx(c => c + 1);
      } else {
        setLineIdx(l => l + 1);
        setCharIdx(0);
      }
    }, 35);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx, lines, onDone]);

  return (
    <div style={{ fontFamily: FONT, fontSize: '0.42rem', letterSpacing: '1px', lineHeight: 2.4 }}>
      {displayed.map((line, i) => (
        <div key={i} style={{
          color: i % 2 === 0 ? '#a8ff3e' : '#ff6eb4',
        }}>
          {line}
          {i === displayed.length - 1 && !done && <Cursor color={i % 2 === 0 ? '#a8ff3e' : '#ff6eb4'} />}
        </div>
      ))}
    </div>
  );
};

// ─── Bouton pixel-art Vert/Rose ───
const PixelBtn = ({ children, onClick, primary, icon }) => {
  const [hover, setHover] = useState(false);
  const green = '#a8ff3e';
  const pink  = '#ff6eb4';
  const color = primary ? green : pink;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        width: '100%',
        padding: '13px 18px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '0.52rem',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        border: `2px solid ${color}`,
        outline: 'none',
        color: hover ? '#0a0a0a' : color,
        background: hover ? color : 'transparent',
        boxShadow: hover
          ? `0 0 20px ${color}88`
          : `inset -3px -3px 0 ${color}44`,
        transition: 'background 0.08s, color 0.08s, box-shadow 0.15s',
      }}
    >
      <span style={{ fontSize: '0.75rem' }}>{icon}</span>
      {children}
    </button>
  );
};

export const MainMenu = ({ onStart }) => {
  const FONT = "'Press Start 2P', monospace";
  const [visible,      setVisible]      = useState(false);
  const [fading,       setFading]       = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  const bootLines = [
    '> VANTAGE_OS v0.1',
    '> CONNECT WORLD_NET',
    '> LOAD SECTORS...',
    '> PLAYERS: ONLINE',
    '> STATUS: READY',
  ];

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);
  const handleBootDone = () => setTimeout(() => setTitleVisible(true), 200);
  const handleStart = () => { setFading(true); setTimeout(() => onStart(), 900); };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      display: 'flex',
      opacity: fading ? 0 : (visible ? 1 : 0),
      transition: 'opacity 0.9s ease',
    }}>
      {/* ── GIF Fond plein écran, qualité native ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <img
          src="/assets/menu_bg2.gif"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(1.4) contrast(1.05) saturate(1.2)',
          }}
        />

        {/* Overlay : sombre à gauche → totalement transparent à droite
            Le côté droit est maintenant complètement visible et lumineux */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(4,8,4,0.96) 0%, rgba(4,8,4,0.85) 28%, rgba(4,8,4,0.3) 48%, rgba(4,8,4,0.02) 65%, rgba(4,8,4,0) 100%)',
        }} />

        {/* Scanlines subtiles (toute la surface) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Panneau gauche (contenu) ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '420px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 50px',
      }}>

        {/* Terminal boot */}
        <div style={{
          background: 'rgba(0,12,0,0.55)',
          border: '1px solid rgba(168,255,62,0.25)',
          borderLeft: '3px solid #a8ff3e',
          padding: '14px 16px',
          marginBottom: '26px',
          backdropFilter: 'blur(2px)',
        }}>
          <Typewriter lines={bootLines} onDone={handleBootDone} />
        </div>

        {/* Titre + Boutons — apparaissent après boot */}
        <div style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>

          {/* Séparateur dashes bicolore */}
          <div style={{
            width: '100%', height: '2px', marginBottom: '22px',
            background: 'repeating-linear-gradient(90deg, #a8ff3e 0px, #a8ff3e 6px, #ff6eb4 6px, #ff6eb4 12px, transparent 12px, transparent 18px)',
            boxShadow: '0 0 10px rgba(168,255,62,0.4)',
          }} />

          {/* VANTAGE */}
          <div style={{
            fontFamily: FONT,
            fontSize: '1.3rem',
            color: '#a8ff3e',
            lineHeight: 1.2,
            marginBottom: '4px',
            textShadow: '3px 3px 0 #1a5000, 0 0 25px rgba(168,255,62,0.35)',
          }}>
            VANTAGE
          </div>

          {/* ALPHA (rose) */}
          <div style={{
            fontFamily: FONT,
            fontSize: '1.3rem',
            color: '#ff6eb4',
            lineHeight: 1.2,
            textShadow: '3px 3px 0 #5a0030, 0 0 30px rgba(255,110,180,0.4)',
            marginBottom: '20px',
          }}>
            ALPHA
          </div>

          {/* Sous-titre */}
          <div style={{
            fontFamily: FONT,
            fontSize: '0.36rem',
            letterSpacing: '2px',
            marginBottom: '30px',
            lineHeight: 2.2,
          }}>
            <span style={{ color: '#a8ff3e' }}>OPEN WORLD</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> · </span>
            <span style={{ color: '#ff6eb4' }}>MULTIPLAYER</span>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            <PixelBtn primary icon="▶" onClick={handleStart}>Commencer</PixelBtn>
          </div>

          {/* Footer */}
          <div style={{
            fontFamily: FONT,
            fontSize: '0.3rem',
            lineHeight: 2.5,
          }}>
            <span style={{ color: 'rgba(168,255,62,0.25)' }}>© 2025 </span>
            <span style={{ color: 'rgba(255,110,180,0.25)' }}>VANTAGE SYSTEMS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
