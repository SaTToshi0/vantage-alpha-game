import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Box, Circle, Cylinder, Cuboid, Download, Trash2, X } from 'lucide-react';

export const EditorSidebar = () => {
  const isEditorMode = useGameStore(state => state.isEditorMode);
  const setIsEditorMode = useGameStore(state => state.setIsEditorMode);
  const addEditorObject = useGameStore(state => state.addEditorObject);
  const editorObjects = useGameStore(state => state.editorObjects);
  const removeEditorObject = useGameStore(state => state.removeEditorObject);
  const localPlayer = useGameStore(state => state.localPlayer);

  const [modelPath, setModelPath] = useState('/assets/models/example.glb');

  if (!isEditorMode) return null;

  const handleSpawnPrimitive = (type, color) => {
    const pos = localPlayer.position || [0, 5, 0];
    const spawnPos = [pos[0], pos[1], pos[2] - 5]; // Devant le joueur

    addEditorObject({
      id: `obj_${Date.now()}`,
      type: 'primitive',
      geometry: type,
      color: color,
      position: spawnPos,
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    });
  };

  const handleSpawnModel = () => {
    if (!modelPath) return;
    const pos = localPlayer.position || [0, 5, 0];
    const spawnPos = [pos[0], pos[1], pos[2] - 5];

    addEditorObject({
      id: `obj_${Date.now()}`,
      type: 'model',
      path: modelPath,
      position: spawnPos,
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    });
  };

  const handleExport = () => {
    const data = JSON.stringify(editorObjects, null, 2);
    console.log("=== MAP EXPORT ===");
    console.log(data);
    navigator.clipboard.writeText(data).then(() => {
      alert('Map exportée dans le presse-papier ! Vous pouvez la coller dans votre code.');
    }).catch(() => {
      alert('Regardez la console (F12) pour récupérer le JSON de la map.');
    });
  };

  const panelStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '320px',
    background: 'rgba(5, 5, 10, 0.85)',
    border: '1px solid #00d8ff',
    borderRadius: '4px',
    padding: '15px',
    color: '#fff',
    fontFamily: "'Rajdhani', sans-serif",
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    pointerEvents: 'auto',
    maxHeight: '80vh',
    overflowY: 'auto'
  };

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '8px 12px',
    background: 'rgba(0, 216, 255, 0.1)',
    border: '1px solid #00d8ff',
    color: '#00d8ff', cursor: 'pointer',
    marginBottom: '8px', transition: 'all 0.2s',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '0.4rem', letterSpacing: '1px',
    textTransform: 'uppercase'
  };

  return (
    <div style={panelStyle} className="editor-sidebar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: '#ff00ff', fontSize: '1.2rem', margin: 0 }}>BUILD MODE</h2>
        <button onClick={() => setIsEditorMode(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Primitives 3D</h3>
        <button style={btnStyle} onClick={() => handleSpawnPrimitive('box', '#00d8ff')}>
          <Box size={14} /> Cube Neon Cyan
        </button>
        <button style={btnStyle} onClick={() => handleSpawnPrimitive('sphere', '#ff00ff')}>
          <Circle size={14} /> Sphère Magenta
        </button>
        <button style={btnStyle} onClick={() => handleSpawnPrimitive('cylinder', '#a8ff3e')}>
          <Cylinder size={14} /> Cylindre Vert
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Modèles GLB (Custom)</h3>
        <input 
          type="text" 
          value={modelPath} 
          onChange={(e) => setModelPath(e.target.value)}
          placeholder="/assets/models/nom_fichier.glb"
          style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: '#fff', marginBottom: '8px', fontFamily: 'monospace' }}
        />
        <button style={{ ...btnStyle, borderColor: '#ff8c00', color: '#ff8c00' }} onClick={handleSpawnModel}>
          <Cuboid size={14} /> Faire Apparaître
        </button>
      </div>

      <div style={{ marginBottom: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>Objets Placés ({editorObjects.length})</h3>
        {editorObjects.map(obj => (
          <div key={obj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', marginBottom: '5px', fontSize: '0.8rem' }}>
            <span>{obj.type === 'model' ? obj.path.split('/').pop() : obj.geometry}</span>
            <button onClick={() => removeEditorObject(obj.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
        <button style={{ ...btnStyle, background: '#00d8ff', color: '#000', fontWeight: 'bold' }} onClick={handleExport}>
          <Download size={14} /> Sauvegarder la Map
        </button>
        <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '10px', lineHeight: '1.4' }}>
          * Utilisez les flèches 3D pour bouger les objets.<br/>
          * Touche 'T' pour passer de Move à Rotate à Scale.<br/>
          * Échap pour déverrouiller la souris.
        </p>
      </div>
    </div>
  );
};
