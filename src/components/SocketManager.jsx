import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

let socket = null;
const peers = {}; // id -> RTCPeerConnection

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
  const setPlayers = useGameStore(state => state.setPlayers);
  const updatePlayer = useGameStore(state => state.updatePlayer);
  const removePlayer = useGameStore(state => state.removePlayer);
  const setLocalPlayerId = useGameStore(state => state.setLocalPlayerId);
  const localStreamInStore = useGameStore(state => state.localStream);
  const addRemoteStream = useGameStore(state => state.addRemoteStream);
  const removeRemoteStream = useGameStore(state => state.removeRemoteStream);
  const setIsGameStarted = useGameStore(state => state.setIsGameStarted);
  const setIsStarting = useGameStore(state => state.setIsStarting);
  const setRoomCode = useGameStore(state => state.setRoomCode);
  const localScreenStream = useGameStore(state => state.localScreenStream);
  const addScreen = useGameStore(state => state.addScreen);
  const updateScreen = useGameStore(state => state.updateScreen);
  const removeScreen = useGameStore(state => state.removeScreen);
  const setScreens = useGameStore(state => state.setScreens);

  useEffect(() => {
    const sock = initializeSocket();

    const createPeer = (targetId, isOffer) => {
      try {
        if (peers[targetId]) return peers[targetId];

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peers[targetId] = pc;

        // Ajouter le flux local initial si disponible
        if (localStreamInStore) {
          localStreamInStore.getTracks().forEach(track => pc.addTrack(track, localStreamInStore));
        }

        pc.onnegotiationneeded = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sock.emit('signal', { target: targetId, sdp: pc.localDescription });
          } catch (err) {
            console.error("Negotiation error:", err);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sock.emit('signal', { target: targetId, candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => {
          console.log('🎞️ Flux distant reçu pour:', targetId);
          addRemoteStream(targetId, event.streams[0]);
        };

        if (isOffer) {
          pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
            sock.emit('signal', { target: targetId, sdp: pc.localDescription });
          });
        }

        return pc;
      } catch (err) {
        console.error("Failed to create peer for", targetId, err);
        return null;
      }
    };

    const handleConnect = () => {
      console.log('✅ Connecté au serveur:', sock.id);
      setLocalPlayerId(sock.id);
    };

    const handlePlayers = (players) => {
      setPlayers(players);
      // Vérification de sécurité : Signal Magique 999
      Object.values(players).forEach(p => {
        if (p.rotation && p.rotation[1] === 999) {
          setIsStarting(true);
          setIsGameStarted(true);
        }
      });
    };

    const handlePlayerConnected = (player) => {
      console.log('👤 Joueur connecté:', player.id);
      updatePlayer(player.id, player);
      // Lancer la connexion WebRTC vers le nouveau joueur
      createPeer(player.id, true);
    };

    const handlePlayerMoved = (player) => {
      updatePlayer(player.id, player);
      if (player.rotation && player.rotation[1] === 999) {
        setIsStarting(true);
        setIsGameStarted(true);
      }
    };
    const handlePlayerUpdated = (player) => {
      updatePlayer(player.id, player);
      if (player.rotation && player.rotation[1] === 999) {
        console.log('🚀 Signal de départ reçu de:', player.id);
        setIsStarting(true);
        setIsGameStarted(true);
      }
    };

    const handlePlayerDisconnected = (id) => {
      console.log('👋 Joueur déconnecté:', id);
      removePlayer(id);
      if (peers[id]) {
        peers[id].close();
        delete peers[id];
      }
      removeRemoteStream(id);
    };

    // room-joined : mettre à jour la liste des joueurs du salon
    const handleRoomJoined = ({ players: roomPlayers, code, screens }) => {
      if (code) setRoomCode(code);
      if (screens) setScreens(screens);
      if (roomPlayers) {
        setPlayers(roomPlayers);
        // On initie la connexion avec tous les joueurs déjà présents
        Object.keys(roomPlayers).forEach(id => {
          if (id !== sock.id) createPeer(id, true);
        });
      }
    };

    const handleGameStarted = () => {
      console.log('🚀 Le jeu commence !');
      setIsStarting(true);
      setIsGameStarted(true);
    };

    const handleRoomCreated = ({ code }) => {
      if (code) setRoomCode(code);
    };

    const handleSignal = async ({ sender, sdp, candidate }) => {
      let pc = peers[sender];
      if (!pc) pc = createPeer(sender, false);

      if (sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sock.emit('signal', { target: sender, sdp: pc.localDescription });
        }
      } else if (candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    sock.on('connect', handleConnect);
    sock.on('players', handlePlayers);
    sock.on('playerConnected', handlePlayerConnected);
    sock.on('playerMoved', handlePlayerMoved);
    sock.on('playerUpdated', handlePlayerUpdated);
    sock.on('playerDisconnected', handlePlayerDisconnected);
    sock.on('room-joined', handleRoomJoined);
    sock.on('room-created', handleRoomCreated);
    sock.on('signal', handleSignal);
    sock.on('game-started', handleGameStarted);
    sock.on('screen-created', addScreen);
    sock.on('screen-updated', (data) => updateScreen(data.id, data));
    sock.on('screen-removed', removeScreen);

    return () => {
      sock.off('connect', handleConnect);
      sock.off('players', handlePlayers);
      sock.off('playerConnected', handlePlayerConnected);
      sock.off('playerMoved', handlePlayerMoved);
      sock.off('playerDisconnected', handlePlayerDisconnected);
      sock.off('room-joined', handleRoomJoined);
      sock.off('room-created', handleRoomCreated);
      sock.off('signal', handleSignal);
      sock.off('game-started', handleGameStarted);
      sock.off('screen-created', addScreen);
      sock.off('screen-updated');
      sock.off('screen-removed', removeScreen);
    };
  }, [setPlayers, updatePlayer, removePlayer, setLocalPlayerId, addRemoteStream, removeRemoteStream, setIsGameStarted, setIsStarting, setRoomCode]); // removed localStreamInStore from dependencies to avoid recreating socket

  // Effet séparé pour gérer l'ajout de nouveaux flux (ex: allumer la caméra en jeu)
  useEffect(() => {
    if (localStreamInStore) {
      Object.values(peers).forEach(pc => {
        const senders = pc.getSenders();
        localStreamInStore.getTracks().forEach(track => {
          const sender = senders.find(s => s.track && s.track.kind === track.kind && s.track.id === track.id);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, localStreamInStore); // Cela déclenchera onnegotiationneeded automatiquement
          }
        });
      });
    }
  }, [localStreamInStore]);

  // Effet pour le partage d'écran
  useEffect(() => {
    if (localScreenStream) {
      Object.values(peers).forEach(pc => {
        localScreenStream.getTracks().forEach(track => {
          // On ajoute simplement les tracks de l'écran. 
          pc.addTrack(track, localScreenStream); 
        });
      });
    } else {
      // Si on arrête le partage, on retire les tracks (ou on ferme le stream)
      Object.values(peers).forEach(pc => {
        const senders = pc.getSenders();
        senders.forEach(s => {
          if (s.track && s.track.label.toLowerCase().includes('screen')) {
            pc.removeTrack(s);
          }
        });
      });
    }
  }, [localScreenStream]);

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
