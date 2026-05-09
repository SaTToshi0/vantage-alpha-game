import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Servir les fichiers statiques du build Vite en production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Stockage ───
const players = {};        // { socketId: playerData }
const rooms   = {};        // { code: { players: [id, id], maxPlayers: 2 } }

// ─── Génère un code salon aléatoire (6 caractères) ───
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms[code]); // Garantit l'unicité
  return code;
};

io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);

  // ─── Créer un salon ───
  socket.on('create-room', () => {
    const code = generateCode();
    rooms[code] = { players: [socket.id], maxPlayers: 2 };
    socket.join(code);           // Socket.io room
    socket.roomCode = code;

    players[socket.id] = { id: socket.id, position: [0, 5, 0], rotation: [0, 0, 0], roomCode: code };
    socket.emit('room-created', { code });
    socket.emit('players', { [socket.id]: players[socket.id] });
    console.log(`🏠 Room created: ${code}`);
  });

  // ─── Rejoindre un salon via code ───
  socket.on('join-room', (code) => {
    if (!code) {
      socket.emit('room-error', 'Veuillez entrer un code.');
      return;
    }
    const upperCode = code.toUpperCase();
    const room = rooms[upperCode];

    if (!room) {
      socket.emit('room-error', 'Code incorrect — ce salon n\'existe pas.');
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('room-error', 'Salon complet (max 2 joueurs).');
      return;
    }

    room.players.push(socket.id);
    socket.join(upperCode);
    socket.roomCode = upperCode;

    players[socket.id] = { id: socket.id, position: [0, 5, 0], rotation: [0, 0, 0], roomCode: upperCode };

    // Envoyer la liste des joueurs déjà dans le salon au nouvel arrivant
    const roomPlayers = room.players.reduce((acc, id) => {
      if (players[id]) acc[id] = players[id];
      return acc;
    }, {});
    socket.emit('room-joined', { code: upperCode, players: roomPlayers });

    // Annoncer le nouvel arrivant aux autres membres du salon
    socket.to(upperCode).emit('playerConnected', players[socket.id]);
    console.log(`👥 Player ${socket.id} joined room: ${upperCode}`);
  });

  // ─── Mode Solo (sans salon) ───
  socket.on('join-solo', () => {
    players[socket.id] = { id: socket.id, position: [0, 5, 0], rotation: [0, 0, 0], roomCode: null };
    socket.emit('players', { [socket.id]: players[socket.id] });
    console.log(`🕹️  Solo player: ${socket.id}`);
  });

  // ─── Lancer la partie (Hôte) ───
  socket.on('start-game', () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      // Vérifier si c'est bien l'hôte (le premier joueur du tableau)
      if (rooms[code].players[0] === socket.id) {
        console.log(`🎮 Game started in room: ${code}`);
        io.to(code).emit('game-started');
      }
    }
  });

  // ─── Mouvement (diffusé uniquement dans le salon) ───
  socket.on('move', (data) => {
    if (!players[socket.id]) return;
    players[socket.id].position = data.position;
    players[socket.id].rotation = data.rotation;

    const code = socket.roomCode;
    if (code) {
      socket.to(code).emit('playerMoved', players[socket.id]);
    }
  });

  // ─── Mise à jour statut (Mic/Cam) ───
  socket.on('update-status', (data) => {
    if (!players[socket.id]) return;
    players[socket.id] = { ...players[socket.id], ...data };

    const code = socket.roomCode;
    if (code) {
      socket.to(code).emit('playerUpdated', players[socket.id]);
    }
  });

  // ─── Déconnexion ───
  socket.on('disconnect', () => {
    console.log('❌ Player disconnected:', socket.id);
    const code = socket.roomCode;

    if (code && rooms[code]) {
      rooms[code].players = rooms[code].players.filter(id => id !== socket.id);
      if (rooms[code].players.length === 0) {
        delete rooms[code];
        console.log(`🗑️  Room deleted: ${code}`);
      } else {
        // Prévenir les autres membres
        io.to(code).emit('playerDisconnected', socket.id);
      }
    }
    delete players[socket.id];
  });
});

// Catch-all pour rediriger vers l'index.html (SPA) en production
app.get('*', (req, res) => {
  if (req.path.startsWith('/socket.io')) return;
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
