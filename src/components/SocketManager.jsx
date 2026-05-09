import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

let socket = null;

export const initializeSocket = () => {
  if (!socket) {
    // En production (déployé), on se connecte à l'origine actuelle.
    // En local, on garde le port 3001 pour le serveur Node.
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : window.location.origin;

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      autoConnect: true,
    });
  }
  return socket;
};

export const SocketManager = () => {
  const { setPlayers, updatePlayer, removePlayer, setLocalPlayerId } = useGameStore();

  useEffect(() => {
    const sock = initializeSocket();

    const handleConnect = () => {
      console.log('✅ Connecté au serveur:', sock.id);
      setLocalPlayerId(sock.id);
    };

    const handlePlayers = (players) => setPlayers(players);

    const handlePlayerConnected = (player) => {
      console.log('👤 Joueur connecté:', player.id);
      updatePlayer(player.id, player);
    };

    const handlePlayerMoved = (player) => updatePlayer(player.id, player);

    const handlePlayerDisconnected = (id) => {
      console.log('👋 Joueur déconnecté:', id);
      removePlayer(id);
    };

    // room-joined : mettre à jour la liste des joueurs du salon
    const handleRoomJoined = ({ players }) => {
      if (players) setPlayers(players);
    };

    sock.on('connect',             handleConnect);
    sock.on('players',             handlePlayers);
    sock.on('playerConnected',     handlePlayerConnected);
    sock.on('playerMoved',         handlePlayerMoved);
    sock.on('playerDisconnected',  handlePlayerDisconnected);
    sock.on('room-joined',         handleRoomJoined);

    return () => {
      sock.off('connect',            handleConnect);
      sock.off('players',            handlePlayers);
      sock.off('playerConnected',    handlePlayerConnected);
      sock.off('playerMoved',        handlePlayerMoved);
      sock.off('playerDisconnected', handlePlayerDisconnected);
      sock.off('room-joined',        handleRoomJoined);
    };
  }, [setPlayers, updatePlayer, removePlayer, setLocalPlayerId]);

  return null;
};

/** Émet le mouvement du joueur (throttlé dans Player.jsx) */
export const emitMove = (position, rotation) => {
  if (socket?.connected) {
    socket.emit('move', {
      position: Array.isArray(position) ? position : [position.x, position.y, position.z],
      rotation,
    });
  }
};

/** Récupère l'instance socket */
export const getSocket = () => socket;
