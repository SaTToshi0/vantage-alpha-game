import { create } from 'zustand';

export const useGameStore = create((set) => ({
  players: {},
  localPlayer: {
    id: null,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },
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
}));
