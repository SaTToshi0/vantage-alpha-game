import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TransformControls, useGLTF } from '@react-three/drei';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

// Composant pour charger un GLTF/GLB dynamiquement
const EditorModel = ({ path, color }) => {
  try {
    const { scene } = useGLTF(path);
    // On clone la scène pour pouvoir en afficher plusieurs identiques
    const clone = React.useMemo(() => scene.clone(), [scene]);
    return <primitive object={clone} />;
  } catch (e) {
    console.error("Erreur chargement modèle:", path, e);
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff0000" wireframe />
      </mesh>
    );
  }
};

export const MapEditor = () => {
  const { scene } = useThree();
  const isEditorMode = useGameStore(state => state.isEditorMode);
  const editorObjects = useGameStore(state => state.editorObjects);
  const updateEditorObject = useGameStore(state => state.updateEditorObject);
  
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('translate'); // translate, rotate, scale
  const transformRef = useRef();

  // Changer de mode avec la touche T
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditorMode) return;
      if (e.key === 't' || e.key === 'T') {
        setMode(prev => prev === 'translate' ? 'rotate' : (prev === 'rotate' ? 'scale' : 'translate'));
      }
      // Supprimer avec Suppr
      if (e.key === 'Delete' && selectedId) {
        useGameStore.getState().removeEditorObject(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorMode, selectedId]);

  // Si on quitte le mode éditeur, on désélectionne
  useEffect(() => {
    if (!isEditorMode) setSelectedId(null);
  }, [isEditorMode]);

  // Si aucun objet, on ne rend rien sauf si on veut ajouter plus tard
  if (editorObjects.length === 0) return null;

  return (
    <group>
      {editorObjects.map((obj) => (
        <group 
          key={obj.id}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          onClick={(e) => {
            if (!isEditorMode) return;
            e.stopPropagation(); // Évite de sélectionner d'autres objets derrière
            setSelectedId(obj.id);
          }}
          onPointerOver={(e) => {
            if (isEditorMode) document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            if (isEditorMode) document.body.style.cursor = 'auto';
          }}
          name={obj.id}
        >
          {obj.type === 'primitive' && obj.geometry === 'box' && (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
            </mesh>
          )}
          {obj.type === 'primitive' && obj.geometry === 'sphere' && (
            <mesh>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
            </mesh>
          )}
          {obj.type === 'primitive' && obj.geometry === 'cylinder' && (
            <mesh>
              <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
              <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
            </mesh>
          )}
          {obj.type === 'model' && (
            <EditorModel path={obj.path} />
          )}

          {/* Surlignage de sélection */}
          {selectedId === obj.id && (
            <mesh scale={1.05}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ffffff" wireframe />
            </mesh>
          )}
        </group>
      ))}

      {/* Les flèches de manipulation pour l'objet sélectionné */}
      {selectedId && isEditorMode && (
        <TransformControls 
          ref={transformRef}
          mode={mode}
          object={scene.getObjectByName(selectedId)}
          onMouseUp={(e) => {
            // Sauvegarder la nouvelle position dans le store quand on lâche le clic
            const target = e.target.object;
            if (target) {
              updateEditorObject(selectedId, {
                position: target.position.toArray(),
                rotation: target.rotation.toArray().slice(0, 3), // Euler to array
                scale: target.scale.toArray()
              });
            }
          }}
        />
      )}
    </group>
  );
};
