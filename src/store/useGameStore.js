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
    skin: 'sphere',
  },
  localStream: null,
  setLocalStream: (stream) => set({ localStream: stream }),
  remoteStreams: {},
  addRemoteStream: (id, stream) => set((state) => ({
    remoteStreams: { ...state.remoteStreams, [id]: stream }
  })),
  removeRemoteStream: (id) => set((state) => {
    const next = { ...state.remoteStreams };
    delete next[id];
    return { remoteStreams: next };
  }),
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
