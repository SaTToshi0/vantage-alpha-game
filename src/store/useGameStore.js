import { create } from 'zustand';

export const useGameStore = create((set) => ({
  players: {},
  localPlayer: {
    id: null,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    micEnabled: false,
    cameraEnabled: false,
    wifiSignal: 100,
    skin: 'criminalMaleA',
  },
  localStream: null,
  setLocalStream: (stream) => set({ localStream: stream }),
  
  localScreenStream: null,
  setLocalScreenStream: (stream) => set({ localScreenStream: stream }),
  
  remoteStreams: {},
  addRemoteStream: (id, stream) => set((state) => ({
    remoteStreams: { ...state.remoteStreams, [id]: stream },
    streamsById: { ...state.streamsById, [stream.id]: stream }
  })),
  removeRemoteStream: (id) => set((state) => {
    const next = { ...state.remoteStreams };
    delete next[id];
    return { remoteStreams: next };
  }),
  
  remoteScreenStreams: {},
  addRemoteScreenStream: (id, stream) => set((state) => ({
    remoteScreenStreams: { ...state.remoteScreenStreams, [id]: stream },
    streamsById: { ...state.streamsById, [stream.id]: stream }
  })),
  removeRemoteScreenStream: (id) => set((state) => {
    const next = { ...state.remoteScreenStreams };
    delete next[id];
    return { remoteScreenStreams: next };
  }),

  streamsById: {}, // Mapping universel stream.id -> MediaStream

  // Les écrans virtuels dans le monde 3D
  screens: [],
  setScreens: (screens) => set({ screens }),
  addScreen: (screen) => set((state) => {
    // Remplacer si un écran avec la même id existe, sinon ajouter
    const existingIndex = state.screens.findIndex(s => s.id === screen.id);
    if (existingIndex >= 0) {
      const next = [...state.screens];
      next[existingIndex] = screen;
      return { screens: next };
    }
    return { screens: [...state.screens, screen] };
  }),
  updateScreen: (id, updates) => set((state) => ({
    screens: state.screens.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  removeScreen: (id) => set((state) => ({
    screens: state.screens.filter(s => s.id !== id)
  })),

  // Mode Éditeur de Map (Build Mode)
  isEditorMode: false,
  setIsEditorMode: (isEditorMode) => set({ isEditorMode }),
  editorObjects: [],
  setEditorObjects: (editorObjects) => set({ editorObjects }),
  addEditorObject: (obj) => set((state) => ({
    editorObjects: [...state.editorObjects, obj]
  })),
  updateEditorObject: (id, updates) => set((state) => ({
    editorObjects: state.editorObjects.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  removeEditorObject: (id) => set((state) => ({
    editorObjects: state.editorObjects.filter(o => o.id !== id)
  })),

  isStarting: false,
  setIsStarting: (isStarting) => set({ isStarting }),
  isGameStarted: false,
  setIsGameStarted: (isGameStarted) => set({ isGameStarted }),
  roomCode: null,
  setRoomCode: (roomCode) => set({ roomCode }),
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, data) => set((state) => ({
    players: {
      ...state.players,
      [id]: { ...state.players[id], ...data },
    },
  })),
  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    return { players: newPlayers };
  }),
  setLocalPlayerId: (id) => set((state) => ({
    localPlayer: { ...state.localPlayer, id },
  })),
  setLocalPlayerStatus: (data) => set((state) => ({
    localPlayer: { ...state.localPlayer, ...data },
  })),
}));
